/**
 * StatusBar — minimal status display (browser mode only)
 *
 * Shows connection status, peer count, and pet state.
 * Hidden in Tauri mode (information is in the tray tooltip + context menu).
 */

import React from 'react';
import { useAppStore } from '../store/appStore';

export function StatusBar() {
  const isOnline = useAppStore((s) => s.isOnline);
  const connectedPeers = useAppStore((s) => s.connectedPeers);
  const petState = useAppStore((s) => s.petState);
  const petName = useAppStore((s) => s.settings.petName);

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 12px',
        background: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 8,
        fontSize: 12,
        fontFamily: 'system-ui, sans-serif',
        color: '#94a3b8',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
        🐾 {petName}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#64748b',
            display: 'inline-block',
          }}
        />
        {isOnline ? `${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''}` : 'offline'}
      </span>
      <span style={{ color: '#475569' }}>|</span>
      <span>{petState}</span>
    </div>
  );
}
