import { act, render, waitFor } from '@testing-library/react';
import { StarmapCanvas } from './StarmapCanvas';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pixiControl = vi.hoisted(() => ({
  pendingLoads: [] as Array<{ resolve: (asset: object) => void }>,
  resolveInit: null as null | (() => void),
}));

vi.mock('pixi.js', () => {
  class Container {
    destroyed = false;
    children: unknown[] = [];
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    visible = true;
    addChild(...children: unknown[]) {
      this.children.push(...children);
    }
    removeChildren() {
      this.children = [];
    }
    destroy() {
      this.destroyed = true;
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
      pixiControl.pendingLoads = [];
    }
  }
  return {
    Application,
    Assets: {
      load: vi.fn(
        () =>
          new Promise<object>((resolve) => {
            pixiControl.pendingLoads.push({ resolve });
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
      while (resolvedCount < 2) {
        while (resolvedCount < pixiControl.pendingLoads.length) {
          pixiControl.pendingLoads[resolvedCount].resolve({ width: 1, height: 1 });
          resolvedCount += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(worldOverlay.style.transform).toContain('scale(1.5)');
    expect(worldOverlay.style.transform).toMatch(/^translate\(-50\.4\d+px, -240\.5px\) scale\(1\.5\)$/);
    unmount();
  });
});
