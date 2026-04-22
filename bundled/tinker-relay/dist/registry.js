/**
 * Tinker Relay — Agent 注册表 v0.2
 *
 * 变更：
 * - AgentIdentity 新增 capabilities 字段
 * - 新增 findAgents({ role?, capability? }) 按条件查询
 * - 新增 setOnline / setOffline 追踪在线状态
 * - 新增 getAgentInfo() 返回对外安全的 AgentInfo（不含 publicKey）
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const TINKER_DIR = path.join(os.homedir(), '.tinker');
const AGENTS_PATH = path.join(TINKER_DIR, 'agents.json');
function ensureDir() {
    if (!fs.existsSync(TINKER_DIR))
        fs.mkdirSync(TINKER_DIR, { recursive: true });
}
function load() {
    try {
        if (!fs.existsSync(AGENTS_PATH))
            return new Map();
        const arr = JSON.parse(fs.readFileSync(AGENTS_PATH, 'utf8'));
        return new Map(arr.map((a) => [a.nodeId, a]));
    }
    catch {
        return new Map();
    }
}
function save(map) {
    try {
        ensureDir();
        fs.writeFileSync(AGENTS_PATH, JSON.stringify([...map.values()], null, 2), 'utf8');
    }
    catch (err) {
        console.warn('[registry] ⚠️ failed to save agents.json:', err);
    }
}
// 内存中的注册表（relay 启动时从磁盘加载）
const agents = load();
// 在线状态（内存，不持久化）
const onlineSet = new Set();
// ─── 注册 / 查询 ──────────────────────────────────────────────────────────
export function register(identity) {
    agents.set(identity.nodeId, identity);
    save(agents);
}
export function getAgent(nodeId) {
    return agents.get(nodeId);
}
export function isKnown(nodeId) {
    return agents.has(nodeId);
}
export function listAgents() {
    return [...agents.values()];
}
export function agentCount() {
    return agents.size;
}
/**
 * 返回对外安全的 AgentInfo（不含 publicKey），附加在线状态
 */
export function getAgentInfo(nodeId) {
    const a = agents.get(nodeId);
    if (!a)
        return undefined;
    const online = onlineSet.has(a.nodeId);
    return {
        nodeId: a.nodeId,
        displayName: a.displayName,
        role: a.role,
        capabilities: a.capabilities,
        online,
        status: online ? 'active' : 'offline',
        registeredAt: a.registeredAt,
    };
}
/**
 * 按条件查询 Agent（role 和 capability 可组合过滤）
 */
export function findAgents(filter = {}) {
    return [...agents.values()]
        .filter((a) => {
        if (filter.role && a.role !== filter.role)
            return false;
        if (filter.capability && !a.capabilities?.includes(filter.capability))
            return false;
        return true;
    })
        .map((a) => {
        const online = onlineSet.has(a.nodeId);
        return {
            nodeId: a.nodeId,
            displayName: a.displayName,
            role: a.role,
            capabilities: a.capabilities,
            online,
            status: (online ? 'active' : 'offline'),
            registeredAt: a.registeredAt,
        };
    });
}
// ─── 在线状态 ─────────────────────────────────────────────────────────────
export function setOnline(nodeId) {
    onlineSet.add(nodeId);
}
export function setOffline(nodeId) {
    onlineSet.delete(nodeId);
}
export function isOnlineInRegistry(nodeId) {
    return onlineSet.has(nodeId);
}
export function onlineCount() {
    return onlineSet.size;
}
//# sourceMappingURL=registry.js.map