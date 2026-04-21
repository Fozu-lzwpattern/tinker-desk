/**
 * AgentHub — Agent/Assistant integration management panel
 *
 * Card-based UI for managing connected agents.
 * Features:
 *   - List configured agents with status badges
 *   - Add agent (form or "generate connect command" flow inspired by Kimi Claw)
 *   - Start/Stop/Edit/Remove agent
 *   - View recent logs per agent
 *   - Responsive slide-in panel
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { AgentIntegration, AgentLogEntry, AgentStatus } from '../types';

// ─── Helpers ──────────────────────────────────────────────────

function generateId(): string {
  return `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function statusColor(status: AgentStatus): string {
  switch (status) {
    case 'running': return '#22c55e';
    case 'connecting': return '#f59e0b';
    case 'stopped': return '#64748b';
    case 'error': return '#ef4444';
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case 'running': return '● Running';
    case 'connecting': return '◌ Connecting…';
    case 'stopped': return '○ Stopped';
    case 'error': return '⚠ Error';
  }
}

function typeIcon(type: AgentIntegration['type']): string {
  switch (type) {
    case 'openclaw': return '🐾';
    case 'claw': return '🦀';
    case 'custom': return '🤖';
  }
}

const MAX_LOGS = 50;

// ─── Sub-components ──────────────────────────────────────────

interface AgentCardProps {
  agent: AgentIntegration;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (agent: AgentIntegration) => void;
  onViewLogs: (agent: AgentIntegration) => void;
}

function AgentCard({ agent, onToggle, onRemove, onEdit, onViewLogs }: AgentCardProps) {
  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.95)',
        borderRadius: 12,
        padding: 16,
        border: `1px solid ${agent.status === 'error' ? '#ef444440' : '#334155'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>{typeIcon(agent.type)}</span>
          <div>
            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{agent.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{agent.description || 'No description'}</div>
          </div>
        </div>
        <span style={{ fontSize: 11, color: statusColor(agent.status), whiteSpace: 'nowrap' }}>
          {statusLabel(agent.status)}
        </span>
      </div>

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              style={{
                fontSize: 10,
                background: '#1e293b',
                color: '#94a3b8',
                borderRadius: 4,
                padding: '1px 6px',
                border: '1px solid #334155',
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Endpoint (truncated) */}
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {agent.endpoint || 'No endpoint configured'}
      </div>

      {/* Last error */}
      {agent.lastError && (
        <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, padding: '4px 8px', background: '#ef444410', borderRadius: 6 }}>
          {agent.lastError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <ActionBtn
          label={agent.status === 'running' ? '⏹ Stop' : '▶ Start'}
          onClick={() => onToggle(agent.id)}
          color={agent.status === 'running' ? '#f59e0b' : '#22c55e'}
        />
        <ActionBtn label="✏️ Edit" onClick={() => onEdit(agent)} color="#3b82f6" />
        <ActionBtn label="📋 Logs" onClick={() => onViewLogs(agent)} color="#8b5cf6" />
        <ActionBtn label="🗑" onClick={() => onRemove(agent.id)} color="#ef4444" />
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: `1px solid ${color}40`,
        color,
        fontSize: 11,
        borderRadius: 6,
        padding: '3px 8px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.background = `${color}20`; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
    >
      {label}
    </button>
  );
}

// ─── Add/Edit Form ───────────────────────────────────────────

type FormMode = 'form' | 'command';

interface AgentFormProps {
  initial?: AgentIntegration;
  onSave: (agent: AgentIntegration) => void;
  onCancel: () => void;
}

function AgentForm({ initial, onSave, onCancel }: AgentFormProps) {
  const isEdit = !!initial;
  const [mode, setMode] = useState<FormMode>(isEdit ? 'form' : 'command');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AgentIntegration['type']>(initial?.type ?? 'custom');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? '');
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '');
  const [capabilities, setCapabilities] = useState(initial?.capabilities.join(', ') ?? 'chat');
  const [autoStart, setAutoStart] = useState(initial?.autoStart ?? false);

  // Generate connect command (Kimi Claw-inspired)
  const connectToken = useMemo(() => {
    return btoa(JSON.stringify({ t: Date.now(), r: Math.random().toString(36).slice(2) })).slice(0, 24);
  }, []);

  const relayUrl = endpoint || 'ws://localhost:3210';

  const connectCommand = `tinker-desk agent connect --token ${connectToken} --relay ${relayUrl} --name "${name || 'my-agent'}"`;

  const handleSave = () => {
    const now = Date.now();
    const agent: AgentIntegration = {
      id: initial?.id ?? generateId(),
      name: name || 'Unnamed Agent',
      type,
      description: desc,
      endpoint,
      apiKey: apiKey || undefined,
      capabilities: capabilities.split(',').map((s) => s.trim()).filter(Boolean),
      status: initial?.status ?? 'stopped',
      autoStart,
      enabled: true,
      logs: initial?.logs ?? [],
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(agent);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: 500,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Mode toggle (only for new agent) */}
      {!isEdit && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <button
            onClick={() => setMode('command')}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 12,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'command' ? '#3b82f6' : '#1e293b',
              color: mode === 'command' ? 'white' : '#94a3b8',
            }}
          >
            ⚡ Quick Connect
          </button>
          <button
            onClick={() => setMode('form')}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 12,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'form' ? '#3b82f6' : '#1e293b',
              color: mode === 'form' ? 'white' : '#94a3b8',
            }}
          >
            📝 Manual Setup
          </button>
        </div>
      )}

      {mode === 'command' && !isEdit ? (
        /* ── Quick Connect (Kimi Claw style) ─────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            Run this command in the terminal where your agent lives.
            It will auto-connect to the tinker relay.
          </div>

          <label style={labelStyle}>Agent Name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-assistant" />

          <label style={labelStyle}>Relay URL (optional)</label>
          <input style={inputStyle} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="ws://localhost:3210" />

          <label style={labelStyle}>Generated Connect Command</label>
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#22c55e',
              lineHeight: 1.5,
              wordBreak: 'break-all',
              position: 'relative',
            }}
          >
            <code>{connectCommand}</code>
            <button
              onClick={() => navigator.clipboard?.writeText(connectCommand)}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 4,
                color: '#94a3b8',
                fontSize: 10,
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              📋 Copy
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '8px 0',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✅ I've run it — Confirm
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: 'none',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Manual Form ──────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" />
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AgentIntegration['type'])}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="openclaw">🐾 OpenClaw</option>
              <option value="claw">🦀 Claw</option>
              <option value="custom">🤖 Custom</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this agent do?" />
          </div>

          <div>
            <label style={labelStyle}>Endpoint (WebSocket URL)</label>
            <input style={inputStyle} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="ws://localhost:3210" />
          </div>

          <div>
            <label style={labelStyle}>API Key / Token (optional)</label>
            <input style={inputStyle} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••" />
          </div>

          <div>
            <label style={labelStyle}>Capabilities (comma-separated)</label>
            <input style={inputStyle} value={capabilities} onChange={(e) => setCapabilities(e.target.value)} placeholder="chat, search, code" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              id="autostart-check"
              style={{ accentColor: '#3b82f6' }}
            />
            <label htmlFor="autostart-check" style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
              Auto-start on launch
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '8px 0',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isEdit ? '💾 Save Changes' : '➕ Add Agent'}
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: 'none',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Log Viewer ──────────────────────────────────────────────

function LogViewer({ agent, onClose }: { agent: AgentIntegration; onClose: () => void }) {
  const logColor = (level: AgentLogEntry['level']) => {
    switch (level) {
      case 'info': return '#94a3b8';
      case 'warn': return '#f59e0b';
      case 'error': return '#ef4444';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
          📋 Logs — {agent.name}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 11,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>

      {agent.logs.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
          No logs yet. Start the agent to see activity.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.6,
            background: '#0f172a',
            borderRadius: 8,
            padding: 10,
          }}
        >
          {agent.logs.slice(0, MAX_LOGS).map((log, i) => (
            <div key={i} style={{ color: logColor(log.level) }}>
              <span style={{ color: '#475569' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>{' '}
              <span style={{ fontWeight: 600 }}>[{log.level.toUpperCase()}]</span>{' '}
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main AgentHub Panel ─────────────────────────────────────

export function AgentHub() {
  const agentHubOpen = useAppStore((s) => s.agentHubOpen);
  const toggleAgentHub = useAppStore((s) => s.toggleAgentHub);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentIntegration | undefined>(undefined);
  const [logAgent, setLogAgent] = useState<AgentIntegration | undefined>(undefined);

  const agents = settings.agents;

  const setAgents = useCallback(
    (newAgents: AgentIntegration[]) => {
      updateSettings({ agents: newAgents });
    },
    [updateSettings]
  );

  const handleAddOrEdit = useCallback(
    (agent: AgentIntegration) => {
      const existing = agents.findIndex((a) => a.id === agent.id);
      if (existing >= 0) {
        const updated = [...agents];
        updated[existing] = agent;
        setAgents(updated);
      } else {
        // New agent — add a log entry
        agent.logs = [
          { timestamp: Date.now(), level: 'info', message: 'Agent configured' },
        ];
        setAgents([...agents, agent]);
      }
      setShowForm(false);
      setEditAgent(undefined);
    },
    [agents, setAgents]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updated = agents.map((a) => {
        if (a.id !== id) return a;
        const newStatus: AgentStatus = a.status === 'running' ? 'stopped' : 'connecting';
        const log: AgentLogEntry = {
          timestamp: Date.now(),
          level: 'info',
          message: newStatus === 'stopped' ? 'Agent stopped by user' : 'Connecting…',
        };
        const newAgent = {
          ...a,
          status: newStatus,
          updatedAt: Date.now(),
          logs: [log, ...a.logs].slice(0, MAX_LOGS),
        };
        // Simulate connection success after 1.5s
        if (newStatus === 'connecting') {
          setTimeout(() => {
            const current = useAppStore.getState().settings.agents;
            const idx = current.findIndex((x) => x.id === id);
            if (idx >= 0 && current[idx].status === 'connecting') {
              const arr = [...current];
              arr[idx] = {
                ...arr[idx],
                status: 'running',
                updatedAt: Date.now(),
                logs: [
                  { timestamp: Date.now(), level: 'info' as const, message: 'Connected to relay ✓' },
                  ...arr[idx].logs,
                ].slice(0, MAX_LOGS),
              };
              updateSettings({ agents: arr });
            }
          }, 1500);
        }
        return newAgent;
      });
      setAgents(updated);
    },
    [agents, setAgents, updateSettings]
  );

  const handleRemove = useCallback(
    (id: string) => {
      setAgents(agents.filter((a) => a.id !== id));
    },
    [agents, setAgents]
  );

  const handleEdit = useCallback((agent: AgentIntegration) => {
    setEditAgent(agent);
    setShowForm(true);
    setLogAgent(undefined);
  }, []);

  const handleViewLogs = useCallback((agent: AgentIntegration) => {
    setLogAgent(agent);
    setShowForm(false);
  }, []);

  const runningCount = useMemo(() => agents.filter((a) => a.status === 'running').length, [agents]);

  if (!agentHubOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.97)',
        borderLeft: '1px solid #1e293b',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e2e8f0',
        backdropFilter: 'blur(12px)',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🤖 Agent Hub</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} · {runningCount} running
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!showForm && !logAgent && (
            <button
              onClick={() => { setShowForm(true); setEditAgent(undefined); setLogAgent(undefined); }}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Agent
            </button>
          )}
          <button
            onClick={toggleAgentHub}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {logAgent ? (
          <LogViewer agent={logAgent} onClose={() => setLogAgent(undefined)} />
        ) : showForm ? (
          <AgentForm
            initial={editAgent}
            onSave={handleAddOrEdit}
            onCancel={() => { setShowForm(false); setEditAgent(undefined); }}
          />
        ) : agents.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', marginTop: 60, color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>No agents connected</div>
            <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
              Add your first agent — connect an OpenClaw instance,<br />
              a Claw agent, or any custom assistant.
            </div>
            <button
              onClick={() => setShowForm(true)}
              style={{
                marginTop: 20,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚡ Connect Your First Agent
            </button>
          </div>
        ) : (
          /* Agent cards */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onEdit={handleEdit}
                onViewLogs={handleViewLogs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
