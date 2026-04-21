# tinker-desk 🐾

> A desktop companion pet powered by the [tinker](https://github.com/Fozu-lzwpattern/tinker) social network.

**tinker-desk** is a transparent, always-on-top desktop pet that lives on your screen. It walks, thinks, sleeps, waves — and can **find buddies** on the tinker P2P network.

Each instance is a fully autonomous node. No cloud. No central server. Just peers.

```
┌─ Your Desktop ──────────────────────────────────┐
│                                                   │
│      💭 Looking for a buddy...                    │
│        ╭──╮                                      │
│       (°ᴗ°)  ← Your tinker pet                  │
│       /    \                                      │
│      ┗━━━━┛                                      │
│                                                   │
│  [Taskbar] ... [tinker-desk 🐾]                  │
└───────────────────────────────────────────────────┘
```

## Features

- 🐾 **Desktop Pet** — transparent window, always-on-top, lives on your screen
- 🎲 **Find Buddy** — one-click "碰碰碰" to discover peers on the tinker network
- 💬 **DM Chat** — chat with matched buddies through floating chat panel
- 🎨 **Themes** — customizable pet appearance (SVG/PNG/GIF sprites)
- 🔧 **Hook Engine** — extensible event→action system for custom behaviors
- 🔊 **Sound Effects** — synthesized audio feedback (zero external files)
- 📡 **P2P Network** — every instance can be both client AND relay
- ⚙️ **Settings** — personality tuning, network config, animation speed
- 💾 **Persistent** — all settings saved to localStorage

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (for Tauri)
- Tauri CLI: `cargo install tauri-cli@^2`

### Install & Run

```bash
# Clone
git clone https://github.com/Fozu-lzwpattern/tinker-desk.git
cd tinker-desk

# Install dependencies
npm install

# Run as desktop app (Tauri)
npm run tauri dev

# Or preview in browser (development)
npm run dev
# → open http://localhost:1420
```

### First Time Rust Setup

If you don't have Rust installed:

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then install Tauri CLI
cargo install tauri-cli@^2

# Verify
cargo tauri --version
```

### Build for Distribution

```bash
# Build .dmg (macOS) / .msi (Windows) / .AppImage (Linux)
npm run tauri build
```

## Architecture

```
tinker-desk/
├── src-tauri/              # Tauri v2 Rust shell
│   ├── src/main.rs         # Window setup + system tray
│   └── tauri.conf.json     # Tauri configuration
├── src/
│   ├── App.tsx             # Main application shell
│   ├── types.ts            # Complete type system
│   ├── main.tsx            # React entry point
│   ├── components/
│   │   ├── PetSprite.tsx   # SVG pet rendering (14 states)
│   │   ├── BubbleOverlay.tsx # Speech/thought bubbles
│   │   ├── ChatPanel.tsx   # DM chat with buddy
│   │   ├── ContextMenu.tsx # Right-click menu
│   │   ├── SettingsPanel.tsx # Full settings UI (5 tabs)
│   │   └── StatusBar.tsx   # Status display (browser mode)
│   ├── hooks/
│   │   ├── useHookEngine.ts    # Extensible event→action engine
│   │   ├── useTinkerNetwork.ts # Tinker network integration
│   │   ├── usePetBehavior.ts   # Autonomous behavior AI
│   │   └── useDrag.ts         # Native drag (Tauri) / CSS drag (browser)
│   ├── network/
│   │   └── TinkerBridge.ts    # Browser-native WebSocket client
│   ├── store/
│   │   └── appStore.ts        # Zustand state + localStorage persistence
│   ├── themes/
│   │   └── ThemeLoader.ts     # Theme loading & management
│   └── sounds/
│       └── SoundEngine.ts     # Web Audio synthesized sounds
├── scripts/
│   └── start-relay.js         # Optional: start a tinker relay
└── examples/
    ├── themes/                # Theme examples + creation guide
    └── hooks/                 # Hook template examples
```

## How It Works

### Desktop Mode (Tauri)

The pet lives in a **transparent, borderless, always-on-top window**. The window IS the pet — dragging the pet moves the window via Tauri's native `startDragging()` API. All non-pet areas are click-through.

### Browser Mode (Development)

The pet is a CSS-positioned element inside the viewport. Useful for development and testing without Rust/Tauri installed. Run `npm run dev` and open `http://localhost:1420`.

### Networking

tinker-desk uses the **tinker protocol** for peer-to-peer social networking:

1. **Connect** to one or more tinker relays via WebSocket
2. **Join rooms** for global chat
3. **Publish intents** to find buddies ("碰碰碰")
4. **DM** matched buddies directly

Each tinker-desk instance can optionally run an **embedded relay**, making it a signaling node for other peers:

```bash
# Start a relay on this machine
node scripts/start-relay.js --port 3210

# Other tinker-desk instances can connect to:
# ws://your-ip:3210
```

### Pet States

The pet has **14 visual states**, driven by the behavior engine and network events:

| State | Trigger |
|-------|---------|
| `idle` | Default — gentle bounce |
| `walk_left` / `walk_right` | Autonomous walking (browser mode) |
| `sit` | Resting |
| `sleep` | Extended idle |
| `think` | Contemplating |
| `wave` | Greeting a new peer |
| `excited` | Clicked or stimulated |
| `celebrate` | Buddy found! |
| `sad` | Buddy lost |
| `searching` | Looking for buddy |
| `matched` | Buddy match confirmed |
| `chatting` | In conversation |
| `drag` | Being dragged |

### Hook Engine

The hook engine lets you create custom behaviors:

```json
{
  "id": "greet-peer",
  "name": "Greet New Peer",
  "enabled": true,
  "event": "peer_discovered",
  "condition": "count > 0",
  "actions": [
    { "type": "animate", "payload": { "state": "wave", "duration": 2000 } },
    { "type": "show_bubble", "payload": { "text": "Hello! 👋", "duration": 3000 } }
  ],
  "cooldownMs": 10000
}
```

**21 events** × **10 action types** = unlimited custom behaviors.

## Custom Themes

See [`examples/themes/CREATING_THEMES.md`](examples/themes/CREATING_THEMES.md) for a guide.

Quick version: create a `theme.json` defining sprites for all 14 states, place sprite files alongside it.

## Network Configuration

In **Settings → Network**:

- **Auto-Start**: Connect to relay on launch
- **Relay Port**: Port for local embedded relay
- **Bootstrap Peers**: Known relay addresses to connect to
- **mDNS**: Auto-discover peers on local network

## Relationship to tinker

**tinker** is the P2P social protocol (SDK + Relay + CLI). It's a separate, independent project.

**tinker-desk** is a desktop application that uses the tinker protocol to enable peer-to-peer social features for desktop pets. It includes a browser-native reimplementation of the tinker client (`TinkerBridge`).

## Tech Stack

- **Tauri v2** — lightweight native desktop shell (Rust)
- **React 18** — UI framework
- **Zustand** — state management
- **Web Audio API** — synthesized sound effects
- **tinker protocol** — P2P networking

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2026-04-21 | Full desktop pet: Tauri shell, 14 states, hook engine, sound, themes, network, settings |
| v0.2.0 | 2026-04-21 | TinkerBridge + useTinkerNetwork + ChatPanel + Find Buddy |
| v0.1.0 | 2026-04-21 | Initial scaffold: PetSprite, HookEngine, BubbleOverlay, ContextMenu |

## License

MIT
