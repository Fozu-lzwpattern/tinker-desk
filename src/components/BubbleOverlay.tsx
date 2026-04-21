/**
 * BubbleOverlay — speech/thought bubbles above the pet
 *
 * In Tauri mode: positioned relative to center (where pet lives).
 * In browser mode: follows the pet's CSS position.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

export function BubbleOverlay() {
  const bubbles = useAppStore((s) => s.bubbles);
  const position = useAppStore((s) => s.position);
  const removeBubble = useAppStore((s) => s.removeBubble);

  // Auto-expire bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const b of useAppStore.getState().bubbles) {
        if (b.expiresAt <= now) {
          removeBubble(b.id);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [removeBubble]);

  if (bubbles.length === 0) return null;

  const tauriMode = isTauri();

  return (
    <>
      {bubbles.map((bubble, i) => {
        const style: React.CSSProperties = tauriMode
          ? {
              // In Tauri: position above center of window
              position: 'absolute',
              left: '50%',
              top: `calc(50% - ${80 + i * 44}px)`,
              transform: 'translateX(-50%)',
              zIndex: 10000,
              animation: 'fadeInUp 0.3s ease-out',
              pointerEvents: 'none', // Don't block pet interaction
            }
          : {
              position: 'fixed',
              left: position.x - 20,
              top: position.y - 50 - i * 40,
              zIndex: 10000,
              animation: 'fadeInUp 0.3s ease-out',
              pointerEvents: 'none',
            };

        return (
          <div key={bubble.id} style={style}>
            <div
              style={{
                background:
                  bubble.type === 'thought'
                    ? 'rgba(147, 197, 253, 0.95)'
                    : bubble.type === 'notification'
                    ? 'rgba(251, 191, 36, 0.95)'
                    : 'rgba(255, 255, 255, 0.95)',
                color: '#1f2937',
                padding: '6px 12px',
                borderRadius: bubble.type === 'thought' ? '12px' : '12px 12px 12px 4px',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                maxWidth: '200px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
              }}
            >
              {bubble.type === 'thought' && '💭 '}
              {bubble.type === 'notification' && '🔔 '}
              {bubble.text}
            </div>
          </div>
        );
      })}
    </>
  );
}
