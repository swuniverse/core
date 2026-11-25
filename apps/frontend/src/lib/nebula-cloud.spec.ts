import {
  buildNebulaCloudIndex,
  type NebulaVisualDto,
} from '@swuniverse/shared';
import { getNebulaCloudCanvas, getNebulaCloudDomStyle } from './nebula-cloud';

it('shares DOM/Pixi halo pixels and separates caches by visible sources', async () => {
  const written: Uint8ClampedArray[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => ({
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: (image: ImageData) => written.push(image.data),
    })) as unknown as HTMLCanvasElement['getContext'],
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,cloud',
  );
  const visual: NebulaVisualDto = {
    version: 2,
    seed: 'landscape-test',
    width: 40,
    height: 40,
    density: 'BALANCED',
  };
  const index = buildNebulaCloudIndex([{ x: 10, y: 8, visual }]);
  try {
    expect(getNebulaCloudDomStyle(index, 11, 8)?.backgroundImage).toContain(
      'data:image/png',
    );
    const field = getNebulaCloudCanvas(index, 11, 8)!;
    expect(written).toHaveLength(1);
    expect(written[0].some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
    const { getNebulaCloudPixiTexture } = await import('./nebula-cloud-pixi');
    const texture = getNebulaCloudPixiTexture(index, 11, 8)!;
    expect(getNebulaCloudPixiTexture(index, 11, 8)).toBe(texture);
    expect(texture.source.resource).toBe(field.canvas);
    expect(
      getNebulaCloudDomStyle(buildNebulaCloudIndex([]), 11, 8),
    ).toBeUndefined();
    expect(
      getNebulaCloudPixiTexture(buildNebulaCloudIndex([]), 11, 8),
    ).toBeNull();
    const changed = buildNebulaCloudIndex([
      { x: 10, y: 8, visual },
      { x: 10, y: 9, visual },
    ]);
    expect(getNebulaCloudCanvas(changed, 11, 8)?.canvas).not.toBe(field.canvas);
    expect(written).toHaveLength(2);
  } finally {
    vi.restoreAllMocks();
  }
});
