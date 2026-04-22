/**
 * SettingsPage — full-page settings UI for tinker-desk
 *
 * Used in two contexts:
 *  1. Tauri mode: rendered in a dedicated "settings" webview window (820×620)
 *  2. Browser mode: rendered as a full-viewport overlay modal
 *
 * Contains all tab sub-components (Pet / Theme / Animation / Network / Hooks /
 * Security / Sprite Studio / About).  SettingsPanel.tsx is a thin wrapper that
 * either opens the Tauri window or mounts this component as a modal overlay.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { getInstalledThemes } from '../themes/ThemeLoader';
import type { HookDefinition, HookEvent, HookActionType } from '../types';
import { SpriteStudioTab } from './SpriteStudioTab';
import { APP_VERSION } from '../version';

// ── Types ──────────────────────────────────────────────────────

type Tab =
  | 'pet'
  | 'theme'
  | 'animation'
  | 'network'
  | 'hooks'
  | 'security'
  | 'sprite'
  | 'about';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

// ── Main Component ─────────────────────────────────────────────

interface SettingsPageProps {
  /** Called when the close button is pressed (browser-mode overlay only) */
  onClose?: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [activeTab, setActiveTab] = useState<Tab>('pet');

  const handleClose = useCallback(async () => {
    if (isTauri()) {
      // In Tauri, close the webview window directly
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch {
        window.close();
      }
    } else {
      onClose?.();
    }
  }, [onClose]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pet',       label: '🐾 Pet'          },
    { id: 'theme',     label: '🎨 Theme'         },
    { id: 'animation', label: '✨ Animation'     },
    { id: 'network',   label: '📡 Network'       },
    { id: 'hooks',     label: '🔧 Hooks'         },
    { id: 'security',  label: '🔒 Security'      },
    { id: 'sprite',    label: '🖼 Sprite Studio'  },
    { id: 'about',     label: 'ℹ️ About'          },
  ];

  // Separate "About" to pin at bottom with a divider
  const mainTabs = tabs.filter((t) => t.id !== 'about');
  const aboutTab = tabs.find((t) => t.id === 'about')!;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0f1a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* ── Header bar ── */}
      <div
        style={{
          height: 52,
          background: '#0f1629',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, marginRight: 10 }}>⚙️</span>
        <span style={{ fontSize: 16, fontWeight: 600, flex: 1, color: '#e2e8f0' }}>
          tinker-desk Settings
        </span>
        <button
          onClick={handleClose}
          title="Close"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            (e.currentTarget as HTMLButtonElement).style.background = '#334155';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          ×
        </button>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: 200,
            background: '#0f1629',
            borderRight: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          {mainTabs.map((tab) => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}

          {/* Divider before About */}
          <div
            style={{
              flex: 1,
              minHeight: 12,
            }}
          />
          <div
            style={{
              height: 1,
              background: '#1e293b',
              margin: '4px 16px',
            }}
          />
          <SidebarItem
            key={aboutTab.id}
            label={aboutTab.label}
            active={activeTab === aboutTab.id}
            onClick={() => setActiveTab(aboutTab.id)}
          />
        </nav>

        {/* Content area */}
        <main
          style={{
            flex: 1,
            background: '#111827',
            overflowY: 'auto',
            padding: '32px',
          }}
        >
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
          {activeTab === 'sprite' && <SpriteStudioTab />}
          {activeTab === 'about' && <AboutTab />}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar item ───────────────────────────────────────────────

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 40,
        padding: '0 16px',
        background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
        border: 'none',
        borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
        color: active ? '#e2e8f0' : '#94a3b8',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
        }
      }}
    >
      {label}
    </button>
  );
}

// ── Shared layout helpers ──────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#e2e8f0',
        margin: '0 0 20px 0',
      }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 500,
          color: '#94a3b8',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 12, color: '#475569', marginTop: 5 }}>{hint}</div>
      )}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: '#64748b',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
};

const rangeStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#3b82f6',
};

const btnStyle: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

// ── Tab props ──────────────────────────────────────────────────

interface TabProps {
  settings: ReturnType<typeof useAppStore.getState>['settings'];
  updateSettings: ReturnType<typeof useAppStore.getState>['updateSettings'];
}

// ── Pet Tab ────────────────────────────────────────────────────

function PetTab({ settings, updateSettings }: TabProps) {
  return (
    <>
      <SectionHeader>🐾 Pet</SectionHeader>
      <Card>
        <Field label="Pet Name">
          <input
            type="text"
            value={settings.petName}
            onChange={(e) => updateSettings({ petName: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field
          label={`Sociability — ${Math.round(settings.personality.sociability * 100)}%`}
          hint="How often the pet initiates buddy search"
        >
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.personality.sociability * 100)}
            onChange={(e) =>
              updateSettings({
                personality: {
                  ...settings.personality,
                  sociability: Number(e.target.value) / 100,
                },
              })
            }
            style={rangeStyle}
          />
        </Field>

        <Field
          label={`Energy — ${Math.round(settings.personality.energy * 100)}%`}
          hint="How active and hyper the pet is"
        >
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.personality.energy * 100)}
            onChange={(e) =>
              updateSettings({
                personality: {
                  ...settings.personality,
                  energy: Number(e.target.value) / 100,
                },
              })
            }
            style={rangeStyle}
          />
        </Field>

        <Field
          label={`Curiosity — ${Math.round(settings.personality.curiosity * 100)}%`}
          hint="How often the pet explores screen edges (browser mode)"
        >
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(settings.personality.curiosity * 100)}
            onChange={(e) =>
              updateSettings({
                personality: {
                  ...settings.personality,
                  curiosity: Number(e.target.value) / 100,
                },
              })
            }
            style={rangeStyle}
          />
        </Field>
      </Card>
    </>
  );
}

// ── Theme Tab ──────────────────────────────────────────────────

function ThemeTab({ settings, updateSettings }: TabProps) {
  const allThemes = useMemo(() => getInstalledThemes(), []);

  const themeEmojis: Record<string, string> = {
    default: '🟢',
    kanga: '🦘',
    pixel: '👾',
    neko: '🐱',
    bot: '🤖',
  };

  return (
    <>
      <SectionHeader>🎨 Theme</SectionHeader>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allThemes.map((t) => {
            const isActive = t.id === settings.activeTheme;
            const emoji = themeEmojis[t.id] ?? '🎨';
            return (
              <div
                key={t.id}
                onClick={() => {
                  if (!isActive) updateSettings({ activeTheme: t.id });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: isActive ? '#1e3a5f' : '#0f172a',
                  borderRadius: 10,
                  border: isActive ? '2px solid #3b82f6' : '1px solid #334155',
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    {t.description && (
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                </div>
                {isActive ? (
                  <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>
                    ✓ Active
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#64748b' }}>Click to use</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div
        style={{
          padding: '12px 16px',
          background: '#1e293b',
          borderRadius: 10,
          border: '1px solid #334155',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.6,
        }}
      >
        💡 Custom themes: place a folder with{' '}
        <code style={{ color: '#94a3b8' }}>theme.json</code> in your themes
        directory and register via the API.
      </div>
    </>
  );
}

// ── Animation Tab ──────────────────────────────────────────────

function AnimationTab({ settings, updateSettings }: TabProps) {
  return (
    <>
      <SectionHeader>✨ Animation</SectionHeader>
      <Card>
        <Field label={`Speed — ${settings.animation.speed.toFixed(1)}x`}>
          <input
            type="range"
            min="50"
            max="200"
            value={Math.round(settings.animation.speed * 100)}
            onChange={(e) =>
              updateSettings({
                animation: {
                  ...settings.animation,
                  speed: Number(e.target.value) / 100,
                },
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
                animation: {
                  ...settings.animation,
                  bounceHeight: Number(e.target.value),
                },
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
                animation: {
                  ...settings.animation,
                  walkSpeed: Number(e.target.value),
                },
              })
            }
            style={rangeStyle}
          />
        </Field>
      </Card>
    </>
  );
}

// ── Network Tab ────────────────────────────────────────────────

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
    <>
      <SectionHeader>📡 Network</SectionHeader>
      <Card>
        <Field label="Display Name" hint="Shown to other peers on the network">
          <input
            type="text"
            value={settings.network.displayName}
            onChange={(e) =>
              updateSettings({
                network: { ...settings.network, displayName: e.target.value },
              })
            }
            style={inputStyle}
          />
        </Field>

        <Field label="Auto-Start Network">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={settings.network.autoStart}
              onChange={(e) =>
                updateSettings({
                  network: { ...settings.network, autoStart: e.target.checked },
                })
              }
            />
            Connect to relay on launch
          </label>
        </Field>

        <Field label={`Relay Port — ${settings.network.relayPort}`} hint="Port for local embedded relay">
          <input
            type="number"
            value={settings.network.relayPort}
            onChange={(e) =>
              updateSettings({
                network: { ...settings.network, relayPort: Number(e.target.value) },
              })
            }
            style={inputStyle}
            min={1024}
            max={65535}
          />
        </Field>

        <Field label="mDNS Discovery">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={settings.network.mdnsEnabled}
              onChange={(e) =>
                updateSettings({
                  network: { ...settings.network, mdnsEnabled: e.target.checked },
                })
              }
            />
            Auto-discover peers on local network
          </label>
        </Field>
      </Card>

      <Card>
        <Field label="Bootstrap Peers">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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
          {settings.network.bootstrapPeers.length === 0 ? (
            <div style={{ fontSize: 13, color: '#475569' }}>
              No peers configured. Add a relay address to connect.
            </div>
          ) : (
            settings.network.bootstrapPeers.map((peer, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  background: '#0f172a',
                  borderRadius: 8,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    color: '#94a3b8',
                    wordBreak: 'break-all',
                  }}
                >
                  {peer}
                </span>
                <button
                  onClick={() => removePeer(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '2px 4px',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </Field>
      </Card>
    </>
  );
}

// ── Hooks Tab ──────────────────────────────────────────────────

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
      actions: [{ type: form.actionType, payload: parsedPayload }],
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
    <>
      <SectionHeader>🔧 Hooks</SectionHeader>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
          Hooks create custom behaviors: when an event happens, trigger actions.
        </p>
        <button
          onClick={() => {
            setShowAddForm((v) => !v);
            setForm(defaultNewHookForm());
            setPayloadError('');
          }}
          style={btnStyle}
        >
          ➕ Add Hook
        </button>
      </div>

      {/* Add Hook Form */}
      {showAddForm && (
        <Card>
          <div
            style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 14, fontSize: 14 }}
          >
            New Hook
          </div>

          <FormRow label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Hook"
              style={inputStyle}
            />
          </FormRow>

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

          <FormRow label="Condition (optional JS)">
            <input
              type="text"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              placeholder="e.g. event.buddy !== null"
              style={inputStyle}
            />
          </FormRow>

          <FormRow label="Action Type">
            <select
              value={form.actionType}
              onChange={(e) =>
                setForm({ ...form, actionType: e.target.value as HookActionType })
              }
              style={selectStyle}
            >
              {ALL_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormRow>

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
                fontSize: 13,
              }}
            />
            {payloadError && (
              <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{payloadError}</div>
            )}
          </FormRow>

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

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
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
        </Card>
      )}

      {/* Hook list */}
      {settings.hooks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#475569',
            fontSize: 14,
          }}
        >
          No custom hooks yet.
          <br />
          <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
            Click "➕ Add Hook" to create your first hook.
          </span>
        </div>
      ) : (
        settings.hooks.map((hook) => (
          <div
            key={hook.id}
            style={{
              padding: '14px 16px',
              background: '#1e293b',
              borderRadius: 10,
              marginBottom: 10,
              border: '1px solid #334155',
              opacity: hook.enabled ? 1 : 0.6,
            }}
          >
            {/* Hook header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>
                {hook.enabled ? '✅' : '⏸️'} {hook.name}
              </span>

              <button
                onClick={() => toggleHook(hook.id)}
                title={hook.enabled ? 'Disable hook' : 'Enable hook'}
                style={{
                  background: hook.enabled ? '#334155' : '#1e3a5f',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {hook.enabled ? 'Disable' : 'Enable'}
              </button>

              {deleteConfirm === hook.id ? (
                <>
                  <button
                    onClick={() => deleteHook(hook.id)}
                    style={{
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    style={{
                      background: '#334155',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 12,
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
                    fontSize: 16,
                    padding: '2px 4px',
                  }}
                >
                  🗑
                </button>
              )}
            </div>

            {/* Hook details */}
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
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
    </>
  );
}

// ── Security Tab ───────────────────────────────────────────────

function SecurityTab({ settings, updateSettings }: TabProps) {
  const allowUnsafe = settings.security.allowUnsafeHooks;

  return (
    <>
      <SectionHeader>🔒 Security</SectionHeader>

      {/* Status banner */}
      <div
        style={{
          padding: '14px 18px',
          background: allowUnsafe ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)',
          border: `1px solid ${allowUnsafe ? '#ef4444' : '#22c55e'}`,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 24 }}>{allowUnsafe ? '⚠️' : '🔒'}</span>
        <div>
          <div
            style={{
              fontWeight: 600,
              color: allowUnsafe ? '#f87171' : '#4ade80',
              fontSize: 15,
            }}
          >
            {allowUnsafe ? 'Unsafe Hooks Enabled' : 'Secure Mode Active'}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
            {allowUnsafe
              ? 'Hook conditions and custom actions can run arbitrary JavaScript.'
              : 'Hook execution is sandboxed. Custom JS disabled.'}
          </div>
        </div>
      </div>

      <Card>
        <Field label="Allow Unsafe Hooks">
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={allowUnsafe}
              onChange={(e) =>
                updateSettings({
                  security: { ...settings.security, allowUnsafeHooks: e.target.checked },
                })
              }
              style={{ marginTop: 3, accentColor: '#ef4444' }}
            />
            <div>
              <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: 14 }}>
                Enable unsafe hook execution
              </div>
              <div style={{ fontSize: 13, color: '#f87171', marginTop: 6, lineHeight: 1.6 }}>
                ⚠️ Allows hooks to execute arbitrary JavaScript. Only enable if you
                trust all installed hooks.
              </div>
            </div>
          </label>
        </Field>

        <div
          style={{
            padding: '12px 14px',
            background: '#0f172a',
            borderRadius: 8,
            border: '1px solid #1e293b',
            fontSize: 13,
            color: '#64748b',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#94a3b8' }}>What does this control?</strong>
          <br />
          Hook conditions (JS expressions) and{' '}
          <code style={{ color: '#94a3b8' }}>custom</code> action types use{' '}
          <code style={{ color: '#94a3b8' }}>new Function()</code> to run code. When
          disabled, these are silently skipped. Only enable if you installed the hooks
          yourself or fully trust their source.
        </div>
      </Card>
    </>
  );
}

// ── Sprite Studio Tab (placeholder) ───────────────────────────

// ── About Tab ──────────────────────────────────────────────────

function AboutTab() {
  return (
    <>
      <SectionHeader>ℹ️ About</SectionHeader>
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>tinker-desk</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            Desktop companion pet powered by the tinker social network
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              background: '#1e3a5f',
              borderRadius: 20,
              border: '1px solid #3b82f6',
              fontSize: 13,
              color: '#60a5fa',
              marginBottom: 24,
            }}
          >
            v{APP_VERSION}
          </div>

          <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.9 }}>
            <p style={{ margin: '0 0 8px 0' }}>Built with Tauri + React + tinker protocol</p>
            <p style={{ margin: '0 0 8px 0' }}>
              <a
                href="https://github.com/Fozu-lzwpattern/tinker-desk"
                style={{ color: '#3b82f6', textDecoration: 'none' }}
                target="_blank"
                rel="noopener"
              >
                GitHub →
              </a>
            </p>
          </div>
        </div>
      </Card>

      <div
        style={{
          padding: '14px 18px',
          background: '#1e293b',
          borderRadius: 10,
          border: '1px solid #1e293b',
          fontSize: 13,
          color: '#475569',
          lineHeight: 1.7,
          textAlign: 'center',
        }}
      >
        Each tinker-desk instance is a fully autonomous node.
        <br />
        No cloud. No central server. Just peers.
      </div>
    </>
  );
}
