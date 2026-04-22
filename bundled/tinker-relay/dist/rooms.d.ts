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
import type WebSocket from 'ws';
import type { RoomMember, AgentIdentity } from './types.js';
export declare function setPublicKey(nodeId: string, publicKey: string): void;
/**
 * Agent 建立 WS 连接后登记（join 时调用）
 */
export declare function registerConnection(nodeId: string, ws: WebSocket): void;
/**
 * Agent 断开连接时注销
 */
export declare function unregisterConnection(nodeId: string): void;
export declare function getOnlineNodeIds(): string[];
export declare function isOnline(nodeId: string): boolean;
export declare function joinRoom(roomId: string, ws: WebSocket, identity: Pick<AgentIdentity, 'nodeId' | 'displayName' | 'role'> & {
    publicKey: string;
}): void;
export declare function leaveRoom(roomId: string, nodeId: string): void;
export declare function leaveAllRooms(nodeId: string): void;
export declare function getRoomMembers(roomId: string): RoomMember[];
export declare function getPublicKey(nodeId: string): string | undefined;
/**
 * 广播给 room 内所有成员（可排除 sender）
 */
export declare function broadcast(roomId: string, data: string, exclude?: string): void;
/**
 * 点对点投递到 room 内的成员（room DM，to + room 都有）
 */
export declare function sendToNode(roomId: string, targetNodeId: string, data: string): boolean;
/**
 * 纯私信：按全局 nodeId 路由，不依赖 room
 * 只要目标 Agent 有活跃 WS 连接即可投递
 */
export declare function sendDirectToNode(targetNodeId: string, data: string): boolean;
/**
 * 广播给所有在线 Agent（排除自身），用于 agent_joined / agent_left 通知
 */
export declare function broadcastGlobal(data: string, exclude?: string): void;
export declare function getRoomCount(): number;
export declare function getTotalConnections(): number;
export declare function getRoomList(): Array<{
    roomId: string;
    memberCount: number;
}>;
//# sourceMappingURL=rooms.d.ts.map