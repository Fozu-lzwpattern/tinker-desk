/**
 * PetSprite — the visual representation of the desktop pet
 *
 * Two modes:
 * - **Tauri mode**: Pet is centered in the transparent window.
 *   The window itself IS the pet — dragging moves the window.
 * - **Browser mode**: Pet is absolutely positioned, moves within the viewport.
 *
 * Default theme renders an SVG creature inline.
 * Custom themes will load sprites from the theme directory.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useDrag } from '../hooks/useDrag';
import { loadTheme, getSpriteUrl } from '../themes/ThemeLoader';
import type { PetState } from '../types';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

/** Default SVG pet — a cute tinker creature */
function DefaultPetSVG({ state, size }: { state: PetState; size: number }) {
  // Animation transforms based on state
  const bodyTransform = useMemo(() => {
    switch (state) {
      case 'walk_left':
        return 'scaleX(-1)';
      case 'excited':
      case 'celebrate':
        return 'translateY(-4px)';
      case 'sleep':
        return 'scaleY(0.9)';
      case 'drag':
        return 'rotate(-5deg)';
      default:
        return '';
    }
  }, [state]);

  const isActive = ['walk_left', 'walk_right', 'excited', 'celebrate', 'searching'].includes(state);
  const isSleeping = state === 'sleep';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      style={{
        transform: bodyTransform,
        transition: 'transform 0.3s ease',
        filter: isSleeping ? 'brightness(0.8)' : undefined,
      }}
    >
      {/* Body — rounded blob */}
      <ellipse
        cx="40"
        cy="48"
        rx="28"
        ry="24"
        fill="#6ee7b7"
        stroke="#34d399"
        strokeWidth="2"
      >
        {isActive && (
          <animate
            attributeName="ry"
            values="24;22;24"
            dur="0.4s"
            repeatCount="indefinite"
          />
        )}
      </ellipse>

      {/* Antenna / tinker signal */}
      <line x1="40" y1="24" x2="40" y2="12" stroke="#34d399" strokeWidth="2" />
      <circle cx="40" cy="10" r="3" fill="#fbbf24">
        {isActive && (
          <animate
            attributeName="r"
            values="3;5;3"
            dur="1s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Eyes */}
      {!isSleeping ? (
        <>
          <circle cx="32" cy="44" r="4" fill="white" />
          <circle cx="48" cy="44" r="4" fill="white" />
          <circle cx="33" cy="44" r="2" fill="#1f2937" />
          <circle cx="49" cy="44" r="2" fill="#1f2937" />
        </>
      ) : (
        <>
          {/* Sleeping eyes — horizontal lines */}
          <line x1="28" y1="44" x2="36" y2="44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
          <line x1="44" y1="44" x2="52" y2="44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
          {/* Zzz */}
          <text x="56" y="30" fill="#94a3b8" fontSize="10" fontFamily="monospace">z</text>
          <text x="62" y="22" fill="#94a3b8" fontSize="8" fontFamily="monospace">z</text>
        </>
      )}

      {/* Mouth */}
      {state === 'excited' || state === 'celebrate' ? (
        <ellipse cx="40" cy="56" rx="6" ry="4" fill="#1f2937" />
      ) : state === 'sad' ? (
        <path d="M 34 58 Q 40 54 46 58" fill="none" stroke="#1f2937" strokeWidth="1.5" />
      ) : !isSleeping ? (
        <path d="M 34 56 Q 40 60 46 56" fill="none" stroke="#1f2937" strokeWidth="1.5" />
      ) : null}

      {/* Feet */}
      <ellipse cx="30" cy="70" rx="8" ry="4" fill="#34d399" />
      <ellipse cx="50" cy="70" rx="8" ry="4" fill="#34d399" />

      {/* Search indicator */}
      {state === 'searching' && (
        <g>
          <circle cx="60" cy="20" r="8" fill="none" stroke="#fbbf24" strokeWidth="2">
            <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="56" y="24" fill="#fbbf24" fontSize="12" fontFamily="monospace">?</text>
        </g>
      )}

      {/* Match celebration */}
      {state === 'matched' && (
        <g>
          <text x="28" y="16" fill="#f472b6" fontSize="16">✨</text>
          <text x="48" y="10" fill="#fbbf24" fontSize="12">🎉</text>
        </g>
      )}

      {/* Chatting indicator */}
      {state === 'chatting' && (
        <g>
          <circle cx="62" cy="30" r="6" fill="#3b82f6" opacity="0.8">
            <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="57" y="34" fill="white" fontSize="8" fontFamily="monospace">💬</text>
        </g>
      )}
    </svg>
  );
}

export function PetSprite() {
  const petState = useAppStore((s) => s.petState);
  const position = useAppStore((s) => s.position);
  const settings = useAppStore((s) => s.settings);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDrag();

  // P2 #13: Mouse proximity detection
  const isNearRef = useRef(false);
  const lastMouseNearTime = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const tauriMode = !!(window as any).__TAURI_INTERNALS__;
      // Determine pet center
      let petCenterX: number;
      let petCenterY: number;
      const petSize = 120;

      if (tauriMode) {
        // In Tauri mode pet is at center of window
        petCenterX = window.innerWidth / 2;
        petCenterY = window.innerHeight / 2;
      } else {
        // In browser mode, get current position from store
        const pos = useAppStore.getState().position;
        petCenterX = pos.x + petSize / 2;
        petCenterY = pos.y + petSize / 2;
      }

      const dx = e.clientX - petCenterX;
      const dy = e.clientY - petCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        // Mouse is near
        const now = Date.now();
        if (!isNearRef.current) {
          isNearRef.current = true;
        }
        // Throttle: dispatch mouse_near at most once per 2s
        if (now - lastMouseNearTime.current > 2000) {
          lastMouseNearTime.current = now;
          window.dispatchEvent(new CustomEvent('tinker-hook', {
            detail: { event: 'mouse_near', distance },
          }));
        }
      } else if (distance > 150 && isNearRef.current) {
        // Mouse moved away
        isNearRef.current = false;
        window.dispatchEvent(new CustomEvent('tinker-hook', {
          detail: { event: 'mouse_away', distance },
        }));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []); // position not in deps — we read from store directly to avoid re-registering

  const size = 120; // Bigger size for desktop pet
  const tauriMode = isTauri();

  // In Tauri mode: pet centered in window, window is the "sprite"
  // In browser mode: pet uses CSS fixed positioning
  const style: React.CSSProperties = tauriMode
    ? {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        cursor: 'grab',
        zIndex: 9999,
        animation:
          petState === 'idle'
            ? `bounce ${1.5 / settings.animation.speed}s ease-in-out infinite`
            : undefined,
      }
    : {
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        cursor: 'grab',
        zIndex: 9999,
        animation:
          petState === 'idle'
            ? `bounce ${1.5 / settings.animation.speed}s ease-in-out infinite`
            : undefined,
      };

  // Theme-aware sprite rendering
  const activeTheme = settings.activeTheme;
  const theme = useMemo(() => loadTheme(activeTheme), [activeTheme]);
  const spriteUrl = useMemo(() => getSpriteUrl(theme, petState), [theme, petState]);

  return (
    <div
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {spriteUrl ? (
        <img
          src={spriteUrl}
          alt={petState}
          width={size}
          height={size}
          style={{
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <DefaultPetSVG state={petState} size={size} />
      )}
    </div>
  );
}
