import type { NebulaVisualDto } from '@swuniverse/shared';

it('shares a chunk and texture frames while crossing large-map chunk boundaries correctly', async () => {
  const createImageData = vi.fn((width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
  }));
  const putImageData = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockReturnValue({
    createImageData,
    putImageData,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,test',
  );
  const visual: NebulaVisualDto = {
    version: 2,
    seed: 'cache-test',
    width: 120,
    height: 120,
    density: 'BALANCED',
  };
  try {
    const { getNebulaDomStyle } = await import('./nebula-texture');
    const { getNebulaPixiTexture } = await import('./nebula-texture-pixi');
    const a = getNebulaDomStyle(visual, 48, 57),
      b = getNebulaDomStyle(visual, 47, 57);
    expect(a?.backgroundImage).toBe(b?.backgroundImage);
    expect(a?.backgroundPosition).toBe('100% 0%');
    expect(createImageData).toHaveBeenCalledTimes(1);
    const frame = getNebulaPixiTexture(visual, 48, 57)!;
    expect(getNebulaPixiTexture(visual, 48, 57)).toBe(frame);
    expect(frame.frame.x).toBe(210);
    expect(frame.frame.y).toBe(0);
    const next = getNebulaPixiTexture(visual, 49, 57)!;
    expect(next.source).not.toBe(frame.source);
    expect(next.frame.x).toBe(0);
    expect(createImageData).toHaveBeenCalledTimes(2);
    expect(getNebulaDomStyle(undefined, 1, 1)).toBeUndefined();
    expect(getNebulaPixiTexture(undefined, 1, 1)).toBeNull();
  } finally {
    vi.restoreAllMocks();
  }
});
