/**
 * Tinker Relay — Ed25519 鉴权模块
 * 复用自 SyncThink agentApi.ts 的鉴权逻辑，简化为通用 Agent 消息签名验证
 */

import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha2.js'
import { createHash } from 'crypto'

// noble/ed25519 v2 需要注入 sha512
ed.etc.sha512Async = async (...msgs: Uint8Array[]) => {
  const data = ed.etc.concatBytes(...msgs)
  return sha512(data)
}

const REPLAY_WINDOW_MS = 30_000

/**
 * 将 hex 字符串转为 Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  return Uint8Array.from(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
}

/**
 * 验证 Agent join 消息的签名
 * 签名载荷：`tinker:join:${nodeId}:${roomId}:${timestamp}`
 */
export async function verifyJoinSignature(params: {
  nodeId: string
  publicKey: string
  roomId: string
  timestamp: number
  signature: string
}): Promise<{ ok: boolean; reason?: string }> {
  const { nodeId, publicKey, roomId, timestamp, signature } = params

  // 时间戳防重放
  const now = Date.now()
  if (Math.abs(now - timestamp) > REPLAY_WINDOW_MS) {
    return { ok: false, reason: `timestamp out of window: delta=${now - timestamp}ms` }
  }

  // 验证 nodeId = SHA-256(publicKey)
  const expectedNodeId = createHash('sha256').update(fromHex(publicKey)).digest('hex')
  if (expectedNodeId !== nodeId) {
    return { ok: false, reason: 'nodeId does not match SHA-256(publicKey)' }
  }

  // 验证签名
  try {
    const payload = `tinker:join:${nodeId}:${roomId}:${timestamp}`
    const msgBytes = new TextEncoder().encode(payload)
    const sig = fromHex(signature)
    const pub = fromHex(publicKey)
    const valid = await ed.verifyAsync(sig, msgBytes, pub)
    if (!valid) return { ok: false, reason: 'invalid signature' }
  } catch (err) {
    return { ok: false, reason: `signature verify error: ${err}` }
  }

  return { ok: true }
}

/**
 * 验证 TinkerMessage 的签名
 * 签名载荷：`${message.id}:${message.content}:${message.timestamp}`
 */
export async function verifyMessageSignature(params: {
  messageId: string
  content: string
  timestamp: number
  signature: string
  publicKey: string
}): Promise<{ ok: boolean; reason?: string }> {
  const { messageId, content, timestamp, signature, publicKey } = params

  try {
    const payload = `${messageId}:${content}:${timestamp}`
    const msgBytes = new TextEncoder().encode(payload)
    const sig = fromHex(signature)
    const pub = fromHex(publicKey)
    const valid = await ed.verifyAsync(sig, msgBytes, pub)
    if (!valid) return { ok: false, reason: 'invalid message signature' }
  } catch (err) {
    return { ok: false, reason: `signature verify error: ${err}` }
  }

  return { ok: true }
}
