#!/usr/bin/env node
/**
 * tinker-desk relay starter
 *
 * Starts an embedded tinker-relay server so this desktop can also act as a
 * signaling node. Other tinker-desk instances can connect to this relay.
 *
 * Usage:
 *   node scripts/start-relay.js [--port 3210]
 */

import { TinkerRelay } from 'tinker-relay';

// ── Parse --port arg (default 3210) ───────────────────────────
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3210;

if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`❌ Invalid port: ${args[portIndex + 1]}`);
  process.exit(1);
}

// ── Start relay ───────────────────────────────────────────────
async function main() {
  console.log(`🔌 Starting tinker-relay on port ${PORT}…`);

  const relay = new TinkerRelay({ port: PORT });

  await relay.start();

  console.log(`✅ tinker-relay running on ws://localhost:${PORT}`);
  console.log('   Connect your tinker-desk instances to this relay.');
  console.log('   Press Ctrl+C to stop.\n');

  // ── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n⏹  Received ${signal} — shutting down relay…`);
    try {
      await relay.stop();
      console.log('✓ Relay stopped cleanly.');
    } catch (err) {
      console.error('Error during shutdown:', err);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('❌ Failed to start relay:', err);
  process.exit(1);
});
