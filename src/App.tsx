/**
 * tinker-desk — Desktop companion pet powered by tinker social network
 *
 * Main application shell.
 * In Tauri mode: transparent window, always-on-top, pet lives on your desktop
 * In browser mode: full window with white background (dev/preview)
 */

import React, { useEffect } from 'react';
import { PetSprite } from './components/PetSprite';
import { BubbleOverlay } from './components/BubbleOverlay';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { ContextMenu } from './components/ContextMenu';
import { ChatPanel } from './components/ChatPanel';
import { usePetBehavior } from './hooks/usePetBehavior';
import { useHookEngine } from './hooks/useHookEngine';
import { useTinkerNetwork } from './hooks/useTinkerNetwork';
import { useAppStore } from './store/appStore';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

function App() {
  // Start autonomous behavior engine
  usePetBehavior();

  // Hook engine
  const { emit } = useHookEngine();

  // Tinker network
  const { findBuddy, setHookEmit } = useTinkerNetwork();

  // Wire hook engine emit into the network layer
  useEffect(() => {
    setHookEmit(emit);
  }, [emit, setHookEmit]);

  const addBubble = useAppStore((s) => s.addBubble);
  const toggleSettings = useAppStore((s) => s.toggleSettings);

  // Emit startup hook
  useEffect(() => {
    emit('startup');

    // Greet on first launch
    const greeted = sessionStorage.getItem('tinker-greeted');
    if (!greeted) {
      setTimeout(() => {
        addBubble({
          text: isTauri()
            ? 'Hi! I live on your desktop now~ ✨\nRight-click me for options!'
            : 'Hi! Right-click me for options ✨',
          type: 'speech',
          expiresAt: Date.now() + 6000,
        });
        sessionStorage.setItem('tinker-greeted', '1');
      }, 1000);
    }

    return () => emit('shutdown');
  }, [emit, addBubble]);

  // Window focus/blur hooks
  useEffect(() => {
    const onFocus = () => emit('window_focus');
    const onBlur = () => emit('window_blur');
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [emit]);

  // ── Tauri tray event listeners ──────────────────────────────
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;

    (async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten1 = await listen('tray-find-buddy', () => {
          findBuddy();
        });
        unlisten2 = await listen('tray-settings', () => {
          toggleSettings();
        });
      } catch (err) {
        console.warn('[App] Failed to listen for tray events:', err);
      }
    })();

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, [findBuddy, toggleSettings]);

  // In Tauri mode, pet position is relative to window (center);
  // the entire window moves when dragged. In browser mode, pet moves within viewport.
  const tauriMode = isTauri();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        // In browser mode, show a subtle background so you can see the pet
        background: tauriMode ? 'transparent' : '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <PetSprite />
      <BubbleOverlay />
      {!tauriMode && <StatusBar />}
      <SettingsPanel />
      <ContextMenu />
      <ChatPanel />

      {/* Global CSS animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
