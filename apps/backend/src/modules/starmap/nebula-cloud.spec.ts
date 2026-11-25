import {
  buildNebulaCloudIndex,
  generateFilmicNebulaTerrain,
  renderNebulaCloudField,
  nebulaCloudSignature,
  type NebulaVisualDto,
} from '@swuniverse/shared';
import {
  buildNebulaTextureContext,
  nebulaTextureForField,
} from './nebula-texture';

const visual: NebulaVisualDto = {
  version: 2,
  seed: 'landscape-test',
  width: 40,
  height: 40,
  density: 'BALANCED',
};
const [coordinate, fieldTypeId] = [...generateFilmicNebulaTerrain(visual)][0];
const [cx, cy] = coordinate.split(',').map(Number);
const source = {
  fieldTypeId,
  cx,
  cy,
  fieldType: { id: fieldTypeId, key: 'NEBULA', category: 'nebula' },
  nebulaGeneration: {
    visual,
    fieldTypeId,
    baseline: {
      fieldTypeId: 1,
      isPassable: true,
      energyCost: 1,
      damage: 6,
      effects: null,
      effectFlags: null,
    },
  },
};
const space = {
  fieldTypeId: 1,
  cx: cx + 1,
  cy,
  fieldType: { id: 1, key: 'EMPTY_SPACE', category: 'space' },
};
const alpha = (data: Uint8ClampedArray) =>
  [...data].filter((_, i) => i % 4 === 3);

describe('continuous known nebula envelope', () => {
  it('renders a weaker decorative halo on adjacent space and no distant cloud', () => {
    const context = buildNebulaTextureContext([source, space]);
    const core = renderNebulaCloudField(context, cx, cy)!,
      halo = renderNebulaCloudField(context, cx + 1, cy)!;
    expect(core).toBeDefined();
    expect(halo).toBeDefined();
    expect(alpha(core).reduce((a, b) => a + b, 0)).toBeGreaterThan(
      alpha(halo).reduce((a, b) => a + b, 0),
    );
    expect(nebulaTextureForField(space, context)).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(renderNebulaCloudField(context, cx + 3, cy)).toBeUndefined();
    expect(space.fieldTypeId).toBe(1);
  });
  it('has no step at a former gameplay tile boundary', () => {
    const context = buildNebulaTextureContext([source, space]);
    const a = renderNebulaCloudField(context, cx, cy)!,
      b = renderNebulaCloudField(context, cx + 1, cy)!;
    const differences = Array.from({ length: 30 }, (_, y) =>
      Math.abs(a[(y * 30 + 29) * 4 + 3] - b[y * 30 * 4 + 3]),
    );
    expect(Math.max(...differences)).toBeLessThan(20);
    expect(
      differences.some(
        (_, y) => a[(y * 30 + 29) * 4 + 3] > 0 && b[y * 30 * 4 + 3] > 0,
      ),
    ).toBe(true);
  });
  it('never lets unknown or redacted sources generate a halo or reuse a visible cache entry', () => {
    const visible = buildNebulaTextureContext([source, space]);
    expect(nebulaTextureForField(space, visible)).toBeDefined();
    const hidden = buildNebulaTextureContext([
      { ...source, redacted: true },
      space,
    ]);
    const unknown = buildNebulaTextureContext([
      { ...source, fieldType: { ...source.fieldType, key: 'UNKNOWN' } },
      space,
    ]);
    expect(nebulaTextureForField(space, hidden)).toBeUndefined();
    expect(nebulaTextureForField(space, unknown)).toBeUndefined();
    expect(
      nebulaTextureForField({ ...space, redacted: true }, visible),
    ).toBeUndefined();
    expect(
      nebulaTextureForField(
        { ...space, fieldType: { ...space.fieldType, key: 'UNKNOWN' } },
        visible,
      ),
    ).toBeUndefined();
    expect(nebulaCloudSignature(visible, cx + 1, cy)).not.toBe(
      nebulaCloudSignature(hidden, cx + 1, cy),
    );
  });
  it('produces the same pixels regardless of source order or unrelated far-away fields', () => {
    const sources = [
      { x: cx, y: cy, visual },
      { x: cx, y: cy + 1, visual },
    ];
    const a = buildNebulaCloudIndex(sources),
      b = buildNebulaCloudIndex(
        [...sources].reverse().concat([{ x: 40, y: 40, visual }]),
      );
    expect(renderNebulaCloudField(a, cx + 1, cy)).toEqual(
      renderNebulaCloudField(b, cx + 1, cy),
    );
    expect(nebulaCloudSignature(a, cx + 1, cy)).toBe(
      nebulaCloudSignature(b, cx + 1, cy),
    );
  });
});
