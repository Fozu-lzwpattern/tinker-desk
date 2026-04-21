/**
 * ContextMenu — right-click menu on the pet
 *
 * Actions: Find Buddy / Settings / Change State / About
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTinkerNetwork } from '../hooks/useTinkerNetwork';
import type { PetState } from '../types';

interface MenuPosition {
  x: number;
  y: number;
}

const QUICK_STATES: { state: PetState; label: string }[] = [
  { state: 'idle', label: '😊 Idle' },
  { state: 'excited', label: '🤩 Excited' },
  { state: 'sit', label: '🪑 Sit' },
  { state: 'sleep', label: '😴 Sleep' },
  { state: 'think', label: '🤔 Think' },
  { state: 'wave', label: '👋 Wave' },
  { state: 'searching', label: '🔍 Searching' },
];

export function ContextMenu() {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const [showStates, setShowStates] = useState(false);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const setPetState = useAppStore((s) => s.setPetState);
  const addBubble = useAppStore((s) => s.addBubble);
  const petName = useAppStore((s) => s.settings.petName);
  const isOnline = useAppStore((s) => s.isOnline);
  const connectedPeers = useAppStore((s) => s.connectedPeers);

  const { findBuddy } = useTinkerNetwork();

  // Listen for right-click on the pet sprite
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const pos = useAppStore.getState().position;
      const dx = e.clientX - (pos.x + 40);
      const dy = e.clientY - (pos.y + 40);
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
        setShowStates(false);
      }
    };
    window.addEventListener('contextmenu', handler);
    return () => window.removeEventListener('contextmenu', handler);
  }, []);

  // Close menu on any click
  useEffect(() => {
    if (!menu) return;
    const handler = () => setMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [menu]);

  const handleFindBuddy = useCallback(() => {
    findBuddy();
    setMenu(null);
  }, [findBuddy]);

  if (!menu) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        zIndex: 30000,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 8,
        padding: '4px 0',
        minWidth: 180,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        color: '#e2e8f0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem
        icon="🎲"
        label="Find Buddy"
        hint={isOnline ? `${connectedPeers} online` : 'offline'}
        onClick={handleFindBuddy}
      />
      <Separator />
      <MenuItem
        icon="🎭"
        label="Change State"
        arrow
        onClick={() => setShowStates(!showStates)}
      />
      {showStates && (
        <div style={{ paddingLeft: 16 }}>
          {QUICK_STATES.map(({ state, label }) => (
            <MenuItem
              key={state}
              label={label}
              onClick={() => {
                setPetState(state);
                setMenu(null);
              }}
            />
          ))}
        </div>
      )}
      <Separator />
      <MenuItem
        icon="⚙️"
        label="Settings"
        onClick={() => {
          toggleSettings();
          setMenu(null);
        }}
      />
      <MenuItem
        icon="ℹ️"
        label={`About ${petName}`}
        onClick={() => {
          addBubble({
            text: `Hi! I'm ${petName} ✨\n${isOnline ? `Connected • ${connectedPeers} peers` : 'Offline mode'}\nPowered by tinker network`,
            type: 'speech',
            expiresAt: Date.now() + 4000,
          });
          setMenu(null);
        }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  arrow,
  onClick,
}: {
  icon?: string;
  label: string;
  hint?: string;
  arrow?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = '#1e293b';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {icon && <span style={{ width: 20 }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: '#64748b' }}>{hint}</span>}
      {arrow && <span style={{ color: '#64748b' }}>▸</span>}
    </div>
  );
}

function Separator() {
  return <div style={{ height: 1, background: '#1e293b', margin: '4px 0' }} />;
}
