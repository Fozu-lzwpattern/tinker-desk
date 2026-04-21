/**
 * Hook Engine — the extensibility core of tinker-desk
 *
 * Evaluates user-defined hooks in response to events.
 * Hooks map events → conditions → actions.
 *
 * Architecture:
 *   Event source (tinker network / system / timer)
 *     → HookEngine.emit(event, context)
 *       → for each matching hook:
 *           → evaluate condition (optional JS expression)
 *           → execute actions (set_state, play_sound, show_bubble, etc.)
 *           → respect cooldown
 *       → play sound for event (via SoundEngine)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { playSoundForEvent } from '../sounds/SoundEngine';
import type { HookAction, HookDefinition, HookEvent, PetState, Bubble } from '../types';

// Cooldown tracker: hookId → last fired timestamp
const cooldowns = new Map<string, number>();

/** Safely evaluate a condition expression with event context */
function evaluateCondition(
  condition: string,
  context: Record<string, unknown>
): boolean {
  try {
    const fn = new Function(
      ...Object.keys(context),
      `"use strict"; return (${condition});`
    );
    return !!fn(...Object.values(context));
  } catch {
    console.warn(`[HookEngine] Condition eval failed: "${condition}"`);
    return false;
  }
}

/** The hook engine — call emit() to fire events through all registered hooks */
export function useHookEngine() {
  const settings = useAppStore((s) => s.settings);
  const setPetState = useAppStore((s) => s.setPetState);
  const addBubble = useAppStore((s) => s.addBubble);

  // Keep a ref to latest hooks/sounds to avoid stale closures
  const hooksRef = useRef<HookDefinition[]>(settings.hooks);
  const soundsRef = useRef(settings.sounds);
  useEffect(() => {
    hooksRef.current = settings.hooks;
    soundsRef.current = settings.sounds;
  }, [settings.hooks, settings.sounds]);

  /** Execute a single hook action */
  const executeAction = useCallback(
    (action: HookAction) => {
      switch (action.type) {
        case 'set_state':
          if (action.payload?.state) {
            setPetState(action.payload.state as PetState);
          }
          break;

        case 'play_sound':
          if (action.payload?.src) {
            try {
              const audio = new Audio(action.payload.src as string);
              audio.volume = (action.payload.volume as number) ?? 0.5;
              audio.play().catch(() => {});
            } catch {}
          } else if (action.payload?.builtin) {
            playSoundForEvent(action.payload.builtin as string, {});
          }
          break;

        case 'show_bubble': {
          const text = (action.payload?.text as string) ?? '...';
          const type = (action.payload?.type as Bubble['type']) ?? 'speech';
          const duration = (action.payload?.duration as number) ?? 3000;
          addBubble({
            text,
            type,
            expiresAt: Date.now() + duration,
          });
          break;
        }

        case 'show_notification':
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(
              (action.payload?.title as string) ?? 'tinker-desk',
              { body: (action.payload?.body as string) ?? '' }
            );
          }
          break;

        case 'animate':
          if (action.payload?.state) {
            const prevState = useAppStore.getState().petState;
            setPetState(action.payload.state as PetState);
            const duration = (action.payload.duration as number) ?? 2000;
            setTimeout(() => setPetState(prevState), duration);
          }
          break;

        case 'open_url':
          if (action.payload?.url) {
            window.open(action.payload.url as string, '_blank');
          }
          break;

        case 'custom':
          if (action.payload?.code) {
            try {
              const fn = new Function('store', `"use strict"; ${action.payload.code}`);
              fn(useAppStore.getState());
            } catch (err) {
              console.warn('[HookEngine] Custom action error:', err);
            }
          }
          break;

        default:
          console.log(`[HookEngine] Unknown action type: ${action.type}`);
      }
    },
    [setPetState, addBubble]
  );

  /** Emit an event — processes all matching hooks + plays sound */
  const emit = useCallback(
    (event: HookEvent, context: Record<string, unknown> = {}) => {
      // Play sound for this event (if configured or has builtin)
      playSoundForEvent(event, soundsRef.current);

      const hooks = hooksRef.current;

      for (const hook of hooks) {
        if (!hook.enabled) continue;
        if (hook.event !== event) continue;

        // Check cooldown
        if (hook.cooldownMs) {
          const lastFired = cooldowns.get(hook.id) ?? 0;
          if (Date.now() - lastFired < hook.cooldownMs) continue;
        }

        // Evaluate condition
        if (hook.condition && !evaluateCondition(hook.condition, context)) {
          continue;
        }

        // Execute all actions
        for (const action of hook.actions) {
          executeAction(action);
        }

        cooldowns.set(hook.id, Date.now());
      }
    },
    [executeAction]
  );

  return { emit };
}
