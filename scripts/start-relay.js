#!/usr/bin/env node

/**
 * tinker-desk relay starter
 *
 * Starts a tinker relay server so this desktop can also act as a signaling node.
 * Other tinker-desk instances can connect to this relay for social features.
 *
 * Usage:
 *   node scripts/start-relay.js [--port 3210]
 *
 * The relay requires tinker-relay to be installed:
 *   npm install tinker-relay  (or use the monorepo)
 */

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '3210', 10);

async function main() {
  try {
    // Try to import from the tinker monorepo (development)
    const relayPath = process.env.TINKER_RELAY_PATH;
    let TinkerRelay;

    if (relayPath) {
      const mod = await import(relayPath);
      TinkerRelay = mod.TinkerRelay;
    } else {
      // Try npm package
      try {
        const mod = await import('tinker-relay');
        TinkerRelay = mod.TinkerRelay;
      } catch {
        console.error('❌ tinker-relay not found.');
        console.error('   Install it: npm install tinker-relay');
        console.error('   Or set TINKER_RELAY_PATH to the relay module path.');
        process.exit(1);
      }
    }

    const relay = new TinkerRelay({
      port: PORT,
      host: '0.0.0.0',
      verbose: true,
    });

    await relay.start();
    console.log(`\n🚀 tinker relay running on ws://localhost:${PORT}`);
    console.log('   Other tinker-desk instances can connect to this address.');
    console.log('   Press Ctrl+C to stop.\n');

    process.on('SIGINT', async () => {
      console.log('\n⏹  Stopping relay...');
      await relay.stop();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start relay:', err);
    process.exit(1);
  }
}

main();
