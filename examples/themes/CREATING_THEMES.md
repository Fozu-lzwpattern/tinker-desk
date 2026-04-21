# Creating Custom Themes for tinker-desk

## Theme Structure

A theme is a directory containing:

```
my-theme/
├── theme.json          # Theme manifest (required)
├── idle.png            # Sprite for idle state
├── walk_left.png       # Sprite for walking left
├── walk_right.png      # Sprite for walking right
├── sit.png             # Sprite for sitting
├── sleep.png           # Sprite for sleeping
├── excited.png         # Sprite for excited state
├── wave.png            # Sprite for waving
├── think.png           # Sprite for thinking
├── celebrate.png       # Sprite for celebration
├── sad.png             # Sprite for sad state
├── searching.png       # Sprite for buddy search
├── matched.png         # Sprite for buddy found
├── chatting.png        # Sprite for chatting
└── drag.png            # Sprite for being dragged
```

## theme.json Format

```json
{
  "name": "My Cool Pet",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A cool custom pet theme",
  "sprites": {
    "idle": { "src": "idle.png", "frames": 1 },
    "walk_left": { "src": "walk_left.png", "frames": 4, "frameDuration": 150, "loop": true },
    "walk_right": { "src": "walk_right.png", "frames": 4, "frameDuration": 150, "loop": true },
    "sit": { "src": "sit.png" },
    "sleep": { "src": "sleep.png" },
    "excited": { "src": "excited.png", "frames": 2, "frameDuration": 200, "loop": true },
    "wave": { "src": "wave.png" },
    "think": { "src": "think.png" },
    "celebrate": { "src": "celebrate.png", "frames": 3, "frameDuration": 200 },
    "sad": { "src": "sad.png" },
    "searching": { "src": "searching.png", "frames": 2, "frameDuration": 500, "loop": true },
    "matched": { "src": "matched.png" },
    "chatting": { "src": "chatting.png" },
    "drag": { "src": "drag.png" }
  },
  "size": { "width": 120, "height": 120 },
  "hitbox": { "x": 10, "y": 10, "width": 100, "height": 100 }
}
```

## Sprite Formats

- **PNG** (recommended): Best for pixel art. Use transparent backgrounds.
- **SVG**: Best for vector art. Scales perfectly.
- **GIF**: Supported but no frame control. Use PNG sprite sheets for animated states.

## Tips

1. **Transparent background**: All sprites should have transparent backgrounds
2. **Consistent size**: Keep all sprites the same dimensions
3. **14 states**: You need sprites for all 14 states. If a state doesn't have unique art, point it to the idle sprite.
4. **Animation frames**: For animated states, use sprite sheets (frames side by side horizontally)
