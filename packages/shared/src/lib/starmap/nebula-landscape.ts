import type { NebulaVisualDto } from './nebula.js';

export const FILMIC_NEBULA_FAMILIES = [100, 120, 140, 170] as const;
export const FILMIC_NEBULA_FIELD_IDS = FILMIC_NEBULA_FAMILIES.flatMap((id) => [
  id,
  id + 1,
  id + 2,
]);
type Region = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  cos: number;
  sin: number;
  kind: number;
  material: number;
  phase: number;
  radius: number;
};
export type NebulaLandscape = {
  visual: NebulaVisualDto;
  regions: Region[];
  buckets: Map<string, Region[]>;
};

export function isNebulaVisual(value: unknown): value is NebulaVisualDto {
  if (!value || typeof value !== 'object') return false;
  const v = value as NebulaVisualDto;
  return (
    v.version === 2 &&
    typeof v.seed === 'string' &&
    v.seed.length > 0 &&
    v.seed.length <= 192 &&
    Number.isSafeInteger(v.width) &&
    Number.isSafeInteger(v.height) &&
    v.width > 0 &&
    v.height > 0 &&
    v.width * v.height <= 1_000_000 &&
    ['SUBTLE', 'BALANCED', 'RICH'].includes(v.density)
  );
}
function hash(x: number, y: number, seed: number) {
  let h =
    Math.imul(x + 374761393, 668265263) ^
    Math.imul(y + 1013904223, 2246822519) ^
    seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function seedHash(text: string) {
  let value = 2166136261;
  for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return value >>> 0;
}
function random(seed: number) {
  let v = seed;
  return () => {
    v += 0x6d2b79f5;
    let t = Math.imul(v ^ (v >>> 15), 1 | v);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise(x: number, y: number, seed: number) {
  const a = Math.floor(x),
    b = Math.floor(y),
    u = x - a,
    v = y - b,
    s = u * u * (3 - 2 * u),
    t = v * v * (3 - 2 * v);
  const p = hash(a, b, seed),
    q = hash(a + 1, b, seed),
    r = hash(a, b + 1, seed),
    z = hash(a + 1, b + 1, seed);
  return p + (q - p) * s + (r - p) * t + (p - q - r + z) * s * t;
}
function fbm(x: number, y: number, seed: number) {
  return (
    noise(x, y, seed) * 0.55 +
    noise(x * 2.07, y * 2.07, seed + 83) * 0.29 +
    noise(x * 4.31, y * 4.31, seed + 317) * 0.16
  );
}

export function buildNebulaLandscape(visual: NebulaVisualDto): NebulaLandscape {
  if (!isNebulaVisual(visual)) throw new Error('Ungültige Nebelbeschreibung');
  const factor = Math.sqrt((visual.width * visual.height) / 1600),
    extent = Math.sqrt(factor) * 1.12;
  const rnd = random(seedHash(visual.seed)),
    regions: Region[] = [],
    buckets = new Map<string, Region[]>();
  [3, 5, 10].forEach((baseCount, scale) => {
    const count = Math.max(scale === 0 ? 2 : 1, Math.round(baseCount * factor)),
      side = Math.ceil(Math.sqrt(count));
    const slots = Array.from({ length: side * side }, (_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      if (scale === 0 && count === 3) {
        [x, y] = [
          [0.23, 0.24],
          [0.74, 0.42],
          [0.36, 0.77],
        ][i];
        x += (rnd() - 0.5) * 0.08;
        y += (rnd() - 0.5) * 0.08;
      } else {
        x = ((slots[i] % side) + 0.25 + rnd() * 0.5) / side;
        y = (Math.floor(slots[i] / side) + 0.25 + rnd() * 0.5) / side;
      }
      const rx =
        (scale === 0 ? 4.7 : scale === 1 ? 2.25 : 0.8) *
        extent *
        (0.78 + rnd() * 0.42);
      const ry =
          (scale === 0 ? 5.8 : scale === 1 ? 2.8 : 1.05) *
          extent *
          (0.78 + rnd() * 0.42),
        angle = rnd() * Math.PI * 2;
      regions.push({
        x: x * visual.width,
        y: y * visual.height,
        rx,
        ry,
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        kind: scale === 0 ? i % 3 : scale === 1 && i % 3 === 0 ? 1 : 0,
        material: i % 4,
        phase: rnd() * Math.PI * 2,
        radius: Math.max(rx, ry) * 2.25,
      });
    }
  });
  for (const region of regions) {
    for (
      let y = Math.floor((region.y - region.radius) / 8);
      y <= Math.floor((region.y + region.radius) / 8);
      y++
    )
      for (
        let x = Math.floor((region.x - region.radius) / 8);
        x <= Math.floor((region.x + region.radius) / 8);
        x++
      ) {
        const key = `${x},${y}`,
          list = buckets.get(key) ?? [];
        list.push(region);
        buckets.set(key, list);
      }
  }
  return { visual, regions, buckets };
}

export function sampleNebulaLandscape(
  scene: NebulaLandscape,
  x: number,
  y: number,
) {
  const warpX = noise(x * 0.16, y * 0.16, 193) - 0.5,
    warpY = noise(x * 0.16, y * 0.16, 953) - 0.5;
  let density = 0,
    material = 0,
    strongest = 0,
    red = 0,
    green = 0,
    blue = 0;
  const palette = [
    [63, 49, 105],
    [32, 105, 123],
    [39, 95, 115],
    [130, 100, 59],
  ];
  for (const region of scene.buckets.get(
    `${Math.floor(x / 8)},${Math.floor(y / 8)}`,
  ) ?? []) {
    const dx = x - region.x + warpX * region.rx * 0.55,
      dy = y - region.y + warpY * region.ry * 0.55;
    const u = (dx * region.cos + dy * region.sin) / region.rx,
      v = (-dx * region.sin + dy * region.cos) / region.ry;
    let value: number;
    if (region.kind === 1)
      value = Math.exp(
        -(u ** 4) * 0.7 -
          ((v - 0.58 * Math.sin(u * 2.7 + region.phase)) / 0.3) ** 2 * 1.15,
      );
    else if (region.kind === 2)
      value =
        Math.exp(-(((Math.hypot(u, v) - 0.9) / 0.24) ** 2)) *
        Math.max(0, Math.cos((Math.atan2(v, u) - region.phase) * 0.5)) ** 2;
    else value = Math.exp(-(u * u + v * v) * 1.8);
    density += value;
    red += value * palette[region.material][0];
    green += value * palette[region.material][1];
    blue += value * palette[region.material][2];
    if (value > strongest) {
      strongest = value;
      material = region.material;
    }
  }
  const total = density || 1;
  const strength = { SUBTLE: 0.85, BALANCED: 1.25, RICH: 1.65 }[
    scene.visual.density
  ];
  density *=
    (0.25 + fbm(x * 0.65, y * 0.65, 811)) ** 1.55 *
    (0.65 + fbm(x * 2.1, y * 2.1, 715) * 0.65) *
    strength;
  return {
    density,
    material,
    red: red / total,
    green: green / total,
    blue: blue / total,
  };
}

export function generateFilmicNebulaTerrain(visual: NebulaVisualDto) {
  const scene = buildNebulaLandscape(visual),
    cells: { x: number; y: number; density: number; material: number }[] = [];
  for (let y = 1; y <= visual.height; y++)
    for (let x = 1; x <= visual.width; x++) {
      const samples = [
        [x - 0.5, y - 0.5],
        [x - 0.25, y - 0.25],
        [x - 0.75, y - 0.75],
      ].map(([a, b]) => sampleNebulaLandscape(scene, a, b));
      const density =
        samples.reduce((sum, item) => sum + item.density, 0) / samples.length;
      if (density >= 0.11)
        cells.push({ x, y, density, material: samples[0].material });
    }
  cells.sort((a, b) => b.density - a.density || a.y - b.y || a.x - b.x);
  return new Map(
    cells.map((cell, i) => [
      `${cell.x},${cell.y}`,
      FILMIC_NEBULA_FAMILIES[cell.material] +
        (i / cells.length < 0.08 ? 2 : i / cells.length < 0.35 ? 1 : 0),
    ]),
  );
}

function smoothstep(low: number, high: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/** Rasterize world coordinates without changing the gameplay field selection. */
export function renderNebulaRaster(
  scene: NebulaLandscape,
  originX: number,
  originY: number,
  width: number,
  height: number,
  pixelsPerField = 30,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  const detailSeed = seedHash(scene.visual.seed);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const wx = originX + (x + 0.5) / pixelsPerField,
        wy = originY + (y + 0.5) / pixelsPerField;
      const point = sampleNebulaLandscape(scene, wx, wy),
        i = (y * width + x) * 4;
      // Distort fine ridges into wisps; broad clouds retain their existing palette.
      const warp = noise(wx * 0.8, wy * 0.8, detailSeed + 37);
      const ridge =
        1 -
        Math.abs(
          noise(wx * 4.6 + warp * 2, wy * 1.8 - warp, detailSeed + 541) * 2 - 1,
        );
      const filaments = ridge ** 6;
      const dust = noise(wx * 3.2, wy * 3.2, detailSeed + 917);
      const density = point.density * (0.78 + dust * 0.3);
      const envelope = smoothstep(0.045, 0.16, density);
      const brightness = 0.83 + dust * 0.2 + filaments * 0.32;
      const light = (1 - Math.exp(-density * 2.3)) * envelope;
      data[i] = point.red * brightness;
      data[i + 1] = point.green * brightness;
      data[i + 2] = point.blue * brightness;
      data[i + 3] = Math.round(Math.min(0.95, light) * 255);
    }
  return data;
}

/** Missing neighbors: N, E, S, W, NW, NE, SE, SW. */
export const NEBULA_CONTOUR_NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** Smooth distance to the union's outside, with rounded corners and world-coordinate wisps.
 * No pixels extend into another field, so protected/redacted terrain remains untouched.
 */
export function renderNebulaContourMask(
  missingNeighbors: number,
  width: number,
  height: number,
  originX: number,
  originY: number,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  // A missing diagonal already covered by a missing side adds no new boundary.
  // Counting it again would leave periodic dents along otherwise straight cloud edges.
  const touchingSides = [1 | 8, 1 | 2, 2 | 4, 4 | 8];
  const outside = NEBULA_CONTOUR_NEIGHBORS.filter(
    (_, i) =>
      missingNeighbors & (1 << i) &&
      (i < 4 || !(missingNeighbors & touchingSides[i - 4])),
  );
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const px = (x + 0.5) / width,
        py = (y + 0.5) / height;
      let sum = 0;
      for (const [dx, dy] of outside) {
        const a = Math.max(dx - px, px - dx - 1, 0),
          b = Math.max(dy - py, py - dy - 1, 0);
        sum += Math.exp(-Math.hypot(a, b) / 0.14);
      }
      const distance = sum ? -0.14 * Math.log(sum) : Infinity;
      const wx = originX + px,
        wy = originY + py;
      const fray =
        0.015 +
        noise(wx * 5.1, wy * 5.1, 719) * 0.055 +
        noise(wx * 12.2, wy * 12.2, 2131) * 0.025;
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = outside.length
        ? Math.round(smoothstep(0, 0.36, distance - fray) * 255)
        : 255;
    }
  return data;
}
