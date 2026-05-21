#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const REGION_NAMES = [
  'Deep Core',
  'Core Worlds',
  'Colonies',
  'Inner Rim',
  'Expansion Region',
  'Mid Rim',
  'Outer Rim Territories',
  'Wild Space',
  'Unknown Regions',
  'Hutt Space',
];

function usage() {
  console.error(
    `Usage: ${basename(process.argv[1])} <pdf-markdown-extract.md> <output.json>\n\n` +
      'The extractor expects the markdown text exported from the official Star Wars system PDF.\n' +
      'It normalizes entries shaped like: SYSTEM SECTOR REGION GRID.',
  );
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  usage();
  process.exit(1);
}

const markdown = readFileSync(inputPath, 'utf8')
  .replace(/<!-- Page \d+ -->/g, ' ')
  .replace(/SYSTEM SECTOR REGION GRID/g, ' ')
  .replace(/Star systems are listed[\s\S]*?STAR SYSTEMS OF THE GALAXY/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const regionPattern = REGION_NAMES.map((region) =>
  region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
).join('|');
const entryRegex = new RegExp(
  `(.+?)\\s+(.+?)\\s+(${regionPattern})\\s+([A-W]-\\d{1,2})(?=\\s+[A-Za-z0-9'’()., -]+\\s+[A-Za-z0-9'’()., -]+\\s+(?:${regionPattern})\\s+[A-W]-\\d{1,2}|\\s*$)`,
  'g',
);

const systems = [];
const seen = new Set();
for (const match of markdown.matchAll(entryRegex)) {
  const [, rawName, rawSector, region, grid] = match;
  const name = rawName.trim().replace(/\s+/g, ' ');
  const sector = rawSector.trim().replace(/\s+/g, ' ');
  if (!name || !sector) continue;
  const key = `${name}|${grid}`.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  systems.push({ name, sector, region, grid });
}

systems.sort(
  (a, b) => a.name.localeCompare(b.name) || a.grid.localeCompare(b.grid),
);
writeFileSync(outputPath, `${JSON.stringify(systems, null, 2)}\n`);
console.error(`Wrote ${systems.length} systems to ${outputPath}`);
