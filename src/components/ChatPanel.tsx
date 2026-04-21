/**
 * ChatPanel — Minimal chat interface for DM with active buddy
 *
 * In Tauri mode: positioned to the right of center (relative to pet).
 * In browser mode: follows the pet's CSS position.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useTinkerNetwork } from '../hooks/useTinkerNetwork';
import type { BridgeMessage } from '../network/TinkerBridge';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

interface ChatMessage {
  id: string;
  from: 'me' | 'buddy';
  text: string;
  time: number;
}

export function ChatPanel() {
  const activeBuddy = useAppStore((s) => s.activeBuddy);
  const position = useAppStore((s) => s.position);
  const petName = useAppStore((s) => s.settings.petName);
  const { sendChat, bridge } = useTinkerNetwork();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for incoming DMs from the buddy
  useEffect(() => {
    if (!bridge || !activeBuddy) return;

    const unsub = bridge.on((ev) => {
      if (ev.event === 'dm' && ev.msg.from === activeBuddy) {
        setMessages((prev) => [
          ...prev,
          { id: ev.msg.id, from: 'buddy', text: ev.msg.content, time: Date.now() },
        ]);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        }, 50);
      }
    });

    return unsub;
  }, [bridge, activeBuddy]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const msg = sendChat(input.trim());
    if (msg) {
      setMessages((prev) => [
        ...prev,
        { id: msg.id, from: 'me', text: input.trim(), time: Date.now() },
      ]);
      setInput('');
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }, 50);
    }
  }, [input, sendChat]);

  if (!activeBuddy) return null;

  const tauriMode = isTauri();

  // Position for minimized badge
  const minStyle: React.CSSProperties = tauriMode
    ? { position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }
    : { position: 'fixed', left: position.x + 90, top: position.y - 10 };

  // Position for full panel
  const panelStyle: React.CSSProperties = tauriMode
    ? { position: 'absolute', right: 10, top: 10 }
    : { position: 'fixed', left: position.x + 90, top: position.y - 180 };

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          ...minStyle,
          zIndex: 20000,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: '4px 10px',
          fontSize: 12,
          color: '#94a3b8',
          cursor: 'pointer',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        💬 Chat
      </div>
    );
  }

  return (
    <div
      style={{
        ...panelStyle,
        zIndex: 20000,
        width: 240,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        animation: 'fadeInUp 0.2s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          background: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
        }}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
          💬 {petName}'s Chat
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
              padding: 2,
            }}
          >
            −
          </button>
          <button
            onClick={() => useAppStore.getState().setActiveBuddy(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
              padding: 2,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          height: 120,
          overflowY: 'auto',
          padding: '8px 12px',
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#475569', textAlign: 'center', padding: 16, fontSize: 12 }}>
            Say hi to your buddy! 👋
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 6,
              textAlign: msg.from === 'me' ? 'right' : 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 10,
                background: msg.from === 'me' ? '#3b82f6' : '#334155',
                color: '#e2e8f0',
                maxWidth: '80%',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          gap: 6,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '4px 8px',
            color: '#e2e8f0',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: '#3b82f6',
            border: 'none',
            borderRadius: 6,
            padding: '4px 10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
