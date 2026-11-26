import { act, render, waitFor } from '@testing-library/react';
import { StarmapCanvas } from './StarmapCanvas';
import { Assets } from 'pixi.js';
import type { StarmapContactDto, StarmapGalaxyFieldDto } from '@swuniverse/shared';
import { STARMAP_CELL_SIZE } from '../../lib/starmap-render';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pixiControl = vi.hoisted(() => ({
  pendingLoads: [] as Array<{ resolve: (asset: object) => void; reject: () => void }>,
  sprites: [] as unknown[],
  graphicsCalls: [] as Array<{ method: string; args: unknown[] }>,
  resolveInit: null as null | (() => void),
  destroyedInsertions: 0,
  organicNebulaSprite: vi.fn(),
  featherNebulaSprite: vi.fn(),
  getNebulaCloudPixiTexture: vi.fn(),
}));

vi.mock('../../lib/map-terrain-pixi', () => ({
  organicNebulaSprite: pixiControl.organicNebulaSprite,
  featherNebulaSprite: pixiControl.featherNebulaSprite,
}));
vi.mock('../../lib/nebula-cloud-pixi', () => ({
  getNebulaCloudPixiTexture: pixiControl.getNebulaCloudPixiTexture,
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
    circle(...args: unknown[]) { pixiControl.graphicsCalls.push({ method: 'circle', args }); return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    fill(...args: unknown[]) { pixiControl.graphicsCalls.push({ method: 'fill', args }); return this; }
    stroke(...args: unknown[]) { pixiControl.graphicsCalls.push({ method: 'stroke', args }); return this; }
    clear() { return this; }
    destroy() { this.destroyed = true; }
  }
  class Sprite {
    position = { set: vi.fn() };
    width = 0;
    height = 0;
    alpha = 1;
    constructor(public texture: unknown) {
      pixiControl.sprites.push(texture);
    }
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
const systemGrids = new Map();
const influence: [] = [];
const contacts: [] = [];
const sensorCoverageContact: StarmapContactDto = {
  spacecraftId: 1,
  spacecraftName: 'Aufklärer',
  shipClassId: 1,
  ownerId: 1,
  ownerName: 'Siedler',
  location: { scope: 'GALAXY', locationId: 1, layerId: 8, x: 12, y: 14 },
  galaxyCell: { layerId: 8, x: 12, y: 14 },
  reason: 'OWN',
  sensorRange: 3,
};

describe('StarmapCanvas arrival focus', () => {
  beforeEach(() => {
    pixiControl.pendingLoads = [];
    pixiControl.sprites = [];
    pixiControl.graphicsCalls = [];
    pixiControl.resolveInit = null;
    pixiControl.destroyedInsertions = 0;
    pixiControl.organicNebulaSprite.mockClear();
    pixiControl.featherNebulaSprite.mockClear();
    pixiControl.getNebulaCloudPixiTexture.mockReset();
    vi.mocked(Assets.load).mockClear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
    } as never);
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
      selectedSystem: null,
      openedSystemIds: [] as number[],
      systemGrids,
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
  const basicProps = { layer, fields, selectedSystem: null, openedSystemIds: [], systemGrids,
    onSelectSystem: vi.fn(), onOpenSystem: vi.fn(), influence, contacts };

  it('marks fields with a trade post, independent of overlays', async () => {
    const post = { ...fields[0], details: {
      territoryOwner: null, tradePost: { id: 20, name: 'Posten', licenseCondition: null },
      region: null, effectTexts: [], isImpassable: false, databaseSystemId: null,
    } };
    const view = render(<StarmapCanvas {...basicProps} fields={[post]} />);
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    await act(async () => {
      for (let flush = 0; flush < 4; flush++) {
        for (const load of pixiControl.pendingLoads.splice(0)) load.resolve({ width: 1, height: 1 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
    const x = (post.cx - 1) * STARMAP_CELL_SIZE + 7;
    const y = post.cy * STARMAP_CELL_SIZE - 7;
    await waitFor(() => {
      expect(pixiControl.graphicsCalls).toContainEqual({ method: 'circle', args: [x, y, 4.5] });
    });
    view.unmount();
  });

  it('draws no trade post marker on fields without a post', async () => {
    const view = render(<StarmapCanvas {...basicProps} />);
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    await act(async () => {
      for (let flush = 0; flush < 4; flush++) {
        for (const load of pixiControl.pendingLoads.splice(0)) load.resolve({ width: 1, height: 1 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    });
    expect(view.queryByRole('status')).toBeNull();
    expect(pixiControl.graphicsCalls.some((call) => call.method === 'circle' && call.args[2] === 4.5)).toBe(false);
    view.unmount();
  });

  it('draws the optional sensor coverage circles', async () => {
    const view = render(
      <StarmapCanvas
        {...basicProps}
        fields={[]}
        contacts={[sensorCoverageContact]}
        showSensorCoverage
      />,
    );
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    const centerX = (sensorCoverageContact.location.x - 0.5) * STARMAP_CELL_SIZE;
    const centerY = (sensorCoverageContact.location.y - 0.5) * STARMAP_CELL_SIZE;
    const radius = sensorCoverageContact.sensorRange! * STARMAP_CELL_SIZE;
    await waitFor(() => {
      expect(pixiControl.graphicsCalls).toContainEqual({
        method: 'circle', args: [centerX, centerY, radius],
      });
    });
    view.unmount();
  });

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

  it('loads and draws a nebula PNG for a known field, but ignores texture metadata on UNKNOWN fields', async () => {
    const knownNebula = { ...fields[0], fieldTypeId: 120, fieldType: { ...fields[0].fieldType, id: 120, key: 'NEBULA', category: 'nebula' }, nebulaTexture: '/known-nebula.png' };
    const knownEmptySpace = {
      ...fields[0],
      id: 2,
      cx: 13,
      fieldType: { ...fields[0].fieldType, key: 'EMPTY_SPACE', category: 'space' },
      nebulaTexture: '/known-space-halo.png',
    };
    const unknown = {
      ...fields[0],
      id: 3,
      cx: 14,
      fieldType: { ...fields[0].fieldType, key: 'UNKNOWN' },
      nebulaTexture: '/hidden-nebula.png',
    };
    const props = {
      layer,
      fields: [knownNebula, knownEmptySpace, unknown],
      selectedSystem: null,
      openedSystemIds: [] as number[],
      systemGrids,
      onSelectSystem: vi.fn(),
      onOpenSystem: vi.fn(),
      selectedField: null,
      influence,
      contacts,
    };
    const view = render(<StarmapCanvas {...props} />);
    await act(async () => { pixiControl.resolveInit?.(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    await waitFor(() => expect(Assets.load).toHaveBeenCalledWith('/known-nebula.png'));
    await waitFor(() => expect(Assets.load).toHaveBeenCalledWith('/known-space-halo.png'));
    expect(vi.mocked(Assets.load).mock.calls.some(([url]) => String(url) === '/hidden-nebula.png')).toBe(false);
    const nebulaPng = { name: 'known-nebula-png' };
    const emptySpacePng = { name: 'known-space-halo-png' };
    await waitFor(() => expect(pixiControl.pendingLoads).toHaveLength(2));
    await act(async () => {
      pixiControl.pendingLoads[0].resolve(nebulaPng);
      pixiControl.pendingLoads[1].resolve(emptySpacePng);
      await Promise.resolve();
    });
    await waitFor(() => expect(pixiControl.pendingLoads).toHaveLength(4));
    await act(async () => {
      pixiControl.pendingLoads[2].resolve({ name: 'nebula-space-background' });
      pixiControl.pendingLoads[3].resolve({ name: 'halo-space-background' });
      await Promise.resolve();
    });
    await waitFor(() => expect(pixiControl.sprites).toContain(nebulaPng));
    expect(pixiControl.sprites).toContain(emptySpacePng);
    expect(pixiControl.organicNebulaSprite).not.toHaveBeenCalled();
    expect(pixiControl.featherNebulaSprite).not.toHaveBeenCalled();
    expect(pixiControl.sprites).not.toContain('/hidden-nebula.png');
    view.unmount();
  });

  it('draws cloud textures on sources and space while preserving adjacent legacy nebula and excluding UNKNOWN', async () => {
    const visual = { version: 2 as const, seed: 'known-cloud', width: 20, height: 20, density: 'RICH' as const };
    const source = {
      ...fields[0],
      fieldTypeId: 120,
      fieldType: { ...fields[0].fieldType, id: 120, key: 'NEBULA', category: 'nebula' },
      nebulaVisual: visual,
    };
    const legacyNebula = {
      ...fields[0],
      id: 2,
      cx: 13,
      fieldTypeId: 120,
      fieldType: { ...fields[0].fieldType, id: 120, key: 'NEBULA', category: 'nebula' },
    };
    const receiver = { ...fields[0], id: 3, cx: 14, fieldType: { ...fields[0].fieldType } };
    const unknown = {
      ...fields[0],
      id: 4,
      cx: 15,
      fieldType: { ...fields[0].fieldType, key: 'UNKNOWN' },
      nebulaVisual: visual,
      nebulaTexture: '/redacted-cloud.png',
    };
    pixiControl.getNebulaCloudPixiTexture.mockImplementation((_index, x, y) => ({ name: `cloud-${x}-${y}` }));

    const view = render(<StarmapCanvas {...basicProps} fields={[source, legacyNebula, receiver, unknown]} />);
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    await waitFor(() => expect(pixiControl.getNebulaCloudPixiTexture).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(pixiControl.pendingLoads).toHaveLength(3));
    await act(async () => {
      pixiControl.pendingLoads.forEach((load, index) => load.resolve({ name: `tile-${index}` }));
      await Promise.resolve();
    });
    expect(pixiControl.getNebulaCloudPixiTexture).toHaveBeenCalledWith(expect.objectContaining({
      sources: expect.any(Map),
    }), 12, 14);
    expect(pixiControl.getNebulaCloudPixiTexture).not.toHaveBeenCalledWith(expect.anything(), 13, 14);
    expect(pixiControl.getNebulaCloudPixiTexture).toHaveBeenCalledWith(expect.anything(), 14, 14);
    expect(pixiControl.getNebulaCloudPixiTexture).not.toHaveBeenCalledWith(expect.anything(), 15, 14);
    expect(pixiControl.organicNebulaSprite).not.toHaveBeenCalled();
    expect(pixiControl.featherNebulaSprite).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), legacyNebula.fieldType,
      [undefined, receiver.fieldType, undefined, source.fieldType],
    );
    expect(pixiControl.featherNebulaSprite).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Assets.load).mock.calls.some(([url]) => String(url) === '/redacted-cloud.png')).toBe(false);
    view.unmount();
  });

  it('keeps legacy nebula tiles on the feather mask', async () => {
    const legacyNebula = { ...fields[0], fieldTypeId: 120, fieldType: { ...fields[0].fieldType, id: 120, key: 'neon_nebel_120', category: 'nebula' } };
    const unknown = { ...fields[0], id: 2, cx: 13, fieldType: { ...fields[0].fieldType, key: 'UNKNOWN' } };
    const view = render(<StarmapCanvas {...basicProps} fields={[legacyNebula, unknown]} />);
    await act(async () => { pixiControl.resolveInit?.(); await Promise.resolve(); });
    await waitFor(() => expect(pixiControl.pendingLoads).toHaveLength(1));
    await act(async () => { pixiControl.pendingLoads[0].resolve({ name: 'legacy-nebula' }); await Promise.resolve(); });

    expect(pixiControl.featherNebulaSprite).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), legacyNebula.fieldType,
      [undefined, undefined, undefined, undefined],
    );
    expect(pixiControl.featherNebulaSprite).toHaveBeenCalledTimes(1);
    expect(pixiControl.organicNebulaSprite).not.toHaveBeenCalled();
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
