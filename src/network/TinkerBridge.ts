/**
 * TinkerBridge — Browser-native tinker network client
 *
 * Replaces tinker-sdk's TinkerClient (which requires Node.js `ws` + `crypto`).
 * Uses native WebSocket + fetch + Web Crypto API.
 *
 * Features:
 * - Connect to relay(s) via native WebSocket
 * - Hello / join / message / dm protocol
 * - Event emitter (typed events)
 * - Message dedup (Set<string>)
 * - Auto-reconnect
 * - Intent publish/match via HTTP
 * - Browser-safe crypto (randomUUID)
 */

export interface BridgeIdentity {
  nodeId: string;
  displayName: string;
  role?: string;
  capabilities?: string[];
}

export interface BridgeMessage {
  id: string;
  type: string;
  from: string;
  to?: string;
  room?: string;
  content: string;
  timestamp: number;
  senderDisplayName?: string;
}

export interface BridgeIntent {
  intentId: string;
  fromNodeId: string;
  capability: string;
  description: string;
  status: string;
  matchedNodeId?: string;
  createdAt: number;
}

export interface BridgeAgent {
  nodeId: string;
  displayName: string;
  role?: string;
  capabilities?: string[];
  online: boolean;
  lastSeen?: number;
}

export type BridgeEvent =
  | { event: 'connected' }
  | { event: 'disconnected'; relay: string }
  | { event: 'reconnecting'; relay: string }
  | { event: 'message'; msg: BridgeMessage }
  | { event: 'dm'; msg: BridgeMessage }
  | { event: 'agent_joined'; agent: BridgeAgent }
  | { event: 'agent_left'; nodeId: string }
  | { event: 'intent_matched'; intent: BridgeIntent }
  | { event: 'intent_expired'; intentId: string }
  | { event: 'peer_count'; count: number }
  | { event: 'error'; message: string };

type EventHandler = (ev: BridgeEvent) => void;

export interface TinkerBridgeOptions {
  relays: string[];
  identity: BridgeIdentity;
  reconnectDelay?: number;
  pingInterval?: number;
}

interface RelayConn {
  url: string;
  ws: WebSocket | null;
  pingTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  destroyed: boolean;
}

const DEDUP_MAX = 500;

export class TinkerBridge {
  private relayUrls: string[];
  private httpUrls: string[];
  private identity: BridgeIdentity;
  private reconnectDelay: number;
  private pingInterval: number;
  private conns = new Map<string, RelayConn>();
  private joinedRooms = new Set<string>();
  private handlers = new Set<EventHandler>();
  private seenIds = new Set<string>();
  private seenOrder: string[] = [];
  private destroyed = false;

  constructor(opts: TinkerBridgeOptions) {
    this.relayUrls = opts.relays;
    this.httpUrls = opts.relays.map((u) =>
      u.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://')
    );
    this.identity = opts.identity;
    this.reconnectDelay = opts.reconnectDelay ?? 3000;
    this.pingInterval = opts.pingInterval ?? 25000;
  }

  // ─── Event system ──────────────────────────────────────────

  on(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(ev: BridgeEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(ev);
      } catch (err) {
        console.error('[TinkerBridge] handler error:', err);
      }
    }
  }

  // ─── Dedup ─────────────────────────────────────────────────

  private isDup(id: string): boolean {
    return this.seenIds.has(id);
  }

  private markSeen(id: string): void {
    if (this.seenIds.has(id)) return;
    this.seenIds.add(id);
    this.seenOrder.push(id);
    if (this.seenOrder.length > DEDUP_MAX) {
      const oldest = this.seenOrder.shift()!;
      this.seenIds.delete(oldest);
    }
  }

  // ─── Connect ───────────────────────────────────────────────

  async connect(): Promise<void> {
    const results = await Promise.allSettled(
      this.relayUrls.map((url) => this.connectRelay(url))
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    if (ok === 0) throw new Error('TinkerBridge: failed to connect to any relay');
    // Verify at least one WebSocket is still actually OPEN before emitting
    // (a relay could have connected and immediately disconnected)
    if (this.isConnected) {
      this.emit({ event: 'connected' });
    }
    this.updatePeerCount();
  }

  private connectRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn: RelayConn = {
        url,
        ws: null,
        pingTimer: null,
        reconnectTimer: null,
        destroyed: false,
      };
      this.conns.set(url, conn);

      try {
        const ws = new WebSocket(url);
        conn.ws = ws;

        ws.onopen = () => {
          // Send hello
          const { nodeId, displayName, role, capabilities } = this.identity;
          ws.send(
            JSON.stringify({ type: 'hello', nodeId, displayName, role, capabilities })
          );
          this.startPing(conn);
          resolve();
        };

        ws.onerror = (e) => {
          console.warn(`[TinkerBridge] ${url} error`, e);
          reject(new Error(`WebSocket error: ${url}`));
        };

        ws.onmessage = (e) => {
          this.handleMessage(String(e.data), url);
        };

        ws.onclose = () => {
          this.stopPing(conn);
          this.emit({ event: 'disconnected', relay: url });
          this.updatePeerCount();

          if (!this.destroyed && !conn.destroyed && this.reconnectDelay > 0) {
            this.emit({ event: 'reconnecting', relay: url });
            conn.reconnectTimer = setTimeout(
              () => this.reconnectRelay(url),
              this.reconnectDelay
            );
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async reconnectRelay(url: string): Promise<void> {
    try {
      await this.connectRelay(url);
      // Re-join rooms
      for (const roomId of this.joinedRooms) {
        this.joinRoomOnConn(url, roomId);
      }
      this.updatePeerCount();
    } catch {
      // Will retry on next close
    }
  }

  private startPing(conn: RelayConn): void {
    conn.pingTimer = setInterval(() => {
      if (conn.ws?.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.pingInterval);
  }

  private stopPing(conn: RelayConn): void {
    if (conn.pingTimer) {
      clearInterval(conn.pingTimer);
      conn.pingTimer = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const conn of this.conns.values()) {
      conn.destroyed = true;
      this.stopPing(conn);
      if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
      conn.ws?.close();
    }
    this.conns.clear();
  }

  // ─── Rooms ─────────────────────────────────────────────────

  joinRoom(roomId: string): void {
    this.joinedRooms.add(roomId);
    for (const url of this.conns.keys()) {
      this.joinRoomOnConn(url, roomId);
    }
  }

  private joinRoomOnConn(url: string, roomId: string): void {
    const conn = this.conns.get(url);
    if (!conn?.ws || conn.ws.readyState !== WebSocket.OPEN) return;
    const { nodeId, displayName, role, capabilities } = this.identity;
    conn.ws.send(
      JSON.stringify({
        type: 'join',
        roomId,
        nodeId,
        displayName,
        role,
        capabilities,
        timestamp: Date.now(),
        signature: '',
      })
    );
  }

  leaveRoom(roomId: string): void {
    this.joinedRooms.delete(roomId);
    this.sendAll({
      type: 'leave',
      roomId,
      nodeId: this.identity.nodeId,
    });
  }

  // ─── Send ──────────────────────────────────────────────────

  send(params: { room: string; content: string; to?: string }): BridgeMessage {
    const msg: BridgeMessage = {
      id: crypto.randomUUID(),
      type: 'text',
      from: this.identity.nodeId,
      room: params.room,
      to: params.to,
      content: params.content,
      timestamp: Date.now(),
    };
    this.markSeen(msg.id);
    this.sendAll({ type: 'message', payload: msg });
    return msg;
  }

  sendDm(params: { to: string; content: string }): BridgeMessage {
    const msg: BridgeMessage = {
      id: crypto.randomUUID(),
      type: 'text',
      from: this.identity.nodeId,
      to: params.to,
      content: params.content,
      timestamp: Date.now(),
    };
    this.markSeen(msg.id);
    this.sendAll({ type: 'dm', payload: msg });
    return msg;
  }

  private sendAll(msg: Record<string, unknown>): void {
    const data = JSON.stringify(msg);
    for (const conn of this.conns.values()) {
      if (conn.ws?.readyState === WebSocket.OPEN) {
        conn.ws.send(data);
      }
    }
  }

  // ─── HTTP API ──────────────────────────────────────────────

  private async fetchHttp<T>(path: string, init?: RequestInit): Promise<T> {
    let lastErr: unknown;
    for (const base of this.httpUrls) {
      try {
        const resp = await fetch(`${base}${path}`, init);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return (await resp.json()) as T;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error('No relay HTTP URL available');
  }

  async getAgents(): Promise<BridgeAgent[]> {
    const data = await this.fetchHttp<{ agents: BridgeAgent[] }>('/agents');
    return data.agents;
  }

  async publishIntent(params: {
    capability: string;
    description: string;
    constraints?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<BridgeIntent> {
    const data = await this.fetchHttp<{ intent: BridgeIntent }>('/intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromNodeId: this.identity.nodeId,
        ...params,
      }),
    });
    return data.intent;
  }

  async matchIntent(intentId: string, matchedNodeId: string): Promise<void> {
    this.sendAll({ type: 'intent_match', intentId, matchedNodeId });
  }

  async getIntents(capability?: string): Promise<BridgeIntent[]> {
    const qs = capability ? `?capability=${encodeURIComponent(capability)}` : '';
    const data = await this.fetchHttp<{ intents: BridgeIntent[] }>(`/intents${qs}`);
    return data.intents;
  }

  /**
   * Fetch DM history between two nodes from the relay.
   * Returns an empty array if the relay does not support this endpoint.
   */
  async getDmHistory(nodeA: string, nodeB: string): Promise<BridgeMessage[]> {
    try {
      const data = await this.fetchHttp<{ messages: BridgeMessage[] }>(
        `/history/dm/${nodeA}/${nodeB}`
      );
      return data.messages ?? [];
    } catch {
      return []; // Relay may not support history
    }
  }

  // ─── Message handling ──────────────────────────────────────

  private handleMessage(raw: string, _fromRelay: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'message': {
        const payload = msg.payload as BridgeMessage;
        if (this.isDup(payload.id)) return;
        this.markSeen(payload.id);
        this.emit({ event: 'message', msg: payload });
        break;
      }
      case 'dm': {
        const payload = msg.payload as BridgeMessage;
        if (this.isDup(payload.id)) return;
        this.markSeen(payload.id);
        this.emit({ event: 'dm', msg: payload });
        break;
      }
      case 'agent_joined':
        this.emit({
          event: 'agent_joined',
          agent: msg.agent as BridgeAgent,
        });
        this.updatePeerCount();
        break;
      case 'agent_left':
        this.emit({ event: 'agent_left', nodeId: msg.nodeId as string });
        this.updatePeerCount();
        break;
      case 'intent_matched':
        this.emit({
          event: 'intent_matched',
          intent: msg.intent as BridgeIntent,
        });
        break;
      case 'intent_expired':
        this.emit({
          event: 'intent_expired',
          intentId: msg.intentId as string,
        });
        break;
      case 'pong':
      case 'ack':
        break;
      default:
        break;
    }
  }

  private async updatePeerCount(): Promise<void> {
    try {
      const agents = await this.getAgents();
      const count = agents.filter((a) => a.online && a.nodeId !== this.identity.nodeId).length;
      this.emit({ event: 'peer_count', count });
    } catch {
      // Ignore HTTP errors for peer count
    }
  }

  // ─── Status ────────────────────────────────────────────────

  get isConnected(): boolean {
    return [...this.conns.values()].some(
      (c) => c.ws?.readyState === WebSocket.OPEN
    );
  }

  get connectedRelayCount(): number {
    return [...this.conns.values()].filter(
      (c) => c.ws?.readyState === WebSocket.OPEN
    ).length;
  }

  get nodeId(): string {
    return this.identity.nodeId;
  }
}
