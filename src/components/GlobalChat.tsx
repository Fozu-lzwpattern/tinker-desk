/**
 * GlobalChat — shows recent messages from the tinker-desk-global room
 *
 * A floating message feed toggled from the StatusBar (💬 button).
 * Positioned at top-right in browser mode.
 *
 * Features:
 * - Listens for global room messages via bridge.on()
 * - Shows last 20 messages with sender display name + timestamp
 * - Input to send messages to the global room via sendRoom()
 * - Collapsible / closeable
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTinkerNetwork } from '../hooks/useTinkerNetwork';

interface GlobalMessage {
  id: string;
  from: string;         // nodeId
  displayName: string;  // human-readable name
  text: string;
  time: number;
}

const MAX_MESSAGES = 20;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function GlobalChat() {
  const globalChatOpen = useAppStore((s) => s.globalChatOpen);
  const petName = useAppStore((s) => s.settings.petName);
  const { bridge, sendRoom } = useTinkerNetwork();

  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Append a new message, keeping at most MAX_MESSAGES
  const appendMessage = useCallback((msg: GlobalMessage) => {
    setMessages((prev) => {
      const updated = [...prev, msg];
      return updated.length > MAX_MESSAGES
        ? updated.slice(updated.length - MAX_MESSAGES)
        : updated;
    });
    // Scroll to bottom after render
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  // Subscribe to bridge events for global room messages
  useEffect(() => {
    if (!bridge) return;

    const unsub = bridge.on((ev) => {
      if (ev.event === 'message' && ev.msg.room === 'tinker-desk-global') {
        appendMessage({
          id: ev.msg.id,
          from: ev.msg.from,
          displayName: ev.msg.senderDisplayName ?? ev.msg.from.slice(0, 8),
          text: ev.msg.content,
          time: ev.msg.timestamp ?? Date.now(),
        });
      }
    });

    return unsub;
  }, [bridge, appendMessage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const result = sendRoom(text);
    if (result) {
      appendMessage({
        id: result.id,
        from: bridge?.nodeId ?? 'me',
        displayName: petName + ' (me)',
        text,
        time: Date.now(),
      });
      setInput('');
    }
  }, [input, sendRoom, appendMessage, bridge, petName]);

  if (!globalChatOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 15000,
        width: 280,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        animation: 'fadeInUp 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column',
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
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
          🌐 Global Room
        </span>
        <button
          onClick={() => useAppStore.getState().toggleGlobalChat()}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 2px',
            lineHeight: 1,
          }}
          title="Close global chat"
        >
          ×
        </button>
      </div>

      {/* Message feed */}
      <div
        ref={scrollRef}
        style={{
          height: 200,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: '#475569',
              textAlign: 'center',
              padding: '20px 0',
              fontSize: 12,
            }}
          >
            No messages yet. Say hello! 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.from === bridge?.nodeId;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#64748b',
                  marginBottom: 2,
                }}
              >
                {isMe ? 'You' : msg.displayName} · {formatTime(msg.time)}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 10,
                  background: isMe ? '#3b82f6' : '#334155',
                  color: '#e2e8f0',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  fontSize: 12,
                }}
              >
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message the room..."
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
