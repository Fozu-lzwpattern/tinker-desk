// ─── Types ───────────────────────────────────────────────────

export interface PromptTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  /** The actual prompt text — ready to copy-paste into AI image generators */
  prompt: string;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Recommended AI tools */
  recommendedTools: string[];
  /** Preview emoji or icon */
  icon: string;
}

// ─── Prompt Library ──────────────────────────────────────────

export const SPRITE_PROMPTS: PromptTemplate[] = [
  {
    id: 'kawaii-animal',
    name: 'Kawaii Animal',
    nameZh: '可爱小动物',
    description: 'Cute chibi-style animal character, perfect for desktop pets',
    descriptionZh: '超萌Q版小动物，适合桌面宠物',
    icon: '🐱',
    prompt: `Create a pixel-art style spritesheet for a cute chibi animal desktop pet character.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle/standing] [walking left] [walking right] [sitting down]
Row 2: [sleeping/zzz] [excited/jumping] [waving hello] [thinking/pondering]
Row 3: [celebrating/party] [sad/droopy] [searching/looking around] [happy match found]
Row 4: [chatting/speech] [being picked up/dragged] [empty] [empty]

STYLE REQUIREMENTS:
- Chibi/kawaii proportions (big head, small body, ~2:1 ratio)
- Clean outlines, 2-3px stroke
- Soft, warm color palette
- Expressive eyes and simple facial expressions
- Consistent character across all 14 poses
- Each sprite centered within its 120×120 cell
- Small shadow/ground indicator below character
- Pixel-art or clean vector style (no photorealistic)

CHARACTER SUGGESTIONS: cat, dog, hamster, rabbit, fox, penguin, owl
Customize the animal type as desired.`,
    negativePrompt:
      'blurry, photorealistic, 3D render, dark, scary, complex background, text overlay, watermark',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Stable Diffusion XL', 'Kling AI'],
  },

  {
    id: 'robot-mech',
    name: 'Mini Robot',
    nameZh: '迷你机器人',
    description: 'Cute robot/mech character with glowing elements',
    descriptionZh: '发光元素的可爱机器人',
    icon: '🤖',
    prompt: `Create a spritesheet for a cute mini robot desktop pet character.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle/standing, LED panel showing :)] [walking left, wheels/legs moving] [walking right, wheels/legs moving] [sitting, powered down slightly]
Row 2: [sleep mode, LED dim, "zzz"] [excited, LED flashing, arms up] [waving, one arm raised] [thinking, gear/loading icon above head]
Row 3: [celebrating, confetti particles] [sad, LED showing :(] [scanning/searching, radar dish spinning] [match found, LED heart]
Row 4: [chatting, speech bubble icon] [being lifted, limbs dangling] [empty] [empty]

STYLE REQUIREMENTS:
- Rounded, friendly robot design (not menacing)
- Glowing LED panel on chest/face area (changes expression per state)
- Metallic body with accent color (blue/green/orange glow)
- Simple geometric shapes, clean design
- Consistent proportions across all 14 states
- Each sprite centered in 120×120 cell
- Subtle glow/bloom effect around LED elements
- Flat or semi-flat illustration style`,
    negativePrompt:
      'scary, military, complex machinery, photorealistic, dark atmosphere, text',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Stable Diffusion XL'],
  },

  {
    id: 'fantasy-creature',
    name: 'Fantasy Creature',
    nameZh: '幻想生物',
    description: 'Magical fantasy creature — dragon, slime, or spirit',
    descriptionZh: '魔法幻想生物——小龙、史莱姆或精灵',
    icon: '🐉',
    prompt: `Create a spritesheet for a cute fantasy creature desktop pet.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle/floating gently] [moving left, trailing sparkles] [moving right, trailing sparkles] [resting/perched]
Row 2: [sleeping, curled up, soft glow] [excited, magical burst] [waving wing/tentacle] [thinking, magic runes floating]
Row 3: [celebrating, fireworks/stars] [sad, wilting/dimming] [searching, eyes glowing] [found friend, heart sparkle]
Row 4: [chatting, magic speech runes] [being carried, surprised look] [empty] [empty]

STYLE REQUIREMENTS:
- Ethereal, magical appearance
- Soft glowing/luminous effects
- Pastel or jewel-tone color palette
- Whimsical, storybook illustration style
- Small magical particles/sparkles around character
- Consistent character design across all 14 poses
- Each sprite centered in 120×120 cell
- Semi-transparent wings/aura elements OK

CREATURE SUGGESTIONS: baby dragon, slime, fairy, spirit wisp, phoenix chick
Customize creature type as desired.`,
    negativePrompt:
      'dark fantasy, horror, realistic, gore, complex background, text, watermark',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Niji Journey'],
  },

  {
    id: 'retro-pixel',
    name: 'Retro Pixel Art',
    nameZh: '复古像素风',
    description: 'Classic pixel art style, 16-bit era nostalgia',
    descriptionZh: '经典像素风格，16位时代怀旧感',
    icon: '👾',
    prompt: `Create a pixel art spritesheet for a retro-style desktop pet character.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle stance, breathing animation frame] [walk left frame] [walk right frame] [sit down pose]
Row 2: [sleep pose with ZZZ] [excited jump pose] [wave gesture] [think pose with ? or ...]
Row 3: [celebrate with stars] [sad droopy pose] [search/look around] [happy with heart]
Row 4: [chat with speech icon] [held/dragged pose] [empty cell] [empty cell]

STYLE REQUIREMENTS:
- True pixel art: clean, crisp pixels, no anti-aliasing
- 16-bit / SNES era aesthetic
- Limited color palette (16-32 colors max)
- Black or dark outline (1-2px)
- Character should be roughly 64×64 pixels centered in 120×120 cell
- Clear silhouette readable at small sizes
- Each state must be distinct and recognizable
- Consistent palette and style across all sprites

COLOR PALETTE SUGGESTIONS:
- Classic: green/blue/brown (Link style)
- Warm: orange/red/yellow (fire theme)
- Cool: blue/purple/white (ice theme)
- Mono: grayscale with one accent color`,
    negativePrompt:
      'blurry, anti-aliased, 3D, photorealistic, too many colors, complex shading',
    recommendedTools: ['DALL-E 3', 'Midjourney --style raw', 'Aseprite (manual)'],
  },

  {
    id: 'chibi-human',
    name: 'Chibi Human',
    nameZh: '迷你人物',
    description: 'Cute chibi human character — office worker, adventurer, or student',
    descriptionZh: '可爱Q版人物——上班族、冒险家或学生',
    icon: '🧑',
    prompt: `Create a spritesheet for a cute chibi human desktop pet character.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle/standing neutral] [walking left, leg motion] [walking right, leg motion] [sitting on floor/chair]
Row 2: [sleeping, lying down or head on desk] [excited, both arms raised] [waving one hand] [thinking, finger on chin or head tilt]
Row 3: [celebrating, arms up, confetti] [sad, hunched or teardrops] [searching, hand shading eyes, looking around] [happy reunion, big smile, arms open]
Row 4: [chatting, speech bubble, animated gesture] [being lifted/dragged, surprised expression] [empty] [empty]

STYLE REQUIREMENTS:
- Chibi proportions: oversized head (50% of body height), tiny limbs
- Expressive cartoon eyes (large, shiny, emotive)
- Simple but distinct outfit (choose a theme: office/adventure/casual/fantasy)
- Soft color palette with consistent skin/hair/outfit tones
- Clean black outlines, 2px
- Each character centered and grounded in 120×120 cell
- Flat 2D illustration, no shadows/gradients unless very subtle
- All 14 poses must read clearly at 120px

CHARACTER THEME OPTIONS: office worker (suit + laptop), adventurer (cape + bag), student (uniform + book), wizard (robe + wand)
Customize character theme as desired.`,
    negativePrompt:
      'realistic, 3D, photo, scary, adult content, complex background, text, watermark, inconsistent proportions',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Niji Journey', 'Stable Diffusion XL'],
  },

  {
    id: 'food-mascot',
    name: 'Food Mascot',
    nameZh: '食物吉祥物',
    description: 'Anthropomorphic food character with personality',
    descriptionZh: '拟人化食物角色，萌态十足',
    icon: '🍱',
    prompt: `Create a spritesheet for a cute anthropomorphic food mascot desktop pet.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle/standing, googly eyes, small arms] [shuffling left] [shuffling right] [sitting, arms tucked in]
Row 2: [sleeping, eyes closed, snoring "zzz"] [excited, jumping/bouncing] [waving tiny arm] [thinking, eyebrow raised]
Row 3: [celebrating, sparkles around it] [sad, teardrops] [searching, eyes scanning side to side] [happy, blushing, hearts]
Row 4: [chatting, speech bubble] [being picked up, wide surprised eyes] [empty] [empty]

STYLE REQUIREMENTS:
- The food item IS the body (no separate body needed)
- Googly eyes or drawn-on eyes directly on the food
- Tiny stubby arms/legs for gestures and movement
- Warm, appetizing color palette matching the food
- Clean outlines, friendly rounded shapes
- Consistent character identity across all 14 poses
- Each mascot centered in 120×120 cell
- Kawaii / moe aesthetic — irresistibly cute

FOOD OPTIONS: bento box, ramen bowl, taiyaki, onigiri, bubble tea, croissant, pizza slice, dumpling
Customize the food type as desired.`,
    negativePrompt:
      'realistic food photography, scary, teeth, dark, complex background, text, watermark',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Niji Journey'],
  },

  {
    id: 'space-alien',
    name: 'Space Alien',
    nameZh: '外星小生物',
    description: 'Friendly alien or cosmic creature from outer space',
    descriptionZh: '来自宇宙的可爱外星生物',
    icon: '👽',
    prompt: `Create a spritesheet for a cute alien/cosmic creature desktop pet character.

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: [idle, floating or standing, antennae bobbing] [floating/hovering left] [floating/hovering right] [sitting or curled up]
Row 2: [sleeping, eyes shut, antenna drooping] [excited, multiple eyes wide, arms flailing] [waving with extra limb/tentacle] [thinking, holographic thought bubble]
Row 3: [celebrating, small UFO or stars around it] [sad, color changed/darker] [scanning, eyes scanning 360°] [contact made, glowing signal pulse]
Row 4: [communicating, beeping sounds depicted] [abducted/grabbed by larger beam — surprised] [empty] [empty]

STYLE REQUIREMENTS:
- Friendly, non-threatening alien design
- Bioluminescent accents or glowing elements
- Unusual but appealing color palette: teal, purple, lime, iridescent
- Big expressive eyes (multiple eyes OK!)
- Fun alien features: antennae, extra limbs, tentacles, tails, fins
- Consistent design across all 14 states
- Each sprite centered in 120×120 cell
- Semi-glossy or cel-shaded style — fun and colorful

ALIEN VARIETIES: blob with eyes, small green humanoid, crystalline creature, cosmic jellyfish, tentacled orb
Customize alien type as desired.`,
    negativePrompt:
      'scary alien, horror, gore, dark/threatening design, realistic, photorealistic, text, watermark',
    recommendedTools: ['Midjourney', 'DALL-E 3', 'Stable Diffusion XL'],
  },

  {
    id: 'custom-blank',
    name: 'Custom / Blank Template',
    nameZh: '自定义模板',
    description: 'Minimal template — describe your own character',
    descriptionZh: '最简模板——填入你自己的角色描述',
    icon: '✏️',
    prompt: `Create a spritesheet for a desktop pet character: [DESCRIBE YOUR CHARACTER HERE]

LAYOUT: 4×4 grid (480×480 pixels total, each cell 120×120 pixels)
BACKGROUND: Transparent (PNG with alpha channel)

GRID POSITIONS (left to right, top to bottom):
Row 1: idle | walk left | walk right | sit
Row 2: sleep | excited | wave | think
Row 3: celebrate | sad | searching | matched
Row 4: chatting | drag | (empty) | (empty)

REQUIREMENTS:
- Transparent PNG, 480×480 total
- 14 distinct poses, each in a 120×120 cell
- Consistent character design across all cells
- Clear, clean art style suitable for small display (~120px)
- No text or watermarks in the image`,
    negativePrompt:
      'text, watermark, blurry, inconsistent character, complex background',
    recommendedTools: ['Any AI image generator'],
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Get a prompt template by ID. Returns undefined if not found. */
export function getPromptById(id: string): PromptTemplate | undefined {
  return SPRITE_PROMPTS.find(p => p.id === id);
}

/** Get all prompt template IDs. */
export function getPromptIds(): string[] {
  return SPRITE_PROMPTS.map(p => p.id);
}

/** Get usage tips text (bilingual). */
export function getUsageTips(): string {
  return `使用提示 / Usage Tips:
1. 复制上方 Prompt，粘贴到 AI 生图工具中
2. 推荐工具：Midjourney、DALL-E 3、Stable Diffusion XL
3. 生成后下载 PNG 图片（确保背景透明）
4. 如果生成的图不是 480×480，系统会自动缩放适配
5. 单张图片也可以导入——所有状态会共用同一个形象

Tips:
1. Copy the prompt above and paste into any AI image generator
2. Recommended: Midjourney, DALL-E 3, Stable Diffusion XL
3. Download as PNG with transparent background
4. Non-standard sizes will be auto-scaled to fit
5. Single images work too — all states will share the same look`;
}

/**
 * Get a formatted prompt string ready to copy, with the negative prompt
 * appended if present.
 */
export function getFullPromptText(template: PromptTemplate): string {
  let text = template.prompt.trim();
  if (template.negativePrompt) {
    text += `\n\n---\nNEGATIVE PROMPT (paste into "negative" field if supported):\n${template.negativePrompt}`;
  }
  if (template.recommendedTools.length > 0) {
    text += `\n\nRECOMMENDED TOOLS: ${template.recommendedTools.join(', ')}`;
  }
  return text;
}
