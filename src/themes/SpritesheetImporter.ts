import type { ThemeManifest, PetState, SpriteDefinition } from '../types';

// ─── Constants ──────────────────────────────────────────────

/** The 14 PetState values in grid order (left-to-right, top-to-bottom) */
const SPRITESHEET_ORDER: PetState[] = [
  'idle',      'walk_left', 'walk_right', 'sit',
  'sleep',     'excited',   'wave',       'think',
  'celebrate', 'sad',       'searching',  'matched',
  'chatting',  'drag',
];

const CELL_SIZE = 120;
const COLS = 4;
const ROWS = 4;
const STANDARD_WIDTH = CELL_SIZE * COLS;   // 480
const STANDARD_HEIGHT = CELL_SIZE * ROWS;  // 480

// ─── Types ───────────────────────────────────────────────────

export interface SpritesheetImportResult {
  themeId: string;
  manifest: ThemeManifest;
  /** Map of PetState -> data:image/png;base64 URL for each sliced sprite */
  spriteDataUrls: Record<PetState, string>;
  /** The original spritesheet as data URL */
  originalDataUrl: string;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Load a File into an HTMLImageElement and return it. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/** Convert a File to a base64 data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

/** Create an off-screen canvas and return [canvas, ctx]. */
function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');
  return [canvas, ctx];
}

/**
 * Scale an image to exactly STANDARD_WIDTH × STANDARD_HEIGHT on a new canvas.
 * Returns the scaled canvas.
 */
function scaleToStandard(img: HTMLImageElement): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(STANDARD_WIDTH, STANDARD_HEIGHT);
  ctx.clearRect(0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);
  ctx.drawImage(img, 0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);
  return canvas;
}

/**
 * Slice a single cell from a canvas at grid position (col, row).
 * Returns a data:image/png base64 URL.
 */
function sliceCell(
  source: HTMLCanvasElement | HTMLImageElement,
  col: number,
  row: number,
  cellW: number,
  cellH: number,
): string {
  const [canvas, ctx] = createCanvas(CELL_SIZE, CELL_SIZE);
  // Draw the cell region, scaling to CELL_SIZE × CELL_SIZE output
  ctx.clearRect(0, 0, CELL_SIZE, CELL_SIZE);
  ctx.drawImage(
    source,
    col * cellW, row * cellH, cellW, cellH,  // source rect
    0, 0, CELL_SIZE, CELL_SIZE,               // dest rect (always 120×120)
  );
  return canvas.toDataURL('image/png');
}

/**
 * Produce a horizontally flipped copy of a data URL.
 * Used to generate walk_left from walk_right (or vice versa).
 */
function flipHorizontal(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [canvas, ctx] = createCanvas(img.width, img.height);
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to flip image'));
    img.src = dataUrl;
  });
}

/**
 * Build a ThemeManifest from a map of state → data URL.
 */
function buildManifest(
  themeId: string,
  themeName: string,
  spriteDataUrls: Record<PetState, string>,
  author?: string,
): ThemeManifest {
  const sprites: Record<PetState, SpriteDefinition> = {} as Record<PetState, SpriteDefinition>;
  for (const state of SPRITESHEET_ORDER) {
    sprites[state] = {
      src: spriteDataUrls[state],
      frames: 1,
      frameDuration: 150,
      loop: true,
    };
  }
  return {
    name: themeName,
    version: '1.0.0',
    author,
    description: `Custom theme: ${themeName}`,
    sprites,
    size: { width: CELL_SIZE, height: CELL_SIZE },
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Validate an image file before import.
 * Returns null if valid, or an error message string.
 */
export function validateSpritesheetImage(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'File must be an image (PNG, JPG, GIF, WebP)';
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'Image must be under 10MB';
  }
  return null;
}

/**
 * Import a spritesheet image and generate a complete theme.
 *
 * Supported layouts:
 *  - 480×480 (standard 4×4 grid, 120×120 per cell)
 *  - Any WxH where W is divisible by 4 and H is divisible by 4 → cells auto-detected
 *  - 480×120 (single row, 4 cells) → row is repeated across all 4 rows
 *  - Any image smaller than a single cell (or equal to one cell) → treated as single sprite
 *
 * @param file       The uploaded image File
 * @param themeName  User-provided theme name
 * @param author     Optional author name
 */
export async function importSpritesheet(
  file: File,
  themeName: string,
  author?: string,
): Promise<SpritesheetImportResult> {
  const validationError = validateSpritesheetImage(file);
  if (validationError) throw new Error(validationError);

  const [img, originalDataUrl] = await Promise.all([
    loadImage(file),
    fileToDataUrl(file),
  ]);

  const { naturalWidth: w, naturalHeight: h } = img;

  // ── Detect layout ──────────────────────────────────────────

  // Case 1: Image is ≤ one cell in both dimensions → single sprite mode
  if (w <= CELL_SIZE && h <= CELL_SIZE) {
    return importSingleSprite(file, themeName, author);
  }

  // Case 2: Single row (height ≤ one cell, width ≥ COLS cells)
  // e.g. 480×120 or any width × ≤120
  if (h <= CELL_SIZE) {
    const cellW = Math.floor(w / COLS);
    const cellH = h;
    const spriteDataUrls = {} as Record<PetState, string>;

    // Slice the single row for first 4 states; repeat pattern for the rest
    const rowSprites: string[] = [];
    for (let col = 0; col < COLS; col++) {
      rowSprites.push(sliceCell(img as unknown as HTMLCanvasElement, col, 0, cellW, cellH));
    }

    SPRITESHEET_ORDER.forEach((state, idx) => {
      // Repeat row sprites cyclically
      spriteDataUrls[state] = rowSprites[idx % COLS];
    });

    const themeId = `custom-${Date.now()}`;
    const manifest = buildManifest(themeId, themeName, spriteDataUrls, author);
    return { themeId, manifest, spriteDataUrls, originalDataUrl };
  }

  // Case 3: Full grid (standard or non-standard dimensions)
  // Auto-detect cell size from image dimensions
  const cellW = Math.floor(w / COLS);
  const cellH = Math.floor(h / ROWS);

  // Scale image to standard 480×480 so all slices come out as 120×120
  const scaled = scaleToStandard(img);

  const spriteDataUrls = {} as Record<PetState, string>;
  SPRITESHEET_ORDER.forEach((state, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    spriteDataUrls[state] = sliceCell(scaled, col, row, CELL_SIZE, CELL_SIZE);
  });

  const themeId = `custom-${Date.now()}`;
  const manifest = buildManifest(themeId, themeName, spriteDataUrls, author);
  return { themeId, manifest, spriteDataUrls, originalDataUrl };
}

/**
 * Import a single sprite image — all states use the same image.
 * `walk_left` is derived by horizontally flipping `walk_right` (the base image).
 *
 * The source image is scaled to CELL_SIZE × CELL_SIZE.
 *
 * @param file       The uploaded image File
 * @param themeName  User-provided theme name
 * @param author     Optional author name
 */
export async function importSingleSprite(
  file: File,
  themeName: string,
  author?: string,
): Promise<SpritesheetImportResult> {
  const validationError = validateSpritesheetImage(file);
  if (validationError) throw new Error(validationError);

  const [img, originalDataUrl] = await Promise.all([
    loadImage(file),
    fileToDataUrl(file),
  ]);

  // Scale the single sprite to CELL_SIZE × CELL_SIZE
  const [canvas, ctx] = createCanvas(CELL_SIZE, CELL_SIZE);
  ctx.clearRect(0, 0, CELL_SIZE, CELL_SIZE);
  ctx.drawImage(img, 0, 0, CELL_SIZE, CELL_SIZE);
  const baseDataUrl = canvas.toDataURL('image/png');

  // Produce a flipped version for walk_left
  const flippedDataUrl = await flipHorizontal(baseDataUrl);

  const spriteDataUrls = {} as Record<PetState, string>;
  for (const state of SPRITESHEET_ORDER) {
    // walk_left is a mirrored version of the base image
    spriteDataUrls[state] = state === 'walk_left' ? flippedDataUrl : baseDataUrl;
  }

  const themeId = `custom-${Date.now()}`;
  const manifest = buildManifest(themeId, themeName, spriteDataUrls, author);
  return { themeId, manifest, spriteDataUrls, originalDataUrl };
}

// ─── localStorage Persistence ────────────────────────────────

const THEME_KEY_PREFIX = 'tinker-theme-';
const REGISTRY_KEY = 'tinker-theme-registry';

/** Return the localStorage key for a given themeId. */
function themeStorageKey(themeId: string): string {
  return `${THEME_KEY_PREFIX}${themeId}`;
}

/** Read the theme ID registry from localStorage. */
function readRegistry(): string[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Write the theme ID registry to localStorage. */
function writeRegistry(ids: string[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(ids));
}

/**
 * Save an imported theme to localStorage for persistence.
 *
 * Key: `tinker-theme-${result.themeId}` → JSON.stringify(result)
 * Also updates the theme ID registry.
 */
export function persistCustomTheme(result: SpritesheetImportResult): void {
  const key = themeStorageKey(result.themeId);
  localStorage.setItem(key, JSON.stringify(result));

  // Update registry (deduplicated)
  const registry = readRegistry();
  if (!registry.includes(result.themeId)) {
    registry.push(result.themeId);
    writeRegistry(registry);
  }
}

/**
 * Load all persisted custom themes from localStorage.
 * Scans for keys matching `tinker-theme-custom-*`.
 */
export function loadPersistedCustomThemes(): SpritesheetImportResult[] {
  const results: SpritesheetImportResult[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(`${THEME_KEY_PREFIX}custom-`)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as SpritesheetImportResult;
      // Basic sanity check
      if (parsed.themeId && parsed.manifest && parsed.spriteDataUrls) {
        results.push(parsed);
      }
    } catch {
      // Skip corrupt entries silently
    }
  }

  return results;
}

/**
 * Delete a custom theme from localStorage and remove it from the registry.
 */
export function deleteCustomTheme(themeId: string): void {
  const key = themeStorageKey(themeId);
  localStorage.removeItem(key);

  // Remove from registry
  const registry = readRegistry().filter(id => id !== themeId);
  writeRegistry(registry);
}
