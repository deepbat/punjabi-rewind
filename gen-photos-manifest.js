#!/usr/bin/env node
/**
 * gen-photos-manifest.js
 * ----------------------------
 * Scans the `photos/` folder for image files (jpg, jpeg, png, webp, gif, svg)
 * and writes a clean `photos/index.json` manifest that the Photos app reads.
 *
 * Run from the project root:
 *   node gen-photos-manifest.js
 *
 * The manifest maps each file to { path, name }. `name` is derived from the
 * filename (humanised). If `index.json` already has custom names for files
 * that still exist, those names are preserved; new files get a generated name.
 */

const fs = require('fs');
const path = require('path');

const PHOTOS_DIR = path.resolve(__dirname, 'photos');
const MANIFEST_PATH = path.join(PHOTOS_DIR, 'index.json');
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB — warn but still include

function humanise(filename) {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  return withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^\d+/, (m) => m + ' ');
}

function loadExisting() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    console.log('Created photos/ folder (empty).');
    fs.writeFileSync(MANIFEST_PATH, '[]', 'utf8');
    return;
  }

  const existing = loadExisting();
  const existingByName = new Map();
  for (const entry of existing) {
    if (entry && typeof entry === 'object' && entry.path) {
      existingByName.set(entry.path, entry);
    }
  }

  const files = fs.readdirSync(PHOTOS_DIR);
  const manifest = [];
  const warned = [];

  for (const file of files.sort()) {
    const filePath = path.join(PHOTOS_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    if (stat.size > MAX_SIZE) {
      warned.push(file);
    }
    const relPath = path.posix.join('photos', file);
    const existingEntry = existingByName.get(relPath);
    manifest.push({
      path: relPath,
      name: (existingEntry && typeof existingEntry.name === 'string')
        ? existingEntry.name
        : humanise(file),
    });
  }

  for (const w of warned) {
    console.warn(`Warning: ${w} is larger than ${MAX_SIZE / 1024 / 1024} MB and may not render everywhere.`);
  }

  // Keep manifest entries for files that no longer exist out of the file
  // (the Photos app ignores missing images anyway).
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${manifest.length} image${manifest.length === 1 ? '' : 's'} to ${MANIFEST_PATH}`);
  if (warned.length) console.warn(`${warned.length} file${warned.length === 1 ? '' : 's'} exceeded the size limit.`);
}

main();
