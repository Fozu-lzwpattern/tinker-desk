/**
 * StatusBar — minimal HUD showing network status and pet info
 * Anchored to bottom of screen, click-through except on interactive elements
 */

import React from 'react';
import { useAppStore } from '../store/appStore';

export function StatusBar() {
  const isOnline = useAppStore((s) => s.isOnline);
  const connectedPeers = useAppStore((s) => s.connectedPeers);
  const petName = useAppStore((s) => s.settings.petName);
  const activeBuddy = useAppStore((s) => s.activeBuddy);
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, monospace',
        color: '#94a3b8',
      }}
    >
      {/* Network indicator */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isOnline ? '#34d399' : '#ef4444',
          display: 'inline-block',
        }}
      />
      <span>{isOnline ? `${connectedPeers} peers` : 'offline'}</span>

      {activeBuddy && (
        <span style={{ color: '#f472b6' }}>🤝 buddy</span>
      )}

      <span style={{ color: '#6ee7b7' }}>{petName}</span>

      {/* Settings gear */}
      <button
        onClick={toggleSettings}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: 14,
          padding: '0 2px',
        }}
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  );
}
