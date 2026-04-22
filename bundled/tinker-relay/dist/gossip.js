/**
 * Tinker Relay — Inter-Relay Gossip Sync
 *
 * 实现 relay 间消息同步，使不同 relay 上的 Agent 可以互相通信。
 *
 * 工作原理：
 * - relay 启动时读取 PEER_RELAYS 环境变量，主动连接其他 relay
 * - 收到 Agent 消息后，转发给所有 peer relay（gossip）
 * - gossip 消息带 gossiped:true 标记，防止无限循环转发
 * - peer relay 断线后自动重连（3s 间隔，最多 30s 退避）
 *
 * 环境变量：
 *   PEER_RELAYS   逗号分隔的 peer relay WS 地址
 *                 例：ws://relay2.example.com:7077,ws://relay3.example.com:7077
 */
import * as WebSocket from 'ws';
const VERBOSE = process.env.VERBOSE !== 'false';
const RECONNECT_BASE_MS = 500; // 首次重连 500ms，之后指数退避
const RECONNECT_MAX_MS = 30000;
function log(...args) {
    if (VERBOSE)
        console.log('[gossip]', ...args);
}
const peers = new Map();
/** 连接到单个 peer relay，断线自动重连 */
function connectPeer(address) {
    if (peers.get(address)?.dead)
        return;
    let conn = peers.get(address);
    if (!conn) {
        conn = { address, ws: null, retries: 0, dead: false };
        peers.set(address, conn);
    }
    log(`🔗 connecting to peer relay: ${address}`);
    const ws = new WebSocket.WebSocket(address);
    conn.ws = ws;
    ws.on('open', () => {
        conn.retries = 0;
        log(`✅ connected to peer relay: ${address}`);
    });
    ws.on('message', (raw) => {
        // peer relay 发来的消息（如 relay_list 等），目前只记录不处理
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'relay_list') {
                log(`📋 relay_list from ${address}: ${msg.relays?.length ?? 0} relays`);
            }
        }
        catch { /* ignore */ }
    });
    ws.on('close', () => {
        if (conn.dead)
            return;
        conn.ws = null;
        const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.5, conn.retries), RECONNECT_MAX_MS);
        conn.retries++;
        log(`🔄 peer relay ${address} disconnected, retry in ${Math.round(delay / 1000)}s (attempt ${conn.retries})`);
        setTimeout(() => connectPeer(address), delay);
    });
    ws.on('error', (err) => {
        log(`⚠️ peer relay ${address} error: ${err.message}`);
        // close event will handle reconnect
    });
}
/** 初始化：读取 PEER_RELAYS 环境变量并连接 */
export function initGossip() {
    const peerList = (process.env.PEER_RELAYS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (peerList.length === 0) {
        log('ℹ️  no PEER_RELAYS configured, gossip disabled');
        return;
    }
    log(`🌐 initializing gossip with ${peerList.length} peer(s): ${peerList.join(', ')}`);
    for (const addr of peerList) {
        connectPeer(addr);
    }
}
/** 动态添加 peer（relay_announce 时调用） */
export function addPeer(address) {
    if (peers.has(address))
        return;
    log(`➕ new peer relay discovered: ${address}`);
    connectPeer(address);
}
/** 获取所有在线 peer 连接数 */
export function getPeerCount() {
    let count = 0;
    for (const c of peers.values()) {
        if (c.ws?.readyState === WebSocket.WebSocket.OPEN)
            count++;
    }
    return count;
}
// ─── 消息转发 ─────────────────────────────────────────────────────────────────
/**
 * 将消息转发给所有在线 peer relay。
 * 调用方确保只有非 gossip 来源的消息才调用此函数（防循环）。
 */
export function gossipBroadcast(payload) {
    const serialized = JSON.stringify({ type: 'gossip_message', payload, gossiped: true });
    let sent = 0;
    for (const conn of peers.values()) {
        if (conn.ws?.readyState === WebSocket.WebSocket.OPEN) {
            conn.ws.send(serialized);
            sent++;
        }
    }
    if (sent > 0)
        log(`📡 gossip → ${sent} peer(s)`);
}
/**
 * 将 DM 消息转发给所有在线 peer relay。
 */
export function gossipDm(payload) {
    const serialized = JSON.stringify({ type: 'gossip_dm', payload, gossiped: true });
    for (const conn of peers.values()) {
        if (conn.ws?.readyState === WebSocket.WebSocket.OPEN) {
            conn.ws.send(serialized);
        }
    }
}
/** 优雅关闭所有 peer 连接 */
export function closeGossip() {
    for (const conn of peers.values()) {
        conn.dead = true;
        conn.ws?.close();
    }
    peers.clear();
}
//# sourceMappingURL=gossip.js.map