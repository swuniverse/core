#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const PRESET_PATH =
  'apps/backend/src/modules/starmap/presets/star-wars-landmarks.ts';
const CATALOG_PATH = 'game-data/starmap/star-wars-systems.json';
const GRID_COLUMNS = 23;
const GRID_ROWS = 21;
const WIDTH = Number(process.argv[2] ?? 120);
const HEIGHT = Number(process.argv[3] ?? 120);

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

function gridToCoordinate(name, grid) {
  const match = /^([A-W])-(\d{1,2})$/i.exec(grid.trim());
  if (!match) return { cx: Math.ceil(WIDTH / 2), cy: Math.ceil(HEIGHT / 2) };
  const column = match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  const row = Number(match[2]) - 1;
  const cellWidth = WIDTH / GRID_COLUMNS;
  const cellHeight = HEIGHT / GRID_ROWS;
  const hash = hashString(key(name));
  const offsetX = ((hash % 997) / 996 - 0.5) * 0.68;
  const offsetY = (((hash >> 10) % 997) / 996 - 0.5) * 0.68;
  return {
    cx: Math.max(
      1,
      Math.min(WIDTH, Math.round((column + 0.5 + offsetX) * cellWidth)),
    ),
    cy: Math.max(
      1,
      Math.min(HEIGHT, Math.round((row + 0.5 + offsetY) * cellHeight)),
    ),
  };
}

const preset = readFileSync(PRESET_PATH, 'utf8');
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
const systemsByKey = new Map(
  catalog.map((system) => [key(system.name), system]),
);
for (const match of preset.matchAll(/landmark\('([^']+)',\s*'([^']+)'/g)) {
  const [, name, grid] = match;
  systemsByKey.set(key(name), {
    name,
    grid,
    region: 'Preset',
    sector: 'Preset',
  });
}

const routeBlocks = [
  ...preset.matchAll(
    /key:\s*'([^']+)',\s*\n\s*name:\s*'([^']+)',[\s\S]*?segments:\s*\[([\s\S]*?)\n\s*\]/g,
  ),
];
console.log(`Star Wars route audit (${WIDTH}x${HEIGHT})`);
console.log(`Routes: ${routeBlocks.length}`);

for (const [, routeKey, routeName, body] of routeBlocks) {
  const segments = [
    ...body.matchAll(/segment\('([^']+)',\s*'([^']+)'([^\n]*)/g),
  ];
  let totalDistance = 0;
  const missing = [];
  const longSegments = [];

  for (const segmentMatch of segments) {
    const [, fromName, toName, segmentTail] = segmentMatch;
    const from = systemsByKey.get(key(fromName));
    const to = systemsByKey.get(key(toName));
    if (!from || !to) {
      missing.push(`${fromName} -> ${toName}`);
      continue;
    }
    const pathPoints = [
      gridToCoordinate(from.name, from.grid),
      ...[...segmentTail.matchAll(/grid:\s*'([^']+)'/g)].map(
        (gridMatch, index) =>
          gridToCoordinate(
            `${routeKey}-${fromName}-${toName}-${index}`,
            gridMatch[1],
          ),
      ),
      gridToCoordinate(to.name, to.grid),
    ];
    let maxLegDistance = 0;
    let segmentDistance = 0;
    for (let index = 0; index < pathPoints.length - 1; index++) {
      const a = pathPoints[index];
      const b = pathPoints[index + 1];
      const legDistance = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      maxLegDistance = Math.max(maxLegDistance, legDistance);
      segmentDistance += legDistance;
    }
    totalDistance += segmentDistance;
    if (maxLegDistance > 35) {
      longSegments.push(
        `${fromName} -> ${toName} (${maxLegDistance.toFixed(1)} max leg)`,
      );
    }
  }

  console.log('');
  console.log(`${routeName} (${routeKey})`);
  console.log(`  segments: ${segments.length}`);
  console.log(`  total distance: ${totalDistance.toFixed(1)}`);
  console.log(
    `  missing endpoints: ${missing.length ? missing.join('; ') : 'none'}`,
  );
  console.log(
    `  long segments > 35: ${longSegments.length ? longSegments.join('; ') : 'none'}`,
  );
}
