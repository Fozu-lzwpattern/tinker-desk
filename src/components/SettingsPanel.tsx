/**
 * SettingsPanel — full settings UI for tinker-desk
 *
 * 6 tabs: Pet / Theme / Animation / Network / Hooks / About
 * Floats as a dark panel, can be opened from right-click menu or tray.
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';

type Tab = 'pet' | 'animation' | 'network' | 'hooks' | 'about';

export function SettingsPanel() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [activeTab, setActiveTab] = useState<Tab>('pet');

  if (!settingsOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleSettings();
      }}
    >
      <div
        style={{
          width: 420,
          maxHeight: '80vh',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
          }}
        >
          <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600 }}>
            ⚙️ Settings
          </span>
          <button
            onClick={toggleSettings}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            padding: '0 12px',
            gap: 2,
            background: '#1e293b',
            borderBottom: '1px solid #334155',
          }}
        >
          {([
            ['pet', '🐾 Pet'],
            ['animation', '✨ Animation'],
            ['network', '📡 Network'],
            ['hooks', '🔧 Hooks'],
            ['about', 'ℹ️ About'],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 12px',
                background: activeTab === tab ? '#0f172a' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, color: '#e2e8f0', fontSize: 13 }}>
          {activeTab === 'pet' && (
            <PetTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'animation' && (
            <AnimationTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'network' && (
            <NetworkTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'hooks' && <HooksTab />}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

interface TabProps {
  settings: ReturnType<typeof useAppStore.getState>['settings'];
  updateSettings: ReturnType<typeof useAppStore.getState>['updateSettings'];
}

function PetTab({ settings, updateSettings }: TabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Pet Name">
        <input
          type="text"
          value={settings.petName}
          onChange={(e) => updateSettings({ petName: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label={`Sociability — ${Math.round(settings.personality.sociability * 100)}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(settings.personality.sociability * 100)}
          onChange={(e) =>
            updateSettings({
              personality: { ...settings.personality, sociability: Number(e.target.value) / 100 },
            })
          }
          style={rangeStyle}
        />
        <div style={hintStyle}>How often the pet initiates buddy search</div>
      </Field>

      <Field label={`Energy — ${Math.round(settings.personality.energy * 100)}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(settings.personality.energy * 100)}
          onChange={(e) =>
            updateSettings({
              personality: { ...settings.personality, energy: Number(e.target.value) / 100 },
            })
          }
          style={rangeStyle}
        />
        <div style={hintStyle}>How active and hyper the pet is</div>
      </Field>

      <Field label={`Curiosity — ${Math.round(settings.personality.curiosity * 100)}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(settings.personality.curiosity * 100)}
          onChange={(e) =>
            updateSettings({
              personality: { ...settings.personality, curiosity: Number(e.target.value) / 100 },
            })
          }
          style={rangeStyle}
        />
        <div style={hintStyle}>How often the pet explores screen edges (browser mode)</div>
      </Field>
    </div>
  );
}

function AnimationTab({ settings, updateSettings }: TabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={`Speed — ${settings.animation.speed.toFixed(1)}x`}>
        <input
          type="range"
          min="50"
          max="200"
          value={Math.round(settings.animation.speed * 100)}
          onChange={(e) =>
            updateSettings({
              animation: { ...settings.animation, speed: Number(e.target.value) / 100 },
            })
          }
          style={rangeStyle}
        />
      </Field>

      <Field label={`Bounce Height — ${settings.animation.bounceHeight}px`}>
        <input
          type="range"
          min="0"
          max="10"
          value={settings.animation.bounceHeight}
          onChange={(e) =>
            updateSettings({
              animation: { ...settings.animation, bounceHeight: Number(e.target.value) },
            })
          }
          style={rangeStyle}
        />
      </Field>

      <Field label={`Walk Speed — ${settings.animation.walkSpeed}px/frame`}>
        <input
          type="range"
          min="1"
          max="8"
          value={settings.animation.walkSpeed}
          onChange={(e) =>
            updateSettings({
              animation: { ...settings.animation, walkSpeed: Number(e.target.value) },
            })
          }
          style={rangeStyle}
        />
      </Field>
    </div>
  );
}

function NetworkTab({ settings, updateSettings }: TabProps) {
  const [newPeer, setNewPeer] = useState('');

  const addPeer = useCallback(() => {
    if (!newPeer.trim()) return;
    const peers = [...settings.network.bootstrapPeers, newPeer.trim()];
    updateSettings({ network: { ...settings.network, bootstrapPeers: peers } });
    setNewPeer('');
  }, [newPeer, settings.network, updateSettings]);

  const removePeer = useCallback(
    (index: number) => {
      const peers = settings.network.bootstrapPeers.filter((_, i) => i !== index);
      updateSettings({ network: { ...settings.network, bootstrapPeers: peers } });
    },
    [settings.network, updateSettings]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Display Name">
        <input
          type="text"
          value={settings.network.displayName}
          onChange={(e) =>
            updateSettings({ network: { ...settings.network, displayName: e.target.value } })
          }
          style={inputStyle}
        />
        <div style={hintStyle}>Shown to other peers on the network</div>
      </Field>

      <Field label="Auto-Start Network">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.network.autoStart}
            onChange={(e) =>
              updateSettings({ network: { ...settings.network, autoStart: e.target.checked } })
            }
          />
          Connect to relay on launch
        </label>
      </Field>

      <Field label={`Relay Port — ${settings.network.relayPort}`}>
        <input
          type="number"
          value={settings.network.relayPort}
          onChange={(e) =>
            updateSettings({ network: { ...settings.network, relayPort: Number(e.target.value) } })
          }
          style={inputStyle}
          min={1024}
          max={65535}
        />
        <div style={hintStyle}>Port for local embedded relay</div>
      </Field>

      <Field label="mDNS Discovery">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.network.mdnsEnabled}
            onChange={(e) =>
              updateSettings({ network: { ...settings.network, mdnsEnabled: e.target.checked } })
            }
          />
          Auto-discover peers on local network
        </label>
      </Field>

      <Field label="Bootstrap Peers">
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            value={newPeer}
            onChange={(e) => setNewPeer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPeer()}
            placeholder="ws://192.168.1.100:3210"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addPeer} style={btnStyle}>
            Add
          </button>
        </div>
        {settings.network.bootstrapPeers.length === 0 && (
          <div style={hintStyle}>No peers configured. Add a relay address to connect.</div>
        )}
        {settings.network.bootstrapPeers.map((peer, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              background: '#1e293b',
              borderRadius: 6,
              marginBottom: 4,
              fontSize: 12,
            }}
          >
            <span style={{ flex: 1, fontFamily: 'monospace', color: '#94a3b8' }}>{peer}</span>
            <button
              onClick={() => removePeer(i)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 14,
                padding: 2,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </Field>
    </div>
  );
}

function HooksTab() {
  const settings = useAppStore((s) => s.settings);
  return (
    <div>
      <div style={hintStyle}>
        Hooks let you create custom behaviors: when an event happens, trigger actions.
      </div>
      <div style={{ marginTop: 12 }}>
        {settings.hooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#475569' }}>
            No custom hooks yet.
            <br />
            <span style={{ fontSize: 11 }}>
              Edit <code>hooks</code> in settings JSON to add custom behaviors.
            </span>
          </div>
        ) : (
          settings.hooks.map((hook) => (
            <div
              key={hook.id}
              style={{
                padding: '8px 12px',
                background: '#1e293b',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ opacity: hook.enabled ? 1 : 0.5 }}>
                  {hook.enabled ? '✅' : '⏸️'} {hook.name}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                On: {hook.event} → {hook.actions.length} action(s)
                {hook.cooldownMs ? ` • ${hook.cooldownMs}ms cooldown` : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>tinker-desk</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Desktop companion pet powered by the tinker social network
      </div>
      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
        <p>v1.0.0</p>
        <p style={{ marginTop: 8 }}>
          Built with Tauri + React + tinker protocol
        </p>
        <p style={{ marginTop: 8 }}>
          <a
            href="https://github.com/Fozu-lzwpattern/tinker-desk"
            style={{ color: '#3b82f6' }}
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
        </p>
        <p style={{ marginTop: 16, fontSize: 11, color: '#334155' }}>
          Each tinker-desk instance is a fully autonomous node.<br />
          No cloud. No central server. Just peers.
        </p>
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: '#94a3b8',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: 13,
  outline: 'none',
};

const rangeStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#3b82f6',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#475569',
  marginTop: 4,
};

const btnStyle: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};
