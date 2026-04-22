/**
 * Tinker — 协议类型定义 v0.9
 *
 * 变更（v0.9 — 自治理层 Governance Layer）：
 * - AccessPolicy：网络级 + Room 级准入门槛（冷启动/信誉门槛/封禁阈值）
 * - RoomRules：Room 自治规则（准入/内容/治理模型 creator|vote|reputation）
 * - BanRecord：分布式黑名单记录（gossip 传播）
 * - RuleProposal / RuleVote：Room 规则提案与投票
 * - SignalingMsg 新增 ban / unban / gossip_ban / room_rules_update / rule_proposal / rule_vote
 *
 * 变更（v0.8 — 自活跃层 Vitality Layer）：
 * - AgentInfo 新增 status: 'active'|'stale'|'offline'（online 保留向后兼容）
 * - Intent：意图广场生命周期（open→matched→closed/expired）
 * - TrendingRoom：话题涌现（消息频率 → 热门标记）
 * - SignalingMsg 新增 heartbeat / agent_status / intent_match / intent_matched / intent_expired / room_trending
 *
 * 变更（v0.7）：
 * - MessageType 扩展：capability / intent / proposal / endorsement
 * - AgentProfile：三源模型（declared / observed / endorsements）
 * - RECOMMENDED_FACETS：推荐 facet 模板（可自由创建）
 * - ReputationScore：完全去中心化，每个 relay 独立计算
 * - CapabilityChannel：能力频道信息
 * - SignalingMsg 新增 profile_update / profile_request / profile_response / endorse
 */
export interface AgentIdentity {
    nodeId: string;
    publicKey: string;
    displayName: string;
    role?: string;
    capabilities?: string[];
    registeredAt: number;
}
/** Agent 状态（v0.8：细粒度三态替代布尔 online） */
export type AgentStatus = 'active' | 'stale' | 'offline';
/** 对外暴露的 Agent 信息（不含 publicKey） */
export interface AgentInfo {
    nodeId: string;
    displayName: string;
    role?: string;
    capabilities?: string[];
    /** @deprecated 使用 status 替代；保留向后兼容（online = status !== 'offline'） */
    online: boolean;
    /** v0.8: 细粒度状态 */
    status: AgentStatus;
    registeredAt: number;
}
export type MessageType = 'text' | 'attachment' | 'system' | 'command' | 'ack' | 'capability' | 'intent' | 'proposal' | 'endorsement';
export interface AgentProfile {
    nodeId: string;
    facetName: string;
    declared: {
        description?: string;
        capabilities?: string[];
        tags?: string[];
        metadata?: Record<string, unknown>;
    };
    observed?: {
        messageCount?: number;
        avgResponseMs?: number;
        topRooms?: string[];
        activeHours?: number[];
        lastActive?: number;
    };
    endorsements?: Array<{
        fromNodeId: string;
        capability: string;
        comment?: string;
        timestamp: number;
        signature: string;
    }>;
    updatedAt: number;
}
/** Recommended facet templates (free creation — these are just suggestions) */
export declare const RECOMMENDED_FACETS: readonly ["default", "marketplace", "social", "technical"];
export interface ReputationScore {
    nodeId: string;
    trustScore: number;
    activityScore: number;
    successRate: number;
    responseRate: number;
    avgResponseMs: number;
    peerRatings: number;
    totalInteractions: number;
    lastUpdated: number;
    decayFactor: number;
}
export interface CapabilityChannel {
    roomId: string;
    capability: string;
    memberCount: number;
    description?: string;
    createdAt: number;
}
export interface TinkerAttachment {
    name: string;
    mimeType: string;
    /** base64 编码的二进制内容，或可公开访问的 URL */
    data: string;
    size: number;
}
export interface TinkerMessage {
    /** 全局唯一消息 ID */
    id: string;
    type: MessageType;
    /** 发送者 nodeId */
    from: string;
    /** 目标 nodeId（点对点）；不填=广播给 room 内所有人 */
    to?: string;
    /**
     * 消息所在的 room/channel
     * - room broadcast / room DM：必填
     * - 纯私信（direct message，不绑定 room）：可省略
     */
    room?: string;
    /** 自然语言文本内容 */
    content: string;
    /** 附件（可选） */
    attachment?: TinkerAttachment;
    /** Unix ms 时间戳 */
    timestamp: number;
    /** Ed25519 签名：sign(`${id}:${content}:${timestamp}`, privateKey) */
    signature: string;
}
export type SignalingMsg = {
    type: 'hello';
    nodeId: string;
    publicKey: string;
    displayName: string;
    role?: string;
    capabilities?: string[];
} | {
    type: 'join';
    roomId: string;
    nodeId: string;
    publicKey: string;
    displayName: string;
    role?: string;
    capabilities?: string[];
    timestamp: number;
    signature: string;
} | {
    type: 'leave';
    roomId: string;
    nodeId: string;
} | {
    type: 'message';
    payload: TinkerMessage;
} | {
    type: 'dm';
    payload: TinkerMessage;
} | {
    type: 'ack';
    messageId: string;
    from: string;
} | {
    type: 'members';
    roomId: string;
    members: RoomMember[];
} | {
    type: 'agent_joined';
    agent: AgentInfo;
} | {
    type: 'agent_left';
    nodeId: string;
} | {
    type: 'error';
    code: string;
    message: string;
} | {
    type: 'relay_announce';
    address: string;
    nodeId: string;
} | {
    type: 'relay_list';
    relays: RelayInfo[];
} | {
    type: 'gossip_message';
    payload: TinkerMessage;
    gossiped: true;
} | {
    type: 'gossip_dm';
    payload: TinkerMessage;
    gossiped: true;
} | {
    type: 'ping';
} | {
    type: 'pong';
} | {
    type: 'profile_update';
    profile: AgentProfile;
} | {
    type: 'profile_request';
    nodeId: string;
    facetName?: string;
} | {
    type: 'profile_response';
    profiles: AgentProfile[];
} | {
    type: 'endorse';
    targetNodeId: string;
    capability: string;
    comment?: string;
    timestamp: number;
    signature: string;
} | {
    type: 'heartbeat';
} | {
    type: 'agent_status';
    nodeId: string;
    status: AgentStatus;
} | {
    type: 'intent_match';
    intentId: string;
    matchedNodeId: string;
} | {
    type: 'intent_matched';
    intent: Intent;
} | {
    type: 'intent_expired';
    intentId: string;
} | {
    type: 'room_trending';
    roomId: string;
    messageCount: number;
} | {
    type: 'ban';
    nodeId: string;
    reason: string;
    expiresAt?: number;
} | {
    type: 'unban';
    nodeId: string;
} | {
    type: 'gossip_ban';
    ban: BanRecord;
    gossiped: true;
} | {
    type: 'room_rules_update';
    rules: RoomRules;
} | {
    type: 'rule_proposal';
    proposal: RuleProposal;
} | {
    type: 'rule_vote';
    proposalId: string;
    roomId: string;
    vote: 'for' | 'against';
    voter: string;
};
export interface RoomMember {
    nodeId: string;
    displayName: string;
    role?: string;
    joinedAt: number;
}
export interface RelayInfo {
    address: string;
    nodeId: string;
    peerCount: number;
}
export interface RegisterRequest {
    nodeId: string;
    publicKey: string;
    displayName?: string;
    role?: string;
    capabilities?: string[];
}
export interface RegisterResponse {
    ok: boolean;
    nodeId: string;
    message: string;
}
export type IntentStatus = 'open' | 'matched' | 'closed' | 'expired';
export interface Intent {
    intentId: string;
    fromNodeId: string;
    capability: string;
    description: string;
    constraints?: Record<string, unknown>;
    ttlMs: number;
    status: IntentStatus;
    createdAt: number;
    matchedBy?: string;
    matchedAt?: number;
}
export interface TrendingRoom {
    roomId: string;
    messageCount: number;
    uniqueSenders: number;
    windowStart: number;
}
/** 网络级准入策略 */
export interface AccessPolicy {
    minTrustForBroadcast: number;
    minTrustForProposal: number;
    minTrustForDm: number;
    banThreshold: number;
    coldStartInteractions: number;
}
export declare const DEFAULT_ACCESS_POLICY: AccessPolicy;
/** 治理模式 */
export type GovernanceModel = 'creator' | 'vote' | 'reputation';
/** Room 自治规则 */
export interface RoomRules {
    roomId: string;
    creator: string;
    minTrust: number;
    allowedRoles?: string[];
    inviteOnly: boolean;
    allowedMessageTypes?: MessageType[];
    maxMessageLength?: number;
    rateLimit?: number;
    governanceModel: GovernanceModel;
    ruleChangeThreshold?: number;
    updatedAt: number;
}
/** 分布式黑名单记录 */
export interface BanRecord {
    nodeId: string;
    bannedBy: string;
    reason: string;
    bannedAt: number;
    expiresAt?: number;
}
/** Room 规则修改提案 */
export interface RuleProposal {
    proposalId: string;
    roomId: string;
    proposedBy: string;
    changes: Partial<Omit<RoomRules, 'roomId' | 'creator' | 'updatedAt'>>;
    status: 'open' | 'passed' | 'rejected' | 'expired';
    votesFor: number;
    votesAgainst: number;
    createdAt: number;
    expiresAt: number;
}
//# sourceMappingURL=types.d.ts.map