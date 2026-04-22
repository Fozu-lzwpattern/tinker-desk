export { TinkerRelay } from './relay.js'
export type { TinkerRelayOptions } from './relay.js'

// Re-export types that consumers might need
export type {
  SignalingMsg,
  TinkerMessage,
  TinkerAttachment,
  AgentInfo,
  AgentIdentity,
  AgentStatus,
  AgentProfile,
  RegisterRequest,
  RegisterResponse,
  RelayInfo,
  RoomMember,
  ReputationScore,
  CapabilityChannel,
  Intent,
  IntentStatus,
  TrendingRoom,
  AccessPolicy,
  GovernanceModel,
  RoomRules,
  BanRecord,
  RuleProposal,
  MessageType,
} from './types.js'

export { RECOMMENDED_FACETS, DEFAULT_ACCESS_POLICY } from './types.js'
