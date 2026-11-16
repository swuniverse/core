import { act, render, waitFor } from '@testing-library/react';
import { FullMapCanvas } from './FullMapCanvas';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';
import { useAdminSignatureStore } from '../../stores/admin-signature.store';
import { useAuthStore } from '../../stores/auth.store';

const pixi = vi.hoisted(() => ({
  resolveInit: null as (() => void) | null,
  strokes: [] as Array<{ color: number; lines: number[][] }>,
}));
vi.mock('pixi.js', () => {
  class Container {
    children: unknown[] = [];
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    addChild(child: unknown) {
      this.children.push(child);
    }
    addChildAt(child: unknown, index: number) {
      this.children.splice(index, 0, child);
    }
    removeChildren() {
      this.children = [];
    }
  }
  class Graphics {
    visible = true;
    lines: number[][] = [];
    clear() {
      this.lines = [];
      return this;
    }
    rect() {
      return this;
    }
    fill() {
      return this;
    }
    moveTo(x: number, y: number) {
      this.lines.push([x, y]);
      return this;
    }
    lineTo(x: number, y: number) {
      this.lines.push([x, y]);
      return this;
    }
    stroke({ color }: { color: number }) {
      pixi.strokes.push({ color, lines: [...this.lines] });
      return this;
    }
  }
  class Application {
    stage = new Container();
    renderer = { on: vi.fn(), off: vi.fn() };
    canvas = document.createElement('canvas');
    screen = { width: 900, height: 600 };
    init() {
      return new Promise<void>((resolve) => {
        pixi.resolveInit = resolve;
      });
    }
    destroy() {
      this.stage.removeChildren();
    }
  }
  return {
    Application,
    Container,
    Graphics,
    Assets: { load: vi.fn() },
    Sprite: class Sprite {},
    Text: class Text {},
    TextStyle: class TextStyle {},
  };
});

const field = {
  fieldId: 1,
  cx: 2,
  cy: 1,
  directions: { NORTH: 0, EAST: 1, SOUTH: 0, WEST: 0 },
};

describe('FullMapCanvas flight signatures', () => {
  beforeEach(() => {
    pixi.resolveInit = null;
    pixi.strokes = [];
    useAuthStore.setState({ user: { isAdmin: true } as never });
    useFullmapEditorStore.setState({
      fields: [],
      layers: [{ id: 5, width: 2, height: 2, name: 'Test' }] as never,
      selectedLayerId: 5,
      selectedField: null,
      selectedFieldIds: [],
    });
    useAdminSignatureStore.setState({
      enabled: true,
      filter: 'ALL',
      targetId: '',
      fields: [],
      viewport: { layerId: 5, xStart: 1, xEnd: 2, yStart: 1, yEnd: 2 },
    });
  });

  it('draws signature data arriving before asynchronous canvas initialization and redraws new directions', async () => {
    const { unmount } = render(<FullMapCanvas />);
    act(() => useAdminSignatureStore.getState().setFields([field]));
    expect(pixi.strokes.some((stroke) => stroke.color === 0xc2b942)).toBe(
      false,
    );
    await act(async () => pixi.resolveInit?.());
    await waitFor(() =>
      expect(
        pixi.strokes.some(
          (stroke) =>
            stroke.color === 0xc2b942 &&
            JSON.stringify(stroke.lines) ===
              JSON.stringify([
                [45, 15],
                [60, 15],
              ]),
        ),
      ).toBe(true),
    );
    pixi.strokes = [];
    act(() =>
      useAdminSignatureStore
        .getState()
        .setFields([
          { ...field, directions: { NORTH: 1, EAST: 0, SOUTH: 0, WEST: 0 } },
        ]),
    );
    expect(
      pixi.strokes.filter((stroke) => stroke.color === 0xc2b942).at(-1)?.lines,
    ).toEqual([
      [45, 15],
      [45, 0],
    ]);
    expect(useAdminSignatureStore.getState().viewport).toEqual({
      layerId: 5,
      xStart: 1,
      xEnd: 2,
      yStart: 1,
      yEnd: 2,
    });
    unmount();
    expect(useAdminSignatureStore.getState().viewport).toBeNull();
  });

  it('never draws signature data for a map editor without admin rights', async () => {
    useAuthStore.setState({
      user: { isAdmin: false, permissions: ['MAP_EDITOR'] } as never,
    });
    render(<FullMapCanvas />);
    act(() => useAdminSignatureStore.getState().setFields([field]));
    await act(async () => pixi.resolveInit?.());
    expect(pixi.strokes.some((stroke) => stroke.color === 0xc2b942)).toBe(
      false,
    );
  });
});
