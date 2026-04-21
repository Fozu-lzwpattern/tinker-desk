/**
 * ThemeLoader — loads and manages pet visual themes
 *
 * Themes are defined by a `theme.json` (ThemeManifest) and accompanying
 * sprite files (SVG/PNG/GIF).
 *
 * In Tauri mode: loads from the filesystem via Tauri's asset protocol.
 * In browser mode: loads from public/ directory or URL.
 *
 * The default theme uses inline SVG (no external files needed).
 */

import type { ThemeManifest, SpriteDefinition, PetState } from '../types';

/** Helper to build a fully-builtin sprite record */
function builtinSprites(): Record<PetState, SpriteDefinition> {
  const states: PetState[] = [
    'idle', 'walk_left', 'walk_right', 'sit', 'sleep',
    'excited', 'wave', 'think', 'celebrate', 'sad',
    'searching', 'matched', 'chatting', 'drag',
  ];
  const record = {} as Record<PetState, SpriteDefinition>;
  for (const s of states) {
    record[s] = { src: '__builtin__', frames: 1 };
  }
  return record;
}

/** Built-in default theme manifest */
export const DEFAULT_THEME: ThemeManifest = {
  name: 'Default Tinker',
  version: '1.0.0',
  author: 'tinker-desk',
  description: 'The original tinker creature — a friendly green blob with antenna',
  sprites: builtinSprites(),
  size: { width: 120, height: 120 },
};

/** Kanga theme — cute baby kangaroo */
export const KANGA_THEME: ThemeManifest = {
  name: 'Kanga',
  version: '1.0.0',
  author: 'tinker-desk',
  description: 'A cute baby kangaroo — warm brown & orange, big ears, bouncy tail',
  sprites: builtinSprites(),
  size: { width: 120, height: 120 },
};

/** Pixel theme — 8-bit retro Game Boy style */
export const PIXEL_THEME: ThemeManifest = {
  name: 'Pixel',
  version: '1.0.0',
  author: 'tinker-desk',
  description: '8-bit retro pixel art creature — classic Game Boy green palette',
  sprites: builtinSprites(),
  size: { width: 120, height: 120 },
};

/** Neko theme — classic Japanese desktop cat */
export const NEKO_THEME: ThemeManifest = {
  name: 'Neko',
  version: '1.0.0',
  author: 'tinker-desk',
  description: 'Classic Japanese desktop cat — orange calico with whiskers and swishing tail',
  sprites: builtinSprites(),
  size: { width: 120, height: 120 },
};

/** Bot theme — cyberpunk robot/droid */
export const BOT_THEME: ThemeManifest = {
  name: 'Bot',
  version: '1.0.0',
  author: 'tinker-desk',
  description: 'Cyberpunk robot — metallic blue/silver with glowing LED panel',
  sprites: builtinSprites(),
  size: { width: 120, height: 120 },
};

/** All built-in themes keyed by ID */
const BUILTIN_THEMES: Record<string, ThemeManifest> = {
  default: DEFAULT_THEME,
  kanga: KANGA_THEME,
  pixel: PIXEL_THEME,
  neko: NEKO_THEME,
  bot: BOT_THEME,
};

/** Cached loaded themes */
const themeCache = new Map<string, ThemeManifest>();

/** List available themes (built-in + localStorage registry) */
export function getInstalledThemes(): Array<{ id: string; name: string; description?: string }> {
  const themes: Array<{ id: string; name: string; description?: string }> = [
    { id: 'default', name: 'Default Tinker', description: 'The original green blob creature' },
    { id: 'kanga',   name: 'Kanga 🦘',       description: 'Cute baby kangaroo — warm brown & orange' },
    { id: 'pixel',   name: 'Pixel 👾',        description: '8-bit retro Game Boy style creature' },
    { id: 'neko',    name: 'Neko 🐱',         description: 'Classic Japanese desktop cat' },
    { id: 'bot',     name: 'Bot 🤖',          description: 'Cyberpunk robot with glowing LED panel' },
  ];

  try {
    const custom = localStorage.getItem('tinker-desk-themes');
    if (custom) {
      const parsed = JSON.parse(custom) as Array<{ id: string; name: string; description?: string }>;
      // Only add custom themes (not duplicating built-ins)
      const builtinIds = new Set(themes.map((t) => t.id));
      for (const t of parsed) {
        if (!builtinIds.has(t.id)) {
          themes.push(t);
        }
      }
    }
  } catch {
    // ignore
  }

  return themes;
}

/** Register a custom theme */
export function registerTheme(id: string, manifest: ThemeManifest): void {
  themeCache.set(id, manifest);

  // Persist in localStorage (only custom, non-builtin themes)
  try {
    const existing = getInstalledThemes().filter((t) => !(t.id in BUILTIN_THEMES));
    const updated = existing.filter((t) => t.id !== id);
    updated.push({ id, name: manifest.name, description: manifest.description });
    localStorage.setItem('tinker-desk-themes', JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/** Load a theme manifest (returns cached if available) */
export function loadTheme(id: string): ThemeManifest {
  if (id in BUILTIN_THEMES) return BUILTIN_THEMES[id];
  return themeCache.get(id) ?? DEFAULT_THEME;
}

/** Get the sprite URL for a given state in a theme */
export function getSpriteUrl(
  theme: ThemeManifest,
  state: PetState,
  baseUrl?: string
): string | null {
  const sprite = theme.sprites[state] ?? theme.sprites.idle;
  if (!sprite || sprite.src === '__builtin__') return null; // Use inline SVG
  if (sprite.src.startsWith('http://') || sprite.src.startsWith('https://') || sprite.src.startsWith('data:')) {
    return sprite.src;
  }
  // Relative path — resolve against base URL
  return baseUrl ? `${baseUrl}/${sprite.src}` : sprite.src;
}

/** Parse a theme.json file content */
export function parseThemeManifest(json: string): ThemeManifest | null {
  try {
    const raw = JSON.parse(json);
    // Validate required fields
    if (!raw.name || !raw.sprites || !raw.size) return null;
    return raw as ThemeManifest;
  } catch {
    return null;
  }
}
