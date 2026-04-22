/**
 * Tinker Relay — SQLite 持久化层 v0.9
 *
 * 表：
 *   messages              — 消息记录（最多保留最近 MAX_MESSAGES 条，超出自动滚动删除）
 *   agents                — Agent 注册表
 *   edges                 — Agent 交互关系图谱
 *   agent_profiles        — Agent Profile（v0.7）
 *   reputation            — 声誉分数（v0.7）
 *   capability_channels   — 能力频道（v0.7）
 *   intents               — 意图广场（v0.8）
 *   room_activity          — Room 活跃度窗口（v0.8）
 *   bans                  — 分布式黑名单（v0.9）
 *   room_rules            — Room 自治规则（v0.9）
 *   rule_proposals        — 规则修改提案（v0.9）
 *   rule_votes            — 提案投票记录（v0.9）
 *
 * DB 文件位置：DATA_DIR 环境变量 / 默认 ~/.tinker/relay.db
 */
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { DEFAULT_ACCESS_POLICY } from './types.js';
// ─── 配置 ──────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR ?? join(homedir(), '.tinker');
const DB_FILE = process.env.DB_FILE ?? join(DATA_DIR, 'relay.db');
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES ?? '1000', 10);
// ─── 初始化 ────────────────────────────────────────────────────────────────
if (!existsSync(DATA_DIR))
    mkdirSync(DATA_DIR, { recursive: true });
export const db = new Database(DB_FILE);
// WAL 模式：并发读写更快
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
// ── 建表 ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    rowid    INTEGER PRIMARY KEY AUTOINCREMENT,
    id       TEXT NOT NULL UNIQUE,
    type     TEXT NOT NULL DEFAULT 'text',
    from_id  TEXT NOT NULL,
    to_id    TEXT,
    room     TEXT,
    content  TEXT NOT NULL,
    attachment TEXT,     -- JSON 或 NULL
    timestamp INTEGER NOT NULL,
    signature TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room      ON messages(room);
  CREATE INDEX IF NOT EXISTS idx_messages_from_to   ON messages(from_id, to_id);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

  -- Agent 关系边：记录任意两个 Agent 之间的交互次数和最近交互时间
  CREATE TABLE IF NOT EXISTS edges (
    source_id    TEXT NOT NULL,
    target_id    TEXT NOT NULL,
    weight       INTEGER NOT NULL DEFAULT 1,   -- 交互次数
    last_active  INTEGER NOT NULL,             -- 最近一次交互 timestamp
    PRIMARY KEY (source_id, target_id)
  );

  CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
  CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);

  CREATE TABLE IF NOT EXISTS agents (
    node_id       TEXT PRIMARY KEY,
    public_key    TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT,
    capabilities  TEXT,   -- JSON array 或 NULL
    online        INTEGER NOT NULL DEFAULT 0,
    registered_at INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL
  );

  -- v0.7: Agent Profile (three-source model)
  CREATE TABLE IF NOT EXISTS agent_profiles (
    node_id      TEXT NOT NULL,
    facet_name   TEXT NOT NULL,
    declared     TEXT NOT NULL,    -- JSON
    observed     TEXT,             -- JSON (relay-computed)
    endorsements TEXT,             -- JSON array
    updated_at   INTEGER NOT NULL,
    PRIMARY KEY (node_id, facet_name)
  );

  -- v0.7: Reputation (decentralized, per-relay)
  CREATE TABLE IF NOT EXISTS reputation (
    node_id            TEXT PRIMARY KEY,
    trust_score        REAL NOT NULL DEFAULT 50,
    activity_score     REAL NOT NULL DEFAULT 0,
    success_rate       REAL NOT NULL DEFAULT 0,
    response_rate      REAL NOT NULL DEFAULT 0,
    avg_response_ms    REAL NOT NULL DEFAULT 0,
    peer_ratings       REAL NOT NULL DEFAULT 50,
    total_interactions INTEGER NOT NULL DEFAULT 0,
    updated_at         INTEGER NOT NULL,
    decay_factor       REAL NOT NULL DEFAULT 1.0
  );

  -- v0.7: Capability channels
  CREATE TABLE IF NOT EXISTS capability_channels (
    room_id     TEXT PRIMARY KEY,  -- '#cap:coupon.issue'
    capability  TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  -- v0.8: Intents (意图广场)
  CREATE TABLE IF NOT EXISTS intents (
    intent_id    TEXT PRIMARY KEY,
    from_node_id TEXT NOT NULL,
    capability   TEXT NOT NULL,
    description  TEXT NOT NULL,
    constraints  TEXT,                -- JSON or NULL
    ttl_ms       INTEGER NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open',  -- open/matched/closed/expired
    created_at   INTEGER NOT NULL,
    matched_by   TEXT,
    matched_at   INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_intents_status     ON intents(status);
  CREATE INDEX IF NOT EXISTS idx_intents_capability ON intents(capability);

  -- v0.8: Room activity windows (话题涌现)
  CREATE TABLE IF NOT EXISTS room_activity (
    room_id        TEXT NOT NULL,
    window_start   INTEGER NOT NULL,
    message_count  INTEGER NOT NULL DEFAULT 0,
    unique_senders TEXT NOT NULL DEFAULT '[]',  -- JSON array of nodeId strings
    PRIMARY KEY (room_id, window_start)
  );

  CREATE INDEX IF NOT EXISTS idx_room_activity_window ON room_activity(window_start);

  -- v0.9: Bans (分布式黑名单)
  CREATE TABLE IF NOT EXISTS bans (
    node_id     TEXT PRIMARY KEY,
    banned_by   TEXT NOT NULL,
    reason      TEXT NOT NULL,
    banned_at   INTEGER NOT NULL,
    expires_at  INTEGER              -- NULL = 永久
  );

  -- v0.9: Room rules (Room 自治)
  CREATE TABLE IF NOT EXISTS room_rules (
    room_id              TEXT PRIMARY KEY,
    creator              TEXT NOT NULL,
    min_trust            REAL NOT NULL DEFAULT 0,
    allowed_roles        TEXT,          -- JSON array or NULL
    invite_only          INTEGER NOT NULL DEFAULT 0,
    allowed_message_types TEXT,         -- JSON array or NULL
    max_message_length   INTEGER,
    rate_limit           INTEGER,       -- per minute
    governance_model     TEXT NOT NULL DEFAULT 'creator',
    rule_change_threshold REAL,
    updated_at           INTEGER NOT NULL
  );

  -- v0.9: Rule proposals (规则提案)
  CREATE TABLE IF NOT EXISTS rule_proposals (
    proposal_id  TEXT PRIMARY KEY,
    room_id      TEXT NOT NULL,
    proposed_by  TEXT NOT NULL,
    changes      TEXT NOT NULL,         -- JSON
    status       TEXT NOT NULL DEFAULT 'open',
    votes_for    INTEGER NOT NULL DEFAULT 0,
    votes_against INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    expires_at   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_proposals_room   ON rule_proposals(room_id, status);

  -- v0.9: Rule votes (投票记录)
  CREATE TABLE IF NOT EXISTS rule_votes (
    proposal_id  TEXT NOT NULL,
    voter        TEXT NOT NULL,
    vote         TEXT NOT NULL,          -- 'for' | 'against'
    weight       REAL NOT NULL DEFAULT 1,
    voted_at     INTEGER NOT NULL,
    PRIMARY KEY (proposal_id, voter)
  );
`);
// ─── v0.8 迁移：给 agents 表加 last_heartbeat_at 列 ─────────────────────
try {
    db.exec(`ALTER TABLE agents ADD COLUMN last_heartbeat_at INTEGER NOT NULL DEFAULT 0`);
}
catch { /* column already exists, ignore */ }
try {
    db.exec(`ALTER TABLE agents ADD COLUMN status TEXT NOT NULL DEFAULT 'offline'`);
}
catch { /* column already exists, ignore */ }
// ─── 消息操作 ──────────────────────────────────────────────────────────────
const stmtInsertMessage = db.prepare(`
  INSERT OR IGNORE INTO messages
    (id, type, from_id, to_id, room, content, attachment, timestamp, signature)
  VALUES
    (@id, @type, @from_id, @to_id, @room, @content, @attachment, @timestamp, @signature)
`);
const stmtPruneMessages = db.prepare(`
  DELETE FROM messages
  WHERE rowid NOT IN (
    SELECT rowid FROM messages ORDER BY rowid DESC LIMIT ${MAX_MESSAGES}
  )
`);
/** 持久化一条消息（超出 MAX_MESSAGES 自动裁剪） */
export function persistMessage(msg) {
    stmtInsertMessage.run({
        id: msg.id,
        type: msg.type,
        from_id: msg.from,
        to_id: msg.to ?? null,
        room: msg.room ?? null,
        content: msg.content,
        attachment: msg.attachment ? JSON.stringify(msg.attachment) : null,
        timestamp: msg.timestamp,
        signature: msg.signature,
    });
    stmtPruneMessages.run();
}
/** 查询 room 历史消息（从旧到新） */
export function getRoomHistory(roomId, limit = 50) {
    const rows = db.prepare(`
    SELECT * FROM messages
    WHERE room = ?
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(roomId, limit);
    return rows.map(rowToMessage);
}
/** 查询两个 Agent 之间的私信历史（双向） */
export function getDmHistory(nodeIdA, nodeIdB, limit = 50) {
    const rows = db.prepare(`
    SELECT * FROM messages
    WHERE room IS NULL
      AND (
        (from_id = ? AND to_id = ?)
        OR
        (from_id = ? AND to_id = ?)
      )
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(nodeIdA, nodeIdB, nodeIdB, nodeIdA, limit);
    return rows.map(rowToMessage);
}
/** 查询某 Agent 的最近消息（发送 + 接收） */
export function getAgentHistory(nodeId, limit = 50) {
    const rows = db.prepare(`
    SELECT * FROM messages
    WHERE from_id = ? OR to_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(nodeId, nodeId, limit);
    return rows.map(rowToMessage).reverse();
}
// ─── Agent 操作 ────────────────────────────────────────────────────────────
const stmtUpsertAgent = db.prepare(`
  INSERT INTO agents
    (node_id, public_key, display_name, role, capabilities, online, registered_at, last_seen_at)
  VALUES
    (@nodeId, @publicKey, @displayName, @role, @capabilities, @online, @registeredAt, @lastSeenAt)
  ON CONFLICT(node_id) DO UPDATE SET
    public_key   = excluded.public_key,
    display_name = excluded.display_name,
    role         = excluded.role,
    capabilities = excluded.capabilities,
    online       = excluded.online,
    last_seen_at = excluded.last_seen_at
`);
const stmtSetAgentOnline = db.prepare(`
  UPDATE agents SET online = ?, last_seen_at = ? WHERE node_id = ?
`);
const stmtGetAgent = db.prepare(`SELECT * FROM agents WHERE node_id = ?`);
const stmtGetAllAgents = db.prepare(`SELECT * FROM agents ORDER BY last_seen_at DESC`);
const stmtFindAgents = (role, capability) => {
    let sql = `SELECT * FROM agents WHERE 1=1`;
    const params = [];
    if (role) {
        sql += ` AND role = ?`;
        params.push(role);
    }
    if (capability) {
        // capabilities 存 JSON 数组，用 LIKE 模糊匹配（简单可靠）
        sql += ` AND capabilities LIKE ?`;
        params.push(`%"${capability}"%`);
    }
    sql += ` ORDER BY last_seen_at DESC`;
    return db.prepare(sql).all(...params);
};
/** 注册或更新 Agent */
export function upsertAgent(info) {
    stmtUpsertAgent.run({
        nodeId: info.nodeId,
        publicKey: info.publicKey,
        displayName: info.displayName,
        role: info.role ?? null,
        capabilities: info.capabilities ? JSON.stringify(info.capabilities) : null,
        online: info.online ? 1 : 0,
        registeredAt: Date.now(),
        lastSeenAt: Date.now(),
    });
}
/** 设置 Agent 在线/离线 */
export function dbSetOnline(nodeId, online) {
    stmtSetAgentOnline.run(online ? 1 : 0, Date.now(), nodeId);
}
// ─── 关系图谱操作 ──────────────────────────────────────────────────────────
const stmtUpsertEdge = db.prepare(`
  INSERT INTO edges (source_id, target_id, weight, last_active)
  VALUES (@source, @target, 1, @ts)
  ON CONFLICT(source_id, target_id) DO UPDATE SET
    weight      = weight + 1,
    last_active = excluded.last_active
`);
/** 记录一次交互关系（发消息时调用，双方各增权重） */
export function recordEdge(fromId, toId) {
    const ts = Date.now();
    stmtUpsertEdge.run({ source: fromId, target: toId, ts });
    // 无向图：双向都记，前端渲染时可做合并
    stmtUpsertEdge.run({ source: toId, target: fromId, ts });
}
/** 获取完整图谱数据（所有 Agent 节点 + 所有关系边） */
export function getGraphData() {
    const nodes = stmtGetAllAgents.all().map(rowToAgentInfo);
    const edgeRows = db.prepare(`
    SELECT source_id, target_id, weight, last_active
    FROM edges
    ORDER BY weight DESC
  `).all();
    const edges = edgeRows.map(r => ({
        source: r.source_id,
        target: r.target_id,
        weight: r.weight,
        lastActive: r.last_active,
    }));
    return { nodes, edges };
}
/** 获取某 Agent 的直接邻居（交互过的 Agent） */
export function getAgentNeighbors(nodeId) {
    const rows = db.prepare(`
    SELECT e.target_id, e.weight, a.*
    FROM edges e
    LEFT JOIN agents a ON a.node_id = e.target_id
    WHERE e.source_id = ?
    ORDER BY e.weight DESC
  `).all(nodeId);
    return rows
        .filter(r => r.node_id)
        .map(r => ({ neighbor: rowToAgentInfo(r), weight: r.weight }));
}
// ─── Agent 操作 ────────────────────────────────────────────────────────────
/** 获取单个 Agent */
export function dbGetAgent(nodeId) {
    const row = stmtGetAgent.get(nodeId);
    return row ? rowToAgentInfo(row) : null;
}
/** 获取所有 Agent */
export function dbGetAllAgents() {
    return stmtGetAllAgents.all().map(rowToAgentInfo);
}
/** 按条件筛选 Agent */
export function dbFindAgents(filter) {
    return stmtFindAgents(filter.role, filter.capability).map(rowToAgentInfo);
}
/** Relay 启动时加载所有 Agent 到内存注册表 */
export function loadPersistedAgents() {
    const rows = stmtGetAllAgents.all();
    // 重启后所有 Agent 标记为离线
    db.prepare(`UPDATE agents SET online = 0`).run();
    return rows.map(rowToAgentInfo);
}
// ─── Agent Profile 操作（v0.7）────────────────────────────────────────────
const stmtUpsertProfile = db.prepare(`
  INSERT INTO agent_profiles (node_id, facet_name, declared, observed, endorsements, updated_at)
  VALUES (@nodeId, @facetName, @declared, @observed, @endorsements, @updatedAt)
  ON CONFLICT(node_id, facet_name) DO UPDATE SET
    declared     = excluded.declared,
    observed     = COALESCE(excluded.observed, observed),
    endorsements = COALESCE(excluded.endorsements, endorsements),
    updated_at   = excluded.updated_at
`);
const stmtGetProfiles = db.prepare(`
  SELECT * FROM agent_profiles WHERE node_id = ? ORDER BY facet_name ASC
`);
const stmtGetProfile = db.prepare(`
  SELECT * FROM agent_profiles WHERE node_id = ? AND facet_name = ?
`);
const stmtGetProfileEndorsements = db.prepare(`
  SELECT endorsements FROM agent_profiles WHERE node_id = ? AND facet_name = ?
`);
const stmtSetProfileEndorsements = db.prepare(`
  UPDATE agent_profiles SET endorsements = ?, updated_at = ? WHERE node_id = ? AND facet_name = ?
`);
const stmtSetProfileObserved = db.prepare(`
  UPDATE agent_profiles SET observed = ?, updated_at = ? WHERE node_id = ? AND facet_name = ?
`);
export function upsertProfile(profile) {
    stmtUpsertProfile.run({
        nodeId: profile.nodeId,
        facetName: profile.facetName,
        declared: JSON.stringify(profile.declared),
        observed: profile.observed ? JSON.stringify(profile.observed) : null,
        endorsements: profile.endorsements ? JSON.stringify(profile.endorsements) : null,
        updatedAt: profile.updatedAt,
    });
}
export function getProfiles(nodeId, facetName) {
    const rows = facetName
        ? [stmtGetProfile.get(nodeId, facetName)].filter(Boolean)
        : stmtGetProfiles.all(nodeId);
    return rows.map(rowToProfile);
}
export function addEndorsement(nodeId, facetName, endorsement) {
    const row = stmtGetProfileEndorsements.get(nodeId, facetName);
    if (!row)
        return; // profile doesn't exist
    const existing = row.endorsements ? JSON.parse(row.endorsements) : [];
    const updated = [...(existing ?? []), endorsement];
    stmtSetProfileEndorsements.run(JSON.stringify(updated), Date.now(), nodeId, facetName);
}
export function updateObserved(nodeId, facetName, observed) {
    stmtSetProfileObserved.run(JSON.stringify(observed), Date.now(), nodeId, facetName);
}
// ─── Reputation 操作（v0.7）───────────────────────────────────────────────
const stmtGetReputation = db.prepare(`
  SELECT * FROM reputation WHERE node_id = ?
`);
const stmtUpsertReputation = db.prepare(`
  INSERT INTO reputation
    (node_id, trust_score, activity_score, success_rate, response_rate, avg_response_ms, peer_ratings, total_interactions, updated_at, decay_factor)
  VALUES
    (@nodeId, @trustScore, @activityScore, @successRate, @responseRate, @avgResponseMs, @peerRatings, @totalInteractions, @lastUpdated, @decayFactor)
  ON CONFLICT(node_id) DO UPDATE SET
    trust_score        = excluded.trust_score,
    activity_score     = excluded.activity_score,
    success_rate       = excluded.success_rate,
    response_rate      = excluded.response_rate,
    avg_response_ms    = excluded.avg_response_ms,
    peer_ratings       = excluded.peer_ratings,
    total_interactions = excluded.total_interactions,
    updated_at         = excluded.updated_at,
    decay_factor       = excluded.decay_factor
`);
const stmtGetAllReputations = db.prepare(`
  SELECT * FROM reputation ORDER BY trust_score DESC
`);
export function getReputation(nodeId) {
    const row = stmtGetReputation.get(nodeId);
    return row ? rowToReputation(row) : null;
}
export function upsertReputation(rep) {
    stmtUpsertReputation.run({
        nodeId: rep.nodeId,
        trustScore: rep.trustScore,
        activityScore: rep.activityScore,
        successRate: rep.successRate,
        responseRate: rep.responseRate,
        avgResponseMs: rep.avgResponseMs,
        peerRatings: rep.peerRatings,
        totalInteractions: rep.totalInteractions,
        lastUpdated: rep.lastUpdated,
        decayFactor: rep.decayFactor,
    });
}
export function getAllReputations(minTrust) {
    const rows = stmtGetAllReputations.all();
    const scores = rows.map(rowToReputation);
    if (minTrust !== undefined)
        return scores.filter(s => s.trustScore >= minTrust);
    return scores;
}
/**
 * Recalculate reputation for a node based on:
 * - activityScore: message count in last 7 days, normalized 0-100 (100 = 100+ msgs)
 * - successRate: derived from edge weight (interactions)
 * - responseRate: derived from dm interactions vs total interactions
 * - peerRatings: weighted average from endorsements (fallback to 50)
 * - decayFactor: -2% per 24h inactive (min 0.5)
 * - trustScore = 0.4*successRate*100 + 0.3*responseRate*100 + 0.2*peerRatings + 0.1*activityScore
 */
export function recalculateReputation(nodeId) {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    // Activity: message count in last 7 days
    const msgCountRow = db.prepare(`
    SELECT COUNT(*) as c FROM messages WHERE from_id = ? AND timestamp > ?
  `).get(nodeId, sevenDaysAgo);
    const msgCount = msgCountRow.c;
    const activityScore = Math.min(msgCount, 100); // normalize: 100+ msgs = 100
    // Total interactions from edges (outgoing)
    const edgeRow = db.prepare(`
    SELECT COALESCE(SUM(weight), 0) as total FROM edges WHERE source_id = ?
  `).get(nodeId);
    const totalInteractions = edgeRow.total;
    // Success rate: if agent has any interactions, assume successful (basic heuristic)
    const successRate = totalInteractions > 0 ? Math.min(totalInteractions / (totalInteractions + 1), 1.0) : 0;
    // Response rate: ratio of dm interactions (incoming dm responses) to incoming dms
    const dmSentRow = db.prepare(`
    SELECT COUNT(*) as c FROM messages WHERE to_id = ? AND room IS NULL AND timestamp > ?
  `).get(nodeId, sevenDaysAgo);
    const dmReceivedRow = db.prepare(`
    SELECT COUNT(*) as c FROM messages WHERE from_id = ? AND to_id IS NOT NULL AND room IS NULL AND timestamp > ?
  `).get(nodeId, sevenDaysAgo);
    const responseRate = dmSentRow.c > 0 ? Math.min(dmReceivedRow.c / dmSentRow.c, 1.0) : 0;
    // Peer ratings: average of endorsements across all profiles
    const profileRows = stmtGetProfiles.all(nodeId);
    let endorsementCount = 0;
    let endorsementSum = 0;
    for (const row of profileRows) {
        const endorsements = row.endorsements ? JSON.parse(row.endorsements) : [];
        if (endorsements && endorsements.length > 0) {
            endorsementCount += endorsements.length;
            endorsementSum += endorsements.length * 75; // each endorsement contributes 75 base rating
        }
    }
    const peerRatings = endorsementCount > 0 ? endorsementSum / endorsementCount : 50;
    // Decay factor: -2% per 24h inactive (min 0.5)
    const lastMsgRow = db.prepare(`
    SELECT MAX(timestamp) as last FROM messages WHERE from_id = ?
  `).get(nodeId);
    const lastActive = lastMsgRow.last ?? 0;
    const hoursInactive = lastActive > 0 ? (now - lastActive) / (60 * 60 * 1000) : 0;
    const daysInactive = hoursInactive / 24;
    const decayFactor = Math.max(0.5, 1.0 - daysInactive * 0.02);
    // Trust score formula
    const trustScore = Math.min(100, Math.max(0, 0.4 * successRate * 100 +
        0.3 * responseRate * 100 +
        0.2 * peerRatings +
        0.1 * activityScore));
    const rep = {
        nodeId,
        trustScore,
        activityScore,
        successRate,
        responseRate,
        avgResponseMs: 0, // not tracked yet, v0.8
        peerRatings,
        totalInteractions,
        lastUpdated: now,
        decayFactor,
    };
    upsertReputation(rep);
    return rep;
}
// ─── Capability Channel 操作（v0.7）──────────────────────────────────────
const stmtUpsertCapabilityChannel = db.prepare(`
  INSERT INTO capability_channels (room_id, capability, description, created_at, updated_at)
  VALUES (@roomId, @capability, @description, @createdAt, @updatedAt)
  ON CONFLICT(capability) DO UPDATE SET
    description = COALESCE(excluded.description, description),
    updated_at  = excluded.updated_at
`);
const stmtGetAllCapabilityChannels = db.prepare(`
  SELECT * FROM capability_channels ORDER BY capability ASC
`);
const stmtGetCapabilityChannel = db.prepare(`
  SELECT * FROM capability_channels WHERE capability = ?
`);
export function upsertCapabilityChannel(channel) {
    stmtUpsertCapabilityChannel.run({
        roomId: channel.roomId,
        capability: channel.capability,
        description: channel.description ?? null,
        createdAt: channel.createdAt,
        updatedAt: Date.now(),
    });
}
export function getCapabilityChannels() {
    const rows = stmtGetAllCapabilityChannels.all();
    return rows.map(rowToCapabilityChannel);
}
export function getCapabilityChannel(capability) {
    const row = stmtGetCapabilityChannel.get(capability);
    return row ? rowToCapabilityChannel(row) : null;
}
function rowToMessage(row) {
    return {
        id: row.id,
        type: row.type,
        from: row.from_id,
        to: row.to_id ?? undefined,
        room: row.room ?? undefined,
        content: row.content,
        attachment: row.attachment ? JSON.parse(row.attachment) : undefined,
        timestamp: row.timestamp,
        signature: row.signature,
    };
}
function rowToAgentInfo(row) {
    const status = (row.status || (row.online === 1 ? 'active' : 'offline'));
    return {
        nodeId: row.node_id,
        displayName: row.display_name,
        role: row.role ?? undefined,
        capabilities: row.capabilities ? JSON.parse(row.capabilities) : undefined,
        online: status !== 'offline',
        status,
        registeredAt: row.registered_at,
    };
}
function rowToProfile(row) {
    return {
        nodeId: row.node_id,
        facetName: row.facet_name,
        declared: JSON.parse(row.declared),
        observed: row.observed ? JSON.parse(row.observed) : undefined,
        endorsements: row.endorsements ? JSON.parse(row.endorsements) : undefined,
        updatedAt: row.updated_at,
    };
}
function rowToReputation(row) {
    return {
        nodeId: row.node_id,
        trustScore: row.trust_score,
        activityScore: row.activity_score,
        successRate: row.success_rate,
        responseRate: row.response_rate,
        avgResponseMs: row.avg_response_ms,
        peerRatings: row.peer_ratings,
        totalInteractions: row.total_interactions,
        lastUpdated: row.updated_at,
        decayFactor: row.decay_factor,
    };
}
function rowToCapabilityChannel(row) {
    return {
        roomId: row.room_id,
        capability: row.capability,
        memberCount: 0, // runtime value, not persisted
        description: row.description ?? undefined,
        createdAt: row.created_at,
    };
}
// ─── v0.8: Heartbeat 操作 ──────────────────────────────────────────────────
const stmtUpdateHeartbeat = db.prepare(`
  UPDATE agents SET last_heartbeat_at = ?, status = 'active', online = 1, last_seen_at = ? WHERE node_id = ?
`);
const stmtSetAgentStatus = db.prepare(`
  UPDATE agents SET status = ?, online = ? WHERE node_id = ?
`);
const stmtGetStaleAgents = db.prepare(`
  SELECT * FROM agents WHERE status = 'active' AND last_heartbeat_at > 0 AND last_heartbeat_at < ?
`);
const stmtGetAllActiveAgents = db.prepare(`
  SELECT * FROM agents WHERE status IN ('active', 'stale') ORDER BY last_seen_at DESC
`);
/** 更新 Agent 心跳时间戳，标记为 active */
export function dbUpdateHeartbeat(nodeId) {
    const now = Date.now();
    stmtUpdateHeartbeat.run(now, now, nodeId);
}
/** 设置 Agent 状态 */
export function dbSetAgentStatus(nodeId, status) {
    stmtSetAgentStatus.run(status, status !== 'offline' ? 1 : 0, nodeId);
}
/** 获取应标记为 stale 的 Agent（心跳超时） */
export function dbGetStaleAgents(thresholdMs) {
    const cutoff = Date.now() - thresholdMs;
    return stmtGetStaleAgents.all(cutoff).map(rowToAgentInfo);
}
/** 获取 Agent 健康状态摘要 */
export function dbGetAgentHealthSummary() {
    const active = db.prepare(`SELECT COUNT(*) as c FROM agents WHERE status = 'active'`).get().c;
    const stale = db.prepare(`SELECT COUNT(*) as c FROM agents WHERE status = 'stale'`).get().c;
    const offline = db.prepare(`SELECT COUNT(*) as c FROM agents WHERE status = 'offline'`).get().c;
    return { active, stale, offline };
}
function rowToIntent(row) {
    return {
        intentId: row.intent_id,
        fromNodeId: row.from_node_id,
        capability: row.capability,
        description: row.description,
        constraints: row.constraints ? JSON.parse(row.constraints) : undefined,
        ttlMs: row.ttl_ms,
        status: row.status,
        createdAt: row.created_at,
        matchedBy: row.matched_by ?? undefined,
        matchedAt: row.matched_at ?? undefined,
    };
}
const stmtInsertIntent = db.prepare(`
  INSERT INTO intents (intent_id, from_node_id, capability, description, constraints, ttl_ms, status, created_at)
  VALUES (@intentId, @fromNodeId, @capability, @description, @constraints, @ttlMs, 'open', @createdAt)
`);
const stmtGetIntent = db.prepare(`SELECT * FROM intents WHERE intent_id = ?`);
const stmtGetOpenIntents = db.prepare(`
  SELECT * FROM intents WHERE status = 'open' ORDER BY created_at DESC
`);
const stmtMatchIntent = db.prepare(`
  UPDATE intents SET status = 'matched', matched_by = ?, matched_at = ? WHERE intent_id = ? AND status = 'open'
`);
const stmtExpireIntents = db.prepare(`
  UPDATE intents SET status = 'expired' WHERE status = 'open' AND (created_at + ttl_ms) < ?
  RETURNING *
`);
export function dbCreateIntent(intent) {
    stmtInsertIntent.run({
        intentId: intent.intentId,
        fromNodeId: intent.fromNodeId,
        capability: intent.capability,
        description: intent.description,
        constraints: intent.constraints ? JSON.stringify(intent.constraints) : null,
        ttlMs: intent.ttlMs,
        createdAt: intent.createdAt,
    });
}
export function dbGetIntent(intentId) {
    const row = stmtGetIntent.get(intentId);
    return row ? rowToIntent(row) : null;
}
export function dbGetOpenIntents() {
    return stmtGetOpenIntents.all().map(rowToIntent);
}
export function dbMatchIntent(intentId, matchedNodeId) {
    const now = Date.now();
    stmtMatchIntent.run(matchedNodeId, now, intentId);
    return dbGetIntent(intentId);
}
/** 过期所有超时的意图，返回被过期的意图列表 */
export function dbExpireIntents() {
    const now = Date.now();
    const rows = stmtExpireIntents.all(now);
    return rows.map(rowToIntent);
}
// ─── v0.8: Room Activity 操作（话题涌现）───────────────────────────────────
const WINDOW_SIZE_MS = 10 * 60 * 1000; // 10 分钟窗口
const stmtUpsertRoomActivity = db.prepare(`
  INSERT INTO room_activity (room_id, window_start, message_count, unique_senders)
  VALUES (@roomId, @windowStart, 1, @senders)
  ON CONFLICT(room_id, window_start) DO UPDATE SET
    message_count  = message_count + 1,
    unique_senders = @senders
`);
const stmtGetRoomActivityWindow = db.prepare(`
  SELECT * FROM room_activity WHERE room_id = ? AND window_start = ?
`);
const stmtGetTrendingRooms = db.prepare(`
  SELECT room_id, SUM(message_count) as total_msgs, window_start
  FROM room_activity
  WHERE window_start >= ?
  GROUP BY room_id
  HAVING total_msgs >= ?
  ORDER BY total_msgs DESC
`);
const stmtCleanOldActivity = db.prepare(`
  DELETE FROM room_activity WHERE window_start < ?
`);
/** 记录一条消息到 room 的活跃度窗口 */
export function dbTrackRoomActivity(roomId, senderNodeId) {
    const windowStart = Math.floor(Date.now() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
    // 获取当前窗口的 unique senders
    const existing = stmtGetRoomActivityWindow.get(roomId, windowStart);
    let senders;
    if (existing) {
        senders = JSON.parse(existing.unique_senders);
        if (!senders.includes(senderNodeId))
            senders.push(senderNodeId);
    }
    else {
        senders = [senderNodeId];
    }
    stmtUpsertRoomActivity.run({
        roomId,
        windowStart,
        senders: JSON.stringify(senders),
    });
}
/** 获取当前热门 room（10 分钟窗口内消息数 >= threshold） */
export function dbGetTrendingRooms(threshold = 20) {
    const windowCutoff = Date.now() - WINDOW_SIZE_MS;
    const rows = stmtGetTrendingRooms.all(windowCutoff, threshold);
    return rows.map(r => {
        // 获取该 room 在当前窗口的 unique senders
        const windowStart = Math.floor(Date.now() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
        const actRow = stmtGetRoomActivityWindow.get(r.room_id, windowStart);
        const senders = actRow ? JSON.parse(actRow.unique_senders) : [];
        return {
            roomId: r.room_id,
            messageCount: r.total_msgs,
            uniqueSenders: senders.length,
            windowStart: windowStart,
        };
    });
}
/** 清理过期的活跃度窗口数据（保留最近 1 小时） */
export function dbCleanOldActivity() {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 小时前
    stmtCleanOldActivity.run(cutoff);
}
// ═══════════════════════════════════════════════════════════════════════════
// v0.9: Governance Layer — Bans / Room Rules / Proposals / Votes
// ═══════════════════════════════════════════════════════════════════════════
// ─── Bans ──────────────────────────────────────────────────────────────────
const stmtInsertBan = db.prepare(`
  INSERT OR REPLACE INTO bans (node_id, banned_by, reason, banned_at, expires_at)
  VALUES (@nodeId, @bannedBy, @reason, @bannedAt, @expiresAt)
`);
const stmtDeleteBan = db.prepare(`DELETE FROM bans WHERE node_id = ?`);
const stmtGetBan = db.prepare(`SELECT * FROM bans WHERE node_id = ?`);
const stmtGetAllBans = db.prepare(`SELECT * FROM bans`);
const stmtCleanExpiredBans = db.prepare(`DELETE FROM bans WHERE expires_at IS NOT NULL AND expires_at < ?`);
export function dbBanAgent(nodeId, bannedBy, reason, expiresAt) {
    const now = Date.now();
    stmtInsertBan.run({ nodeId, bannedBy, reason, bannedAt: now, expiresAt: expiresAt ?? null });
    return { nodeId, bannedBy, reason, bannedAt: now, expiresAt };
}
export function dbUnbanAgent(nodeId) {
    stmtDeleteBan.run(nodeId);
}
export function dbGetBan(nodeId) {
    const row = stmtGetBan.get(nodeId);
    if (!row)
        return undefined;
    return { nodeId: row.node_id, bannedBy: row.banned_by, reason: row.reason, bannedAt: row.banned_at, expiresAt: row.expires_at ?? undefined };
}
export function dbIsBanned(nodeId) {
    const ban = dbGetBan(nodeId);
    if (!ban)
        return false;
    // Check expiry
    if (ban.expiresAt && ban.expiresAt < Date.now()) {
        stmtDeleteBan.run(nodeId);
        return false;
    }
    return true;
}
export function dbGetAllBans() {
    const rows = stmtGetAllBans.all();
    return rows.map(r => ({ nodeId: r.node_id, bannedBy: r.banned_by, reason: r.reason, bannedAt: r.banned_at, expiresAt: r.expires_at ?? undefined }));
}
export function dbCleanExpiredBans() {
    const result = stmtCleanExpiredBans.run(Date.now());
    return result.changes;
}
// ─── Room Rules ────────────────────────────────────────────────────────────
const stmtUpsertRoomRules = db.prepare(`
  INSERT OR REPLACE INTO room_rules
    (room_id, creator, min_trust, allowed_roles, invite_only, allowed_message_types, max_message_length, rate_limit, governance_model, rule_change_threshold, updated_at)
  VALUES
    (@roomId, @creator, @minTrust, @allowedRoles, @inviteOnly, @allowedMessageTypes, @maxMessageLength, @rateLimit, @governanceModel, @ruleChangeThreshold, @updatedAt)
`);
const stmtGetRoomRules = db.prepare(`SELECT * FROM room_rules WHERE room_id = ?`);
const stmtDeleteRoomRules = db.prepare(`DELETE FROM room_rules WHERE room_id = ?`);
function rowToRoomRules(row) {
    return {
        roomId: row.room_id,
        creator: row.creator,
        minTrust: row.min_trust,
        allowedRoles: row.allowed_roles ? JSON.parse(row.allowed_roles) : undefined,
        inviteOnly: row.invite_only === 1,
        allowedMessageTypes: row.allowed_message_types ? JSON.parse(row.allowed_message_types) : undefined,
        maxMessageLength: row.max_message_length ?? undefined,
        rateLimit: row.rate_limit ?? undefined,
        governanceModel: row.governance_model,
        ruleChangeThreshold: row.rule_change_threshold ?? undefined,
        updatedAt: row.updated_at,
    };
}
export function dbSetRoomRules(rules) {
    stmtUpsertRoomRules.run({
        roomId: rules.roomId,
        creator: rules.creator,
        minTrust: rules.minTrust,
        allowedRoles: rules.allowedRoles ? JSON.stringify(rules.allowedRoles) : null,
        inviteOnly: rules.inviteOnly ? 1 : 0,
        allowedMessageTypes: rules.allowedMessageTypes ? JSON.stringify(rules.allowedMessageTypes) : null,
        maxMessageLength: rules.maxMessageLength ?? null,
        rateLimit: rules.rateLimit ?? null,
        governanceModel: rules.governanceModel,
        ruleChangeThreshold: rules.ruleChangeThreshold ?? null,
        updatedAt: rules.updatedAt,
    });
}
export function dbGetRoomRules(roomId) {
    const row = stmtGetRoomRules.get(roomId);
    return row ? rowToRoomRules(row) : undefined;
}
export function dbDeleteRoomRules(roomId) {
    stmtDeleteRoomRules.run(roomId);
}
// ─── Access Policy enforcement helpers ─────────────────────────────────────
/**
 * Check if an agent is allowed to perform an action based on trust + interactions.
 * Returns { allowed, reason } — relay uses this to gate messages/broadcasts.
 */
export function dbCheckAccess(nodeId, action, roomId) {
    // 1. Check ban
    if (dbIsBanned(nodeId)) {
        return { allowed: false, reason: 'banned' };
    }
    // 2. Get reputation
    const repRow = db.prepare(`SELECT trust_score, total_interactions FROM reputation WHERE node_id = ?`)
        .get(nodeId);
    const trustScore = repRow?.trust_score ?? 50; // New agent default
    const totalInteractions = repRow?.total_interactions ?? 0;
    // 3. Cold start check: first N interactions only allow text + intent
    if (totalInteractions < DEFAULT_ACCESS_POLICY.coldStartInteractions && action === 'proposal') {
        return { allowed: false, reason: `cold_start: need ${DEFAULT_ACCESS_POLICY.coldStartInteractions - totalInteractions} more interactions` };
    }
    // 4. Trust threshold check (global)
    const thresholdMap = {
        broadcast: DEFAULT_ACCESS_POLICY.minTrustForBroadcast,
        proposal: DEFAULT_ACCESS_POLICY.minTrustForProposal,
        dm: DEFAULT_ACCESS_POLICY.minTrustForDm,
    };
    if (trustScore < thresholdMap[action]) {
        return { allowed: false, reason: `trust_too_low: ${trustScore.toFixed(1)} < ${thresholdMap[action]}` };
    }
    // 5. Room-level rules check
    if (roomId) {
        const rules = dbGetRoomRules(roomId);
        if (rules) {
            if (trustScore < rules.minTrust) {
                return { allowed: false, reason: `room_trust_too_low: ${trustScore.toFixed(1)} < ${rules.minTrust}` };
            }
            // Role check
            if (rules.allowedRoles) {
                const agentRow = db.prepare(`SELECT role FROM agents WHERE node_id = ?`).get(nodeId);
                const agentRole = agentRow?.role;
                if (agentRole && !rules.allowedRoles.includes(agentRole)) {
                    return { allowed: false, reason: `role_not_allowed: ${agentRole}` };
                }
            }
        }
    }
    return { allowed: true };
}
/**
 * Check rate limit for a room. Returns true if within limit.
 */
export function dbCheckRateLimit(nodeId, roomId) {
    const rules = dbGetRoomRules(roomId);
    if (!rules?.rateLimit)
        return true; // No limit
    const oneMinAgo = Date.now() - 60_000;
    const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM messages
    WHERE from_id = ? AND room = ? AND timestamp > ?
  `).get(nodeId, roomId, oneMinAgo);
    return row.cnt < rules.rateLimit;
}
// ─── Rule Proposals ────────────────────────────────────────────────────────
const stmtInsertProposal = db.prepare(`
  INSERT INTO rule_proposals (proposal_id, room_id, proposed_by, changes, status, votes_for, votes_against, created_at, expires_at)
  VALUES (@proposalId, @roomId, @proposedBy, @changes, 'open', 0, 0, @createdAt, @expiresAt)
`);
const stmtGetProposal = db.prepare(`SELECT * FROM rule_proposals WHERE proposal_id = ?`);
const stmtGetRoomProposals = db.prepare(`SELECT * FROM rule_proposals WHERE room_id = ? AND status = 'open' ORDER BY created_at DESC`);
const stmtUpdateProposalStatus = db.prepare(`UPDATE rule_proposals SET status = ?, votes_for = ?, votes_against = ? WHERE proposal_id = ?`);
const stmtExpireProposals = db.prepare(`UPDATE rule_proposals SET status = 'expired' WHERE status = 'open' AND expires_at < ?`);
const stmtInsertVote = db.prepare(`
  INSERT OR REPLACE INTO rule_votes (proposal_id, voter, vote, weight, voted_at)
  VALUES (@proposalId, @voter, @vote, @weight, @votedAt)
`);
const stmtGetProposalVotes = db.prepare(`SELECT * FROM rule_votes WHERE proposal_id = ?`);
function rowToProposal(row) {
    return {
        proposalId: row.proposal_id,
        roomId: row.room_id,
        proposedBy: row.proposed_by,
        changes: JSON.parse(row.changes),
        status: row.status,
        votesFor: row.votes_for,
        votesAgainst: row.votes_against,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
    };
}
export function dbCreateProposal(proposalId, roomId, proposedBy, changes, ttlMs = 3600_000) {
    const now = Date.now();
    stmtInsertProposal.run({
        proposalId, roomId, proposedBy, changes: JSON.stringify(changes),
        createdAt: now, expiresAt: now + ttlMs,
    });
    return { proposalId, roomId, proposedBy, changes, status: 'open', votesFor: 0, votesAgainst: 0, createdAt: now, expiresAt: now + ttlMs };
}
export function dbGetProposal(proposalId) {
    const row = stmtGetProposal.get(proposalId);
    return row ? rowToProposal(row) : undefined;
}
export function dbGetRoomProposals(roomId) {
    const rows = stmtGetRoomProposals.all(roomId);
    return rows.map(rowToProposal);
}
/**
 * Cast a vote on a proposal. Weight defaults to 1 for 'vote' model,
 * or trustScore for 'reputation' model.
 * Returns the updated proposal (with re-tallied votes) or undefined if proposal not found.
 */
export function dbVoteOnProposal(proposalId, voter, vote, weight = 1) {
    const proposal = dbGetProposal(proposalId);
    if (!proposal || proposal.status !== 'open')
        return undefined;
    stmtInsertVote.run({ proposalId, voter, vote, weight, votedAt: Date.now() });
    // Re-tally
    const votes = stmtGetProposalVotes.all(proposalId);
    const votesFor = votes.filter(v => v.vote === 'for').reduce((s, v) => s + v.weight, 0);
    const votesAgainst = votes.filter(v => v.vote === 'against').reduce((s, v) => s + v.weight, 0);
    stmtUpdateProposalStatus.run(proposal.status, votesFor, votesAgainst, proposalId);
    return { ...proposal, votesFor, votesAgainst };
}
/**
 * Evaluate a proposal: check if it should pass or be rejected.
 * For 'vote' model: majority wins (votesFor > votesAgainst).
 * For 'reputation' model: weighted votes compared to threshold.
 * Returns 'passed' | 'rejected' | null (still open).
 */
export function dbEvaluateProposal(proposalId) {
    const proposal = dbGetProposal(proposalId);
    if (!proposal || proposal.status !== 'open')
        return null;
    const rules = dbGetRoomRules(proposal.roomId);
    const threshold = rules?.ruleChangeThreshold ?? 0.5;
    const totalWeight = proposal.votesFor + proposal.votesAgainst;
    if (totalWeight === 0)
        return null;
    const forRatio = proposal.votesFor / totalWeight;
    let result = null;
    if (forRatio >= threshold)
        result = 'passed';
    else if ((1 - forRatio) >= threshold)
        result = 'rejected';
    if (result) {
        stmtUpdateProposalStatus.run(result, proposal.votesFor, proposal.votesAgainst, proposalId);
        // If passed, apply changes to room rules
        if (result === 'passed' && rules) {
            const updated = { ...rules, ...proposal.changes, updatedAt: Date.now() };
            dbSetRoomRules(updated);
        }
    }
    return result;
}
export function dbExpireProposals() {
    const result = stmtExpireProposals.run(Date.now());
    return result.changes;
}
//# sourceMappingURL=db.js.map