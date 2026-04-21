import { create } from 'zustand';
import type { AppState, Bubble, PetPosition, PetState, TinkerDeskSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

let bubbleCounter = 0;

export const useAppStore = create<AppState>()((set) => ({
  // Pet state
  petState: 'idle' as PetState,
  position: { x: 200, y: 200 },
  isDragging: false,
  bubbles: [],

  // Network
  isOnline: false,
  connectedPeers: 0,
  activeBuddy: null,

  // Settings
  settings: DEFAULT_SETTINGS,
  settingsOpen: false,

  // Actions
  setPetState: (petState: PetState) => set({ petState }),
  setPosition: (position: PetPosition) => set({ position }),
  setDragging: (isDragging: boolean) => set({ isDragging }),
  addBubble: (bubble: Omit<Bubble, 'id'>) =>
    set((state: AppState) => ({
      bubbles: [
        ...state.bubbles,
        { ...bubble, id: `bubble-${++bubbleCounter}` },
      ],
    })),
  removeBubble: (id: string) =>
    set((state: AppState) => ({
      bubbles: state.bubbles.filter((b: Bubble) => b.id !== id),
    })),
  setOnline: (isOnline: boolean) => set({ isOnline }),
  setConnectedPeers: (connectedPeers: number) => set({ connectedPeers }),
  setActiveBuddy: (activeBuddy: string | null) => set({ activeBuddy }),
  updateSettings: (partial: Partial<TinkerDeskSettings>) =>
    set((state: AppState) => ({
      settings: { ...state.settings, ...partial },
    })),
  toggleSettings: () =>
    set((state: AppState) => ({ settingsOpen: !state.settingsOpen })),
}));
