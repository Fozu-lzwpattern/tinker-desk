/**
 * Autonomous pet behavior engine
 *
 * Drives the pet's idle behavior:
 * - Random walks along screen bottom
 * - Idle animations (sit, think, sleep)
 * - Responds to mouse proximity
 * - Periodic buddy search based on personality
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { PetState } from '../types';

const TICK_MS = 100; // behavior tick interval
const IDLE_ACTIONS: PetState[] = ['idle', 'sit', 'think'];

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

  const tick = useCallback(() => {
    if (isDragging) return;

    stateTimer.current += TICK_MS;
    const { walkSpeed, speed } = settings.animation;
    const effectiveSpeed = walkSpeed * speed;

    // Walking behavior
    if (petState === 'walk_left' || petState === 'walk_right') {
      const dir = petState === 'walk_left' ? -1 : 1;
      const newX = position.x + dir * effectiveSpeed;

      // Clamp to screen
      const maxX = window.innerWidth - (settings.activeTheme === 'default' ? 80 : 100);
      const clampedX = Math.max(0, Math.min(maxX, newX));

      setPosition({ x: clampedX, y: position.y });

      // Reached target or edge? Stop walking
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
    const stateDuration = 3000 + Math.random() * 5000; // 3-8 seconds
    if (stateTimer.current > stateDuration / speed) {
      stateTimer.current = 0;
      const rand = Math.random();

      // Personality-driven behavior
      const { energy, curiosity } = settings.personality;

      if (rand < 0.3 * energy) {
        // Start walking
        const dir = Math.random() > 0.5 ? 'walk_right' : 'walk_left';
        const range = window.innerWidth * 0.3 * curiosity;
        walkTarget.current =
          dir === 'walk_right'
            ? position.x + Math.random() * range
            : position.x - Math.random() * range;
        setPetState(dir);
      } else {
        // Switch idle animation
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
