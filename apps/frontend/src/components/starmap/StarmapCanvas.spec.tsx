import { act, render, waitFor } from '@testing-library/react';
import { StarmapCanvas } from './StarmapCanvas';
import { Assets } from 'pixi.js';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pixiControl = vi.hoisted(() => ({
  pendingLoads: [] as Array<{ resolve: (asset: object) => void; reject: () => void }>,
  resolveInit: null as null | (() => void),
  destroyedInsertions: 0,
}));

vi.mock('pixi.js', () => {
  class Container {
    destroyed = false;
    children: unknown[] = [];
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    visible = true;
    addChild(...children: unknown[]) {
      if (this.destroyed) pixiControl.destroyedInsertions++;
      this.children.push(...children);
    }
    removeChildren() {
      const removed = this.children;
      this.children = [];
      return removed;
    }
    destroy() {
      this.destroyed = true;
      for (const child of this.children) (child as { destroy?: () => void }).destroy?.();
    }
  }
  class Graphics {
    destroyed = false;
    visible = true;
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    rect() { return this; }
    circle() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    fill() { return this; }
    stroke() { return this; }
    clear() { return this; }
    destroy() { this.destroyed = true; }
  }
  class Sprite {
    position = { set: vi.fn() };
    width = 0;
    height = 0;
    alpha = 1;
    constructor(public texture: unknown) {}
  }
  class Text {
    position = { set: vi.fn() };
    anchor = { set: vi.fn() };
    constructor(public options: unknown) {}
  }
  class Application {
    stage = new Container();
    screen = { width: 900, height: 700 };
    canvas = document.createElement('canvas');
    init() {
      return new Promise<void>((resolve) => {
        pixiControl.resolveInit = resolve;
      });
    }
    destroy() {
      this.stage.destroy();
      pixiControl.pendingLoads = [];
    }
  }
  return {
    Application,
    Assets: {
      load: vi.fn(
        () =>
          new Promise<object>((resolve, reject) => {
            pixiControl.pendingLoads.push({ resolve, reject });
          }),
      ),
    },
    Container,
    Graphics,
    Sprite,
    Text,
    Texture: { from: vi.fn((image: unknown) => image) },
  };
});

const layer = { id: 8, name: 'Outer Rim', width: 100, height: 100, sectorSize: 10 };
const fields: StarmapGalaxyFieldDto[] = [
  {
    id: 1,
    cx: 12,
    cy: 14,
    fieldTypeId: 1,
    fieldType: {
      id: 1,
      key: 'EMPTY_SPACE',
      name: 'Leerer Raum',
      passable: true,
      energyCost: 0,
      damage: 0,
      isSystem: false,
      colorKey: null,
      category: null,
    },
    systemTypeId: null,
    factionZone: 'NEUTRAL',
    adminRegionKey: null,
    starSystemId: null,
    regionId: null,
    borderTypeId: null,
    starSystem: null,
    passableOverride: null,
    effects: [],
  },
];
const routes: [] = [];
const systemGrids = new Map();
const wormholes: [] = [];
const influence: [] = [];
const contacts: [] = [];

describe('StarmapCanvas arrival focus', () => {
  beforeEach(() => {
    pixiControl.pendingLoads = [];
    pixiControl.resolveInit = null;
    pixiControl.destroyedInsertions = 0;
    vi.mocked(Assets.load).mockClear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 700, width: 900, height: 700,
      toJSON: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the confirmed destination focused after delayed galaxy assets finish loading', async () => {
    const props = {
      layer,
      fields,
      routes,
      selectedSystem: null,
      openedSystemIds: [] as number[],
      systemGrids,
      wormholes,
      onSelectSystem: vi.fn(),
      onOpenSystem: vi.fn(),
      selectedField: null,
      influence,
      contacts,
    };
    const view = render(<StarmapCanvas {...props} focusField={{ cx: 12, cy: 14 }} />);
    const worldOverlay = view.container.querySelector('.origin-top-left') as HTMLDivElement;
    await act(async () => {
      pixiControl.resolveInit?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(pixiControl.pendingLoads.length).toBeGreaterThan(0);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(worldOverlay.style.transform).toContain('scale(1.5)'));
    const { unmount } = view;

    await act(async () => {
      let resolvedCount = 0;
      for (let flush = 0; flush < 4; flush++) {
        while (resolvedCount < pixiControl.pendingLoads.length) {
          pixiControl.pendingLoads[resolvedCount].resolve({ width: 1, height: 1 });
          resolvedCount += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(vi.mocked(Assets.load).mock.calls.every(([url]) => !String(url).includes('galactic-star-map-background'))).toBe(true);
    expect(view.queryByRole('status')).toBeNull();
    expect(worldOverlay.style.transform).toContain('scale(1.5)');
    expect(worldOverlay.style.transform).toMatch(/^translate\(-50\.4\d+px, -240\.5px\) scale\(1\.5\)$/);
    unmount();
  });
  const basicProps = { layer, fields, routes, selectedSystem: null, openedSystemIds: [], systemGrids, wormholes,
    onSelectSystem: vi.fn(), onOpenSystem: vi.fn(), influence, contacts };

  it('loads the real nebula terrain, hides unknown fields and finishes on an asset failure', async () => {
    const nebula = { ...fields[0], fieldTypeId: 120, fieldType: { ...fields[0].fieldType, id: 120, key: 'neon_nebel_120', category: 'nebula' } };
    const unknown = { ...fields[0], id: 2, cx: 13, fieldType: { ...fields[0].fieldType, key: 'UNKNOWN' } };
    const view = render(<StarmapCanvas {...basicProps} fields={[nebula, unknown]} />);
    expect(view.getByRole('status').textContent).toContain('geladen');
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    expect(Assets.load).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(Assets.load).mock.calls[0][0])).toContain('/map/120.png');
    await act(async () => { pixiControl.pendingLoads[0].reject(); await Promise.resolve(); });
    await waitFor(() => expect(view.queryByRole('status')).toBeNull());
    view.unmount();
  });

  it('does not insert late asset results into a destroyed map', async () => {
    const view = render(<StarmapCanvas {...basicProps} />);
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    const loads = [...pixiControl.pendingLoads];
    expect(loads.length).toBeGreaterThan(0);
    view.unmount();
    await act(async () => { await Promise.resolve(); loads.forEach((load) => load.resolve({})); await Promise.resolve(); });
    expect(pixiControl.destroyedInsertions).toBe(0);
  });

});
