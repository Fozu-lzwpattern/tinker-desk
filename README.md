# tinker-desk 🐾

> Desktop companion pet × P2P social network — your little digital creature that lives on the screen and makes friends on its own.

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

---

## ⚡ Quick Start (< 2 minutes)

### Prerequisites

- **Node.js v18+** — [Download](https://nodejs.org/) (LTS recommended)

That's it! Rust is only needed for the native desktop mode.

### Option A: One-Click Setup (Recommended)

```bash
# 1. Unzip the package
tar xzf tinker-desk-v0.1.0-standalone.tar.gz
cd tinker-desk

# 2. Run!
./setup.sh
```

This will:
- ✅ Install all dependencies (frontend + relay)
- ✅ Build the frontend
- ✅ Start dev server at **http://localhost:1420**

Open your browser → done! 🎉

### Option B: Clone from GitHub

```bash
git clone https://github.com/Fozu-lzwpattern/tinker-desk.git
cd tinker-desk
./setup.sh
```

### Option C: Native Desktop App (requires Rust)

```bash
# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli@^2

# Launch as native desktop app
./setup.sh --tauri
```

---

## 🎮 How to Use

### First Launch

1. Run `./setup.sh` → browser opens at `http://localhost:1420`
2. Your pet appears! It will **idle, walk, sit, think, sleep** autonomously
3. Click the pet → it gets excited! Right-click → context menu

### Find Buddies ("碰碰碰")

1. Right-click pet → **"碰碰碰 Find Buddy"**
2. Pet enters searching mode 🔍
3. If another tinker-desk is online → **match!** 🎉
4. Chat panel opens → DM your new buddy

### Settings

Right-click → **Settings** to access:

| Tab | What You Can Do |
|-----|-----------------|
| **Personality** | Adjust energy, curiosity, friendliness |
| **Network** | Configure relay address, auto-connect |
| **Theme** | Switch between 5 built-in themes |
| **Hooks** | Create custom event→action behaviors |
| **Security** | Toggle unsafe hook permissions |

### Built-in Themes

| Theme | Look |
|-------|------|
| 🟢 **default** | Green jelly blob with antenna |
| 🦘 **kanga** | Little kangaroo with pouch |
| 👾 **pixel** | 8-bit Game Boy style |
| 🐱 **neko** | Orange tabby cat |
| 🤖 **bot** | Cyber robot with LED chest |

---

## 📡 Networking

tinker-desk uses the **tinker P2P protocol**. No cloud, no central server — just peers.

### Architecture

```
┌──────────────┐     WebSocket     ┌──────────────┐
│ tinker-desk  │ ◄──────────────► │ tinker-relay │
│  (your pet)  │                   │  (signaling) │
└──────────────┘                   └──────────────┘
       ▲                                  ▲
       │           WebSocket              │
       │      ┌──────────────┐            │
       └─────►│ tinker-desk  │◄───────────┘
              │ (other pets) │
              └──────────────┘
```

### Running Your Own Relay

Every tinker-desk includes a **bundled relay server**:

```bash
# Start relay on port 3210
./setup.sh --relay

# Or with custom port
RELAY_PORT=4000 ./setup.sh --relay
```

Other pets can connect to your relay at `ws://your-ip:3210`.

### Connecting to a Relay

In Settings → Network:
- Set **Relay URL** to `ws://relay-ip:3210`
- Enable **Auto-Connect**

---

## 🏗️ Project Structure

```
tinker-desk/
├── setup.sh                    # ⭐ One-click setup & launch
├── bundled/
│   └── tinker-relay/           # Self-contained relay server
│       ├── dist/               #   Pre-built JavaScript
│       └── src/                #   TypeScript source
├── scripts/
│   └── start-relay.js          # Standalone relay launcher
├── src/
│   ├── App.tsx                 # Main app shell
│   ├── types.ts                # Complete type system
│   ├── components/
│   │   ├── PetSprite.tsx       # SVG pet rendering (14 states)
│   │   ├── BubbleOverlay.tsx   # Speech/thought bubbles
│   │   ├── ChatPanel.tsx       # DM chat interface
│   │   ├── ContextMenu.tsx     # Right-click menu
│   │   ├── GlobalChat.tsx      # Room-wide chat
│   │   ├── AgentHub.tsx        # Multi-agent connections
│   │   ├── SettingsPanel.tsx   # Full settings UI (5 tabs)
│   │   └── StatusBar.tsx       # Connection status bar
│   ├── hooks/
│   │   ├── usePetBehavior.ts   # Autonomous behavior AI
│   │   ├── useTinkerNetwork.ts # Network integration
│   │   ├── useHookEngine.ts    # Event→action engine
│   │   └── useDrag.ts          # Native/CSS drag
│   ├── network/
│   │   ├── TinkerBridge.ts     # WebSocket client (browser-native)
│   │   └── AgentSDK.ts         # External agent integration
│   ├── store/
│   │   └── appStore.ts         # Zustand + localStorage persistence
│   ├── themes/
│   │   └── ThemeLoader.ts      # Theme loading & management
│   └── sounds/
│       └── SoundEngine.ts      # Web Audio synthesized SFX
├── src-tauri/                   # Tauri v2 Rust shell (desktop mode)
│   ├── src/main.rs
│   └── tauri.conf.json
├── examples/
│   ├── themes/                 # Theme creation guide
│   └── hooks/                  # Hook template examples
├── vite.config.ts              # Vite configuration
└── package.json
```

---

## 🐾 Pet States

The pet has **14 visual states**, driven by the behavior engine and network events:

| State | Trigger | Visual |
|-------|---------|--------|
| `idle` | Default | Gentle bounce |
| `walk_left` / `walk_right` | Autonomous | Walking animation |
| `sit` | Rest | Sitting pose |
| `sleep` | Extended idle | Zzz animation |
| `think` | Contemplating | Thought bubble |
| `wave` | New peer found | Waving arm |
| `excited` | Clicked! | Bouncing |
| `celebrate` | Buddy matched! | Party mode |
| `sad` | Buddy lost | Drooping |
| `searching` | Finding buddy | Scanning |
| `matched` | Buddy confirmed | Hearts |
| `chatting` | In conversation | Chat bubble |
| `drag` | Being dragged | Surprised |

---

## 🔧 Hook Engine

Create custom behaviors by linking **events** to **actions**:

```json
{
  "id": "greet-peer",
  "event": "peer_discovered",
  "actions": [
    { "type": "animate", "payload": { "state": "wave", "duration": 2000 } },
    { "type": "show_bubble", "payload": { "text": "Hello! 👋" } }
  ],
  "cooldownMs": 10000
}
```

**21 events** (click, double-click, idle, peer events, timer...) × **10 action types** (animate, bubble, sound, move, network...) = unlimited behaviors.

See [`examples/hooks/`](examples/hooks/) for templates.

---

## 🎨 Custom Themes

See [`examples/themes/CREATING_THEMES.md`](examples/themes/CREATING_THEMES.md) for the full guide.

Quick version: create SVG sprites for each of the 14 states, wrap in a `theme.json`.

---

## 🔗 Relationship to tinker

| Project | What | Repo |
|---------|------|------|
| **tinker** | P2P social protocol (SDK + Relay + CLI) | [tinker](https://github.com/Fozu-lzwpattern/tinker) |
| **tinker-desk** | Desktop pet app using tinker protocol | This repo |

tinker-desk **bundles** its own copy of `tinker-relay` — no need to install tinker separately.

---

## 📋 setup.sh Reference

```bash
./setup.sh              # Install + browser dev mode (http://localhost:1420)
./setup.sh --tauri      # Install + Tauri desktop app (requires Rust)
./setup.sh --relay      # Start relay server only (ws://localhost:3210)
./setup.sh --port 4000  # Custom relay port (with --relay)
./setup.sh --help       # Show help
```

**Environment variables:**
```bash
RELAY_PORT=4000 ./setup.sh --relay   # Custom relay port
```

---

## ⚠️ Troubleshooting

### "Cannot find module 'tinker-relay'"
```bash
# Re-run setup to fix symlinks
./setup.sh
```

### "better-sqlite3 build error"
This native module needs compilation tools:
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install build-essential python3

# Then re-run
./setup.sh
```

### "Tauri: command not found"
```bash
cargo install tauri-cli@^2
```

### Browser mode: pet doesn't show
Check console (F12) for errors. Likely cause: relay not running. Start one:
```bash
./setup.sh --relay   # In another terminal
```

---

## Tech Stack

- **Tauri v2** — native desktop shell (Rust, optional)
- **React 18** — UI
- **Zustand** — state management
- **Vite 5** — build tool
- **Web Audio API** — synthesized sounds (zero external files)
- **tinker protocol** — P2P networking (WebSocket)

## Version

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | 2026-04-22 | Self-contained package, one-click setup, 5 themes, 17 features |

## License

MIT
