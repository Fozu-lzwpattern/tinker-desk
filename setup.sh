#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# tinker-desk — One-click setup & launch
# ─────────────────────────────────────────────────────────────
#
# Usage:
#   ./setup.sh              # Install deps + launch browser dev
#   ./setup.sh --tauri      # Install deps + launch Tauri desktop
#   ./setup.sh --relay      # Start embedded relay only
#   ./setup.sh --help       # Show this help
#
# Prerequisites:
#   - Node.js v18+
#   - (Optional) Rust + Tauri CLI v2 for desktop mode
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() {
  echo -e "${CYAN}${BOLD}"
  echo "  ╭──────────────────────────────────╮"
  echo "  │     🐾 tinker-desk v0.1.0        │"
  echo "  │  Desktop Pet × P2P Social Net    │"
  echo "  ╰──────────────────────────────────╯"
  echo -e "${NC}"
}

info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
err()   { echo -e "${RED}[✗]${NC} $*" >&2; }

check_node() {
  if ! command -v node &>/dev/null; then
    err "Node.js not found. Install from https://nodejs.org (v18+)"
    exit 1
  fi
  local v
  v=$(node -v | sed 's/v//' | cut -d. -f1)
  if (( v < 18 )); then
    err "Node.js v18+ required (found v$(node -v))"
    exit 1
  fi
  info "Node.js $(node -v)"
}

check_rust() {
  if ! command -v rustc &>/dev/null; then
    warn "Rust not found — required for Tauri desktop mode"
    warn "Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    return 1
  fi
  if ! command -v cargo &>/dev/null; then
    warn "cargo not found"
    return 1
  fi
  # Check for tauri CLI
  if ! cargo tauri --version &>/dev/null 2>&1; then
    warn "Tauri CLI not found. Installing..."
    cargo install tauri-cli@^2
  fi
  info "Rust $(rustc --version | awk '{print $2}') + Tauri CLI"
  return 0
}

install_deps() {
  info "Installing dependencies..."

  # Force dev deps to be installed even if NODE_ENV=production
  export NODE_ENV=development

  # ── Step 1: Install tinker-relay into bundled/ ──
  if [ ! -d "bundled/tinker-relay/node_modules/better-sqlite3" ]; then
    info "  Setting up bundled tinker-relay..."
    if [ ! -d "bundled/tinker-relay/dist" ]; then
      err "bundled/tinker-relay not found. This package may be incomplete."
      err "Re-download from the release."
      exit 1
    fi
    (cd bundled/tinker-relay && npm install 2>&1 | tail -3)
  fi
  info "  tinker-relay ready"

  # ── Step 2: Install tinker-desk frontend deps ──
  if [ ! -d "node_modules/react" ] || [ ! -d "node_modules/vite" ]; then
    info "  Installing frontend dependencies..."
    npm install 2>&1 | tail -3
  fi
  info "  Frontend deps ready"

  # ── Step 3: Build frontend (if dist missing or stale) ──
  if [ ! -f "dist/index.html" ]; then
    info "  Building frontend..."
    npx vite build 2>&1 | tail -3
  fi
  info "  Frontend built"

  info "All dependencies ready ✅"
}

launch_browser() {
  info "Starting in browser dev mode → http://localhost:1420"
  echo ""
  echo -e "  ${BOLD}Open:${NC}  http://localhost:1420"
  echo -e "  ${BOLD}Stop:${NC}  Ctrl+C"
  echo ""
  npx vite --port 1420
}

launch_tauri() {
  if ! check_rust; then
    err "Cannot launch Tauri mode without Rust. Use browser mode instead:"
    echo "  ./setup.sh"
    exit 1
  fi
  info "Starting Tauri desktop mode..."
  npm run tauri dev
}

launch_relay() {
  info "Starting embedded tinker-relay on port ${RELAY_PORT:-3210}..."
  node scripts/start-relay.js --port "${RELAY_PORT:-3210}"
}

show_help() {
  banner
  echo "Usage: ./setup.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  (none)       Install deps + start browser dev mode (http://localhost:1420)"
  echo "  --tauri      Install deps + start Tauri desktop app (requires Rust)"
  echo "  --relay      Start embedded tinker-relay server only"
  echo "  --port N     Relay port (default: 3210, used with --relay)"
  echo "  --help       Show this help"
  echo ""
  echo "Environment:"
  echo "  RELAY_PORT=3210   Override relay port"
  echo ""
  echo "Quick start (browser mode, no Rust needed):"
  echo "  ./setup.sh"
  echo ""
  echo "Desktop mode (requires Rust + Tauri CLI):"
  echo "  ./setup.sh --tauri"
}

# ─── Main ─────────────────────────────────────────────

MODE="browser"
RELAY_PORT="${RELAY_PORT:-3210}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tauri)  MODE="tauri"; shift ;;
    --relay)  MODE="relay"; shift ;;
    --port)   RELAY_PORT="$2"; shift 2 ;;
    --help|-h) show_help; exit 0 ;;
    *) err "Unknown option: $1"; show_help; exit 1 ;;
  esac
done

banner
check_node
install_deps

case "$MODE" in
  browser) launch_browser ;;
  tauri)   launch_tauri ;;
  relay)   launch_relay ;;
esac
