#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# tinker-desk — One-click setup & launch (Tauri Desktop)
# ─────────────────────────────────────────────────────────────
#
# Usage:
#   ./setup.sh              # Install deps + launch Tauri desktop
#   ./setup.sh --help       # Show this help
#
# Prerequisites:
#   - Node.js v18+
#   - Rust + Tauri CLI v2
#
# ─────────────────────────────────────────────────────────────
# 🔧 Alternative modes (advanced / development):
#
#   Browser-only mode (no Rust required):
#     Uncomment the following in the Main section at the bottom:
#       # launch_browser
#     Then run: ./setup.sh
#     Opens http://localhost:1420 with hot-reload via Vite.
#
#   Relay-only mode:
#     Uncomment the following in the Main section at the bottom:
#       # launch_relay
#     Then run: ./setup.sh
#     Starts an embedded tinker-relay on port 3210 (or $RELAY_PORT).
#     Useful when you want to host a relay node without running the UI.
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
    err "Rust not found — required for Tauri desktop mode"
    echo -e "  Install: ${BOLD}curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${NC}"
    return 1
  fi
  if ! command -v cargo &>/dev/null; then
    err "cargo not found"
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

  # ── Step 4: Generate icons (if missing) ──
  if [ ! -f "src-tauri/icons/32x32.png" ]; then
    info "  Generating app icons..."
    node scripts/generate-icons.js 2>&1 | tail -3
  fi

  info "All dependencies ready ✅"
}

launch_tauri() {
  if ! check_rust; then
    err "Cannot launch without Rust + Tauri CLI."
    echo ""
    echo -e "  ${BOLD}Install Rust:${NC}  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo -e "  ${BOLD}Install Tauri:${NC} cargo install tauri-cli@^2"
    echo ""
    # ───────────────────────────────────────────────────────
    # 💡 If you don't have Rust and just want to preview in
    #    a browser, uncomment launch_browser in the Main
    #    section below and re-run this script.
    # ───────────────────────────────────────────────────────
    exit 1
  fi
  info "Starting Tauri desktop mode..."
  npm run tauri dev
}

# ─────────────────────────────────────────────────────────────
# Alternative launchers (uncomment in Main section to use)
# ─────────────────────────────────────────────────────────────

# launch_browser() {
#   # Browser dev mode — no Rust required, hot-reload via Vite
#   # Opens http://localhost:1420
#   info "Starting in browser dev mode → http://localhost:1420"
#   echo ""
#   echo -e "  ${BOLD}Open:${NC}  http://localhost:1420"
#   echo -e "  ${BOLD}Stop:${NC}  Ctrl+C"
#   echo ""
#   npx vite --port 1420
# }

# launch_relay() {
#   # Standalone relay mode — host a tinker-relay node
#   # Override port with RELAY_PORT env var (default: 3210)
#   info "Starting embedded tinker-relay on port ${RELAY_PORT:-3210}..."
#   node scripts/start-relay.js --port "${RELAY_PORT:-3210}"
# }

show_help() {
  banner
  echo "Usage: ./setup.sh [OPTIONS]"
  echo ""
  echo "  Default: Install dependencies + launch Tauri desktop app"
  echo ""
  echo "Options:"
  echo "  --help, -h    Show this help"
  echo ""
  echo "Prerequisites:"
  echo "  • Node.js v18+"
  echo "  • Rust toolchain (rustup.rs)"
  echo "  • Tauri CLI v2 (cargo install tauri-cli@^2)"
  echo ""
  echo "Alternative modes (edit this script to enable):"
  echo "  Browser-only: Uncomment launch_browser in the Main section"
  echo "  Relay-only:   Uncomment launch_relay in the Main section"
}

# ─── Main ─────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) show_help; exit 0 ;;
    *) err "Unknown option: $1"; show_help; exit 1 ;;
  esac
done

banner
check_node
install_deps
launch_tauri

# ─── Alternative modes (uncomment ONE to switch) ─────
# launch_browser
# launch_relay
