/**
 * useTinkerNetwork — Connects tinker-desk to the tinker social network
 *
 * Lifecycle:
 *   1. On mount: create TinkerBridge → connect to relay(s)
 *   2. Subscribe to bridge events → update store + fire hook events
 *   3. On unmount: destroy bridge
 *
 * Provides:
 *   - bridge ref (for imperative actions like send/publishIntent)
 *   - findBuddy() — one-click 碰碰碰
 *   - sendChat() — DM to current buddy
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
  TinkerBridge,
  type BridgeEvent,
  type BridgeIdentity,
} from '../network/TinkerBridge';
import type { HookEvent } from '../types';

// Generate a persistent node ID (stored in localStorage)
function getOrCreateNodeId(): string {
  const KEY = 'tinker-desk-nodeId';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Singleton bridge ref shared across the app */
let globalBridge: TinkerBridge | null = null;

export function useTinkerNetwork() {
  const settings = useAppStore((s) => s.settings);
  const setOnline = useAppStore((s) => s.setOnline);
  const setConnectedPeers = useAppStore((s) => s.setConnectedPeers);
  const setActiveBuddy = useAppStore((s) => s.setActiveBuddy);
  const setPetState = useAppStore((s) => s.setPetState);
  const addBubble = useAppStore((s) => s.addBubble);

  // Track if this hook instance manages the bridge lifecycle
  const isOwner = useRef(false);

  // Store event emitter from HookEngine (passed in via App)
  const hookEmitRef = useRef<((event: HookEvent, ctx?: Record<string, unknown>) => void) | null>(null);

  /** Set the hook engine emit function (called from App) */
  const setHookEmit = useCallback(
    (fn: (event: HookEvent, ctx?: Record<string, unknown>) => void) => {
      hookEmitRef.current = fn;
    },
    []
  );

  // Connect on mount
  useEffect(() => {
    if (!settings.network.autoStart) return;
    if (globalBridge) return; // Already connected

    const nodeId = getOrCreateNodeId();
    const identity: BridgeIdentity = {
      nodeId,
      displayName: settings.network.displayName || settings.petName,
      role: 'pet',
      capabilities: ['chat', 'buddy-match'],
    };

    // Build relay URLs from settings
    const relays: string[] = [];
    if (settings.network.relayPort) {
      relays.push(`ws://localhost:${settings.network.relayPort}`);
    }
    for (const peer of settings.network.bootstrapPeers) {
      if (peer && !relays.includes(peer)) relays.push(peer);
    }

    // If no relays configured, don't connect
    if (relays.length === 0) return;

    const bridge = new TinkerBridge({ relays, identity });
    globalBridge = bridge;
    isOwner.current = true;

    // Subscribe to events
    const unsub = bridge.on((ev: BridgeEvent) => {
      switch (ev.event) {
        case 'connected':
          setOnline(true);
          break;

        case 'disconnected':
          if (!bridge.isConnected) setOnline(false);
          break;

        case 'peer_count':
          setConnectedPeers(ev.count);
          hookEmitRef.current?.('peer_discovered', { count: ev.count });
          break;

        case 'message':
          hookEmitRef.current?.('message_received', {
            from: ev.msg.from,
            content: ev.msg.content,
            room: ev.msg.room,
          });
          break;

        case 'dm':
          hookEmitRef.current?.('dm_received', {
            from: ev.msg.from,
            content: ev.msg.content,
          });
          // Show bubble for incoming DMs
          addBubble({
            text: `📩 ${ev.msg.content.slice(0, 50)}`,
            type: 'notification',
            expiresAt: Date.now() + 5000,
          });
          break;

        case 'agent_joined':
          hookEmitRef.current?.('peer_discovered', {
            nodeId: ev.agent.nodeId,
            displayName: ev.agent.displayName,
          });
          break;

        case 'agent_left':
          hookEmitRef.current?.('buddy_lost', { nodeId: ev.nodeId });
          break;

        case 'intent_matched':
          // Buddy found!
          setActiveBuddy(ev.intent.matchedNodeId ?? ev.intent.fromNodeId);
          setPetState('matched');
          hookEmitRef.current?.('buddy_found', {
            intentId: ev.intent.intentId,
            buddy: ev.intent.matchedNodeId,
          });
          addBubble({
            text: '🎉 Found a buddy!',
            type: 'notification',
            expiresAt: Date.now() + 5000,
          });
          // Revert to idle after celebration
          setTimeout(() => setPetState('idle'), 3000);
          break;

        case 'intent_expired':
          hookEmitRef.current?.('intent_expired', {
            intentId: ev.intentId,
          });
          break;

        case 'error':
          console.warn('[TinkerNetwork]', ev.message);
          break;
      }
    });

    // Connect
    bridge
      .connect()
      .then(() => {
        // Auto-join the global room
        bridge.joinRoom('tinker-desk-global');
      })
      .catch((err) => {
        console.warn('[TinkerNetwork] connect failed:', err);
        setOnline(false);
      });

    return () => {
      unsub();
      if (isOwner.current) {
        bridge.destroy();
        globalBridge = null;
        isOwner.current = false;
      }
    };
    // Only reconnect if relay config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.network.autoStart,
    settings.network.relayPort,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    settings.network.bootstrapPeers.join(','),
  ]);

  /** 碰碰碰 — Publish a buddy-match intent */
  const findBuddy = useCallback(async () => {
    if (!globalBridge?.isConnected) {
      addBubble({
        text: '📡 Not connected to any relay...',
        type: 'thought',
        expiresAt: Date.now() + 3000,
      });
      return;
    }

    setPetState('searching');
    addBubble({
      text: '🎲 Looking for a buddy...',
      type: 'speech',
      expiresAt: Date.now() + 5000,
    });

    try {
      const intent = await globalBridge.publishIntent({
        capability: 'buddy-match',
        description: `${settings.petName} is looking for a buddy!`,
        ttlMs: 30000, // 30 seconds
      });
      hookEmitRef.current?.('publish_intent', {
        intentId: intent.intentId,
        capability: 'buddy-match',
      });
    } catch (err) {
      console.warn('[findBuddy] failed:', err);
      setPetState('sad');
      addBubble({
        text: '😿 Couldn\'t reach the network...',
        type: 'thought',
        expiresAt: Date.now() + 3000,
      });
      setTimeout(() => setPetState('idle'), 2000);
    }
  }, [settings.petName, setPetState, addBubble]);

  /** Send a chat message to the current buddy */
  const sendChat = useCallback(
    (content: string) => {
      const buddy = useAppStore.getState().activeBuddy;
      if (!globalBridge?.isConnected || !buddy) return null;
      return globalBridge.sendDm({ to: buddy, content });
    },
    []
  );

  /** Send a message to the global room */
  const sendRoom = useCallback((content: string) => {
    if (!globalBridge?.isConnected) return null;
    return globalBridge.send({
      room: 'tinker-desk-global',
      content,
    });
  }, []);

  return {
    bridge: globalBridge,
    findBuddy,
    sendChat,
    sendRoom,
    setHookEmit,
  };
}
