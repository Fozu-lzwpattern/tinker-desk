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
  const globalChatOpen = useAppStore((s) => s.globalChatOpen);
  const toggleGlobalChat = useAppStore((s) => s.toggleGlobalChat);
  const agentHubOpen = useAppStore((s) => s.agentHubOpen);
  const toggleAgentHub = useAppStore((s) => s.toggleAgentHub);
  const agentCount = useAppStore((s) => s.settings.agents.length);
  const runningAgents = useAppStore((s) => s.settings.agents.filter((a) => a.status === 'running').length);

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
      <span style={{ color: '#475569' }}>|</span>
      <button
        onClick={toggleGlobalChat}
        title="Toggle global room chat"
        style={{
          background: globalChatOpen ? '#3b82f6' : 'none',
          border: globalChatOpen ? 'none' : '1px solid #334155',
          borderRadius: 5,
          color: globalChatOpen ? 'white' : '#94a3b8',
          cursor: 'pointer',
          fontSize: 13,
          padding: '1px 6px',
          lineHeight: 1.4,
        }}
      >
        💬
      </button>
      <button
        onClick={toggleAgentHub}
        title={`Agent Hub (${runningAgents}/${agentCount} running)`}
        style={{
          background: agentHubOpen ? '#8b5cf6' : 'none',
          border: agentHubOpen ? 'none' : '1px solid #334155',
          borderRadius: 5,
          color: agentHubOpen ? 'white' : '#94a3b8',
          cursor: 'pointer',
          fontSize: 13,
          padding: '1px 6px',
          lineHeight: 1.4,
          position: 'relative',
        }}
      >
        🤖
        {runningAgents > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#22c55e',
              border: '1px solid rgba(15, 23, 42, 0.85)',
            }}
          />
        )}
      </button>
    </div>
  );
}
