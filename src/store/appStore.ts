import { create } from 'zustand';
import type { AppState, Bubble, PetPosition, PetState, TinkerDeskSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

let bubbleCounter = 0;

/** Load settings from localStorage (returns defaults if not found) */
function loadPersistedSettings(): TinkerDeskSettings {
  try {
    const raw = localStorage.getItem('tinker-desk-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields added in updates
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

/** Save settings to localStorage */
function persistSettings(settings: TinkerDeskSettings): void {
  try {
    localStorage.setItem('tinker-desk-settings', JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/** Load persisted position */
function loadPosition(): PetPosition {
  try {
    const raw = localStorage.getItem('tinker-desk-position');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { x: 200, y: 200 };
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Pet state
  petState: 'idle' as PetState,
  position: loadPosition(),
  isDragging: false,
  bubbles: [],

  // Network
  isOnline: false,
  connectedPeers: 0,
  activeBuddy: null,

  // Settings (loaded from localStorage)
  settings: loadPersistedSettings(),
  settingsOpen: false,

  // Chat UI
  globalChatOpen: false,

  // Agent Hub
  agentHubOpen: false,

  // Actions
  setPetState: (petState: PetState) => set({ petState }),

  setPosition: (position: PetPosition) => {
    set({ position });
    // Persist position (throttled by caller)
    try {
      localStorage.setItem('tinker-desk-position', JSON.stringify(position));
    } catch {}
  },

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

  updateSettings: (partial: Partial<TinkerDeskSettings>) => {
    set((state: AppState) => {
      const prev = state.settings;
      const newSettings: TinkerDeskSettings = {
        ...prev,
        ...partial,
        // Deep merge known nested objects to prevent sibling keys from being wiped
        animation: { ...prev.animation, ...(partial.animation ?? {}) },
        network: { ...prev.network, ...(partial.network ?? {}) },
        personality: { ...prev.personality, ...(partial.personality ?? {}) },
        security: { ...prev.security, ...(partial.security ?? {}) },
      };
      persistSettings(newSettings);
      return { settings: newSettings };
    });
  },

  toggleSettings: () =>
    set((state: AppState) => ({ settingsOpen: !state.settingsOpen })),

  toggleGlobalChat: () =>
    set((state: AppState) => ({ globalChatOpen: !state.globalChatOpen })),

  toggleAgentHub: () =>
    set((state: AppState) => ({ agentHubOpen: !state.agentHubOpen })),
}));
