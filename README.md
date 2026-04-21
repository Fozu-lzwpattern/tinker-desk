# tinker-desk 🐾

Desktop companion pet powered by the [tinker](https://github.com/Fozu-lzwpattern/tinker) social network.

A transparent, always-on-top desktop creature that lives on your screen, socializes with other tinker-desk instances on the network, and is deeply customizable through themes, hooks, and personality settings.

## ✨ Features

- **🎨 Custom Themes** — Upload your own sprite sets (SVG/PNG/GIF) with `theme.json`
- **🪝 Hook System** — Map any event → action. Extend behavior with JS expressions
- **🔊 Sound Effects** — Custom audio for every event and state transition
- **🎲 Find Buddy** — One-click "碰碰碰" to discover and connect with peers
- **🌐 P2P Network** — Each instance is both a client and a relay (fully decentralized)
- **🐾 Personality** — Configurable sociability, energy, and curiosity drive autonomous behavior
- **📦 Zero Dependencies** — No cloud server needed. LAN discovery + optional bootstrap peers

## Architecture

```
┌─ Tauri (Rust) ──────────────────────┐
│  Transparent window + always-on-top  │
│  System tray                         │
│  Node Sidecar ──────────────────── │
│    ├── EmbeddedRelay (tinker-relay)  │
│    ├── TinkerClient (tinker-sdk)     │
│    └── [Future: Kangas Engine]       │
│                                      │
│  WebView (React) ──────────────── │
│    ├── PetSprite (SVG animations)    │
│    ├── BubbleOverlay                 │
│    ├── ContextMenu (right-click)     │
│    ├── SettingsPanel (6 tabs)        │
│    ├── HookEngine                    │
│    └── StatusBar                     │
└──────────────────────────────────────┘
```

## Quick Start

### Browser Dev Mode (no Rust needed)

```bash
npm install
npm run dev
# Open http://localhost:1420
```

### Tauri Desktop App

```bash
# Requires Rust toolchain
npm install
npm run tauri:dev
```

## Settings (right-click pet → ⚙️)

| Tab | What it does |
|-----|-------------|
| 🎨 Theme | Upload custom sprite packs, switch themes |
| 🪝 Hooks | Event → Action mappings, JS conditions, cooldowns |
| 🔊 Sounds | Map events to audio files |
| ✨ Animation | Speed, bounce, walk speed, particles |
| 🌐 Network | Relay port, bootstrap peers, mDNS toggle |
| 🐾 Pet | Name, personality sliders |

## Hook System

Hooks connect **events** to **actions**:

```json
{
  "id": "my-hook",
  "name": "Greet on Click",
  "enabled": true,
  "event": "pet_clicked",
  "condition": "Math.random() > 0.5",
  "actions": [
    { "type": "show_bubble", "payload": { "text": "Hey! 👋" } },
    { "type": "play_sound", "payload": { "src": "sounds/pop.mp3" } }
  ],
  "cooldownMs": 3000
}
```

### Events (21 types)

**Network**: `peer_discovered` · `intent_matched` · `intent_expired` · `message_received` · `dm_received` · `agent_status_changed` · `buddy_found` · `buddy_lost`

**Local**: `pet_clicked` · `pet_double_clicked` · `pet_dragged` · `pet_dropped` · `mouse_near` · `mouse_away` · `window_focus` · `window_blur` · `idle_timeout` · `timer`

**Lifecycle**: `startup` · `shutdown`

### Actions (10 types)

`set_state` · `play_sound` · `show_bubble` · `show_notification` · `animate` · `move_to` · `open_url` · `send_message` · `publish_intent` · `custom`

## Theme Format

Create a `theme.json` with sprites for each pet state:

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "size": { "width": 80, "height": 80 },
  "sprites": {
    "idle": { "src": "sprites/idle.svg", "frames": 1 },
    "walk_left": { "src": "sprites/walk.svg", "frames": 4, "frameDuration": 150 },
    ...
  }
}
```

**States**: idle · walk_left · walk_right · sit · sleep · excited · wave · think · celebrate · sad · searching · matched · chatting · drag

## Roadmap

- [x] v0.1 — Pet sprite + drag + behavior engine + settings panel + hook system
- [ ] v0.2 — tinker network integration (EmbeddedRelay + TinkerClient)
- [ ] v0.3 — "Find Buddy" 碰碰碰 (intent publish + match flow)
- [ ] v0.4 — Custom theme loading from disk
- [ ] v0.5 — Chat bubble (DM through tinker)
- [ ] v1.0 — Tauri desktop build + installer

## Related

- [tinker](https://github.com/Fozu-lzwpattern/tinker) — The underlying P2P social protocol
- [kangas-pet](https://github.com/Fozu-lzwpattern/kangas-pet) — Digital life engine (future soul layer)

## License

MIT
