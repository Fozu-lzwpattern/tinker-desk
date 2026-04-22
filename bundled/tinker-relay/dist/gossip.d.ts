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
/** 初始化：读取 PEER_RELAYS 环境变量并连接 */
export declare function initGossip(): void;
/** 动态添加 peer（relay_announce 时调用） */
export declare function addPeer(address: string): void;
/** 获取所有在线 peer 连接数 */
export declare function getPeerCount(): number;
/**
 * 将消息转发给所有在线 peer relay。
 * 调用方确保只有非 gossip 来源的消息才调用此函数（防循环）。
 */
export declare function gossipBroadcast(payload: unknown): void;
/**
 * 将 DM 消息转发给所有在线 peer relay。
 */
export declare function gossipDm(payload: unknown): void;
/** 优雅关闭所有 peer 连接 */
export declare function closeGossip(): void;
//# sourceMappingURL=gossip.d.ts.map