// ============================================================
// tinker-desk type system
// ============================================================

// ─── Theme System ───────────────────────────────────────────

/** A complete theme package defines the pet's visual identity */
export interface ThemeManifest {
  name: string;
  version: string;
  author?: string;
  description?: string;
  /** Sprite sheet or individual sprites */
  sprites: Record<PetState, SpriteDefinition>;
  /** Collision/click hitbox relative to sprite origin */
  hitbox?: { x: number; y: number; width: number; height: number };
  /** Eye tracking parameters (if the pet has eyes that follow cursor) */
  eyeTracking?: {
    enabled: boolean;
    leftEye: { cx: number; cy: number; radius: number };
    rightEye: { cx: number; cy: number; radius: number };
  };
  /** Base size of the pet sprite */
  size: { width: number; height: number };
}

export interface SpriteDefinition {
  /** Path to SVG/PNG/GIF sprite (relative to theme dir) */
  src: string;
  /** Number of animation frames (1 = static) */
  frames?: number;
  /** Frame duration in ms */
  frameDuration?: number;
  /** Whether the animation loops */
  loop?: boolean;
}

// All possible visual states the pet can be in
export type PetState =
  | 'idle'
  | 'walk_left'
  | 'walk_right'
  | 'sit'
  | 'sleep'
  | 'excited'
  | 'wave'
  | 'think'
  | 'celebrate'
  | 'sad'
  | 'searching'    // looking for buddies
  | 'matched'      // found a buddy!
  | 'chatting'     // in conversation
  | 'drag';        // being dragged

// ─── Hook System ────────────────────────────────────────────

/** Events that hooks can listen to */
export type HookEvent =
  // Tinker network events
  | 'peer_discovered'
  | 'intent_matched'
  | 'intent_expired'
  | 'message_received'
  | 'dm_received'
  | 'agent_status_changed'
  | 'buddy_found'
  | 'buddy_lost'
  // Local/system events
  | 'pet_clicked'
  | 'pet_double_clicked'
  | 'pet_dragged'
  | 'pet_dropped'
  | 'mouse_near'
  | 'mouse_away'
  | 'window_focus'
  | 'window_blur'
  | 'idle_timeout'
  | 'timer'
  // Lifecycle
  | 'startup'
  | 'shutdown';

/** Actions a hook can trigger */
export interface HookAction {
  type: HookActionType;
  payload?: Record<string, unknown>;
}

export type HookActionType =
  | 'set_state'       // change pet visual state
  | 'play_sound'      // play a sound effect
  | 'show_bubble'     // show speech/thought bubble
  | 'show_notification' // system notification
  | 'animate'         // play a one-shot animation
  | 'move_to'         // move pet to position
  | 'open_url'        // open URL in browser
  | 'send_message'    // send tinker message
  | 'publish_intent'  // broadcast intent
  | 'custom';         // user-defined action

/** A single hook definition */
export interface HookDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  /** Which event triggers this hook */
  event: HookEvent;
  /** Optional condition (JS expression evaluated with event context) */
  condition?: string;
  /** Actions to execute when triggered */
  actions: HookAction[];
  /** Cooldown in ms to prevent spamming */
  cooldownMs?: number;
}

// ─── Sound System ───────────────────────────────────────────

export interface SoundMapping {
  /** Map an event or state transition to a sound file */
  [key: string]: {
    src: string;       // path to audio file (relative to sounds dir)
    volume?: number;   // 0-1
    loop?: boolean;
  };
}

// ─── Settings ───────────────────────────────────────────────

export interface TinkerDeskSettings {
  /** Pet display name */
  petName: string;
  /** Active theme directory name */
  activeTheme: string;
  /** Hook definitions */
  hooks: HookDefinition[];
  /** Sound mappings */
  sounds: SoundMapping;
  /** Animation parameters */
  animation: {
    speed: number;          // global speed multiplier (0.5-2.0)
    bounceHeight: number;   // idle bounce in px
    walkSpeed: number;      // px per frame
    particleDensity: number; // 0-1
  };
  /** Network settings */
  network: {
    autoStart: boolean;     // start relay on launch
    relayPort: number;      // embedded relay port
    bootstrapPeers: string[];
    mdnsEnabled: boolean;
    displayName: string;    // name shown to other peers
  };
  /** Pet personality (affects autonomous behavior) */
  personality: {
    sociability: number;    // 0-1, how often it initiates buddy search
    energy: number;         // 0-1, how active/hyper
    curiosity: number;      // 0-1, how often it explores screen edges
  };
}

export const DEFAULT_SETTINGS: TinkerDeskSettings = {
  petName: 'Tinker',
  activeTheme: 'default',
  hooks: [],
  sounds: {},
  animation: {
    speed: 1.0,
    bounceHeight: 3,
    walkSpeed: 2,
    particleDensity: 0.5,
  },
  network: {
    autoStart: true,
    relayPort: 3210,
    bootstrapPeers: [],
    mdnsEnabled: true,
    displayName: 'tinker-pet',
  },
  personality: {
    sociability: 0.6,
    energy: 0.5,
    curiosity: 0.4,
  },
};

// ─── Store ──────────────────────────────────────────────────

export interface PetPosition {
  x: number;
  y: number;
}

export interface Bubble {
  id: string;
  text: string;
  type: 'speech' | 'thought' | 'notification';
  expiresAt: number; // timestamp
}

export interface AppState {
  // Pet state
  petState: PetState;
  position: PetPosition;
  isDragging: boolean;
  bubbles: Bubble[];

  // Network
  isOnline: boolean;
  connectedPeers: number;
  activeBuddy: string | null;

  // Settings
  settings: TinkerDeskSettings;
  settingsOpen: boolean;

  // Actions
  setPetState: (state: PetState) => void;
  setPosition: (pos: PetPosition) => void;
  setDragging: (dragging: boolean) => void;
  addBubble: (bubble: Omit<Bubble, 'id'>) => void;
  removeBubble: (id: string) => void;
  setOnline: (online: boolean) => void;
  setConnectedPeers: (count: number) => void;
  setActiveBuddy: (buddy: string | null) => void;
  updateSettings: (partial: Partial<TinkerDeskSettings>) => void;
  toggleSettings: () => void;
}
