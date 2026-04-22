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

// ─── 节点身份 ────────────────────────────────────────────────────────────────

export interface AgentIdentity {
  nodeId: string         // SHA-256(publicKey) hex
  publicKey: string      // Ed25519 公钥 hex
  displayName: string    // 人类可读别名
  role?: string          // 'asC' | 'asB' | 'human' | 自定义
  capabilities?: string[] // Agent 能力声明，如 ['meeting-room-booking', 'search']
  registeredAt: number
}

/** Agent 状态（v0.8：细粒度三态替代布尔 online） */
export type AgentStatus = 'active' | 'stale' | 'offline'

/** 对外暴露的 Agent 信息（不含 publicKey） */
export interface AgentInfo {
  nodeId: string
  displayName: string
  role?: string
  capabilities?: string[]
  /** @deprecated 使用 status 替代；保留向后兼容（online = status !== 'offline'） */
  online: boolean
  /** v0.8: 细粒度状态 */
  status: AgentStatus
  registeredAt: number
}

// ─── 消息协议 ────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'attachment' | 'system' | 'command' | 'ack'
  | 'capability' | 'intent' | 'proposal' | 'endorsement'

// ─── Agent Profile (three-source model) ─────────────────────────────────────

export interface AgentProfile {
  nodeId: string
  facetName: string  // 'default' | 'marketplace' | 'social' | 'technical' | custom
  declared: {
    description?: string
    capabilities?: string[]
    tags?: string[]
    metadata?: Record<string, unknown>
  }
  observed?: {
    messageCount?: number
    avgResponseMs?: number
    topRooms?: string[]
    activeHours?: number[]
    lastActive?: number
  }
  endorsements?: Array<{
    fromNodeId: string
    capability: string
    comment?: string
    timestamp: number
    signature: string
  }>
  updatedAt: number
}

/** Recommended facet templates (free creation — these are just suggestions) */
export const RECOMMENDED_FACETS = ['default', 'marketplace', 'social', 'technical'] as const

// ─── Reputation (decentralized, computed per-relay) ──────────────────────────

export interface ReputationScore {
  nodeId: string
  trustScore: number        // 0-100
  activityScore: number     // 0-100
  successRate: number       // 0-1
  responseRate: number      // 0-1
  avgResponseMs: number
  peerRatings: number       // weighted average of endorsements
  totalInteractions: number
  lastUpdated: number
  decayFactor: number       // decreases with inactivity
}

// ─── Capability channel info ─────────────────────────────────────────────────

export interface CapabilityChannel {
  roomId: string            // '#cap:coupon.issue' format
  capability: string        // 'coupon.issue'
  memberCount: number
  description?: string
  createdAt: number
}

export interface TinkerAttachment {
  name: string
  mimeType: string
  /** base64 编码的二进制内容，或可公开访问的 URL */
  data: string
  size: number
}

export interface TinkerMessage {
  /** 全局唯一消息 ID */
  id: string
  type: MessageType
  /** 发送者 nodeId */
  from: string
  /** 目标 nodeId（点对点）；不填=广播给 room 内所有人 */
  to?: string
  /**
   * 消息所在的 room/channel
   * - room broadcast / room DM：必填
   * - 纯私信（direct message，不绑定 room）：可省略
   */
  room?: string
  /** 自然语言文本内容 */
  content: string
  /** 附件（可选） */
  attachment?: TinkerAttachment
  /** Unix ms 时间戳 */
  timestamp: number
  /** Ed25519 签名：sign(`${id}:${content}:${timestamp}`, privateKey) */
  signature: string
}

// ─── WebSocket 信令包 ────────────────────────────────────────────────────────

export type SignalingMsg =
  // 连接握手（connect 后立即发，无需 join room，用于纯私信路由登记）
  | { type: 'hello';        nodeId: string; publicKey: string; displayName: string; role?: string; capabilities?: string[] }
  // 房间相关
  | { type: 'join';         roomId: string; nodeId: string; publicKey: string; displayName: string; role?: string; capabilities?: string[]; timestamp: number; signature: string }
  | { type: 'leave';        roomId: string; nodeId: string }
  // 消息（room broadcast / room DM）
  | { type: 'message';      payload: TinkerMessage }
  // 纯私信（不绑定 room，relay 按 nodeId 全局路由）
  | { type: 'dm';           payload: TinkerMessage }
  // ACK
  | { type: 'ack';          messageId: string; from: string }
  // 成员列表回包
  | { type: 'members';      roomId: string; members: RoomMember[] }
  // Agent 上下线通知（全局广播给已连接的 Agent）
  | { type: 'agent_joined'; agent: AgentInfo }
  | { type: 'agent_left';   nodeId: string }
  // 错误
  | { type: 'error';        code: string; message: string }
  // Relay 发现
  | { type: 'relay_announce'; address: string; nodeId: string }
  | { type: 'relay_list'; relays: RelayInfo[] }
  // Relay 间 Gossip 同步（relay → relay，不暴露给 Agent）
  | { type: 'gossip_message'; payload: TinkerMessage; gossiped: true }
  | { type: 'gossip_dm';      payload: TinkerMessage; gossiped: true }
  // 心跳
  | { type: 'ping' }
  | { type: 'pong' }
  // v0.7: Profile
  | { type: 'profile_update'; profile: AgentProfile }
  | { type: 'profile_request'; nodeId: string; facetName?: string }
  | { type: 'profile_response'; profiles: AgentProfile[] }
  // v0.7: Endorsement
  | { type: 'endorse'; targetNodeId: string; capability: string; comment?: string; timestamp: number; signature: string }
  // v0.8: Health heartbeat
  | { type: 'heartbeat' }
  | { type: 'agent_status'; nodeId: string; status: AgentStatus }
  // v0.8: Intent marketplace
  | { type: 'intent_match'; intentId: string; matchedNodeId: string }
  | { type: 'intent_matched'; intent: Intent }
  | { type: 'intent_expired'; intentId: string }
  // v0.8: Topic emergence
  | { type: 'room_trending'; roomId: string; messageCount: number }
  // v0.9: Governance
  | { type: 'ban'; nodeId: string; reason: string; expiresAt?: number }
  | { type: 'unban'; nodeId: string }
  | { type: 'gossip_ban'; ban: BanRecord; gossiped: true }
  | { type: 'room_rules_update'; rules: RoomRules }
  | { type: 'rule_proposal'; proposal: RuleProposal }
  | { type: 'rule_vote'; proposalId: string; roomId: string; vote: 'for' | 'against'; voter: string }

export interface RoomMember {
  nodeId: string
  displayName: string
  role?: string
  joinedAt: number
}

// ─── Relay 信息 ──────────────────────────────────────────────────────────────

export interface RelayInfo {
  address: string    // ws://host:port
  nodeId: string
  peerCount: number
}

// ─── Agent 注册 (HTTP) ───────────────────────────────────────────────────────

export interface RegisterRequest {
  nodeId: string
  publicKey: string
  displayName?: string
  role?: string
  capabilities?: string[]
}

export interface RegisterResponse {
  ok: boolean
  nodeId: string
  message: string
}

// ─── v0.8: Intent (意图广场) ──────────────────────────────────────────────

export type IntentStatus = 'open' | 'matched' | 'closed' | 'expired'

export interface Intent {
  intentId: string
  fromNodeId: string
  capability: string
  description: string
  constraints?: Record<string, unknown>
  ttlMs: number            // 生存时间（毫秒），超时自动 expire
  status: IntentStatus
  createdAt: number
  matchedBy?: string       // 匹配方 nodeId
  matchedAt?: number
}

// ─── v0.8: Trending Room (话题涌现) ──────────────────────────────────────

export interface TrendingRoom {
  roomId: string
  messageCount: number     // 窗口内消息数
  uniqueSenders: number    // 窗口内去重发送者数
  windowStart: number
}

// ─── v0.9: Governance Layer (自治理层) ──────────────────────────────────

/** 网络级准入策略 */
export interface AccessPolicy {
  minTrustForBroadcast: number    // 广播意图的最低声誉（默认 30）
  minTrustForProposal: number     // 发送提案的最低声誉（默认 20）
  minTrustForDm: number           // 发起私信的最低声誉（默认 10）
  banThreshold: number            // 低于此分数触发封禁（默认 5）
  coldStartInteractions: number   // 冷启动期交互次数（默认 10）
}

export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  minTrustForBroadcast: 30,
  minTrustForProposal: 20,
  minTrustForDm: 10,
  banThreshold: 5,
  coldStartInteractions: 10,
}

/** 治理模式 */
export type GovernanceModel = 'creator' | 'vote' | 'reputation'

/** Room 自治规则 */
export interface RoomRules {
  roomId: string
  creator: string                // 创建者 nodeId
  // 准入
  minTrust: number               // 最低声誉（默认 0 = 无门槛）
  allowedRoles?: string[]        // 允许的角色，null = 全部
  inviteOnly: boolean            // 仅邀请制
  // 内容
  allowedMessageTypes?: MessageType[]
  maxMessageLength?: number      // 最大消息长度
  rateLimit?: number             // 每分钟最大消息数
  // 治理
  governanceModel: GovernanceModel
  ruleChangeThreshold?: number   // vote/reputation 模式通过阈值 (0-1)
  updatedAt: number
}

/** 分布式黑名单记录 */
export interface BanRecord {
  nodeId: string
  bannedBy: string               // relay nodeId that issued the ban
  reason: string
  bannedAt: number
  expiresAt?: number             // null = 永久
}

/** Room 规则修改提案 */
export interface RuleProposal {
  proposalId: string
  roomId: string
  proposedBy: string             // nodeId
  changes: Partial<Omit<RoomRules, 'roomId' | 'creator' | 'updatedAt'>>
  status: 'open' | 'passed' | 'rejected' | 'expired'
  votesFor: number
  votesAgainst: number
  createdAt: number
  expiresAt: number
}
