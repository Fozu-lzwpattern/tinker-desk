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
  const connectionState = useAppStore((s) => s.connectionState);
  const petState = useAppStore((s) => s.petState);
  const petName = useAppStore((s) => s.settings.petName);
  const globalChatOpen = useAppStore((s) => s.globalChatOpen);
  const toggleGlobalChat = useAppStore((s) => s.toggleGlobalChat);
  const unreadDmCount = useAppStore((s) => s.unreadDmCount);
  const clearUnreadDm = useAppStore((s) => s.clearUnreadDm);
  const agentHubOpen = useAppStore((s) => s.agentHubOpen);
  const toggleAgentHub = useAppStore((s) => s.toggleAgentHub);
  const agentCount = useAppStore((s) => s.settings.agents.length);
  const runningAgents = useAppStore((s) => s.settings.agents.filter((a) => a.status === 'running').length);

  // P1 #7: Connection dot appearance based on connectionState
  const connectionDotStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      width: 7,
      height: 7,
      borderRadius: '50%',
      display: 'inline-block',
    };
    if (connectionState === 'connected') {
      return {
        ...base,
        background: '#22c55e',
        boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
        animation: 'pulse-green 2s ease-out infinite',
      };
    } else if (connectionState === 'reconnecting') {
      return { ...base, background: '#f59e0b' };
    }
    return { ...base, background: '#64748b' };
  })();

  const connectionLabel = (() => {
    if (connectionState === 'connected') {
      return `${connectedPeers} peer${connectedPeers !== 1 ? 's' : ''}`;
    } else if (connectionState === 'reconnecting') {
      return 'reconnecting...';
    }
    return 'offline';
  })();

  const connectionLabelColor = (() => {
    if (connectionState === 'reconnecting') return '#f59e0b';
    if (connectionState === 'disconnected') return '#64748b';
    return '#94a3b8';
  })();

  const handleChatClick = () => {
    toggleGlobalChat();
    clearUnreadDm();
  };

  return (
    <>
      {/* Keyframe injection for pulse-green animation */}
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
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

        {/* P1 #7: Enhanced connection status indicator */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: connectionLabelColor,
          }}
        >
          <span style={connectionDotStyle} />
          {connectionLabel}
          {connectionState === 'reconnecting' && (
            <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 1 }}>⟳</span>
          )}
        </span>

        <span style={{ color: '#475569' }}>|</span>
        <span>{petState}</span>
        <span style={{ color: '#475569' }}>|</span>

        {/* P1 #6: Chat button with unread badge */}
        <button
          onClick={handleChatClick}
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
            position: 'relative',
          }}
        >
          💬
          {unreadDmCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: '#ef4444',
                border: '1.5px solid rgba(15, 23, 42, 0.85)',
                color: 'white',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                lineHeight: 1,
              }}
            >
              {unreadDmCount > 99 ? '99+' : unreadDmCount}
            </span>
          )}
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
    </>
  );
}
