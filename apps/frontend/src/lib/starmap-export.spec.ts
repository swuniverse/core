import type { StarmapExportDto } from '@swuniverse/shared';
import { createStarmapPng, downloadStarmapBlob } from './starmap-export';

const data: StarmapExportDto = {
  version: 1, exportedAt: '2026-11-04T12:00:00Z',
  layer: { id: 3, name: 'Galaxis', width: 1000, height: 1000, sectorSize: 20 },
  fields: [
    { cx: 2, cy: 4, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' }, starSystem: { id: 7, name: 'Kessel' } },
    { cx: 5, cy: 8, fieldType: { id: 2, key: 'NEBULA', name: 'Nebel' }, starSystem: null },
  ],
  colonies: [{ id: 70, name: 'Outpost', cx: 2, cy: 4 }],
};

describe('Personal starmap image and browser downloads', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('rejects an empty explored map without allocating a canvas', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext');
    await expect(createStarmapPng({ ...data, fields: [] })).rejects.toThrow('Noch keine Felder erkundet.');
    expect(getContext).not.toHaveBeenCalled();
  });

  it('scales a large explored extent to portable browser canvas limits', async () => {
    let dimensions: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockReturnValue({ fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
      dimensions = [this.width, this.height];
      callback(new Blob(['png'], { type }));
    });
    await createStarmapPng({ ...data, fields: [data.fields[0], { ...data.fields[1], cx: 1000, cy: 1000 }] });
    expect(dimensions[0]).toBeLessThanOrEqual(4096);
    expect(dimensions[1]).toBeLessThanOrEqual(4096);
    expect(dimensions[0] * dimensions[1]).toBeLessThanOrEqual(16_777_216);
  });

  it('handles a densely explored layer without exceeding the JavaScript argument limit', async () => {
    vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockReturnValue({ fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    const fields = Array.from({ length: 150_000 }, (_, index) => ({ ...data.fields[0], cx: index % 500 + 1, cy: Math.floor(index / 500) + 1 }));
    await expect(createStarmapPng({ ...data, fields })).resolves.toHaveProperty('type', 'image/png');
  });

  it('releases the canvas after PNG encoding fails', async () => {
    const canvases: HTMLCanvasElement[] = [];
    vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvases.push(this);
      return { fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null));
    await expect(createStarmapPng(data)).rejects.toThrow('PNG konnte nicht erstellt werden.');
    expect([canvases[0].width, canvases[0].height]).toEqual([0, 0]);
  });

  it('connects the download anchor and defers URL cleanup until the browser can consume it', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:download'), revokeObjectURL: revoke }));
    const anchors: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchors.push(this);
      expect(this.isConnected).toBe(true);
      expect(this.href).toBe('blob:download');
      expect(this.download).toBe('starmap-3.json');
    });
    downloadStarmapBlob(new Blob(['{}']), 'starmap-3.json');
    expect(anchors[0].isConnected).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:download');
  });

  it('keeps own-colony markers visible when large maps hide cell labels', async () => {
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockReturnValue({ fillRect, strokeRect: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    await createStarmapPng({ ...data, fields: [data.fields[0], { ...data.fields[1], cx: 1000, cy: 1000 }] });
    // Background, two known fields and the colony's distinct inset mark.
    expect(fillRect).toHaveBeenCalledTimes(4);
  });

  it('renders the entire explored rectangle with fog gaps, field labels and own colonies, without reading the viewport', async () => {
    const context = { fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn() };
    const canvases: HTMLCanvasElement[] = [];
    const dimensions: number[][] = [];
    vi.spyOn(HTMLCanvasElement.prototype as { getContext: (contextId: string) => unknown }, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvases.push(this);
      return context as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback, type) {
      dimensions.push([this.width, this.height]);
      callback(new Blob(['png'], { type }));
    });
    const result = await createStarmapPng(data);
    expect(result.type).toBe('image/png');
    // Four columns, five rows, at the existing 30px cell size + 60px heading.
    expect(dimensions).toEqual([[120, 210]]);
    expect(context.fillRect.mock.calls).toEqual([
      [0, 0, 120, 210], [0, 60, 30, 30], [90, 180, 30, 30],
    ]);
    const labels = context.fillText.mock.calls.map(([text]) => text);
    expect(labels).toContain('Kessel');
    expect(labels).toContain('Outpost');
    expect(labels).toContain('Nebel');
    expect(canvases[0].isConnected).toBe(false);
    expect([canvases[0].width, canvases[0].height]).toEqual([0, 0]);
  });
});
