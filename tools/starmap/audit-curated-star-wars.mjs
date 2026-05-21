#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const CATALOG_PATH = 'game-data/starmap/star-wars-systems.json';
const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 120;
const DEFAULT_SECTOR_SIZE = 20;
const GRID_COLUMNS = 23;
const GRID_ROWS = 21;
const MAX_SYSTEMS_PER_SECTOR = 10;

const ASSETS_TS = readFileSync('apps/frontend/src/lib/assets.ts', 'utf8');
const MARKER_ASSET_KEYS = new Set(
  [...ASSETS_TS.matchAll(/['"]?([a-z0-9]+(?:-[a-z0-9]+)*)['"]?:\s*\d+,/g)].map(
    (match) => match[1],
  ),
);

function key(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function gridToCoordinate(system, width, height) {
  const match = /^([A-W])-(\d{1,2})$/i.exec(system.grid.trim());
  if (!match) return { cx: Math.ceil(width / 2), cy: Math.ceil(height / 2) };
  const column = match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const row = Number(match[2]) - 1;
  const cellWidth = width / GRID_COLUMNS;
  const cellHeight = height / GRID_ROWS;
  const hash = hashString(key(system.name));
  const offsetX = ((hash % 997) / 996 - 0.5) * 0.68;
  const offsetY = (((hash >> 10) % 997) / 996 - 0.5) * 0.68;
  return {
    cx: Math.max(
      1,
      Math.min(width, Math.round((column + 0.5 + offsetX) * cellWidth)),
    ),
    cy: Math.max(
      1,
      Math.min(height, Math.round((row + 0.5 + offsetY) * cellHeight)),
    ),
  };
}

function sectorNumber(sectorX, sectorY, columns) {
  return sectorY * columns + sectorX + 1;
}

const width = Number(process.argv[2] ?? DEFAULT_WIDTH);
const height = Number(process.argv[3] ?? DEFAULT_HEIGHT);
const sectorSize = Number(process.argv[4] ?? DEFAULT_SECTOR_SIZE);
const sectorColumns = Math.ceil(width / sectorSize);
const systems = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

const regionCounts = new Map();
const sectorSystems = new Map();
const gridCounts = new Map();
const missingAssets = [];

for (const system of systems) {
  regionCounts.set(system.region, (regionCounts.get(system.region) ?? 0) + 1);
  gridCounts.set(system.grid, (gridCounts.get(system.grid) ?? 0) + 1);
  const { cx, cy } = gridToCoordinate(system, width, height);
  const sectorX = Math.floor((cx - 1) / sectorSize);
  const sectorY = Math.floor((cy - 1) / sectorSize);
  const sectorKey = `${sectorX},${sectorY}`;
  const list = sectorSystems.get(sectorKey) ?? [];
  list.push({ ...system, cx, cy, sectorX, sectorY });
  sectorSystems.set(sectorKey, list);
  if (!MARKER_ASSET_KEYS.has(key(system.name))) missingAssets.push(system.name);
}

console.log(
  `Curated Star Wars atlas audit (${width}x${height}, sectorSize ${sectorSize})`,
);
console.log(`Systems: ${systems.length}`);
console.log('');
console.log('Regions:');
for (const [region, count] of [...regionCounts.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  console.log(`  ${region.padEnd(22)} ${count}`);
}

console.log('');
console.log('Top sector densities:');
const density = [...sectorSystems.entries()]
  .map(([sectorKey, list]) => {
    const [sectorX, sectorY] = sectorKey.split(',').map(Number);
    return { sectorKey, sectorX, sectorY, count: list.length, list };
  })
  .sort(
    (a, b) =>
      b.count - a.count || a.sectorY - b.sectorY || a.sectorX - b.sectorX,
  );
for (const entry of density.slice(0, 12)) {
  console.log(
    `  Sector ${String(sectorNumber(entry.sectorX, entry.sectorY, sectorColumns)).padStart(2)} ` +
      `[${entry.sectorX + 1}|${entry.sectorY + 1}] ${entry.count}: ` +
      entry.list.map((system) => system.name).join(', '),
  );
}

const crowded = density.filter((entry) => entry.count > MAX_SYSTEMS_PER_SECTOR);
console.log('');
console.log(`Crowded sectors (> ${MAX_SYSTEMS_PER_SECTOR}): ${crowded.length}`);
for (const entry of crowded) {
  console.log(
    `  Sector ${String(sectorNumber(entry.sectorX, entry.sectorY, sectorColumns)).padStart(2)} ` +
      `[${entry.sectorX + 1}|${entry.sectorY + 1}] ${entry.count}`,
  );
}

console.log('');
console.log('Crowded official grid cells (> 4 systems):');
for (const [grid, count] of [...gridCounts.entries()]
  .filter(([, count]) => count > 4)
  .sort((a, b) => b[1] - a[1])) {
  console.log(`  ${grid.padEnd(4)} ${count}`);
}

console.log('');
console.log(
  `Marker asset coverage: ${systems.length - missingAssets.length}/${systems.length}`,
);
if (missingAssets.length > 0) {
  console.log(`Missing specific marker assets (${missingAssets.length}):`);
  console.log(`  ${missingAssets.join(', ')}`);
}
