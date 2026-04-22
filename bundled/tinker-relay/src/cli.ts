#!/usr/bin/env node
import { TinkerRelay } from './relay.js'

const port = parseInt(
  process.argv.find(a => a.startsWith('--port='))?.split('=')[1] ?? '7077',
  10,
)

const relay = new TinkerRelay({ port })

relay.start().catch((err) => {
  console.error('[relay] failed to start:', err)
  process.exit(1)
})

process.on('SIGTERM', () => { void relay.stop() })
process.on('SIGINT',  () => { void relay.stop() })
