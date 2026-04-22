/**
 * Tinker Relay — Room 管理 v0.2
 *
 * 变更：
 * - 新增全局 nodeId → ws 映射（globalConnections）
 *   用于纯私信路由，不依赖 room
 * - leaveAllRooms 同时清理 globalConnections
 * - 新增 sendDirectToNode()：按全局 nodeId 投递，无需 room
 * - 新增 getOnlineNodeIds()：查询所有在线 Agent
 */
// roomId → Map<nodeId, RoomEntry>
const rooms = new Map();
// 全局 nodeId → ws（所有已连接的 Agent，不区分 room）
const globalConnections = new Map();
// nodeId → publicKey（relay index 的 hello handler 也需要写入）
const knownPublicKeys = new Map();
export function setPublicKey(nodeId, publicKey) {
    knownPublicKeys.set(nodeId, publicKey);
}
// ─── 全局连接管理 ──────────────────────────────────────────────────────────
/**
 * Agent 建立 WS 连接后登记（join 时调用）
 */
export function registerConnection(nodeId, ws) {
    globalConnections.set(nodeId, ws);
}
/**
 * Agent 断开连接时注销
 */
export function unregisterConnection(nodeId) {
    globalConnections.delete(nodeId);
}
export function getOnlineNodeIds() {
    return [...globalConnections.keys()];
}
export function isOnline(nodeId) {
    return globalConnections.has(nodeId);
}
// ─── Room 管理 ────────────────────────────────────────────────────────────
export function joinRoom(roomId, ws, identity) {
    if (!rooms.has(roomId))
        rooms.set(roomId, new Map());
    rooms.get(roomId).set(identity.nodeId, {
        ws,
        identity: { nodeId: identity.nodeId, displayName: identity.displayName, role: identity.role },
        joinedAt: Date.now(),
    });
    knownPublicKeys.set(identity.nodeId, identity.publicKey);
    // 同时登记全局连接
    registerConnection(identity.nodeId, ws);
}
export function leaveRoom(roomId, nodeId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    room.delete(nodeId);
    if (room.size === 0)
        rooms.delete(roomId);
}
export function leaveAllRooms(nodeId) {
    for (const [roomId, room] of rooms) {
        room.delete(nodeId);
        if (room.size === 0)
            rooms.delete(roomId);
    }
    unregisterConnection(nodeId);
}
export function getRoomMembers(roomId) {
    const room = rooms.get(roomId);
    if (!room)
        return [];
    return [...room.values()].map((e) => ({
        nodeId: e.identity.nodeId,
        displayName: e.identity.displayName,
        role: e.identity.role,
        joinedAt: e.joinedAt,
    }));
}
export function getPublicKey(nodeId) {
    return knownPublicKeys.get(nodeId);
}
// ─── 消息投递 ─────────────────────────────────────────────────────────────
/**
 * 广播给 room 内所有成员（可排除 sender）
 */
export function broadcast(roomId, data, exclude) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    for (const [nodeId, entry] of room) {
        if (nodeId === exclude)
            continue;
        if (entry.ws.readyState === 1 /* OPEN */) {
            entry.ws.send(data);
        }
    }
}
/**
 * 点对点投递到 room 内的成员（room DM，to + room 都有）
 */
export function sendToNode(roomId, targetNodeId, data) {
    const room = rooms.get(roomId);
    if (!room)
        return false;
    const entry = room.get(targetNodeId);
    if (!entry || entry.ws.readyState !== 1)
        return false;
    entry.ws.send(data);
    return true;
}
/**
 * 纯私信：按全局 nodeId 路由，不依赖 room
 * 只要目标 Agent 有活跃 WS 连接即可投递
 */
export function sendDirectToNode(targetNodeId, data) {
    const ws = globalConnections.get(targetNodeId);
    if (!ws || ws.readyState !== 1)
        return false;
    ws.send(data);
    return true;
}
/**
 * 广播给所有在线 Agent（排除自身），用于 agent_joined / agent_left 通知
 */
export function broadcastGlobal(data, exclude) {
    for (const [nodeId, ws] of globalConnections) {
        if (nodeId === exclude)
            continue;
        if (ws.readyState === 1)
            ws.send(data);
    }
}
// ─── 统计 ─────────────────────────────────────────────────────────────────
export function getRoomCount() {
    return rooms.size;
}
export function getTotalConnections() {
    return globalConnections.size;
}
export function getRoomList() {
    return [...rooms.entries()].map(([roomId, room]) => ({
        roomId,
        memberCount: room.size,
    }));
}
//# sourceMappingURL=rooms.js.map