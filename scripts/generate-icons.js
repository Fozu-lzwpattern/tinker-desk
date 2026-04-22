#!/usr/bin/env node
/**
 * Generate Tauri icon files from SVG using sharp (if available) or canvas fallback.
 * Run: node scripts/generate-icons.js
 *
 * Required icons for Tauri v2:
 *   icons/32x32.png
 *   icons/128x128.png
 *   icons/128x128@2x.png  (256x256)
 *   icons/icon.icns         (macOS — we generate a PNG placeholder, `cargo tauri icon` can convert)
 *   icons/icon.ico          (Windows — we generate a PNG placeholder)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Minimal PNG generator (no dependencies)
// Creates a simple colored square with a paw-print-like pattern
function createMinimalPNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Generate pixel data (simple green circle on transparent-ish background)
  const rawData = [];
  const cx = size / 2, cy = size / 2, r = size * 0.4;

  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < r) {
        // Green circle (tinker-desk brand color)
        rawData.push(76, 175, 80); // #4CAF50
      } else {
        rawData.push(240, 240, 240); // light gray background
      }
    }
  }

  const rawBuf = Buffer.from(rawData);
  return { ihdr, rawBuf, size };
}

import { deflateSync } from 'zlib';
import { createHash } from 'crypto';

function crc32(buf) {
  // PNG CRC-32
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crc]);
}

function generatePNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Pixel data: green circle with paw icon
  const raw = [];
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const pawR = size * 0.08;

  // Paw pad positions (relative to center)
  const pads = [
    { x: 0, y: size * 0.08 },           // main pad
    { x: -size * 0.12, y: -size * 0.1 }, // left toe
    { x: size * 0.12, y: -size * 0.1 },  // right toe
    { x: 0, y: -size * 0.2 },            // top toe
  ];

  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: none
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      // Check if inside any paw pad
      let inPaw = false;
      for (const pad of pads) {
        const pd = Math.sqrt((x - cx - pad.x) ** 2 + (y - cy - pad.y) ** 2);
        const pr = pad === pads[0] ? pawR * 1.5 : pawR;
        if (pd < pr) { inPaw = true; break; }
      }

      if (inPaw) {
        raw.push(255, 255, 255, 255); // white paw
      } else if (dist < r) {
        raw.push(76, 175, 80, 255);   // #4CAF50 green
      } else {
        raw.push(0, 0, 0, 0);         // transparent
      }
    }
  }

  const rawBuf = Buffer.from(raw);
  const compressed = deflateSync(rawBuf);

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all required sizes
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },        // source for icns/ico generation
];

for (const { name, size } of sizes) {
  const png = generatePNG(size);
  const path = join(iconsDir, name);
  writeFileSync(path, png);
  console.log(`✅ ${name} (${size}×${size}, ${png.length} bytes)`);
}

// For icon.icns and icon.ico, copy the 256px PNG as placeholder
// Real conversion should use `cargo tauri icon` or similar tool
const png256 = generatePNG(256);
writeFileSync(join(iconsDir, 'icon.icns'), png256);
writeFileSync(join(iconsDir, 'icon.ico'), png256);
console.log('⚠️  icon.icns and icon.ico are PNG placeholders');
console.log('   Run `cargo tauri icon src-tauri/icons/icon.png` to generate proper formats');
console.log('\n✅ All icons generated in src-tauri/icons/');
