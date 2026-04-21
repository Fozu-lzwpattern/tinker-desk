/**
 * SettingsPanel — full settings UI for tinker-desk
 *
 * 8 tabs: Pet / Theme / Animation / Network / Hooks / Security / About
 * Floats as a dark panel, can be opened from right-click menu or tray.
 */

import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { HookDefinition, HookEvent, HookActionType } from '../types';

// P2 #8 + #9: extended Tab type with 'theme' and 'security'
type Tab = 'pet' | 'theme' | 'animation' | 'network' | 'hooks' | 'security' | 'about';

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
          width: 460,
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

        {/* Tab bar — scrollable row */}
        <div
          style={{
            display: 'flex',
            padding: '0 8px',
            gap: 2,
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            overflowX: 'auto',
          }}
        >
          {([
            ['pet', '🐾 Pet'],
            ['theme', '🎨 Theme'],
            ['animation', '✨ Animation'],
            ['network', '📡 Network'],
            ['hooks', '🔧 Hooks'],
            ['security', '🔒 Security'],
            ['about', 'ℹ️ About'],
          ] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 10px',
                background: activeTab === tab ? '#0f172a' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#e2e8f0' : '#64748b',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: activeTab === tab ? 600 : 400,
                whiteSpace: 'nowrap',
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
          {activeTab === 'theme' && (
            <ThemeTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'animation' && (
            <AnimationTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'network' && (
            <NetworkTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'hooks' && <HooksTab />}
          {activeTab === 'security' && (
            <SecurityTab settings={settings} updateSettings={updateSettings} />
          )}
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

// ── P2 #9: Theme Tab ──────────────────────────────────────────

interface RegisteredTheme {
  name: string;
  version: string;
  author?: string;
}

function ThemeTab({ settings, updateSettings }: TabProps) {
  const [themeInput, setThemeInput] = useState(settings.activeTheme);

  // Load registered themes from localStorage
  const registeredThemes = useCallback((): RegisteredTheme[] => {
    try {
      const raw = localStorage.getItem('tinker-desk-themes');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RegisteredTheme[]) : [];
    } catch {
      return [];
    }
  }, [])();

  const applyTheme = () => {
    const name = themeInput.trim();
    if (!name) return;
    updateSettings({ activeTheme: name });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Active Theme">
        <div
          style={{
            padding: '6px 10px',
            background: '#1e293b',
            border: '1px solid #3b82f6',
            borderRadius: 6,
            color: '#38bdf8',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'monospace',
          }}
        >
          {settings.activeTheme}
        </div>
        <div style={hintStyle}>Currently active theme directory</div>
      </Field>

      <Field label="Set Theme Directory">
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyTheme()}
            placeholder="e.g. my-theme"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={applyTheme} style={btnStyle}>
            Apply
          </button>
        </div>
      </Field>

      <Field label="Registered Themes">
        {registeredThemes.length === 0 ? (
          <div style={hintStyle}>No themes found in localStorage.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {registeredThemes.map((t) => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: '#1e293b',
                  borderRadius: 6,
                  border: t.name === settings.activeTheme ? '1px solid #3b82f6' : '1px solid #334155',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{t.name}</span>
                  <span style={{ color: '#64748b', marginLeft: 8, fontSize: 11 }}>
                    v{t.version}
                    {t.author ? ` · ${t.author}` : ''}
                  </span>
                </div>
                {t.name !== settings.activeTheme && (
                  <button
                    onClick={() => {
                      setThemeInput(t.name);
                      updateSettings({ activeTheme: t.name });
                    }}
                    style={{ ...btnStyle, padding: '3px 8px', fontSize: 11 }}
                  >
                    Use
                  </button>
                )}
                {t.name === settings.activeTheme && (
                  <span style={{ fontSize: 11, color: '#3b82f6' }}>✓ active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Field>

      <div
        style={{
          padding: '10px 12px',
          background: '#1e293b',
          borderRadius: 8,
          border: '1px solid #334155',
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        💡 Place theme folders in your themes directory. Each must contain a{' '}
        <code style={{ color: '#94a3b8' }}>theme.json</code> manifest.
      </div>
    </div>
  );
}

// ── P2 #8: Security Tab ───────────────────────────────────────

function SecurityTab({ settings, updateSettings }: TabProps) {
  const allowUnsafe = settings.security.allowUnsafeHooks;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status banner */}
      <div
        style={{
          padding: '10px 14px',
          background: allowUnsafe ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)',
          border: `1px solid ${allowUnsafe ? '#ef4444' : '#22c55e'}`,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>{allowUnsafe ? '⚠️' : '🔒'}</span>
        <div>
          <div style={{ fontWeight: 600, color: allowUnsafe ? '#f87171' : '#4ade80', fontSize: 13 }}>
            {allowUnsafe ? 'Unsafe Hooks Enabled' : 'Secure Mode Active'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {allowUnsafe
              ? 'Hook conditions and custom actions can run arbitrary JavaScript.'
              : 'Hook execution is sandboxed. Custom JS disabled.'}
          </div>
        </div>
      </div>

      <Field label="Allow Unsafe Hooks">
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allowUnsafe}
            onChange={(e) =>
              updateSettings({
                security: { ...settings.security, allowUnsafeHooks: e.target.checked },
              })
            }
            style={{ marginTop: 2, accentColor: '#ef4444' }}
          />
          <div>
            <div style={{ fontWeight: 500, color: '#e2e8f0' }}>Enable unsafe hook execution</div>
            <div style={{ fontSize: 11, color: '#f87171', marginTop: 4, lineHeight: 1.5 }}>
              ⚠️ Allows hooks to execute arbitrary JavaScript. Only enable if you trust all
              installed hooks.
            </div>
          </div>
        </label>
      </Field>

      <div
        style={{
          padding: '10px 12px',
          background: '#1e293b',
          borderRadius: 8,
          border: '1px solid #334155',
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: '#94a3b8' }}>What does this control?</strong>
        <br />
        Hook conditions (JS expressions) and <code style={{ color: '#94a3b8' }}>custom</code>{' '}
        action types use <code style={{ color: '#94a3b8' }}>new Function()</code> to run code.
        When disabled, these are silently skipped. Only enable if you installed the hooks yourself
        or fully trust their source.
      </div>
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

// ── P2 #10: Enhanced HooksTab ─────────────────────────────────

/** All HookEvent values — hardcoded for the dropdown */
const ALL_HOOK_EVENTS: HookEvent[] = [
  'peer_discovered',
  'intent_matched',
  'intent_expired',
  'message_received',
  'dm_received',
  'agent_status_changed',
  'buddy_found',
  'buddy_lost',
  'publish_intent',
  'pet_clicked',
  'pet_double_clicked',
  'pet_dragged',
  'pet_dropped',
  'mouse_near',
  'mouse_away',
  'window_focus',
  'window_blur',
  'idle_timeout',
  'timer',
  'startup',
  'shutdown',
];

/** All HookActionType values — hardcoded for the dropdown */
const ALL_ACTION_TYPES: HookActionType[] = [
  'set_state',
  'play_sound',
  'show_bubble',
  'show_notification',
  'animate',
  'move_to',
  'open_url',
  'send_message',
  'publish_intent',
  'custom',
];

interface NewHookForm {
  name: string;
  event: HookEvent;
  condition: string;
  actionType: HookActionType;
  actionPayload: string;
  cooldownMs: number;
  enabled: boolean;
}

const defaultNewHookForm = (): NewHookForm => ({
  name: '',
  event: 'pet_clicked',
  condition: '',
  actionType: 'show_bubble',
  actionPayload: '{}',
  cooldownMs: 0,
  enabled: true,
});

function HooksTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewHookForm>(defaultNewHookForm());
  const [payloadError, setPayloadError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const saveHook = () => {
    // Validate payload JSON
    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(form.actionPayload || '{}');
    } catch {
      setPayloadError('Invalid JSON in action payload');
      return;
    }
    setPayloadError('');

    const newHook: HookDefinition = {
      id: crypto.randomUUID(),
      name: form.name.trim() || 'Unnamed Hook',
      enabled: form.enabled,
      event: form.event,
      condition: form.condition.trim() || undefined,
      actions: [
        {
          type: form.actionType,
          payload: parsedPayload,
        },
      ],
      cooldownMs: form.cooldownMs > 0 ? form.cooldownMs : undefined,
    };

    updateSettings({ hooks: [...settings.hooks, newHook] });
    setForm(defaultNewHookForm());
    setShowAddForm(false);
  };

  const toggleHook = (id: string) => {
    const hooks = settings.hooks.map((h) =>
      h.id === id ? { ...h, enabled: !h.enabled } : h
    );
    updateSettings({ hooks });
  };

  const deleteHook = (id: string) => {
    const hooks = settings.hooks.filter((h) => h.id !== id);
    updateSettings({ hooks });
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={hintStyle}>
          Hooks create custom behaviors: when an event happens, trigger actions.
        </div>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setForm(defaultNewHookForm());
            setPayloadError('');
          }}
          style={{ ...btnStyle, fontSize: 12 }}
        >
          ➕ Add Hook
        </button>
      </div>

      {/* Add Hook Form */}
      {showAddForm && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 2 }}>New Hook</div>

          {/* Name */}
          <FormRow label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Hook"
              style={inputStyle}
            />
          </FormRow>

          {/* Event */}
          <FormRow label="Event">
            <select
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value as HookEvent })}
              style={selectStyle}
            >
              {ALL_HOOK_EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </FormRow>

          {/* Condition */}
          <FormRow label="Condition (optional JS)">
            <input
              type="text"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              placeholder="e.g. event.buddy !== null"
              style={inputStyle}
            />
          </FormRow>

          {/* Action type */}
          <FormRow label="Action Type">
            <select
              value={form.actionType}
              onChange={(e) => setForm({ ...form, actionType: e.target.value as HookActionType })}
              style={selectStyle}
            >
              {ALL_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormRow>

          {/* Action payload */}
          <FormRow label="Action Payload (JSON)">
            <textarea
              value={form.actionPayload}
              onChange={(e) => {
                setForm({ ...form, actionPayload: e.target.value });
                setPayloadError('');
              }}
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            />
            {payloadError && (
              <div style={{ color: '#f87171', fontSize: 11, marginTop: 2 }}>{payloadError}</div>
            )}
          </FormRow>

          {/* Cooldown */}
          <FormRow label="Cooldown (ms, 0 = none)">
            <input
              type="number"
              value={form.cooldownMs}
              onChange={(e) => setForm({ ...form, cooldownMs: Number(e.target.value) })}
              min={0}
              step={100}
              style={inputStyle}
            />
          </FormRow>

          {/* Enabled */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            <span style={{ fontSize: 12 }}>Enabled</span>
          </label>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={saveHook} style={btnStyle}>
              💾 Save Hook
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setPayloadError('');
              }}
              style={{ ...btnStyle, background: '#334155' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hook list */}
      <div style={{ marginTop: 4 }}>
        {settings.hooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#475569' }}>
            No custom hooks yet.
            <br />
            <span style={{ fontSize: 11 }}>Click "➕ Add Hook" to create your first hook.</span>
          </div>
        ) : (
          settings.hooks.map((hook) => (
            <div
              key={hook.id}
              style={{
                padding: '10px 12px',
                background: '#1e293b',
                borderRadius: 8,
                marginBottom: 8,
                border: '1px solid #334155',
                opacity: hook.enabled ? 1 : 0.6,
              }}
            >
              {/* Hook header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontWeight: 500 }}>
                  {hook.enabled ? '✅' : '⏸️'} {hook.name}
                </span>

                {/* Toggle enable/disable */}
                <button
                  onClick={() => toggleHook(hook.id)}
                  title={hook.enabled ? 'Disable hook' : 'Enable hook'}
                  style={{
                    background: hook.enabled ? '#334155' : '#1e3a5f',
                    border: 'none',
                    borderRadius: 5,
                    padding: '3px 8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {hook.enabled ? 'Disable' : 'Enable'}
                </button>

                {/* Delete button */}
                {deleteConfirm === hook.id ? (
                  <>
                    <button
                      onClick={() => deleteHook(hook.id)}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: 5,
                        padding: '3px 8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{
                        background: '#334155',
                        border: 'none',
                        borderRadius: 5,
                        padding: '3px 8px',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(hook.id)}
                    title="Delete hook"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 15,
                      padding: '2px 4px',
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>

              {/* Hook details */}
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, lineHeight: 1.5 }}>
                <span>
                  On: <code style={{ color: '#94a3b8' }}>{hook.event}</code>
                </span>
                {hook.condition && (
                  <span>
                    {' '}· if <code style={{ color: '#fbbf24' }}>{hook.condition}</code>
                  </span>
                )}
                <span>
                  {' '}→ {hook.actions.length} action{hook.actions.length !== 1 ? 's' : ''}
                </span>
                {hook.cooldownMs ? (
                  <span> · {hook.cooldownMs}ms cooldown</span>
                ) : null}
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
        <p>v0.1.0</p>
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

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 500,
          color: '#64748b',
          marginBottom: 4,
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
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: 12,
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
