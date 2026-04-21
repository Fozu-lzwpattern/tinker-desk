/**
 * tinker-desk — Desktop companion pet powered by tinker social network
 *
 * Main application shell.
 * In Tauri mode: transparent window, always-on-top, click-through background
 * In browser mode: full window with white background (dev/preview)
 */

import React, { useEffect } from 'react';
import { PetSprite } from './components/PetSprite';
import { BubbleOverlay } from './components/BubbleOverlay';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { ContextMenu } from './components/ContextMenu';
import { usePetBehavior } from './hooks/usePetBehavior';
import { useHookEngine } from './hooks/useHookEngine';
import { useAppStore } from './store/appStore';

function App() {
  // Start autonomous behavior engine
  usePetBehavior();

  const { emit } = useHookEngine();
  const addBubble = useAppStore((s) => s.addBubble);

  // Emit startup hook
  useEffect(() => {
    emit('startup');

    // Greet on first launch
    const greeted = sessionStorage.getItem('tinker-greeted');
    if (!greeted) {
      setTimeout(() => {
        addBubble({
          text: 'Hi! Right-click me for options ✨',
          type: 'speech',
          expiresAt: Date.now() + 5000,
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

  return (
    <>
      <PetSprite />
      <BubbleOverlay />
      <StatusBar />
      <SettingsPanel />
      <ContextMenu />

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
      `}</style>
    </>
  );
}

export default App;
