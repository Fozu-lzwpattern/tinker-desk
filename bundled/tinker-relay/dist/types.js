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
/** Recommended facet templates (free creation — these are just suggestions) */
export const RECOMMENDED_FACETS = ['default', 'marketplace', 'social', 'technical'];
export const DEFAULT_ACCESS_POLICY = {
    minTrustForBroadcast: 30,
    minTrustForProposal: 20,
    minTrustForDm: 10,
    banThreshold: 5,
    coldStartInteractions: 10,
};
//# sourceMappingURL=types.js.map