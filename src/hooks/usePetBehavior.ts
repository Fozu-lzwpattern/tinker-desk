/**
 * Autonomous pet behavior engine
 *
 * In **Browser mode**: drives walks, random idle animations, screen edge exploration.
 * In **Tauri mode**: drives idle animations only (no walking — the window IS the pet).
 *
 * Personality-driven behavior:
 * - sociability: how often it initiates buddy search
 * - energy: how active/hyper
 * - curiosity: in browser mode, how often it explores screen edges
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { PetState } from '../types';

const TICK_MS = 100; // behavior tick interval
const IDLE_ACTIONS: PetState[] = ['idle', 'sit', 'think'];
const TAURI_IDLE_ACTIONS: PetState[] = ['idle', 'sit', 'think', 'wave'];

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function usePetBehavior() {
  const petState = useAppStore((s) => s.petState);
  const position = useAppStore((s) => s.position);
  const isDragging = useAppStore((s) => s.isDragging);
  const settings = useAppStore((s) => s.settings);
  const setPetState = useAppStore((s) => s.setPetState);
  const setPosition = useAppStore((s) => s.setPosition);

  const stateTimer = useRef(0);
  const walkTarget = useRef<number | null>(null);
  const tauriMode = useRef(false);

  useEffect(() => {
    tauriMode.current = isTauri();
  }, []);

  const tick = useCallback(() => {
    if (isDragging) return;

    // Don't override special states (searching, matched, chatting)
    const nonInterruptable: PetState[] = ['searching', 'matched', 'chatting', 'celebrate', 'drag'];
    if (nonInterruptable.includes(petState)) return;

    stateTimer.current += TICK_MS;
    const { walkSpeed, speed } = settings.animation;
    const effectiveSpeed = walkSpeed * speed;

    // ── Tauri mode: idle animations only ──────────────────
    if (tauriMode.current) {
      const stateDuration = 4000 + Math.random() * 6000; // 4-10 seconds
      if (stateTimer.current > stateDuration / speed) {
        stateTimer.current = 0;
        setPetState(randomChoice(TAURI_IDLE_ACTIONS));
      }
      return;
    }

    // ── Browser mode: walking + idle ──────────────────────
    if (petState === 'walk_left' || petState === 'walk_right') {
      const dir = petState === 'walk_left' ? -1 : 1;
      const newX = position.x + dir * effectiveSpeed;

      const maxX = window.innerWidth - 120;
      const clampedX = Math.max(0, Math.min(maxX, newX));
      setPosition({ x: clampedX, y: position.y });

      if (
        walkTarget.current !== null &&
        Math.abs(clampedX - walkTarget.current) < effectiveSpeed * 2
      ) {
        walkTarget.current = null;
        setPetState(randomChoice(IDLE_ACTIONS));
        stateTimer.current = 0;
      } else if (clampedX <= 0 || clampedX >= maxX) {
        walkTarget.current = null;
        setPetState('idle');
        stateTimer.current = 0;
      }
      return;
    }

    // Idle state transitions
    const stateDuration = 3000 + Math.random() * 5000;
    if (stateTimer.current > stateDuration / speed) {
      stateTimer.current = 0;
      const rand = Math.random();
      const { energy, curiosity } = settings.personality;

      if (rand < 0.3 * energy) {
        const dir = Math.random() > 0.5 ? 'walk_right' : 'walk_left';
        const range = window.innerWidth * 0.3 * curiosity;
        walkTarget.current =
          dir === 'walk_right'
            ? position.x + Math.random() * range
            : position.x - Math.random() * range;
        setPetState(dir);
      } else {
        setPetState(randomChoice(IDLE_ACTIONS));
      }
    }
  }, [
    isDragging,
    petState,
    position,
    settings,
    setPetState,
    setPosition,
  ]);

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);
}
