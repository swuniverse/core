import {
  getOrganicNebulaMaskCanvas,
  organicNebulaEdgeMask,
} from './nebula-contour';

const nebula = { id: 100, key: 'neon_nebel_100', category: 'nebula' };
it('shares the DOM/Pixi contour and treats unknown diagonal neighbors as outside', async () => {
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
    'data:image/png;base64,contour',
  );
  try {
    const neighbors = Array.from({ length: 8 }, () => nebula);
    expect(getOrganicNebulaMaskCanvas(nebula, 5, 5, neighbors)).toBeUndefined();
    neighbors[6] = { ...nebula, key: 'UNKNOWN' };
    const value = getOrganicNebulaMaskCanvas(nebula, 5, 5, neighbors)!;
    expect(getOrganicNebulaMaskCanvas(nebula, 5, 5, neighbors)).toBe(value);
    expect(organicNebulaEdgeMask(nebula, 5, 5, neighbors)?.maskImage).toContain(
      'data:image/png',
    );
    expect(written).toHaveLength(1);
    expect(written[0][(28 * 30 + 28) * 4 + 3]).toBeLessThan(10);
    expect(written[0][(15 * 30 + 15) * 4 + 3]).toBe(255);
    const { Sprite, Container, Texture } = await import('pixi.js');
    const { organicNebulaSprite } = await import('./map-terrain-pixi');
    const container = new Container(),
      cloud = new Sprite(Texture.EMPTY);
    cloud.position.set(120, 120);
    cloud.width = cloud.height = 30;
    container.addChild(cloud);
    organicNebulaSprite(cloud, container, nebula, 5, 5, neighbors);
    const mask = cloud.mask as InstanceType<typeof Sprite>;
    expect(mask).toBeInstanceOf(Sprite);
    expect(mask.texture.source.resource).toBe(value.canvas);
    expect(mask.position.x).toBe(120);
    expect(mask.position.y).toBe(120);
    expect(mask.parent).toBe(container);
    expect(written).toHaveLength(1);
    container.destroy({ children: true });
  } finally {
    vi.restoreAllMocks();
  }
});
