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

/** Built-in default theme manifest */
export const DEFAULT_THEME: ThemeManifest = {
  name: 'Default Tinker',
  version: '1.0.0',
  author: 'tinker-desk',
  description: 'The original tinker creature — a friendly green blob with antenna',
  sprites: {
    idle: { src: '__builtin__', frames: 1 },
    walk_left: { src: '__builtin__', frames: 1 },
    walk_right: { src: '__builtin__', frames: 1 },
    sit: { src: '__builtin__', frames: 1 },
    sleep: { src: '__builtin__', frames: 1 },
    excited: { src: '__builtin__', frames: 1 },
    wave: { src: '__builtin__', frames: 1 },
    think: { src: '__builtin__', frames: 1 },
    celebrate: { src: '__builtin__', frames: 1 },
    sad: { src: '__builtin__', frames: 1 },
    searching: { src: '__builtin__', frames: 1 },
    matched: { src: '__builtin__', frames: 1 },
    chatting: { src: '__builtin__', frames: 1 },
    drag: { src: '__builtin__', frames: 1 },
  },
  size: { width: 120, height: 120 },
};

/** Cached loaded themes */
const themeCache = new Map<string, ThemeManifest>();

/** List available themes (from localStorage registry) */
export function getInstalledThemes(): Array<{ id: string; name: string; description?: string }> {
  const themes: Array<{ id: string; name: string; description?: string }> = [
    { id: 'default', name: 'Default Tinker', description: 'The original green blob creature' },
  ];

  try {
    const custom = localStorage.getItem('tinker-desk-themes');
    if (custom) {
      const parsed = JSON.parse(custom) as Array<{ id: string; name: string; description?: string }>;
      themes.push(...parsed);
    }
  } catch {
    // ignore
  }

  return themes;
}

/** Register a custom theme */
export function registerTheme(id: string, manifest: ThemeManifest): void {
  themeCache.set(id, manifest);

  // Persist in localStorage
  try {
    const existing = getInstalledThemes().filter((t) => t.id !== 'default');
    const updated = existing.filter((t) => t.id !== id);
    updated.push({ id, name: manifest.name, description: manifest.description });
    localStorage.setItem('tinker-desk-themes', JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/** Load a theme manifest (returns cached if available) */
export function loadTheme(id: string): ThemeManifest {
  if (id === 'default') return DEFAULT_THEME;
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
