/**
 * TinkerRelay — class-based wrapper around the Tinker Relay Server v0.9.0
 *
 * Wraps the procedural relay server into a TinkerRelay class with
 * start() and stop() methods for programmatic embedding.
 */
export interface TinkerRelayOptions {
    /** Listening port (default 7077) */
    port?: number;
    /** Listening host (default '0.0.0.0') */
    host?: string;
    /** Data directory for SQLite DB (default ~/.tinker) */
    dataDir?: string;
    /** Require signature verification on join (default false) */
    authRequired?: boolean;
    /** Require signature verification on message/dm (default false) */
    msgAuth?: boolean;
    /** Enable verbose logging (default true) */
    verbose?: boolean;
    /** Gossip peer relay addresses */
    peerRelays?: string[];
    /** Heartbeat interval in ms (default 30000) */
    heartbeatIntervalMs?: number;
}
export declare class TinkerRelay {
    private readonly port;
    private readonly host;
    private readonly authRequired;
    private readonly msgAuth;
    private readonly verbose;
    private readonly heartbeatIntervalMs;
    private httpServer;
    private wss;
    private heartbeatInterval;
    private reputationInterval;
    private vitalityInterval;
    private isShuttingDown;
    private _isRunning;
    private wsToNodeId;
    private wsAlive;
    private knownRelays;
    constructor(opts?: TinkerRelayOptions);
    get address(): string;
    get httpAddress(): string;
    get isRunning(): boolean;
    private log;
    private jsonResp;
    private announceRelay;
    private getKnownRelays;
    /** Auto-create a #cap:<capability> channel if it doesn't exist */
    private ensureCapabilityChannel;
    start(): Promise<void>;
    stop(): Promise<void>;
    private startIntervals;
    private handleRequest;
    private handleConnection;
    private handleWsMessage;
    private handleWsClose;
}
//# sourceMappingURL=relay.d.ts.map