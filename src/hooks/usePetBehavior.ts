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

const IDLE_TIMEOUT_MS = 60_000; // 60 seconds of no interaction

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

  // P2 #12: idle timeout tracking
  const lastInteractionTime = useRef<number>(Date.now());
  const idleFired = useRef(false);

  // Refs for frequently-changing values — avoids rebuilding tick closure every 100ms
  const positionRef = useRef(position);
  const petStateRef = useRef(petState);
  const settingsRef = useRef(settings);
  const isDraggingRef = useRef(isDragging);

  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { petStateRef.current = petState; }, [petState]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  useEffect(() => {
    tauriMode.current = isTauri();
  }, []);

  // P2 #12: Track user interactions to reset idle timer
  useEffect(() => {
    const resetIdle = () => {
      lastInteractionTime.current = Date.now();
      idleFired.current = false;
    };
    // Listen for tinker-hook events (pet_clicked, pet_double_clicked) and direct pointer events
    window.addEventListener('pointerdown', resetIdle);
    window.addEventListener('keydown', resetIdle);
    const hookListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { event?: string };
      if (detail?.event === 'pet_clicked' || detail?.event === 'pet_double_clicked') {
        resetIdle();
      }
    };
    window.addEventListener('tinker-hook', hookListener);
    return () => {
      window.removeEventListener('pointerdown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('tinker-hook', hookListener);
    };
  }, []);

  const tick = useCallback(() => {
    if (isDraggingRef.current) {
      // Dragging counts as interaction
      lastInteractionTime.current = Date.now();
      idleFired.current = false;
      return;
    }

    // Don't override special states (searching, matched, chatting)
    const currentPetState = petStateRef.current;
    const nonInterruptable: PetState[] = ['searching', 'matched', 'chatting', 'celebrate', 'drag'];
    if (nonInterruptable.includes(currentPetState)) return;

    // P2 #12: Check idle timeout
    const timeSinceLastInteraction = Date.now() - lastInteractionTime.current;
    if (timeSinceLastInteraction >= IDLE_TIMEOUT_MS && !idleFired.current) {
      idleFired.current = true;
      window.dispatchEvent(new CustomEvent('tinker-hook', {
        detail: { event: 'idle_timeout' },
      }));
    }

    stateTimer.current += TICK_MS;
    const { walkSpeed, speed } = settingsRef.current.animation;
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
    const currentPosition = positionRef.current;
    if (currentPetState === 'walk_left' || currentPetState === 'walk_right') {
      const dir = currentPetState === 'walk_left' ? -1 : 1;
      const newX = currentPosition.x + dir * effectiveSpeed;

      const maxX = window.innerWidth - 120;
      const clampedX = Math.max(0, Math.min(maxX, newX));
      setPosition({ x: clampedX, y: currentPosition.y });

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
      const { energy, curiosity } = settingsRef.current.personality;

      if (rand < 0.3 * energy) {
        const dir = Math.random() > 0.5 ? 'walk_right' : 'walk_left';
        const range = window.innerWidth * 0.3 * curiosity;
        walkTarget.current =
          dir === 'walk_right'
            ? currentPosition.x + Math.random() * range
            : currentPosition.x - Math.random() * range;
        setPetState(dir);
      } else {
        setPetState(randomChoice(IDLE_ACTIONS));
      }
    }
  }, [setPetState, setPosition]); // Only stable setter functions as deps

  useEffect(() => {
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [tick]);
}
