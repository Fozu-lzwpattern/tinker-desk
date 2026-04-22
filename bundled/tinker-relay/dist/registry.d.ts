/**
 * Tinker Relay — Agent 注册表 v0.2
 *
 * 变更：
 * - AgentIdentity 新增 capabilities 字段
 * - 新增 findAgents({ role?, capability? }) 按条件查询
 * - 新增 setOnline / setOffline 追踪在线状态
 * - 新增 getAgentInfo() 返回对外安全的 AgentInfo（不含 publicKey）
 */
import type { AgentIdentity, AgentInfo } from './types.js';
export declare function register(identity: AgentIdentity): void;
export declare function getAgent(nodeId: string): AgentIdentity | undefined;
export declare function isKnown(nodeId: string): boolean;
export declare function listAgents(): AgentIdentity[];
export declare function agentCount(): number;
/**
 * 返回对外安全的 AgentInfo（不含 publicKey），附加在线状态
 */
export declare function getAgentInfo(nodeId: string): AgentInfo | undefined;
/**
 * 按条件查询 Agent（role 和 capability 可组合过滤）
 */
export declare function findAgents(filter?: {
    role?: string;
    capability?: string;
}): AgentInfo[];
export declare function setOnline(nodeId: string): void;
export declare function setOffline(nodeId: string): void;
export declare function isOnlineInRegistry(nodeId: string): boolean;
export declare function onlineCount(): number;
//# sourceMappingURL=registry.d.ts.map