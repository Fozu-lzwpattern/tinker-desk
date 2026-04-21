/**
 * AgentSDK — Helper for external agents to connect to tinker-desk's relay
 *
 * This is a lightweight, browser-native SDK that external agents can import
 * to participate in the tinker network. It handles the WebSocket handshake,
 * manifest exchange, message routing, and structured messaging.
 *
 * Usage:
 *   const sdk = new AgentSDK({ relay: 'ws://localhost:3210', manifest: {...} });
 *   await sdk.connect();
 *   sdk.onMessage((msg) => { ... });
 *   sdk.send('room-id', 'Hello!');
 *   sdk.sendStructured('room-id', { version: '1.0', messageType: 'text', payload: { text: 'Hi' } });
 */

import type { AgentManifest, StructuredMessage } from '../types';

// ─── Public types ──────────────────────────────────────────────

export interface SDKOptions {
  /** WebSocket URL of the tinker relay to connect to */
  relay: string;
  /** This agent's self-description */
  manifest: AgentManifest;
  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Delay between reconnect attempts in ms (default: 3000) */
  reconnectDelay?: number;
}

export interface SDKIncomingMessage {
  /** Message type: 'text' | 'dm' | 'structured' | 'raw' */
  kind: 'text' | 'dm' | 'structured' | 'raw';
  /** Originating room (if a room message) */
  room?: string;
  /** Sender nodeId */
  from: string;
  /** Raw text content (for 'text' kind) */
  content?: string;
  /** Parsed StructuredMessage (for 'structured' kind) */
  structured?: StructuredMessage;
  /** Full raw parsed payload (for 'raw' kind or inspection) */
  raw: Record<string, unknown>;
}

type MessageHandler = (msg: SDKIncomingMessage) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting') => void;

// ─── AgentSDK ──────────────────────────────────────────────────

export class AgentSDK {
  private relay: string;
  private manifest: AgentManifest;
  private reconnect: boolean;
  private reconnectDelay: number;

  private ws: WebSocket | null = null;
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();

  constructor(opts: SDKOptions) {
    this.relay = opts.relay;
    this.manifest = opts.manifest;
    this.reconnect = opts.reconnect ?? true;
    this.reconnectDelay = opts.reconnectDelay ?? 3000;
  }

  // ─── Lifecycle ───────────────────────────────────────────────

  /**
   * Connect to the relay and perform the hello + manifest_exchange handshake.
   * Resolves when the WebSocket opens; rejects on immediate connection failure.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.destroyed) {
        reject(new Error('AgentSDK: already destroyed'));
        return;
      }

      try {
        const ws = new WebSocket(this.relay);
        this.ws = ws;

        ws.onopen = () => {
          // Send standard tinker hello
          this.sendRaw({
            type: 'hello',
            nodeId: this.manifest.agentId,
            displayName: this.manifest.name,
            role: 'agent',
            capabilities: this.manifest.capabilities,
          });

          // Also perform manifest exchange so peers know our full description
          this.sendRaw({
            type: 'message',
            payload: {
              id: this.uuid(),
              type: 'structured',
              from: this.manifest.agentId,
              content: JSON.stringify({
                version: '1.0',
                messageType: 'manifest_exchange',
                manifest: this.manifest,
                payload: {},
              } satisfies StructuredMessage),
              timestamp: Date.now(),
            },
          });

          this.emitStatus('connected');
          resolve();
        };

        ws.onerror = (e) => {
          console.warn('[AgentSDK] WebSocket error', e);
          reject(new Error(`AgentSDK: WebSocket connection failed to ${this.relay}`));
        };

        ws.onmessage = (e) => {
          this.handleRaw(String(e.data));
        };

        ws.onclose = () => {
          this.emitStatus('disconnected');
          if (!this.destroyed && this.reconnect) {
            this.emitStatus('reconnecting');
            this.reconnectTimer = setTimeout(() => {
              if (!this.destroyed) {
                this.connect().catch((err) =>
                  console.warn('[AgentSDK] reconnect failed:', err)
                );
              }
            }, this.reconnectDelay);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the relay and stop any reconnect attempts.
   */
  disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Handlers ────────────────────────────────────────────────

  /**
   * Register a handler for incoming messages (text, DM, structured).
   * Returns an unsubscribe function.
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register a handler for connection status changes.
   * Returns an unsubscribe function.
   */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // ─── Send ─────────────────────────────────────────────────────

  /**
   * Send a plain text message to a room.
   */
  send(room: string, content: string): void {
    this.sendRaw({
      type: 'message',
      payload: {
        id: this.uuid(),
        type: 'text',
        from: this.manifest.agentId,
        room,
        content,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send a direct message (DM) to a specific peer node.
   */
  sendDm(to: string, content: string): void {
    this.sendRaw({
      type: 'dm',
      payload: {
        id: this.uuid(),
        type: 'text',
        from: this.manifest.agentId,
        to,
        content,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send a StructuredMessage to a room.
   * The StructuredMessage is JSON-serialised into the `content` field of a
   * standard tinker message envelope so that peers without the SDK can still
   * route it, while SDK-aware peers will parse it back out.
   */
  sendStructured(room: string, msg: StructuredMessage): void {
    this.sendRaw({
      type: 'message',
      payload: {
        id: this.uuid(),
        type: 'structured',
        from: this.manifest.agentId,
        room,
        content: JSON.stringify(msg),
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Join a room so we receive its messages.
   */
  joinRoom(roomId: string): void {
    this.sendRaw({
      type: 'join',
      roomId,
      nodeId: this.manifest.agentId,
      displayName: this.manifest.name,
      role: 'agent',
      capabilities: this.manifest.capabilities,
      timestamp: Date.now(),
      signature: '',
    });
  }

  /**
   * Leave a room.
   */
  leaveRoom(roomId: string): void {
    this.sendRaw({
      type: 'leave',
      roomId,
      nodeId: this.manifest.agentId,
    });
  }

  // ─── Status ──────────────────────────────────────────────────

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get nodeId(): string {
    return this.manifest.agentId;
  }

  // ─── Internals ───────────────────────────────────────────────

  private sendRaw(msg: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[AgentSDK] sendRaw called while not connected — message dropped');
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  private handleRaw(raw: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = parsed.type as string | undefined;

    if (type === 'message') {
      const payload = (parsed.payload ?? {}) as Record<string, unknown>;
      const contentStr = payload.content as string | undefined;
      const from = (payload.from as string) ?? '';
      const room = payload.room as string | undefined;

      // Try to parse as StructuredMessage
      if (payload.type === 'structured' && contentStr) {
        try {
          const structured = JSON.parse(contentStr) as StructuredMessage;
          this.emitMessage({
            kind: 'structured',
            room,
            from,
            structured,
            raw: parsed,
          });
          return;
        } catch {
          // Fall through to plain text handling
        }
      }

      this.emitMessage({
        kind: 'text',
        room,
        from,
        content: contentStr,
        raw: parsed,
      });
      return;
    }

    if (type === 'dm') {
      const payload = (parsed.payload ?? {}) as Record<string, unknown>;
      this.emitMessage({
        kind: 'dm',
        from: (payload.from as string) ?? '',
        content: payload.content as string | undefined,
        raw: parsed,
      });
      return;
    }

    // Emit all other types as 'raw' for custom processing
    if (type && type !== 'pong' && type !== 'ack') {
      this.emitMessage({
        kind: 'raw',
        from: (parsed.nodeId as string) ?? '',
        raw: parsed,
      });
    }
  }

  private emitMessage(msg: SDKIncomingMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(msg);
      } catch (err) {
        console.error('[AgentSDK] message handler error:', err);
      }
    }
  }

  private emitStatus(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch (err) {
        console.error('[AgentSDK] status handler error:', err);
      }
    }
  }

  private uuid(): string {
    return crypto.randomUUID();
  }
}
