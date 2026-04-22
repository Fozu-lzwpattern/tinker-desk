/**
 * SettingsPanel — thin wrapper around SettingsPage
 *
 * Behavior:
 *  - Tauri mode:  renders nothing (settings open in a dedicated webview window
 *                 triggered by the tray / context menu)
 *  - Browser mode: renders SettingsPage as a full-viewport overlay modal
 */

import React from 'react';
import { useAppStore } from '../store/appStore';
import { SettingsPage } from './SettingsPage';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

export function SettingsPanel() {
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  // In Tauri mode the settings window is opened as a separate WebviewWindow;
  // this component has nothing to render.
  if (isTauri()) return null;

  // In browser mode, render as a full-viewport backdrop + settings page
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
        background: 'rgba(0,0,0,0.6)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleSettings();
      }}
    >
      {/* Modal container — 760×560 */}
      <div
        style={{
          width: 760,
          height: 560,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          border: '1px solid #1e293b',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SettingsPage onClose={toggleSettings} />
      </div>
    </div>
  );
}
