import {
  buildNebulaLandscape,
  isNebulaVisual,
  renderNebulaRaster,
  type NebulaLandscape,
} from './nebula-landscape.js';
import type { NebulaVisualDto } from './nebula.js';

export interface NebulaCloudSource {
  x: number;
  y: number;
  visual: NebulaVisualDto;
}
export interface NebulaCloudIndex {
  sources: ReadonlyMap<string, NebulaCloudSource>;
}
const scenes = new Map<string, NebulaLandscape>();
const chunks = new Map<string, Uint8ClampedArray>();
const visualKey = (v: NebulaVisualDto) =>
  JSON.stringify([v.seed, v.width, v.height, v.density]);
const smoothstep = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** The caller must supply only visible, active nebula sources. */
export function buildNebulaCloudIndex(
  sources: readonly NebulaCloudSource[],
): NebulaCloudIndex {
  const known = new Map<string, NebulaCloudSource>();
  for (const source of sources) {
    if (
      !isNebulaVisual(source.visual) ||
      !Number.isSafeInteger(source.x) ||
      !Number.isSafeInteger(source.y) ||
      source.x < 1 ||
      source.y < 1 ||
      source.x > source.visual.width ||
      source.y > source.visual.height
    )
      continue;
    known.set(`${source.x},${source.y}`, {
      x: source.x,
      y: source.y,
      visual: { ...source.visual },
    });
  }
  return { sources: known };
}

export function isNebulaCloudSpace(
  type: { id: number; key: string; category?: string | null } | undefined,
): boolean {
  return (
    !!type &&
    type.key !== 'UNKNOWN' &&
    (type.key === 'EMPTY_SPACE' ||
      type.key === 'DEEP_SPACE' ||
      type.key === 'STAR_SYSTEM' ||
      type.category === 'space' ||
      type.category === 'system')
  );
}

function nearby(index: NebulaCloudIndex, x: number, y: number) {
  const sources: NebulaCloudSource[] = [];
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const source = index.sources.get(`${x + dx},${y + dy}`);
      if (source) sources.push(source);
    }
  return sources;
}

/** Include visibility and source descriptions so caches cannot reuse another viewer's halo. */
export function nebulaCloudSignature(
  index: NebulaCloudIndex,
  x: number,
  y: number,
): string | undefined {
  const sources = nearby(index, x, y);
  if (!sources.length) return undefined;
  const groups = new Map<string, number[][]>();
  for (const source of sources) {
    const key = visualKey(source.visual),
      positions = groups.get(key) ?? [];
    positions.push([source.x, source.y]);
    groups.set(key, positions);
  }
  return JSON.stringify([
    'cloud-1',
    x,
    y,
    ...[...groups].sort(([a], [b]) => a.localeCompare(b)),
  ]);
}

function baseRaster(
  visual: NebulaVisualDto,
  x: number,
  y: number,
  pixels: number,
) {
  const key = visualKey(visual),
    cx = Math.floor((x - 1) / 8),
    cy = Math.floor((y - 1) / 8);
  let scene = scenes.get(key);
  if (!scene) {
    scene = buildNebulaLandscape(visual);
    scenes.set(key, scene);
    if (scenes.size > 8) scenes.delete(scenes.keys().next().value!);
  }
  const chunkKey = `${key}:${pixels}:${cx},${cy}`;
  let raster = chunks.get(chunkKey);
  if (!raster) {
    raster = renderNebulaRaster(
      scene,
      cx * 8,
      cy * 8,
      8 * pixels,
      8 * pixels,
      pixels,
    );
    chunks.set(chunkKey, raster);
    if (chunks.size > 64) chunks.delete(chunks.keys().next().value!);
  }
  return { raster, left: ((x - 1) % 8) * pixels, top: ((y - 1) % 8) * pixels };
}

/** Continuous source surface, including a faint decorative skirt across known space fields.
 * Recipient eligibility and fog are enforced by callers; this function changes no terrain.
 */
export function renderNebulaCloudField(
  index: NebulaCloudIndex,
  x: number,
  y: number,
  pixels = 30,
): Uint8ClampedArray | undefined {
  if (
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y) ||
    x < 1 ||
    y < 1 ||
    !Number.isSafeInteger(pixels) ||
    pixels < 1 ||
    pixels > 128
  )
    return undefined;
  const sources = nearby(index, x, y);
  if (!sources.length) return undefined;
  const groups = new Map<string, NebulaCloudSource[]>();
  for (const source of sources) {
    const key = visualKey(source.visual),
      group = groups.get(key) ?? [];
    group.push(source);
    groups.set(key, group);
  }
  const data = new Uint8ClampedArray(pixels * pixels * 4);
  let visible = false;
  for (const [, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    let hash = 2166136261;
    for (const c of group[0].visual.seed)
      hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    const phase = ((hash >>> 0) / 4294967296) * Math.PI * 2;
    // The broad surface changes slowly: sample an aligned 8×8 grid and interpolate.
    // Shared edge samples are identical, while large maps avoid per-pixel Gaussian work.
    const steps = 8,
      stride = steps + 1,
      supportGrid = new Float32Array(stride * stride);
    let maximum = 0;
    for (let gy = 0; gy <= steps; gy++)
      for (let gx = 0; gx <= steps; gx++) {
        const wx = x - 1 + gx / steps,
          wy = y - 1 + gy / steps;
        const warpX =
          0.18 * Math.sin(wx * 1.35 + 0.6 * Math.sin(wy * 0.85) + phase);
        const warpY =
          0.18 * Math.sin(wy * 1.1 + 0.6 * Math.sin(wx * 0.75) + phase * 1.7);
        let coverage = 0;
        for (const source of group) {
          const distance = Math.hypot(
            wx + warpX - (source.x - 0.5),
            wy + warpY - (source.y - 0.5),
          );
          if (distance >= 1.7) continue;
          coverage +=
            Math.exp((-distance * distance) / (0.62 * 0.62 * 2)) *
            (1 - smoothstep(1.4, 1.7, distance));
        }
        const support = smoothstep(0.07, 1.55, coverage);
        supportGrid[gy * stride + gx] = support;
        maximum = Math.max(maximum, support);
      }
    if (maximum < 1 / 255) continue;
    const { raster, left, top } = baseRaster(group[0].visual, x, y, pixels);
    for (let py = 0; py < pixels; py++)
      for (let px = 0; px < pixels; px++) {
        const u = ((px + 0.5) / pixels) * steps,
          v = ((py + 0.5) / pixels) * steps;
        const gx = Math.floor(u),
          gy = Math.floor(v),
          fx = u - gx,
          fy = v - gy;
        const at = gy * stride + gx;
        const support =
          (supportGrid[at] * (1 - fx) + supportGrid[at + 1] * fx) * (1 - fy) +
          (supportGrid[at + stride] * (1 - fx) +
            supportGrid[at + stride + 1] * fx) *
            fy;
        const from = ((top + py) * pixels * 8 + left + px) * 4,
          to = (py * pixels + px) * 4;
        const alpha = (raster[from + 3] / 255) * support;
        if (alpha < 1 / 255) continue;
        const previous = data[to + 3] / 255,
          combined = alpha + previous * (1 - alpha);
        for (let channel = 0; channel < 3; channel++)
          data[to + channel] =
            (raster[from + channel] * alpha +
              data[to + channel] * previous * (1 - alpha)) /
            combined;
        data[to + 3] = Math.round(combined * 255);
        visible = true;
      }
  }
  return visible ? data : undefined;
}
