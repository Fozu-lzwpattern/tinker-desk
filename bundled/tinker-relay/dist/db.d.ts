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
import { type Database as BetterSqliteDB } from 'better-sqlite3';
import type { TinkerMessage, AgentInfo, AgentStatus, AgentProfile, ReputationScore, CapabilityChannel, Intent, TrendingRoom, BanRecord, RoomRules, RuleProposal } from './types.js';
export declare const db: BetterSqliteDB;
/** 持久化一条消息（超出 MAX_MESSAGES 自动裁剪） */
export declare function persistMessage(msg: TinkerMessage): void;
/** 查询 room 历史消息（从旧到新） */
export declare function getRoomHistory(roomId: string, limit?: number): TinkerMessage[];
/** 查询两个 Agent 之间的私信历史（双向） */
export declare function getDmHistory(nodeIdA: string, nodeIdB: string, limit?: number): TinkerMessage[];
/** 查询某 Agent 的最近消息（发送 + 接收） */
export declare function getAgentHistory(nodeId: string, limit?: number): TinkerMessage[];
/** 注册或更新 Agent */
export declare function upsertAgent(info: {
    nodeId: string;
    publicKey: string;
    displayName: string;
    role?: string;
    capabilities?: string[];
    online?: boolean;
}): void;
/** 设置 Agent 在线/离线 */
export declare function dbSetOnline(nodeId: string, online: boolean): void;
export interface GraphEdge {
    source: string;
    target: string;
    weight: number;
    lastActive: number;
}
export interface GraphData {
    nodes: AgentInfo[];
    edges: GraphEdge[];
}
/** 记录一次交互关系（发消息时调用，双方各增权重） */
export declare function recordEdge(fromId: string, toId: string): void;
/** 获取完整图谱数据（所有 Agent 节点 + 所有关系边） */
export declare function getGraphData(): GraphData;
/** 获取某 Agent 的直接邻居（交互过的 Agent） */
export declare function getAgentNeighbors(nodeId: string): {
    neighbor: AgentInfo;
    weight: number;
}[];
/** 获取单个 Agent */
export declare function dbGetAgent(nodeId: string): AgentInfo | null;
/** 获取所有 Agent */
export declare function dbGetAllAgents(): AgentInfo[];
/** 按条件筛选 Agent */
export declare function dbFindAgents(filter: {
    role?: string;
    capability?: string;
}): AgentInfo[];
/** Relay 启动时加载所有 Agent 到内存注册表 */
export declare function loadPersistedAgents(): AgentInfo[];
export declare function upsertProfile(profile: AgentProfile): void;
export declare function getProfiles(nodeId: string, facetName?: string): AgentProfile[];
export declare function addEndorsement(nodeId: string, facetName: string, endorsement: {
    fromNodeId: string;
    capability: string;
    comment?: string;
    timestamp: number;
    signature: string;
}): void;
export declare function updateObserved(nodeId: string, facetName: string, observed: AgentProfile['observed']): void;
export declare function getReputation(nodeId: string): ReputationScore | null;
export declare function upsertReputation(rep: ReputationScore): void;
export declare function getAllReputations(minTrust?: number): ReputationScore[];
/**
 * Recalculate reputation for a node based on:
 * - activityScore: message count in last 7 days, normalized 0-100 (100 = 100+ msgs)
 * - successRate: derived from edge weight (interactions)
 * - responseRate: derived from dm interactions vs total interactions
 * - peerRatings: weighted average from endorsements (fallback to 50)
 * - decayFactor: -2% per 24h inactive (min 0.5)
 * - trustScore = 0.4*successRate*100 + 0.3*responseRate*100 + 0.2*peerRatings + 0.1*activityScore
 */
export declare function recalculateReputation(nodeId: string): ReputationScore;
export declare function upsertCapabilityChannel(channel: CapabilityChannel): void;
export declare function getCapabilityChannels(): CapabilityChannel[];
export declare function getCapabilityChannel(capability: string): CapabilityChannel | null;
/** 更新 Agent 心跳时间戳，标记为 active */
export declare function dbUpdateHeartbeat(nodeId: string): void;
/** 设置 Agent 状态 */
export declare function dbSetAgentStatus(nodeId: string, status: AgentStatus): void;
/** 获取应标记为 stale 的 Agent（心跳超时） */
export declare function dbGetStaleAgents(thresholdMs: number): AgentInfo[];
/** 获取 Agent 健康状态摘要 */
export declare function dbGetAgentHealthSummary(): {
    active: number;
    stale: number;
    offline: number;
};
export declare function dbCreateIntent(intent: Omit<Intent, 'status' | 'matchedBy' | 'matchedAt'>): void;
export declare function dbGetIntent(intentId: string): Intent | null;
export declare function dbGetOpenIntents(): Intent[];
export declare function dbMatchIntent(intentId: string, matchedNodeId: string): Intent | null;
/** 过期所有超时的意图，返回被过期的意图列表 */
export declare function dbExpireIntents(): Intent[];
/** 记录一条消息到 room 的活跃度窗口 */
export declare function dbTrackRoomActivity(roomId: string, senderNodeId: string): void;
/** 获取当前热门 room（10 分钟窗口内消息数 >= threshold） */
export declare function dbGetTrendingRooms(threshold?: number): TrendingRoom[];
/** 清理过期的活跃度窗口数据（保留最近 1 小时） */
export declare function dbCleanOldActivity(): void;
export declare function dbBanAgent(nodeId: string, bannedBy: string, reason: string, expiresAt?: number): BanRecord;
export declare function dbUnbanAgent(nodeId: string): void;
export declare function dbGetBan(nodeId: string): BanRecord | undefined;
export declare function dbIsBanned(nodeId: string): boolean;
export declare function dbGetAllBans(): BanRecord[];
export declare function dbCleanExpiredBans(): number;
export declare function dbSetRoomRules(rules: RoomRules): void;
export declare function dbGetRoomRules(roomId: string): RoomRules | undefined;
export declare function dbDeleteRoomRules(roomId: string): void;
/**
 * Check if an agent is allowed to perform an action based on trust + interactions.
 * Returns { allowed, reason } — relay uses this to gate messages/broadcasts.
 */
export declare function dbCheckAccess(nodeId: string, action: 'broadcast' | 'proposal' | 'dm', roomId?: string): {
    allowed: boolean;
    reason?: string;
};
/**
 * Check rate limit for a room. Returns true if within limit.
 */
export declare function dbCheckRateLimit(nodeId: string, roomId: string): boolean;
export declare function dbCreateProposal(proposalId: string, roomId: string, proposedBy: string, changes: Partial<Omit<RoomRules, 'roomId' | 'creator' | 'updatedAt'>>, ttlMs?: number): RuleProposal;
export declare function dbGetProposal(proposalId: string): RuleProposal | undefined;
export declare function dbGetRoomProposals(roomId: string): RuleProposal[];
/**
 * Cast a vote on a proposal. Weight defaults to 1 for 'vote' model,
 * or trustScore for 'reputation' model.
 * Returns the updated proposal (with re-tallied votes) or undefined if proposal not found.
 */
export declare function dbVoteOnProposal(proposalId: string, voter: string, vote: 'for' | 'against', weight?: number): RuleProposal | undefined;
/**
 * Evaluate a proposal: check if it should pass or be rejected.
 * For 'vote' model: majority wins (votesFor > votesAgainst).
 * For 'reputation' model: weighted votes compared to threshold.
 * Returns 'passed' | 'rejected' | null (still open).
 */
export declare function dbEvaluateProposal(proposalId: string): 'passed' | 'rejected' | null;
export declare function dbExpireProposals(): number;
//# sourceMappingURL=db.d.ts.map