/**
 * SettingsPanel — the full configuration UI
 *
 * Opened via right-click on pet or ⚙️ in status bar.
 * Six tabs: Theme / Hooks / Sounds / Animation / Network / Pet
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { TinkerDeskSettings, HookDefinition, HookEvent, HookActionType } from '../types';

type SettingsTab = 'theme' | 'hooks' | 'sounds' | 'animation' | 'network' | 'pet';

const TABS: { key: SettingsTab; icon: string; label: string }[] = [
  { key: 'theme', icon: '🎨', label: 'Theme' },
  { key: 'hooks', icon: '🪝', label: 'Hooks' },
  { key: 'sounds', icon: '🔊', label: 'Sounds' },
  { key: 'animation', icon: '✨', label: 'Animation' },
  { key: 'network', icon: '🌐', label: 'Network' },
  { key: 'pet', icon: '🐾', label: 'Pet' },
];

const ALL_HOOK_EVENTS: HookEvent[] = [
  'peer_discovered', 'intent_matched', 'intent_expired',
  'message_received', 'dm_received', 'agent_status_changed',
  'buddy_found', 'buddy_lost',
  'pet_clicked', 'pet_double_clicked', 'pet_dragged', 'pet_dropped',
  'mouse_near', 'mouse_away', 'window_focus', 'window_blur',
  'idle_timeout', 'timer', 'startup', 'shutdown',
];

const ALL_ACTION_TYPES: HookActionType[] = [
  'set_state', 'play_sound', 'show_bubble', 'show_notification',
  'animate', 'move_to', 'open_url', 'send_message', 'publish_intent', 'custom',
];

// ─── Sub-panels ────────────────────────────────────────────

function ThemeTab() {
  const activeTheme = useAppStore((s) => s.settings.activeTheme);
  return (
    <div>
      <h3 style={styles.sectionTitle}>🎨 Theme</h3>
      <p style={styles.hint}>Upload a theme package or select from built-in themes.</p>
      <div style={styles.field}>
        <label style={styles.label}>Active Theme</label>
        <input style={styles.input} value={activeTheme} readOnly />
      </div>
      <div style={{ ...styles.dropZone, marginTop: 12 }}>
        <p>📁 Drop theme folder here</p>
        <p style={styles.hint}>Must contain theme.json + sprites/</p>
      </div>
      <div style={{ marginTop: 12 }}>
        <p style={styles.hint}>
          Theme format: <code>theme.json</code> defines sprites for each pet state
          (idle, walk_left, walk_right, sit, sleep, excited, wave, think, celebrate, sad,
          searching, matched, chatting, drag) with animation frames and timing.
        </p>
      </div>
    </div>
  );
}

function HooksTab() {
  const hooks = useAppStore((s) => s.settings.hooks);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const addHook = () => {
    const newHook: HookDefinition = {
      id: `hook-${Date.now()}`,
      name: 'New Hook',
      enabled: true,
      event: 'pet_clicked',
      actions: [{ type: 'show_bubble', payload: { text: 'Hello!', duration: 2000 } }],
      cooldownMs: 1000,
    };
    updateSettings({ hooks: [...hooks, newHook] });
  };

  const removeHook = (id: string) => {
    updateSettings({ hooks: hooks.filter((h) => h.id !== id) });
  };

  const toggleHook = (id: string) => {
    updateSettings({
      hooks: hooks.map((h) =>
        h.id === id ? { ...h, enabled: !h.enabled } : h
      ),
    });
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>🪝 Hooks</h3>
      <p style={styles.hint}>
        Map events to actions. When an event fires, matching hooks execute their actions.
      </p>

      {hooks.map((hook) => (
        <div key={hook.id} style={styles.hookCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={hook.enabled}
              onChange={() => toggleHook(hook.id)}
            />
            <strong>{hook.name}</strong>
            <span style={styles.badge}>{hook.event}</span>
            <span style={{ ...styles.badge, background: '#2dd4bf20', color: '#2dd4bf' }}>
              {hook.actions.length} action{hook.actions.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => removeHook(hook.id)}
              style={styles.dangerBtn}
              title="Remove"
            >
              ✕
            </button>
          </div>
          {hook.condition && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
              if: <code>{hook.condition}</code>
            </div>
          )}
        </div>
      ))}

      <button onClick={addHook} style={styles.addBtn}>
        + Add Hook
      </button>

      <div style={{ marginTop: 16 }}>
        <details>
          <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>
            Available Events ({ALL_HOOK_EVENTS.length})
          </summary>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {ALL_HOOK_EVENTS.map((e) => (
              <span key={e} style={styles.badge}>{e}</span>
            ))}
          </div>
        </details>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>
            Available Actions ({ALL_ACTION_TYPES.length})
          </summary>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {ALL_ACTION_TYPES.map((a) => (
              <span key={a} style={{ ...styles.badge, background: '#2dd4bf20', color: '#2dd4bf' }}>
                {a}
              </span>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function AnimationTab() {
  const animation = useAppStore((s) => s.settings.animation);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const update = (key: keyof typeof animation, value: number) => {
    updateSettings({ animation: { ...animation, [key]: value } });
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>✨ Animation</h3>
      {([
        ['speed', 'Global Speed', 0.2, 3, 0.1],
        ['bounceHeight', 'Idle Bounce (px)', 0, 10, 1],
        ['walkSpeed', 'Walk Speed (px/tick)', 0.5, 6, 0.5],
        ['particleDensity', 'Particle Density', 0, 1, 0.1],
      ] as const).map(([key, label, min, max, step]) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>
            {label}: <strong>{animation[key].toFixed(1)}</strong>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={animation[key]}
            onChange={(e) => update(key, parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      ))}
    </div>
  );
}

function SoundsTab() {
  const sounds = useAppStore((s) => s.settings.sounds);
  return (
    <div>
      <h3 style={styles.sectionTitle}>🔊 Sounds</h3>
      <p style={styles.hint}>
        Map events and state transitions to sound effects.
        Upload .mp3/.wav/.ogg files, or drag from your file system.
      </p>
      <div style={styles.dropZone}>
        <p>🔊 Drop sound files here</p>
      </div>
      {Object.keys(sounds).length === 0 && (
        <p style={{ ...styles.hint, marginTop: 8 }}>
          No sound mappings configured. Add hooks with <code>play_sound</code> actions,
          or drop audio files to auto-create mappings.
        </p>
      )}
    </div>
  );
}

function NetworkTab() {
  const network = useAppStore((s) => s.settings.network);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const update = (key: keyof typeof network, value: unknown) => {
    updateSettings({ network: { ...network, [key]: value } });
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>🌐 Network</h3>
      <div style={styles.field}>
        <label style={styles.label}>Display Name</label>
        <input
          style={styles.input}
          value={network.displayName}
          onChange={(e) => update('displayName', e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Relay Port</label>
        <input
          style={styles.input}
          type="number"
          value={network.relayPort}
          onChange={(e) => update('relayPort', parseInt(e.target.value) || 3210)}
        />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={network.autoStart}
            onChange={(e) => update('autoStart', e.target.checked)}
          />{' '}
          Auto-start relay on launch
        </label>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={network.mdnsEnabled}
            onChange={(e) => update('mdnsEnabled', e.target.checked)}
          />{' '}
          mDNS discovery (LAN)
        </label>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Bootstrap Peers</label>
        <textarea
          style={{ ...styles.input, height: 60, resize: 'vertical' }}
          value={network.bootstrapPeers.join('\n')}
          onChange={(e) =>
            update(
              'bootstrapPeers',
              e.target.value.split('\n').filter(Boolean)
            )
          }
          placeholder="ws://peer1:3210&#10;ws://peer2:3210"
        />
      </div>
    </div>
  );
}

function PetTab() {
  const petName = useAppStore((s) => s.settings.petName);
  const personality = useAppStore((s) => s.settings.personality);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const updatePersonality = (key: keyof typeof personality, value: number) => {
    updateSettings({ personality: { ...personality, [key]: value } });
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>🐾 Pet</h3>
      <div style={styles.field}>
        <label style={styles.label}>Name</label>
        <input
          style={styles.input}
          value={petName}
          onChange={(e) => updateSettings({ petName: e.target.value })}
        />
      </div>
      <h4 style={{ ...styles.sectionTitle, fontSize: 13, marginTop: 16 }}>Personality</h4>
      {([
        ['sociability', '🤝 Sociability', 'How often it looks for buddies'],
        ['energy', '⚡ Energy', 'How active and bouncy'],
        ['curiosity', '🔍 Curiosity', 'How far it wanders'],
      ] as const).map(([key, label, hint]) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>
            {label}: <strong>{(personality[key] * 100).toFixed(0)}%</strong>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={personality[key]}
            onChange={(e) => updatePersonality(key, parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: 11, color: '#64748b' }}>{hint}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────

export function SettingsPanel() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  if (!settingsOpen) return null;

  const TabContent = {
    theme: ThemeTab,
    hooks: HooksTab,
    sounds: SoundsTab,
    animation: AnimationTab,
    network: NetworkTab,
    pet: PetTab,
  }[activeTab];

  return (
    <div style={styles.overlay} onClick={toggleSettings}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: 16 }}>⚙️ Settings</h2>
          <button onClick={toggleSettings} style={styles.closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <TabContent />
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 20000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: 480,
    maxHeight: '80vh',
    background: '#0f172a',
    borderRadius: 12,
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 18,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    padding: '0 8px',
    overflowX: 'auto',
  },
  tab: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#94a3b8',
    padding: '8px 12px',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#6ee7b7',
    borderBottomColor: '#6ee7b7',
  },
  content: {
    padding: 16,
    overflowY: 'auto',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 12,
    color: '#f1f5f9',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '6px 10px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  hint: {
    fontSize: 11,
    color: '#64748b',
  },
  hookCard: {
    padding: '8px 12px',
    background: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 12,
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 4,
    background: '#6ee7b720',
    color: '#6ee7b7',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  dangerBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 12,
    marginLeft: 'auto',
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    background: '#1e293b',
    border: '1px dashed #334155',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
  },
  dropZone: {
    padding: '20px',
    border: '2px dashed #334155',
    borderRadius: 8,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
  },
};
