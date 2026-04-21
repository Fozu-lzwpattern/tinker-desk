/**
 * Drag behavior for the desktop pet
 *
 * Two modes:
 * - **Tauri mode**: Uses Tauri's native `startDragging()` to move the window itself
 * - **Browser mode**: Moves the pet element within the viewport (CSS position)
 *
 * Click detection: if pointer barely moved (<5px), treat as click, not drag.
 */

import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useHookEngine } from './useHookEngine';

/** Detect if running inside Tauri WebView */
function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

export function useDrag() {
  const setPosition = useAppStore((s) => s.setPosition);
  const setDragging = useAppStore((s) => s.setDragging);
  const setPetState = useAppStore((s) => s.setPetState);
  const { emit } = useHookEngine();

  const offset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);
  // P2 #11: double-click detection
  const lastClickTime = useRef<number>(0);
  const lastClickPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    async (e: React.PointerEvent) => {
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      didMove.current = false;

      if (isTauri()) {
        // In Tauri: use native window dragging
        // We defer the actual startDragging to pointer move (to detect click vs drag)
        setDragging(true);
        setPetState('drag');
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // In browser: move the element within viewport
        const pos = useAppStore.getState().position;
        offset.current = {
          x: e.clientX - pos.x,
          y: e.clientY - pos.y,
        };
        setDragging(true);
        setPetState('drag');
        emit('pet_dragged', { x: pos.x, y: pos.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [setDragging, setPetState, emit]
  );

  const handlePointerMove = useCallback(
    async (e: React.PointerEvent) => {
      if (!useAppStore.getState().isDragging) return;

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5 && !didMove.current) {
        didMove.current = true;

        if (isTauri()) {
          // Start native window drag — releases pointer capture automatically
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            await getCurrentWindow().startDragging();
          } catch (err) {
            console.warn('[useDrag] startDragging failed:', err);
          }
          // OS took over the drag from here; the browser will never fire pointerup.
          // Reset drag state now so usePetBehavior doesn't get stuck on isDragging=true.
          setDragging(false);
          setPetState('idle');
          emit('pet_dropped', {
            x: useAppStore.getState().position.x,
            y: useAppStore.getState().position.y,
          });
          return;
        }
      }

      if (!isTauri()) {
        // Browser mode: move pet element
        setPosition({
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y,
        });
      }
    },
    [setPosition]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!useAppStore.getState().isDragging) return;
      setDragging(false);
      setPetState('idle');

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If barely moved, treat as click
      if (distance < 5) {
        emit('pet_clicked', {
          x: e.clientX,
          y: e.clientY,
        });

        // P2 #11: Double-click detection
        const now = Date.now();
        const timeDiff = now - lastClickTime.current;
        const clickDx = e.clientX - lastClickPos.current.x;
        const clickDy = e.clientY - lastClickPos.current.y;
        const clickDist = Math.sqrt(clickDx * clickDx + clickDy * clickDy);

        if (timeDiff < 300 && clickDist < 20) {
          // Double click!
          useAppStore.getState().setPetState('excited');
          window.dispatchEvent(new CustomEvent('tinker-hook', {
            detail: { event: 'pet_double_clicked' },
          }));
          // Reset so triple-click doesn't double-fire
          lastClickTime.current = 0;
        } else {
          lastClickTime.current = now;
          lastClickPos.current = { x: e.clientX, y: e.clientY };
        }
      } else {
        emit('pet_dropped', {
          x: useAppStore.getState().position.x,
          y: useAppStore.getState().position.y,
        });
      }

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // May already be released by Tauri's startDragging
      }
    },
    [setDragging, setPetState, emit]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
