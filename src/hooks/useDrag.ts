/**
 * Drag behavior for the desktop pet
 * Supports both mouse and touch events
 */

import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useHookEngine } from './useHookEngine';

export function useDrag() {
  const setPosition = useAppStore((s) => s.setPosition);
  const setDragging = useAppStore((s) => s.setDragging);
  const setPetState = useAppStore((s) => s.setPetState);
  const { emit } = useHookEngine();

  const offset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pos = useAppStore.getState().position;
      offset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setDragging(true);
      setPetState('drag');
      emit('pet_dragged', { x: pos.x, y: pos.y });

      // Capture pointer for smooth dragging even outside window
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setDragging, setPetState, emit]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!useAppStore.getState().isDragging) return;
      setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
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
      } else {
        emit('pet_dropped', {
          x: useAppStore.getState().position.x,
          y: useAppStore.getState().position.y,
        });
      }

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [setDragging, setPetState, emit]
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
