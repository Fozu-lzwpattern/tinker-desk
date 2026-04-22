/**
 * SpriteStudioTab — Sprite Studio settings tab for tinker-desk
 *
 * Combines:
 *  - Section 1: 🎨 AI Prompt Templates — grid of copyable prompt cards
 *  - Section 2: 📥 Import Spritesheet — drag-and-drop image importer
 *  - Section 3: 📦 My Custom Themes — list/manage imported themes
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  importSpritesheet,
  importSingleSprite,
  persistCustomTheme,
  loadPersistedCustomThemes,
  deleteCustomTheme,
  type SpritesheetImportResult,
} from '../themes/SpritesheetImporter';
import { SPRITE_PROMPTS, getUsageTips, getFullPromptText, type PromptTemplate } from '../themes/SpritePrompts';
import { registerTheme } from '../themes/ThemeLoader';
import { useAppStore } from '../store/appStore';

// ─── Types ────────────────────────────────────────────────────

type ImportMode = 'spritesheet' | 'single';

// ─── Shared Styles ────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 13,
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
  fontSize: 13,
  outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  borderRadius: 8,
  padding: '8px 18px',
  color: 'white',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  transition: 'background 0.15s',
};

const btnSecondary: React.CSSProperties = {
  background: '#334155',
  border: 'none',
  borderRadius: 8,
  padding: '7px 14px',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  transition: 'background 0.15s',
};

const btnDanger: React.CSSProperties = {
  background: 'none',
  border: '1px solid #ef4444',
  borderRadius: 6,
  padding: '5px 10px',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: 12,
  transition: 'background 0.15s',
};

// ─── Section Header ───────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: '#e2e8f0',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {children}
    </h2>
  );
}

// ─── Toast ────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s, transform 0.25s',
        pointerEvents: 'none',
        background: '#22c55e',
        color: 'white',
        borderRadius: 10,
        padding: '8px 20px',
        fontSize: 13,
        fontWeight: 600,
        zIndex: 99999,
        boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
      }}
    >
      {message}
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────

function PromptCard({ template }: { template: PromptTemplate }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = getFullPromptText(template);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [template]);

  return (
    <div
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 12,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#475569';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
      }}
    >
      {/* Header: icon + name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{template.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#e2e8f0',
              lineHeight: 1.2,
            }}
          >
            {template.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#64748b',
              marginTop: 2,
            }}
          >
            {template.nameZh}
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: '#94a3b8',
          lineHeight: 1.6,
        }}
      >
        {template.description}
        {template.descriptionZh && (
          <span style={{ color: '#64748b', display: 'block', marginTop: 2 }}>
            {template.descriptionZh}
          </span>
        )}
      </div>

      {/* Recommended tools */}
      {template.recommendedTools.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          <span>🛠</span>
          {template.recommendedTools.join(', ')}
        </div>
      )}

      {/* Negative prompt badge */}
      {template.negativePrompt && (
        <div
          style={{
            fontSize: 11,
            color: '#64748b',
            background: '#0f172a',
            borderRadius: 6,
            padding: '3px 8px',
            display: 'inline-block',
          }}
        >
          ⊖ Negative prompt included
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={handleCopy}
          style={{
            ...btnPrimary,
            flex: 1,
            padding: '7px 10px',
            fontSize: 12,
            background: copied ? '#22c55e' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {copied ? '✅ Copied!' : '📋 Copy Prompt'}
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            ...btnSecondary,
            padding: '7px 12px',
            fontSize: 12,
            background: expanded ? '#1e3a5f' : '#334155',
            color: expanded ? '#93c5fd' : '#94a3b8',
          }}
        >
          {expanded ? '🙈 Hide' : '👁 View'}
        </button>
      </div>

      {/* Expanded prompt preview */}
      {expanded && (
        <div
          style={{
            marginTop: 4,
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#a5b4fc',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {template.prompt}
          {template.negativePrompt && (
            <>
              <div
                style={{
                  borderTop: '1px solid #1e293b',
                  margin: '10px 0 8px',
                  color: '#64748b',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 10,
                  fontStyle: 'italic',
                }}
              >
                ⊖ Negative Prompt:
              </div>
              <span style={{ color: '#94a3b8' }}>{template.negativePrompt}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Prompt Templates Section ─────────────────────────────────

function PromptTemplatesSection() {
  return (
    <section style={{ marginBottom: 36 }}>
      <SectionHeader>🎨 AI Prompt Templates</SectionHeader>

      <p
        style={{
          fontSize: 13,
          color: '#64748b',
          margin: '0 0 20px 0',
          lineHeight: 1.6,
        }}
      >
        Use these prompts with your favorite AI image generator to create custom sprites.
        <br />
        <span style={{ color: '#475569' }}>
          用这些提示词配合 AI 绘图工具生成专属宠物形象。
        </span>
      </p>

      {/* Card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {SPRITE_PROMPTS.map((template) => (
          <PromptCard key={template.id} template={template} />
        ))}
      </div>

      {/* Usage tips */}
      <div
        style={{
          marginTop: 20,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 12,
          padding: '16px 18px',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#94a3b8',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          💡 How to use these prompts
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#64748b',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}
        >
          {getUsageTips()}
        </div>
      </div>
    </section>
  );
}

// ─── Sprite Preview Grid ──────────────────────────────────────

function SpritePreviewGrid({ result }: { result: SpritesheetImportResult }) {
  const entries = Object.entries(result.spriteDataUrls) as [string, string][];

  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 14,
        marginTop: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#94a3b8',
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        ✅ Preview — {result.manifest.name}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {entries.map(([state, dataUrl]) => (
          <div key={state} style={{ textAlign: 'center' }}>
            <div
              style={{
                background: '#1e293b',
                borderRadius: 8,
                padding: 4,
                marginBottom: 4,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={dataUrl}
                alt={state}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  imageRendering: 'pixelated',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 9,
                color: '#64748b',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {state}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Import Spritesheet Section ───────────────────────────────

function ImportSpritesheetSection({
  onImportSuccess,
}: {
  onImportSuccess: (result: SpritesheetImportResult) => void;
}) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const settings = useAppStore((s) => s.settings);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [themeName, setThemeName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('spritesheet');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<SpritesheetImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Use PNG, JPG, GIF, or WebP.`);
      return;
    }
    setSelectedFile(file);
    setError(null);
    setImportResult(null);
    // Auto-fill theme name from filename if empty
    setThemeName((prev) => {
      if (prev.trim()) return prev;
      return file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClickZone = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [handleFile]
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    if (!themeName.trim()) {
      setError('Theme name is required.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      let result: SpritesheetImportResult;

      if (importMode === 'spritesheet') {
        result = await importSpritesheet(selectedFile, themeName.trim(), authorName.trim() || undefined);
      } else {
        result = await importSingleSprite(selectedFile, themeName.trim(), authorName.trim() || undefined);
      }

      // Persist to localStorage
      persistCustomTheme(result);

      // Register so it's selectable in the Theme tab
      registerTheme(result.themeId, result.manifest);

      setImportResult(result);
      onImportSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, [selectedFile, themeName, authorName, importMode, onImportSuccess]);

  const handleSwitchToTheme = useCallback(() => {
    if (!importResult) return;
    updateSettings({ activeTheme: importResult.themeId });
  }, [importResult, updateSettings]);

  const isActive = importResult && settings.activeTheme === importResult.themeId;

  return (
    <section style={{ marginBottom: 36 }}>
      <SectionHeader>📥 Import Spritesheet</SectionHeader>

      {/* Drop zone */}
      <div
        onClick={handleClickZone}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragOver ? '#3b82f6' : selectedFile ? '#22c55e' : '#334155'}`,
          borderRadius: 12,
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver
            ? 'rgba(59,130,246,0.07)'
            : selectedFile
            ? 'rgba(34,197,94,0.05)'
            : '#1e293b',
          transition: 'border-color 0.2s, background 0.2s',
          marginBottom: 16,
          userSelect: 'none',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {selectedFile ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼</div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}
            >
              {selectedFile.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB · Click to change file
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {isDragOver ? '⬇️' : '📂'}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: isDragOver ? '#60a5fa' : '#94a3b8',
                marginBottom: 6,
              }}
            >
              {isDragOver ? 'Drop it here!' : 'Drag & drop your spritesheet'}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              or click to select · PNG, JPG, GIF, WebP
            </div>
          </>
        )}
      </div>

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Theme name */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Theme Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="e.g. My Kawaii Cat"
            style={inputStyle}
          />
        </div>

        {/* Author name */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Author <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name or handle"
            style={inputStyle}
          />
        </div>

        {/* Import mode */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#94a3b8',
              marginBottom: 6,
            }}
          >
            Import Mode
          </label>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as ImportMode)}
            style={selectStyle}
          >
            <option value="spritesheet">🗂 Full Spritesheet (4×4 grid)</option>
            <option value="single">🖼 Single Sprite (all states)</option>
          </select>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 5, lineHeight: 1.5 }}>
            {importMode === 'spritesheet'
              ? 'Your image is a 4×4 grid — each cell is a different animation state.'
              : 'Your image is a single sprite — it will be used for all states.'}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠️</span>
            {error}
          </div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={isImporting || !selectedFile}
          style={{
            ...btnPrimary,
            padding: '10px 24px',
            fontSize: 14,
            opacity: isImporting || !selectedFile ? 0.5 : 1,
            cursor: isImporting || !selectedFile ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: 'flex-start',
          }}
        >
          {isImporting ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Importing…
            </>
          ) : (
            '🚀 Import'
          )}
        </button>
      </div>

      {/* Preview after successful import */}
      {importResult && (
        <>
          <SpritePreviewGrid result={importResult} />

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid #22c55e',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                color: '#86efac',
                flex: 1,
                minWidth: 180,
              }}
            >
              ✅ <strong>"{importResult.manifest.name}"</strong> imported successfully!
            </div>

            <button
              onClick={handleSwitchToTheme}
              disabled={!!isActive}
              style={{
                ...btnPrimary,
                background: isActive ? '#334155' : '#22c55e',
                cursor: isActive ? 'default' : 'pointer',
                opacity: isActive ? 0.7 : 1,
                fontSize: 13,
                padding: '8px 16px',
              }}
            >
              {isActive ? '✓ Active Theme' : '🎨 Switch to this theme'}
            </button>
          </div>
        </>
      )}

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

// ─── Custom Themes Section ────────────────────────────────────

function CustomThemesSection({
  themes,
  onDelete,
}: {
  themes: SpritesheetImportResult[];
  onDelete: (themeId: string) => void;
}) {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const activeTheme = useAppStore((s) => s.settings.activeTheme);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (themes.length === 0) return null;

  const handleUse = (themeId: string) => {
    updateSettings({ activeTheme: themeId });
  };

  const handleDelete = (themeId: string) => {
    deleteCustomTheme(themeId);
    onDelete(themeId);
    setDeleteConfirm(null);
  };

  return (
    <section style={{ marginBottom: 36 }}>
      <SectionHeader>📦 My Custom Themes</SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {themes.map((theme) => {
          const isActive = activeTheme === theme.themeId;
          const spriteCount = Object.keys(theme.spriteDataUrls).length;
          // Extract timestamp from themeId (format: custom-<timestamp>)
          const tsMatch = theme.themeId.match(/custom-(\d+)$/);
          const importedDate = tsMatch
            ? new Date(parseInt(tsMatch[1], 10)).toLocaleDateString()
            : 'Unknown date';

          return (
            <div
              key={theme.themeId}
              style={{
                background: isActive ? '#1e2d4a' : '#1e293b',
                border: `1px solid ${isActive ? '#3b82f6' : '#334155'}`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              {/* Thumbnail — first sprite */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: '#0f172a',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {Object.values(theme.spriteDataUrls)[0] ? (
                  <img
                    src={Object.values(theme.spriteDataUrls)[0]}
                    alt={theme.manifest.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 24 }}>🖼</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {theme.manifest.name}
                  {isActive && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#3b82f6',
                        fontWeight: 700,
                        background: 'rgba(59,130,246,0.15)',
                        borderRadius: 4,
                        padding: '1px 6px',
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  {spriteCount} sprites · Imported {importedDate}
                  {theme.manifest.author && ` · by ${theme.manifest.author}`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                {!isActive && (
                  <button
                    onClick={() => handleUse(theme.themeId)}
                    style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px' }}
                  >
                    🎨 Use
                  </button>
                )}

                {deleteConfirm === theme.themeId ? (
                  <>
                    <button
                      onClick={() => handleDelete(theme.themeId)}
                      style={{
                        ...btnDanger,
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={btnSecondary}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(theme.themeId)}
                    style={btnDanger}
                    title="Delete theme"
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Export ──────────────────────────────────────────────

export function SpriteStudioTab(): JSX.Element {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [customThemes, setCustomThemes] = useState<SpritesheetImportResult[]>(() => {
    try {
      return loadPersistedCustomThemes();
    } catch {
      return [];
    }
  });

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const handleImportSuccess = useCallback(
    (result: SpritesheetImportResult) => {
      setCustomThemes((prev) => {
        // Replace existing entry with same id if re-importing
        const filtered = prev.filter((t) => t.themeId !== result.themeId);
        return [result, ...filtered];
      });
      showToast(`✅ "${result.manifest.name}" imported!`);
    },
    [showToast]
  );

  const handleDeleteTheme = useCallback((themeId: string) => {
    setCustomThemes((prev) => prev.filter((t) => t.themeId !== themeId));
  }, []);

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <PromptTemplatesSection />
      <ImportSpritesheetSection onImportSuccess={handleImportSuccess} />
      <CustomThemesSection themes={customThemes} onDelete={handleDeleteTheme} />

      {/* Global toast */}
      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  );
}