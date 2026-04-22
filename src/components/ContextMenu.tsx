/**
 * ContextMenu — right-click menu on the pet
 *
 * Actions: Find Buddy / Settings / Change State / About
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTinkerNetwork } from '../hooks/useTinkerNetwork';
import type { PetState } from '../types';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

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
  const toggleAgentHub = useAppStore((s) => s.toggleAgentHub);
  const setPetState = useAppStore((s) => s.setPetState);
  const addBubble = useAppStore((s) => s.addBubble);
  const petName = useAppStore((s) => s.settings.petName);
  const isOnline = useAppStore((s) => s.isOnline);
  const connectedPeers = useAppStore((s) => s.connectedPeers);
  const agentCount = useAppStore((s) => s.settings.agents.length);

  const { findBuddy } = useTinkerNetwork();

  // Listen for right-click on the pet sprite
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const tauriMode = isTauri();
      const pos = useAppStore.getState().position;
      // In Tauri mode the pet is centered in the viewport (CSS 50%/50%),
      // so use the viewport center as the hit target instead of store coords.
      const hitX = tauriMode ? window.innerWidth / 2 : pos.x + 40;
      const hitY = tauriMode ? window.innerHeight / 2 : pos.y + 40;
      const dx = e.clientX - hitX;
      const dy = e.clientY - hitY;
      // Slightly larger radius (80) for Tauri to account for window size variance
      if (Math.sqrt(dx * dx + dy * dy) < (tauriMode ? 80 : 60)) {
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
        icon="🤖"
        label="Agent Hub"
        hint={agentCount > 0 ? `${agentCount} agent${agentCount !== 1 ? 's' : ''}` : undefined}
        onClick={() => {
          toggleAgentHub();
          setMenu(null);
        }}
      />
      <MenuItem
        icon="⚙️"
        label="Settings"
        onClick={async () => {
          setMenu(null);
          if (isTauri()) {
            // Open (or focus) the dedicated settings window via Tauri v2 API
            try {
              const tauriMod = (window as any).__TAURI_INTERNALS__;
              if (tauriMod) {
                // Use core invoke to ask Rust backend to open/focus the settings window
                // This mirrors the tray "settings" handler in main.rs
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('open_settings_window');
              } else {
                toggleSettings();
              }
            } catch (err) {
              console.warn('[ContextMenu] invoke failed, trying WebviewWindow API:', err);
              try {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
                const existing = await WebviewWindow.getByLabel('settings');
                if (existing) {
                  await existing.show();
                  await existing.setFocus();
                } else {
                  new WebviewWindow('settings', {
                    url: 'index.html?settings=1',
                    title: 'tinker-desk Settings',
                    width: 820,
                    height: 620,
                    resizable: true,
                    decorations: true,
                    transparent: false,
                    alwaysOnTop: false,
                  });
                }
              } catch (err2) {
                console.warn('[ContextMenu] WebviewWindow also failed:', err2);
                toggleSettings();
              }
            }
          } else {
            toggleSettings();
          }
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
