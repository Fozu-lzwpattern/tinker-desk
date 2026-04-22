/**
 * Tinker Relay — Ed25519 鉴权模块
 * 复用自 SyncThink agentApi.ts 的鉴权逻辑，简化为通用 Agent 消息签名验证
 */
/**
 * 验证 Agent join 消息的签名
 * 签名载荷：`tinker:join:${nodeId}:${roomId}:${timestamp}`
 */
export declare function verifyJoinSignature(params: {
    nodeId: string;
    publicKey: string;
    roomId: string;
    timestamp: number;
    signature: string;
}): Promise<{
    ok: boolean;
    reason?: string;
}>;
/**
 * 验证 TinkerMessage 的签名
 * 签名载荷：`${message.id}:${message.content}:${message.timestamp}`
 */
export declare function verifyMessageSignature(params: {
    messageId: string;
    content: string;
    timestamp: number;
    signature: string;
    publicKey: string;
}): Promise<{
    ok: boolean;
    reason?: string;
}>;
//# sourceMappingURL=auth.d.ts.map