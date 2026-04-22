/**
 * TinkerRelay — class-based wrapper around the Tinker Relay Server v0.9.0
 *
 * Wraps the procedural relay server into a TinkerRelay class with
 * start() and stop() methods for programmatic embedding.
 */
import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import { verifyJoinSignature, verifyMessageSignature } from './auth.js';
import { joinRoom, leaveRoom, leaveAllRooms, getRoomMembers, broadcast, sendToNode, sendDirectToNode, broadcastGlobal, getRoomCount, getTotalConnections, getRoomList, getPublicKey, registerConnection, unregisterConnection, setPublicKey, } from './rooms.js';
import { register, findAgents, agentCount, getAgentInfo, setOnline, setOffline, onlineCount, } from './registry.js';
import { db, persistMessage, getRoomHistory, getDmHistory, getAgentHistory, upsertAgent, dbSetOnline, getGraphData, getAgentNeighbors, upsertProfile, getProfiles, addEndorsement, getReputation, recalculateReputation, getAllReputations, upsertCapabilityChannel, getCapabilityChannels, getCapabilityChannel, dbUpdateHeartbeat, dbSetAgentStatus, dbGetStaleAgents, dbGetAgentHealthSummary, dbCreateIntent, dbGetIntent, dbGetOpenIntents, dbMatchIntent, dbExpireIntents, dbTrackRoomActivity, dbGetTrendingRooms, dbCleanOldActivity, dbBanAgent, dbUnbanAgent, dbIsBanned, dbGetAllBans, dbCleanExpiredBans, dbSetRoomRules, dbGetRoomRules, dbCheckAccess, dbCheckRateLimit, dbCreateProposal, dbGetProposal, dbGetRoomProposals, dbVoteOnProposal, dbEvaluateProposal, dbExpireProposals, loadPersistedAgents, recordEdge, } from './db.js';
import { initGossip, gossipBroadcast, gossipDm, addPeer, getPeerCount, closeGossip } from './gossip.js';
// ─── TinkerRelay class ────────────────────────────────────────────────────────
export class TinkerRelay {
    port;
    host;
    authRequired;
    msgAuth;
    verbose;
    heartbeatIntervalMs;
    httpServer = null;
    wss = null;
    heartbeatInterval = null;
    reputationInterval = null;
    vitalityInterval = null;
    isShuttingDown = false;
    _isRunning = false;
    // WeakMaps for per-WS state
    wsToNodeId = new WeakMap();
    wsAlive = new WeakMap();
    // Relay discovery registry (Nostr-style)
    knownRelays = new Map();
    constructor(opts) {
        this.port = opts?.port ?? 7077;
        this.host = opts?.host ?? '0.0.0.0';
        this.authRequired = opts?.authRequired ?? false;
        this.msgAuth = opts?.msgAuth ?? false;
        this.verbose = opts?.verbose ?? true;
        this.heartbeatIntervalMs = opts?.heartbeatIntervalMs ?? 30_000;
        // Set env vars consumed by singleton modules (must be before any module-scope code runs)
        if (opts?.dataDir)
            process.env.DATA_DIR = opts.dataDir;
        if (opts?.peerRelays)
            process.env.PEER_RELAYS = opts.peerRelays.join(',');
    }
    // ── Derived addresses ──────────────────────────────────────────────────────
    get address() {
        const h = this.host === '0.0.0.0' ? '127.0.0.1' : this.host;
        return `ws://${h}:${this.port}`;
    }
    get httpAddress() {
        const h = this.host === '0.0.0.0' ? '127.0.0.1' : this.host;
        return `http://${h}:${this.port}`;
    }
    get isRunning() {
        return this._isRunning;
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    log(...args) {
        if (this.verbose)
            console.log('[relay]', ...args);
    }
    jsonResp(res, status, body) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
    }
    announceRelay(info) {
        this.knownRelays.set(info.address, info);
        this.log(`🔗 relay_announce: ${info.address} (${info.nodeId.slice(0, 8)}, peers=${info.peerCount})`);
    }
    getKnownRelays() {
        return [...this.knownRelays.values()];
    }
    /** Auto-create a #cap:<capability> channel if it doesn't exist */
    ensureCapabilityChannel(capability, description) {
        const existing = getCapabilityChannel(capability);
        if (existing)
            return existing;
        const now = Date.now();
        const channel = {
            roomId: `#cap:${capability}`,
            capability,
            memberCount: 0,
            description,
            createdAt: now,
        };
        upsertCapabilityChannel(channel);
        this.log(`📡 auto-created capability channel: #cap:${capability}`);
        return channel;
    }
    // ── Lifecycle ──────────────────────────────────────────────────────────────
    async start() {
        if (this._isRunning) {
            throw new Error('TinkerRelay is already running');
        }
        this.isShuttingDown = false;
        // ── 1. Load persisted agents from DB ────────────────────────────────────
        const persisted = loadPersistedAgents();
        for (const a of persisted) {
            register({
                nodeId: a.nodeId,
                publicKey: '',
                displayName: a.displayName,
                role: a.role,
                capabilities: a.capabilities,
                registeredAt: a.registeredAt,
            });
        }
        if (persisted.length > 0)
            this.log(`♻️  loaded ${persisted.length} agents from DB`);
        // ── 2. Create HTTP server with all routes ────────────────────────────────
        this.httpServer = http.createServer((req, res) => this.handleRequest(req, res));
        // ── 3. Create WebSocket server ───────────────────────────────────────────
        this.wss = new WebSocketServer({ server: this.httpServer });
        // ── 4. Set up WS handlers ────────────────────────────────────────────────
        this.wss.on('connection', (ws) => this.handleConnection(ws));
        this.wss.on('close', () => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        });
        // ── 5. Start background intervals ────────────────────────────────────────
        this.startIntervals();
        // ── 6. Init gossip ───────────────────────────────────────────────────────
        initGossip();
        // ── 7. Listen ────────────────────────────────────────────────────────────
        await new Promise((resolve, reject) => {
            this.httpServer.on('error', reject);
            this.httpServer.listen(this.port, this.host, () => {
                this._isRunning = true;
                const peers = process.env.PEER_RELAYS ? process.env.PEER_RELAYS.split(',').filter(Boolean) : [];
                const h = this.host === '0.0.0.0' ? '127.0.0.1' : this.host;
                console.log(`\n🔗 Tinker Relay v0.9.0`);
                console.log(`   WS:     ws://${h}:${this.port}`);
                console.log(`   HTTP:   http://${h}:${this.port}/health`);
                console.log(`   Auth:   join=${this.authRequired ? 'required' : 'open'}, msg=${this.msgAuth ? 'required' : 'open'}`);
                console.log(`   DB:     ${process.env.DATA_DIR ?? '~/.tinker'}/relay.db`);
                console.log(`   Gossip: ${peers.length > 0 ? peers.join(', ') : 'disabled (no PEER_RELAYS)'}`);
                console.log();
                resolve();
            });
        });
    }
    async stop() {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        this._isRunning = false;
        console.log('[relay] shutting down...');
        if (this.reputationInterval) {
            clearInterval(this.reputationInterval);
            this.reputationInterval = null;
        }
        if (this.vitalityInterval) {
            clearInterval(this.vitalityInterval);
            this.vitalityInterval = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        closeGossip();
        await new Promise((resolve) => {
            if (!this.wss) {
                resolve();
                return;
            }
            this.wss.close(() => {
                if (!this.httpServer) {
                    resolve();
                    return;
                }
                this.httpServer.close(() => {
                    try {
                        db.close();
                    }
                    catch { /* already closed */ }
                    resolve();
                });
            });
        });
    }
    // ── Background intervals ───────────────────────────────────────────────────
    startIntervals() {
        // Heartbeat (ping/pong to detect stale WS connections)
        this.heartbeatInterval = setInterval(() => {
            this.wss?.clients.forEach((ws) => {
                if (this.wsAlive.get(ws) === false) {
                    ws.terminate();
                    return;
                }
                this.wsAlive.set(ws, false);
                ws.ping();
            });
        }, this.heartbeatIntervalMs);
        // Reputation recalculation (every 60s for recently active nodes)
        this.reputationInterval = setInterval(() => {
            try {
                const fiveMinAgo = Date.now() - 5 * 60 * 1000;
                const activeNodes = db.prepare(`SELECT DISTINCT from_id FROM messages WHERE timestamp > ?`).all(fiveMinAgo);
                for (const { from_id } of activeNodes) {
                    try {
                        recalculateReputation(from_id);
                    }
                    catch { /* ignore per-node errors */ }
                }
                if (activeNodes.length > 0) {
                    this.log(`🔄 recalculated reputation for ${activeNodes.length} active node(s)`);
                }
            }
            catch (err) {
                this.log('⚠️ reputation job error:', err.message);
            }
        }, 60_000);
        // Vitality job (stale detection, intent expiry, trending, cleanup)
        const STALE_THRESHOLD_MS = 90_000;
        const TRENDING_THRESHOLD = 20;
        this.vitalityInterval = setInterval(() => {
            try {
                // ① Stale detection
                const staleAgents = dbGetStaleAgents(STALE_THRESHOLD_MS);
                for (const agent of staleAgents) {
                    dbSetAgentStatus(agent.nodeId, 'stale');
                    broadcastGlobal(JSON.stringify({
                        type: 'agent_status', nodeId: agent.nodeId, status: 'stale',
                    }));
                    this.log(`⏳ agent stale: ${agent.nodeId.slice(0, 8)} (${agent.displayName})`);
                }
                // ② Intent expiry
                const expired = dbExpireIntents();
                for (const intent of expired) {
                    broadcastGlobal(JSON.stringify({
                        type: 'intent_expired', intentId: intent.intentId,
                    }));
                    this.log(`⏰ intent expired: ${intent.intentId}`);
                }
                // ③ Trending rooms
                const trending = dbGetTrendingRooms(TRENDING_THRESHOLD);
                for (const room of trending) {
                    broadcastGlobal(JSON.stringify({
                        type: 'room_trending', roomId: room.roomId, messageCount: room.messageCount,
                    }));
                }
                if (trending.length > 0) {
                    this.log(`🔥 trending rooms: ${trending.map(r => `${r.roomId}(${r.messageCount})`).join(', ')}`);
                }
                // ④ Clean old activity data
                dbCleanOldActivity();
                // ⑤ Clean expired bans
                const expiredBans = dbCleanExpiredBans();
                if (expiredBans > 0)
                    this.log(`🔓 cleaned ${expiredBans} expired ban(s)`);
                // ⑥ Expire proposals
                const expiredProps = dbExpireProposals();
                if (expiredProps > 0)
                    this.log(`🗳️ expired ${expiredProps} proposal(s)`);
            }
            catch (err) {
                this.log('⚠️ vitality job error:', err.message);
            }
        }, 60_000);
    }
    // ── HTTP request handler ───────────────────────────────────────────────────
    handleRequest(req, res) {
        const url = new URL(req.url ?? '/', `http://${this.host}:${this.port}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // ── GET /health ─────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/health') {
            const msgCount = db.prepare(`SELECT COUNT(*) as c FROM messages`).get().c;
            const agentHealth = dbGetAgentHealthSummary();
            this.jsonResp(res, 200, {
                ok: true,
                version: '0.9.0',
                rooms: getRoomCount(),
                connections: getTotalConnections(),
                registeredAgents: agentCount(),
                onlineAgents: onlineCount(),
                agentHealth,
                persistedMessages: msgCount,
                gossipPeers: getPeerCount(),
                uptime: process.uptime(),
            });
            return;
        }
        // ── GET /rooms ──────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/rooms') {
            this.jsonResp(res, 200, { rooms: getRoomList() });
            return;
        }
        // ── GET /relays ──────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/relays') {
            this.jsonResp(res, 200, { relays: this.getKnownRelays() });
            return;
        }
        // ── POST /relays/announce ────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/relays/announce') {
            let body = '';
            req.on('data', (chunk) => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const info = JSON.parse(body);
                    if (!info.address || !info.nodeId) {
                        this.jsonResp(res, 400, { ok: false, message: 'address and nodeId required' });
                        return;
                    }
                    this.announceRelay({ address: info.address, nodeId: info.nodeId, peerCount: info.peerCount ?? 0 });
                    this.jsonResp(res, 200, { ok: true });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON' });
                }
            });
            return;
        }
        // ── GET /rooms/:roomId/members ───────────────────────────────────────────
        const membersMatch = url.pathname.match(/^\/rooms\/([^/]+)\/members$/);
        if (req.method === 'GET' && membersMatch) {
            const roomId = decodeURIComponent(membersMatch[1]);
            this.jsonResp(res, 200, { roomId, members: getRoomMembers(roomId) });
            return;
        }
        // ── GET /agents?role=&capability= ───────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/agents') {
            const role = url.searchParams.get('role') ?? undefined;
            const capability = url.searchParams.get('capability') ?? undefined;
            const results = findAgents({ role, capability });
            this.jsonResp(res, 200, { agents: results });
            return;
        }
        // ── GET /agents/:nodeId ──────────────────────────────────────────────────
        const agentMatch = url.pathname.match(/^\/agents\/([^/]+)$/);
        if (req.method === 'GET' && agentMatch) {
            const nodeId = decodeURIComponent(agentMatch[1]);
            const info = getAgentInfo(nodeId);
            if (!info) {
                this.jsonResp(res, 404, { ok: false, message: 'agent not found' });
                return;
            }
            this.jsonResp(res, 200, { agent: info });
            return;
        }
        // ── POST /agents/register ────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/agents/register') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    if (!payload.nodeId || !payload.publicKey) {
                        this.jsonResp(res, 400, { ok: false, message: 'nodeId and publicKey are required' });
                        return;
                    }
                    const agentData = {
                        nodeId: payload.nodeId,
                        publicKey: payload.publicKey,
                        displayName: payload.displayName ?? `Agent-${payload.nodeId.slice(0, 6)}`,
                        role: payload.role,
                        capabilities: payload.capabilities,
                        registeredAt: Date.now(),
                    };
                    upsertAgent({ ...agentData, online: false });
                    register(agentData);
                    this.log(`✅ registered: ${payload.nodeId.slice(0, 8)} (${agentData.displayName}) role=${payload.role ?? '-'}`);
                    const resp = { ok: true, nodeId: payload.nodeId, message: 'Agent registered' };
                    this.jsonResp(res, 200, resp);
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON body' });
                }
            });
            return;
        }
        // ── GET /graph ──────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/graph') {
            this.jsonResp(res, 200, getGraphData());
            return;
        }
        // ── GET /graph/agent/:nodeId ─────────────────────────────────────────────
        const graphAgentMatch = url.pathname.match(/^\/graph\/agent\/([^/]+)$/);
        if (req.method === 'GET' && graphAgentMatch) {
            const nodeId = decodeURIComponent(graphAgentMatch[1]);
            this.jsonResp(res, 200, { nodeId, neighbors: getAgentNeighbors(nodeId) });
            return;
        }
        // ── GET /profiles/:nodeId ────────────────────────────────────────────────
        const profilesNodeMatch = url.pathname.match(/^\/profiles\/([^/]+)$/);
        if (req.method === 'GET' && profilesNodeMatch) {
            const nodeId = decodeURIComponent(profilesNodeMatch[1]);
            const profiles = getProfiles(nodeId);
            this.jsonResp(res, 200, { nodeId, profiles });
            return;
        }
        // ── GET /profiles/:nodeId/:facetName ─────────────────────────────────────
        const profilesFacetMatch = url.pathname.match(/^\/profiles\/([^/]+)\/([^/]+)$/);
        if (req.method === 'GET' && profilesFacetMatch) {
            const nodeId = decodeURIComponent(profilesFacetMatch[1]);
            const facetName = decodeURIComponent(profilesFacetMatch[2]);
            const profiles = getProfiles(nodeId, facetName);
            if (profiles.length === 0) {
                this.jsonResp(res, 404, { ok: false, message: 'profile not found' });
                return;
            }
            this.jsonResp(res, 200, { profile: profiles[0] });
            return;
        }
        // ── POST /profiles ────────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/profiles') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    if (!payload.nodeId || !payload.facetName || !payload.declared) {
                        this.jsonResp(res, 400, { ok: false, message: 'nodeId, facetName, and declared are required' });
                        return;
                    }
                    upsertProfile({
                        nodeId: payload.nodeId,
                        facetName: payload.facetName,
                        declared: payload.declared,
                        observed: undefined,
                        endorsements: undefined,
                        updatedAt: Date.now(),
                    });
                    if (payload.declared.capabilities) {
                        for (const cap of payload.declared.capabilities) {
                            this.ensureCapabilityChannel(cap);
                        }
                    }
                    this.jsonResp(res, 200, { ok: true });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON body' });
                }
            });
            return;
        }
        // ── GET /reputation ───────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/reputation') {
            const minTrustStr = url.searchParams.get('minTrust');
            const minTrust = minTrustStr !== null ? parseFloat(minTrustStr) : undefined;
            const scores = getAllReputations(minTrust);
            this.jsonResp(res, 200, { scores });
            return;
        }
        // ── GET /reputation/:nodeId ───────────────────────────────────────────────
        const reputationMatch = url.pathname.match(/^\/reputation\/([^/]+)$/);
        if (req.method === 'GET' && reputationMatch) {
            const nodeId = decodeURIComponent(reputationMatch[1]);
            const score = getReputation(nodeId);
            if (!score) {
                this.jsonResp(res, 404, { ok: false, message: 'no reputation data for this node' });
                return;
            }
            this.jsonResp(res, 200, { score });
            return;
        }
        // ── GET /channels ─────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/channels') {
            const channels = getCapabilityChannels();
            this.jsonResp(res, 200, { channels });
            return;
        }
        // ── GET /channels/:capability ─────────────────────────────────────────────
        const channelMatch = url.pathname.match(/^\/channels\/([^/]+)$/);
        if (req.method === 'GET' && channelMatch) {
            const capability = decodeURIComponent(channelMatch[1]);
            const channel = getCapabilityChannel(capability);
            if (!channel) {
                this.jsonResp(res, 404, { ok: false, message: 'channel not found' });
                return;
            }
            this.jsonResp(res, 200, { channel });
            return;
        }
        // ── POST /channels ─────────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/channels') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    if (!payload.capability) {
                        this.jsonResp(res, 400, { ok: false, message: 'capability is required' });
                        return;
                    }
                    const channel = this.ensureCapabilityChannel(payload.capability, payload.description);
                    this.jsonResp(res, 200, { ok: true, channel });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON body' });
                }
            });
            return;
        }
        // ── GET /health/agents ────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/health/agents') {
            this.jsonResp(res, 200, dbGetAgentHealthSummary());
            return;
        }
        // ── GET /intents ──────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/intents') {
            const capability = url.searchParams.get('capability') ?? undefined;
            let intents = dbGetOpenIntents();
            if (capability)
                intents = intents.filter(i => i.capability === capability);
            this.jsonResp(res, 200, { intents });
            return;
        }
        // ── GET /intents/:intentId ────────────────────────────────────────────────
        const intentMatch = url.pathname.match(/^\/intents\/([^/]+)$/);
        if (req.method === 'GET' && intentMatch) {
            const intentId = decodeURIComponent(intentMatch[1]);
            const intent = dbGetIntent(intentId);
            if (!intent) {
                this.jsonResp(res, 404, { ok: false, message: 'intent not found' });
                return;
            }
            this.jsonResp(res, 200, { intent });
            return;
        }
        // ── POST /intents ─────────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/intents') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    if (!payload.fromNodeId || !payload.capability || !payload.description) {
                        this.jsonResp(res, 400, { ok: false, message: 'fromNodeId, capability, description required' });
                        return;
                    }
                    const intentId = `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    const intent = {
                        intentId,
                        fromNodeId: payload.fromNodeId,
                        capability: payload.capability,
                        description: payload.description,
                        constraints: payload.constraints,
                        ttlMs: payload.ttlMs ?? 300_000,
                        createdAt: Date.now(),
                    };
                    dbCreateIntent(intent);
                    this.log(`🎯 intent created: ${intentId} [${payload.capability}] by ${payload.fromNodeId.slice(0, 8)}`);
                    broadcastGlobal(JSON.stringify({
                        type: 'message',
                        payload: {
                            id: intentId,
                            type: 'intent',
                            from: payload.fromNodeId,
                            room: '#intents',
                            content: JSON.stringify(intent),
                            timestamp: Date.now(),
                            signature: '',
                        },
                    }));
                    this.jsonResp(res, 200, { ok: true, intent: dbGetIntent(intentId) });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON body' });
                }
            });
            return;
        }
        // ── GET /trending ─────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/trending') {
            const threshold = parseInt(url.searchParams.get('threshold') ?? '20', 10);
            const trending = dbGetTrendingRooms(threshold);
            this.jsonResp(res, 200, { trending });
            return;
        }
        // ── GET /history/room/:roomId ─────────────────────────────────────────────
        const histRoomMatch = url.pathname.match(/^\/history\/room\/([^/]+)$/);
        if (req.method === 'GET' && histRoomMatch) {
            const roomId = decodeURIComponent(histRoomMatch[1]);
            const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
            const msgs = getRoomHistory(roomId, limit);
            this.jsonResp(res, 200, { roomId, messages: msgs, count: msgs.length });
            return;
        }
        // ── GET /history/dm/:a/:b ─────────────────────────────────────────────────
        const histDmMatch = url.pathname.match(/^\/history\/dm\/([^/]+)\/([^/]+)$/);
        if (req.method === 'GET' && histDmMatch) {
            const nodeIdA = decodeURIComponent(histDmMatch[1]);
            const nodeIdB = decodeURIComponent(histDmMatch[2]);
            const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
            const msgs = getDmHistory(nodeIdA, nodeIdB, limit);
            this.jsonResp(res, 200, { nodeIdA, nodeIdB, messages: msgs, count: msgs.length });
            return;
        }
        // ── GET /history/agent/:nodeId ────────────────────────────────────────────
        const histAgentMatch = url.pathname.match(/^\/history\/agent\/([^/]+)$/);
        if (req.method === 'GET' && histAgentMatch) {
            const nodeId = decodeURIComponent(histAgentMatch[1]);
            const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
            const msgs = getAgentHistory(nodeId, limit);
            this.jsonResp(res, 200, { nodeId, messages: msgs, count: msgs.length });
            return;
        }
        // ═══════════════════════════════════════════════════════════════════════════
        // v0.9: Governance HTTP routes
        // ═══════════════════════════════════════════════════════════════════════════
        // ── GET /bans ─────────────────────────────────────────────────────────────
        if (req.method === 'GET' && url.pathname === '/bans') {
            this.jsonResp(res, 200, { bans: dbGetAllBans() });
            return;
        }
        // ── POST /bans ────────────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/bans') {
            let raw = '';
            req.on('data', (c) => { raw += c.toString(); });
            req.on('end', () => {
                try {
                    const { nodeId, reason, expiresAt } = JSON.parse(raw);
                    if (!nodeId || !reason) {
                        this.jsonResp(res, 400, { ok: false, message: 'nodeId and reason required' });
                        return;
                    }
                    const ban = dbBanAgent(nodeId, 'relay', reason, expiresAt);
                    broadcastGlobal(JSON.stringify({ type: 'ban', nodeId, reason, expiresAt }));
                    gossipBroadcast(JSON.stringify({ type: 'gossip_ban', ban, gossiped: true }));
                    this.log(`🚫 banned: ${nodeId.slice(0, 8)} — ${reason}`);
                    this.jsonResp(res, 200, { ok: true, ban });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON' });
                }
            });
            return;
        }
        // ── DELETE /bans/:nodeId ──────────────────────────────────────────────────
        const banMatch = url.pathname.match(/^\/bans\/([^/]+)$/);
        if (req.method === 'DELETE' && banMatch) {
            const nodeId = decodeURIComponent(banMatch[1]);
            dbUnbanAgent(nodeId);
            broadcastGlobal(JSON.stringify({ type: 'unban', nodeId }));
            this.log(`✅ unbanned: ${nodeId.slice(0, 8)}`);
            this.jsonResp(res, 200, { ok: true, nodeId });
            return;
        }
        // ── GET /rules/:roomId ────────────────────────────────────────────────────
        const rulesMatch = url.pathname.match(/^\/rules\/([^/]+)$/);
        if (req.method === 'GET' && rulesMatch) {
            const roomId = decodeURIComponent(rulesMatch[1]);
            const rules = dbGetRoomRules(roomId);
            if (!rules) {
                this.jsonResp(res, 404, { ok: false, message: 'no rules for room' });
                return;
            }
            this.jsonResp(res, 200, { rules });
            return;
        }
        // ── POST /rules ───────────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/rules') {
            let raw = '';
            req.on('data', (c) => { raw += c.toString(); });
            req.on('end', () => {
                try {
                    const rules = JSON.parse(raw);
                    if (!rules.roomId || !rules.creator) {
                        this.jsonResp(res, 400, { ok: false, message: 'roomId and creator required' });
                        return;
                    }
                    rules.updatedAt = Date.now();
                    dbSetRoomRules(rules);
                    broadcast(rules.roomId, JSON.stringify({ type: 'room_rules_update', rules }));
                    this.log(`📜 rules set: ${rules.roomId} by ${rules.creator.slice(0, 8)}, model=${rules.governanceModel}`);
                    this.jsonResp(res, 200, { ok: true, rules });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON' });
                }
            });
            return;
        }
        // ── GET /proposals/:roomId ────────────────────────────────────────────────
        const proposalsMatch = url.pathname.match(/^\/proposals\/([^/]+)$/);
        if (req.method === 'GET' && proposalsMatch) {
            const roomId = decodeURIComponent(proposalsMatch[1]);
            this.jsonResp(res, 200, { proposals: dbGetRoomProposals(roomId) });
            return;
        }
        // ── POST /proposals ───────────────────────────────────────────────────────
        if (req.method === 'POST' && url.pathname === '/proposals') {
            let raw = '';
            req.on('data', (c) => { raw += c.toString(); });
            req.on('end', () => {
                try {
                    const { roomId, proposedBy, changes, ttlMs } = JSON.parse(raw);
                    if (!roomId || !proposedBy || !changes) {
                        this.jsonResp(res, 400, { ok: false, message: 'roomId, proposedBy, changes required' });
                        return;
                    }
                    const rules = dbGetRoomRules(roomId);
                    if (rules && rules.governanceModel === 'creator' && rules.creator !== proposedBy) {
                        this.jsonResp(res, 403, { ok: false, message: 'creator-governed room: only creator can change rules' });
                        return;
                    }
                    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    const proposal = dbCreateProposal(proposalId, roomId, proposedBy, changes, ttlMs);
                    broadcast(roomId, JSON.stringify({ type: 'rule_proposal', proposal }));
                    this.log(`🗳️ proposal: ${proposalId} for ${roomId} by ${proposedBy.slice(0, 8)}`);
                    this.jsonResp(res, 200, { ok: true, proposal });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON' });
                }
            });
            return;
        }
        // ── POST /proposals/:proposalId/vote ──────────────────────────────────────
        const voteMatch = url.pathname.match(/^\/proposals\/([^/]+)\/vote$/);
        if (req.method === 'POST' && voteMatch) {
            let raw = '';
            req.on('data', (c) => { raw += c.toString(); });
            req.on('end', () => {
                try {
                    const proposalId = decodeURIComponent(voteMatch[1]);
                    const { voter, vote } = JSON.parse(raw);
                    if (!voter || !vote) {
                        this.jsonResp(res, 400, { ok: false, message: 'voter and vote required' });
                        return;
                    }
                    const proposal = dbGetProposal(proposalId);
                    if (!proposal) {
                        this.jsonResp(res, 404, { ok: false, message: 'proposal not found' });
                        return;
                    }
                    const rules = dbGetRoomRules(proposal.roomId);
                    let weight = 1;
                    if (rules?.governanceModel === 'reputation') {
                        const rep = getReputation(voter);
                        weight = rep?.trustScore ?? 50;
                    }
                    const updated = dbVoteOnProposal(proposalId, voter, vote, weight);
                    if (!updated) {
                        this.jsonResp(res, 404, { ok: false, message: 'proposal not found or closed' });
                        return;
                    }
                    broadcast(proposal.roomId, JSON.stringify({ type: 'rule_vote', proposalId, roomId: proposal.roomId, vote, voter }));
                    const result = dbEvaluateProposal(proposalId);
                    if (result === 'passed') {
                        const newRules = dbGetRoomRules(proposal.roomId);
                        if (newRules) {
                            broadcast(proposal.roomId, JSON.stringify({ type: 'room_rules_update', rules: newRules }));
                            this.log(`📜 proposal ${proposalId} passed → rules updated`);
                        }
                    }
                    else if (result === 'rejected') {
                        this.log(`❌ proposal ${proposalId} rejected`);
                    }
                    this.jsonResp(res, 200, { ok: true, proposal: updated, result });
                }
                catch {
                    this.jsonResp(res, 400, { ok: false, message: 'invalid JSON' });
                }
            });
            return;
        }
        this.jsonResp(res, 404, { ok: false, message: 'not found' });
    }
    // ── WebSocket connection handler ───────────────────────────────────────────
    handleConnection(ws) {
        this.wsAlive.set(ws, true);
        ws.on('pong', () => this.wsAlive.set(ws, true));
        ws.on('message', (raw) => void this.handleWsMessage(ws, raw.toString()));
        ws.on('close', () => this.handleWsClose(ws));
        ws.on('error', (err) => this.log('⚠️ ws error:', err.message));
    }
    async handleWsMessage(ws, rawStr) {
        let msg;
        try {
            msg = JSON.parse(rawStr);
        }
        catch {
            ws.send(JSON.stringify({ type: 'error', code: 'PARSE_ERROR', message: 'invalid JSON' }));
            return;
        }
        switch (msg.type) {
            // ── hello ──────────────────────────────────────────────────────────────
            case 'hello': {
                const { nodeId, publicKey, displayName, role, capabilities } = msg;
                if (dbIsBanned(nodeId)) {
                    ws.send(JSON.stringify({ type: 'error', code: 'BANNED', message: 'you are banned from this relay' }));
                    this.log(`🚫 hello rejected (banned): ${nodeId.slice(0, 8)}`);
                    ws.close(4403, 'banned');
                    return;
                }
                this.wsToNodeId.set(ws, nodeId);
                registerConnection(nodeId, ws);
                setPublicKey(nodeId, publicKey);
                setOnline(nodeId);
                upsertAgent({ nodeId, publicKey, displayName, role, capabilities, online: true });
                dbSetOnline(nodeId, true);
                this.log(`👋 hello: ${displayName} (${nodeId.slice(0, 8)}) role=${role ?? '-'}`);
                if (capabilities && capabilities.length > 0) {
                    for (const cap of capabilities) {
                        this.ensureCapabilityChannel(cap);
                    }
                }
                const agentInfo = {
                    nodeId, displayName, role, capabilities,
                    online: true, status: 'active', registeredAt: Date.now(),
                };
                broadcastGlobal(JSON.stringify({ type: 'agent_joined', agent: agentInfo }), nodeId);
                break;
            }
            // ── join ───────────────────────────────────────────────────────────────
            case 'join': {
                if (this.authRequired) {
                    const result = await verifyJoinSignature({
                        nodeId: msg.nodeId, publicKey: msg.publicKey,
                        roomId: msg.roomId, timestamp: msg.timestamp, signature: msg.signature,
                    });
                    if (!result.ok) {
                        ws.send(JSON.stringify({ type: 'error', code: 'AUTH_FAILED', message: result.reason ?? 'auth failed' }));
                        this.log(`❌ join rejected: ${msg.nodeId.slice(0, 8)} — ${result.reason}`);
                        return;
                    }
                }
                this.wsToNodeId.set(ws, msg.nodeId);
                joinRoom(msg.roomId, ws, {
                    nodeId: msg.nodeId, publicKey: msg.publicKey,
                    displayName: msg.displayName, role: msg.role,
                });
                setOnline(msg.nodeId);
                this.log(`📥 join: ${msg.displayName} (${msg.nodeId.slice(0, 8)}) → room:${msg.roomId}`);
                ws.send(JSON.stringify({ type: 'members', roomId: msg.roomId, members: getRoomMembers(msg.roomId) }));
                const sysMsg = {
                    id: `sys-join-${Date.now()}`, type: 'system', from: 'relay',
                    room: msg.roomId, content: `${msg.displayName} joined the room`,
                    timestamp: Date.now(), signature: '',
                };
                broadcast(msg.roomId, JSON.stringify({ type: 'message', payload: sysMsg }), msg.nodeId);
                const agentInfo = {
                    nodeId: msg.nodeId, displayName: msg.displayName,
                    role: msg.role, capabilities: msg.capabilities,
                    online: true, status: 'active', registeredAt: Date.now(),
                };
                broadcastGlobal(JSON.stringify({ type: 'agent_joined', agent: agentInfo }), msg.nodeId);
                break;
            }
            // ── leave ──────────────────────────────────────────────────────────────
            case 'leave': {
                leaveRoom(msg.roomId, msg.nodeId);
                this.log(`📤 leave: ${msg.nodeId.slice(0, 8)} ← room:${msg.roomId}`);
                break;
            }
            // ── message ────────────────────────────────────────────────────────────
            case 'message': {
                const { payload } = msg;
                if (this.msgAuth) {
                    const pubKey = getPublicKey(payload.from);
                    if (!pubKey) {
                        ws.send(JSON.stringify({ type: 'error', code: 'UNKNOWN_SENDER', message: 'sender not in room' }));
                        return;
                    }
                    const result = await verifyMessageSignature({
                        messageId: payload.id, content: payload.content,
                        timestamp: payload.timestamp, signature: payload.signature, publicKey: pubKey,
                    });
                    if (!result.ok) {
                        ws.send(JSON.stringify({ type: 'error', code: 'MSG_AUTH_FAILED', message: result.reason ?? 'auth failed' }));
                        return;
                    }
                }
                // v0.9: access policy enforcement
                {
                    const actionType = payload.type === 'proposal' ? 'proposal' : (payload.to ? 'dm' : 'broadcast');
                    const access = dbCheckAccess(payload.from, actionType, payload.room);
                    if (!access.allowed) {
                        ws.send(JSON.stringify({ type: 'error', code: 'ACCESS_DENIED', message: access.reason ?? 'access denied' }));
                        this.log(`🚫 access denied: ${payload.from.slice(0, 8)} ${actionType} → ${access.reason}`);
                        return;
                    }
                    if (payload.room && !dbCheckRateLimit(payload.from, payload.room)) {
                        ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMITED', message: 'rate limit exceeded for this room' }));
                        return;
                    }
                    if (payload.room) {
                        const rules = dbGetRoomRules(payload.room);
                        if (rules?.maxMessageLength && payload.content.length > rules.maxMessageLength) {
                            ws.send(JSON.stringify({ type: 'error', code: 'MSG_TOO_LONG', message: `message exceeds max length ${rules.maxMessageLength}` }));
                            return;
                        }
                        if (rules?.allowedMessageTypes && !rules.allowedMessageTypes.includes(payload.type)) {
                            ws.send(JSON.stringify({ type: 'error', code: 'MSG_TYPE_NOT_ALLOWED', message: `message type '${payload.type}' not allowed in this room` }));
                            return;
                        }
                    }
                }
                if (payload.type !== 'system') {
                    persistMessage(payload);
                    if (payload.to)
                        recordEdge(payload.from, payload.to);
                    else
                        recordEdge(payload.from, `room:${payload.room}`);
                    if (payload.room) {
                        try {
                            dbTrackRoomActivity(payload.room, payload.from);
                        }
                        catch { /* ignore */ }
                    }
                }
                if (!msg.gossiped) {
                    gossipBroadcast(payload);
                }
                const serialized = JSON.stringify(msg);
                if (payload.to) {
                    if (!payload.room) {
                        ws.send(JSON.stringify({ type: 'error', code: 'MISSING_ROOM', message: 'room required for room DM; use dm type for roomless DM' }));
                        return;
                    }
                    const delivered = sendToNode(payload.room, payload.to, serialized);
                    if (!delivered) {
                        ws.send(JSON.stringify({ type: 'error', code: 'DELIVERY_FAILED', message: `target ${payload.to.slice(0, 8)} not in room` }));
                    }
                    this.log(`💬 room-DM: ${payload.from.slice(0, 8)} → ${payload.to.slice(0, 8)} [${payload.room}]`);
                }
                else {
                    if (!payload.room) {
                        ws.send(JSON.stringify({ type: 'error', code: 'MISSING_ROOM', message: 'room required for broadcast' }));
                        return;
                    }
                    broadcast(payload.room, serialized, payload.from);
                    this.log(`📢 broadcast: ${payload.from.slice(0, 8)} [${payload.room}] "${payload.content.slice(0, 50)}"`);
                }
                ws.send(JSON.stringify({ type: 'ack', messageId: payload.id, from: 'relay' }));
                break;
            }
            // ── dm ─────────────────────────────────────────────────────────────────
            case 'dm': {
                const { payload } = msg;
                if (!payload.to) {
                    ws.send(JSON.stringify({ type: 'error', code: 'MISSING_TO', message: 'dm requires to field' }));
                    return;
                }
                if (this.msgAuth) {
                    const pubKey = getPublicKey(payload.from);
                    if (pubKey) {
                        const result = await verifyMessageSignature({
                            messageId: payload.id, content: payload.content,
                            timestamp: payload.timestamp, signature: payload.signature, publicKey: pubKey,
                        });
                        if (!result.ok) {
                            ws.send(JSON.stringify({ type: 'error', code: 'MSG_AUTH_FAILED', message: result.reason ?? 'auth failed' }));
                            return;
                        }
                    }
                }
                persistMessage(payload);
                recordEdge(payload.from, payload.to);
                if (!msg.gossiped) {
                    gossipDm(payload);
                }
                const delivered = sendDirectToNode(payload.to, JSON.stringify(msg));
                if (!delivered) {
                    ws.send(JSON.stringify({ type: 'error', code: 'DELIVERY_FAILED', message: `target ${payload.to.slice(0, 8)} is offline or not connected` }));
                    this.log(`❌ dm failed: ${payload.from.slice(0, 8)} → ${payload.to.slice(0, 8)} (offline)`);
                }
                else {
                    this.log(`📩 dm: ${payload.from.slice(0, 8)} → ${payload.to.slice(0, 8)} "${payload.content.slice(0, 50)}"`);
                }
                ws.send(JSON.stringify({ type: 'ack', messageId: payload.id, from: 'relay' }));
                break;
            }
            // ── relay_announce ─────────────────────────────────────────────────────
            case 'relay_announce': {
                const { address, nodeId } = msg;
                this.announceRelay({ address, nodeId, peerCount: getTotalConnections() });
                addPeer(address);
                ws.send(JSON.stringify({
                    type: 'relay_list',
                    relays: this.getKnownRelays(),
                }));
                break;
            }
            // ── gossip_message ─────────────────────────────────────────────────────
            case 'gossip_message': {
                const payload = msg.payload;
                try {
                    persistMessage(payload);
                }
                catch { /* duplicate, ignore */ }
                if (payload.room) {
                    broadcast(payload.room, JSON.stringify({ type: 'message', payload }), undefined);
                    this.log(`📡 gossip_message delivered to room:${payload.room} from ${payload.from.slice(0, 8)}`);
                }
                break;
            }
            // ── gossip_dm ──────────────────────────────────────────────────────────
            case 'gossip_dm': {
                const payload = msg.payload;
                try {
                    persistMessage(payload);
                }
                catch { /* duplicate, ignore */ }
                if (payload.to) {
                    const delivered = sendDirectToNode(payload.to, JSON.stringify({ type: 'dm', payload }));
                    this.log(`📡 gossip_dm → ${payload.to.slice(0, 8)}: ${delivered ? '✅' : '❌ not connected here'}`);
                }
                break;
            }
            // ── ping ───────────────────────────────────────────────────────────────
            case 'ping': {
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            }
            // ── profile_update ─────────────────────────────────────────────────────
            case 'profile_update': {
                const { profile } = msg;
                const senderNodeId = this.wsToNodeId.get(ws);
                if (!senderNodeId || senderNodeId !== profile.nodeId) {
                    ws.send(JSON.stringify({ type: 'error', code: 'AUTH_FAILED', message: 'can only update your own profile' }));
                    return;
                }
                upsertProfile({
                    nodeId: profile.nodeId,
                    facetName: profile.facetName,
                    declared: profile.declared,
                    observed: undefined,
                    endorsements: undefined,
                    updatedAt: Date.now(),
                });
                if (profile.declared.capabilities) {
                    for (const cap of profile.declared.capabilities) {
                        const ch = this.ensureCapabilityChannel(cap);
                        broadcastGlobal(JSON.stringify({
                            type: 'profile_update',
                            profile: { ...profile, updatedAt: Date.now() },
                        }), senderNodeId);
                        this.log(`📋 profile_update: ${senderNodeId.slice(0, 8)} facet=${profile.facetName} caps=${cap} channel=${ch.roomId}`);
                    }
                }
                this.log(`📋 profile_update: ${senderNodeId.slice(0, 8)} facet=${profile.facetName}`);
                break;
            }
            // ── profile_request ────────────────────────────────────────────────────
            case 'profile_request': {
                const profiles = getProfiles(msg.nodeId, msg.facetName);
                ws.send(JSON.stringify({ type: 'profile_response', profiles }));
                break;
            }
            // ── endorse ────────────────────────────────────────────────────────────
            case 'endorse': {
                const senderNodeId = this.wsToNodeId.get(ws);
                if (!senderNodeId) {
                    ws.send(JSON.stringify({ type: 'error', code: 'NOT_CONNECTED', message: 'must send hello first' }));
                    return;
                }
                const targetProfiles = getProfiles(msg.targetNodeId);
                const facetName = targetProfiles.length > 0 ? targetProfiles[0].facetName : 'default';
                addEndorsement(msg.targetNodeId, facetName, {
                    fromNodeId: senderNodeId,
                    capability: msg.capability,
                    comment: msg.comment,
                    timestamp: msg.timestamp,
                    signature: msg.signature,
                });
                sendDirectToNode(msg.targetNodeId, JSON.stringify({
                    type: 'endorse',
                    targetNodeId: msg.targetNodeId,
                    capability: msg.capability,
                    comment: msg.comment,
                    timestamp: msg.timestamp,
                    signature: msg.signature,
                }));
                this.log(`⭐ endorse: ${senderNodeId.slice(0, 8)} → ${msg.targetNodeId.slice(0, 8)} [${msg.capability}]`);
                break;
            }
            // ── heartbeat ──────────────────────────────────────────────────────────
            case 'heartbeat': {
                const nodeId = this.wsToNodeId.get(ws);
                if (nodeId) {
                    dbUpdateHeartbeat(nodeId);
                    this.log(`💓 heartbeat: ${nodeId.slice(0, 8)}`);
                }
                break;
            }
            // ── intent_match ───────────────────────────────────────────────────────
            case 'intent_match': {
                const senderNodeId = this.wsToNodeId.get(ws);
                if (!senderNodeId) {
                    ws.send(JSON.stringify({ type: 'error', code: 'NOT_CONNECTED', message: 'must send hello first' }));
                    return;
                }
                const intent = dbGetIntent(msg.intentId);
                if (!intent) {
                    ws.send(JSON.stringify({ type: 'error', code: 'NOT_FOUND', message: 'intent not found' }));
                    return;
                }
                if (intent.fromNodeId !== senderNodeId) {
                    ws.send(JSON.stringify({ type: 'error', code: 'AUTH_FAILED', message: 'only intent creator can match' }));
                    return;
                }
                if (intent.status !== 'open') {
                    ws.send(JSON.stringify({ type: 'error', code: 'INVALID_STATE', message: `intent status is ${intent.status}, not open` }));
                    return;
                }
                const matched = dbMatchIntent(msg.intentId, msg.matchedNodeId);
                if (matched) {
                    broadcastGlobal(JSON.stringify({ type: 'intent_matched', intent: matched }));
                    sendDirectToNode(msg.matchedNodeId, JSON.stringify({
                        type: 'intent_matched', intent: matched,
                    }));
                    this.log(`🤝 intent matched: ${msg.intentId} → ${msg.matchedNodeId.slice(0, 8)}`);
                }
                break;
            }
            // ── gossip_ban ─────────────────────────────────────────────────────────
            case 'gossip_ban': {
                const ban = msg.ban;
                if (ban && ban.nodeId) {
                    dbBanAgent(ban.nodeId, ban.bannedBy, ban.reason, ban.expiresAt);
                    broadcastGlobal(JSON.stringify({ type: 'ban', nodeId: ban.nodeId, reason: ban.reason, expiresAt: ban.expiresAt }));
                    this.log(`🚫 gossip ban received: ${ban.nodeId.slice(0, 8)} — ${ban.reason}`);
                }
                break;
            }
            // ── rule_vote ──────────────────────────────────────────────────────────
            case 'rule_vote': {
                const { proposalId, roomId, vote, voter } = msg;
                if (proposalId && roomId && vote && voter) {
                    const rules = dbGetRoomRules(roomId);
                    let weight = 1;
                    if (rules?.governanceModel === 'reputation') {
                        const rep = getReputation(voter);
                        weight = rep?.trustScore ?? 50;
                    }
                    const updated = dbVoteOnProposal(proposalId, voter, vote, weight);
                    if (updated) {
                        broadcast(roomId, JSON.stringify({ type: 'rule_vote', proposalId, roomId, vote, voter }), voter);
                        const result = dbEvaluateProposal(proposalId);
                        if (result === 'passed') {
                            const newRules = dbGetRoomRules(roomId);
                            if (newRules) {
                                broadcast(roomId, JSON.stringify({ type: 'room_rules_update', rules: newRules }));
                                this.log(`📜 proposal ${proposalId} passed via WS vote`);
                            }
                        }
                    }
                }
                break;
            }
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    code: 'UNKNOWN_MSG_TYPE',
                    message: `unknown type: ${msg.type}`,
                }));
        }
    }
    handleWsClose(ws) {
        const nodeId = this.wsToNodeId.get(ws);
        if (nodeId) {
            leaveAllRooms(nodeId);
            unregisterConnection(nodeId);
            setOffline(nodeId);
            if (!this.isShuttingDown) {
                try {
                    dbSetOnline(nodeId, false);
                }
                catch { /* ignore */ }
                try {
                    dbSetAgentStatus(nodeId, 'offline');
                }
                catch { /* ignore */ }
                try {
                    recalculateReputation(nodeId);
                }
                catch { /* ignore */ }
                try {
                    broadcastGlobal(JSON.stringify({ type: 'agent_status', nodeId, status: 'offline' }));
                }
                catch { /* ignore */ }
                this.log(`👋 disconnected: ${nodeId.slice(0, 8)}`);
                broadcastGlobal(JSON.stringify({ type: 'agent_left', nodeId }));
            }
        }
    }
}
//# sourceMappingURL=relay.js.map