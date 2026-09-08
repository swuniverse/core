import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Application,
  Container,
  Sprite,
  Graphics,
  Assets,
  Texture,
} from 'pixi.js';
import type {
  StarmapGalaxyFieldDto,
  StarmapSystemListItemDto,
  StarmapSystemGridDto,
  HyperspaceRouteDto,
  StarmapLayerDto,
  StarmapWormholeDto,
} from '@swuniverse/shared';
import {
  spaceBackgroundTile,
  systemTypeImage,
  starWarsMarkerImage,
  planetThumbnail,
  starTileImage,
  galaxyMapBackground,
} from '../../lib/assets';
import { buildStarTileLayers, getStarTileIdAt } from '../../lib/starmap-render';

const CELL_SIZE = 30;
const MIN_SCALE = 0.08;
const MAX_SCALE = 6;
const AXIS_SIZE = 34;
const ZOOM_DURATION = 800;
const SYSTEM_CELL_SIZE = 30;

type MapMode = 'galaxy' | 'system' | 'transitioning';

export interface StarmapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  enterSystem: () => void;
}

export interface ColonizationTargetHint {
  celestialObjectId: number;
  canColonize: boolean;
  reasons: string[];
}

interface StarmapCanvasProps {
  layer: Pick<
    StarmapLayerDto,
    'id' | 'name' | 'width' | 'height' | 'sectorSize'
  >;
  fields: StarmapGalaxyFieldDto[];
  routes: HyperspaceRouteDto[];
  selectedSystem: StarmapSystemListItemDto | null;
  systemGrid: StarmapSystemGridDto | null;
  wormholes: StarmapWormholeDto[];
  onSelectSystem: (system: StarmapSystemListItemDto) => void;
  onExitSystem: () => void;
  onEnterSystem: (system: StarmapSystemListItemDto) => Promise<StarmapSystemGridDto>;
  onFieldHover?: (field: StarmapGalaxyFieldDto | null) => void;
  onFieldClick?: (field: StarmapGalaxyFieldDto | null) => void;
  selectedField?: StarmapGalaxyFieldDto | null;
  selectedSector?: { x: number; y: number } | null;
  showGrid?: boolean;
  colonizationHints?: Record<number, ColonizationTargetHint>;
}

const FIELD_TYPE_COLORS: Record<string, number> = {
  UNKNOWN: 0x000000,
  EMPTY_SPACE: 0x0a0a1a,
  DEEP_SPACE: 0x0f0f2a,
  NEBULA: 0x1a2e1a,
  BLOCKED: 0x2a0a0a,
};


function minimumZoomScale(
  app: Application,
  layer: StarmapCanvasProps['layer'],
  mode: MapMode,
): number {
  if (mode === 'system') return 0.5;
  const viewW = app.screen.width - AXIS_SIZE;
  const viewH = app.screen.height - AXIS_SIZE;
  return Math.max(
    MIN_SCALE,
    Math.min(viewW / (layer.width * CELL_SIZE), viewH / (layer.height * CELL_SIZE)),
  );
}
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const StarmapCanvas = forwardRef<
  StarmapCanvasHandle,
  StarmapCanvasProps
>(function StarmapCanvas(
  {
    layer,
    fields,
    routes,
    selectedSystem,
    systemGrid,
    wormholes,
    onSelectSystem,
    onEnterSystem,
    onExitSystem,
    onFieldHover,
    onFieldClick,
    selectedField,
    selectedSector,
    showGrid = true,
    colonizationHints: _colonizationHints = {},
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stateRef = useRef({
    mode: 'galaxy' as MapMode,
    viewX: 0,
    viewY: 0,
    scale: 1,
    // Saved galaxy view for returning
    galaxyViewX: 0,
    galaxyViewY: 0,
    galaxyScale: 1,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragViewX: 0,
    dragViewY: 0,
    dragMoved: false,
    pinching: false,
    pinchDist: 0,
    pinchScale: 1,
    mouseX: 0,
    mouseY: 0,
    hoveredField: null as StarmapGalaxyFieldDto | null,
    animationId: 0,
  });
  const galaxyContainerRef = useRef<Container | null>(null);
  const systemContainerRef = useRef<Container | null>(null);
  const gridRef = useRef<Graphics | null>(null);
  const selectionRef = useRef<Graphics | null>(null);
  const routeGraphicsRef = useRef<Graphics | null>(null);
  const galaxyBackgroundRef = useRef<Sprite | null>(null);
  const galaxyFieldLayerRef = useRef<Container | null>(null);
  const galaxyIconLayerRef = useRef<Container | null>(null);
  const galaxyOverlayLayerRef = useRef<Container | null>(null);
  const onSelectSystemRef = useRef(onSelectSystem);
  const sectorGridRef = useRef<Graphics | null>(null);
  const fieldMapRef = useRef<Map<string, StarmapGalaxyFieldDto>>(new Map());
  const systemGridRef = useRef<StarmapSystemGridDto | null>(null);
  const selectedFieldRef = useRef(selectedField);
  const selectedSectorRef = useRef(selectedSector);
  const showGridRef = useRef(showGrid);
  const onFieldHoverRef = useRef(onFieldHover);
  const onFieldClickRef = useRef(onFieldClick);

  useEffect(() => {
    systemGridRef.current = systemGrid;
  }, [systemGrid]);

  useEffect(() => {
    selectedFieldRef.current = selectedField;
  }, [selectedField]);

  useEffect(() => {
    selectedSectorRef.current = selectedSector;
  }, [selectedSector]);

  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  useEffect(() => {
    onSelectSystemRef.current = onSelectSystem;
  }, [onSelectSystem]);

  useEffect(() => {
    onFieldHoverRef.current = onFieldHover;
  }, [onFieldHover]);

  useEffect(() => {
    onFieldClickRef.current = onFieldClick;
  }, [onFieldClick]);

  useEffect(() => {
    fieldMapRef.current = new Map(fields.map((f) => [`${f.cx},${f.cy}`, f]));
  }, [fields]);

  const getFieldAt = useCallback((worldX: number, worldY: number) => {
    const gx = Math.floor(worldX / CELL_SIZE) + 1;
    const gy = Math.floor(worldY / CELL_SIZE) + 1;
    return fieldMapRef.current.get(`${gx},${gy}`) ?? null;
  }, []);

  // --- Animation helper ---
  const animateTo = useCallback(
    (
      targetX: number,
      targetY: number,
      targetScale: number,
      duration: number,
      onComplete?: () => void,
    ) => {
      const state = stateRef.current;
      const startX = state.viewX;
      const startY = state.viewY;
      const startScale = state.scale;
      const startTime = performance.now();

      cancelAnimationFrame(state.animationId);

      function tick() {
        const t = Math.min(1, (performance.now() - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        state.viewX = startX + (targetX - startX) * ease;
        state.viewY = startY + (targetY - startY) * ease;
        state.scale = startScale + (targetScale - startScale) * ease;
        updateView();
        if (t < 1) {
          state.animationId = requestAnimationFrame(tick);
        } else {
          onComplete?.();
        }
      }
      state.animationId = requestAnimationFrame(tick);
    },
    [],
  );

  // --- Overlay (Canvas 2D axes + labels) ---
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(8, 8, 24, 0.95)';
    ctx.fillRect(0, 0, w, AXIS_SIZE);
    ctx.fillRect(0, AXIS_SIZE, AXIS_SIZE, h - AXIS_SIZE);
    ctx.fillStyle = 'rgba(8, 8, 24, 1)';
    ctx.fillRect(0, 0, AXIS_SIZE, AXIS_SIZE);

    const cellSize = state.mode === 'system' ? SYSTEM_CELL_SIZE : CELL_SIZE;
    const currentGrid = systemGridRef.current;
    const maxCols =
      state.mode === 'system' && currentGrid
        ? currentGrid.system.maxX
        : layer.width;
    const maxRows =
      state.mode === 'system' && currentGrid
        ? currentGrid.system.maxY
        : layer.height;

    const pixelPerCell = state.scale * cellSize;

    // Axis labels only at sufficient zoom
    if (pixelPerCell >= 4) {
      const labelStep =
        pixelPerCell < 14
          ? Math.ceil(14 / pixelPerCell) * 2
          : pixelPerCell < 28
            ? Math.ceil(28 / pixelPerCell)
            : 1;

      const startX = Math.max(1, Math.floor(state.viewX / cellSize) + 1);
      const endX = Math.min(
        maxCols,
        Math.ceil((state.viewX + (w - AXIS_SIZE) / state.scale) / cellSize),
      );
      const startY = Math.max(1, Math.floor(state.viewY / cellSize) + 1);
      const endY = Math.min(
        maxRows,
        Math.ceil((state.viewY + (h - AXIS_SIZE) / state.scale) / cellSize),
      );

      ctx.font = '10px monospace';
      ctx.textBaseline = 'middle';

      ctx.textAlign = 'center';
      ctx.fillStyle = '#888';
      for (let x = startX; x <= endX; x++) {
        if ((x - 1) % labelStep !== 0) continue;
        const screenX =
          AXIS_SIZE +
          ((x - 1) * cellSize + cellSize / 2 - state.viewX) * state.scale;
        if (screenX < AXIS_SIZE || screenX > w) continue;
        ctx.fillRect(screenX - 0.5, AXIS_SIZE - 5, 1, 5);
        if (pixelPerCell >= 10) {
          ctx.fillStyle = '#aaa';
          ctx.fillText(String(x), screenX, AXIS_SIZE / 2);
          ctx.fillStyle = '#888';
        }
      }

      ctx.textAlign = 'right';
      for (let y = startY; y <= endY; y++) {
        if ((y - 1) % labelStep !== 0) continue;
        const screenY =
          AXIS_SIZE +
          ((y - 1) * cellSize + cellSize / 2 - state.viewY) * state.scale;
        if (screenY < AXIS_SIZE || screenY > h) continue;
        ctx.fillRect(AXIS_SIZE - 5, screenY - 0.5, 5, 1);
        if (pixelPerCell >= 10) {
          ctx.fillStyle = '#aaa';
          ctx.fillText(String(y), AXIS_SIZE - 7, screenY);
          ctx.fillStyle = '#888';
        }
      }

      // System mode label
      if (state.mode === 'system' && selectedSystem) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(selectedSystem.name, AXIS_SIZE + 8, AXIS_SIZE / 2);
      }
    }

    // Sector selection highlight
    const sector = selectedSectorRef.current;
    if (sector && state.mode === 'galaxy') {
      const sectorSize = layer.sectorSize;
      const sx =
        AXIS_SIZE +
        (sector.x * sectorSize * CELL_SIZE - state.viewX) * state.scale;
      const sy =
        AXIS_SIZE +
        (sector.y * sectorSize * CELL_SIZE - state.viewY) * state.scale;
      const sw = sectorSize * CELL_SIZE * state.scale;
      const sh = sectorSize * CELL_SIZE * state.scale;
      ctx.strokeStyle = '#6b8ba4';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    // Field selection highlight
    const field = selectedFieldRef.current;
    if (field && state.mode === 'galaxy') {
      const fx =
        AXIS_SIZE + ((field.cx - 1) * CELL_SIZE - state.viewX) * state.scale;
      const fy =
        AXIS_SIZE + ((field.cy - 1) * CELL_SIZE - state.viewY) * state.scale;
      const fs = CELL_SIZE * state.scale;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(fx, fy, fs, fs);
    }
  }, [layer, selectedSystem]);

  const updateTooltip = useCallback(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const state = stateRef.current;

    if (state.dragging || state.mode !== 'galaxy' || !state.hoveredField) {
      tooltip.style.display = 'none';
      return;
    }

    const field = state.hoveredField;
    let text = `${field.cx}, ${field.cy}`;
    if (field.fieldType.key !== 'UNKNOWN') text += ` · ${field.fieldType.name}`;
    if (field.starSystem) {
      text += ` · ${field.starSystem.name}`;
      if (field.starSystem.isMapOnly) text += ' (POI)';
    }

    tooltip.textContent = text;
    tooltip.style.display = 'block';
    tooltip.style.left = `${state.mouseX + 12}px`;
    tooltip.style.top = `${state.mouseY + 12}px`;
  }, []);

  // --- View update ---
  const updateView = useCallback(() => {
    const app = appRef.current;
    const state = stateRef.current;
    const container =
      state.mode === 'system'
        ? systemContainerRef.current
        : galaxyContainerRef.current;
    if (!app || !container || container.destroyed) return;

    // Clamp view to map bounds (center when map fits in viewport)
    const viewW = (app.screen.width - AXIS_SIZE) / state.scale;
    const viewH = (app.screen.height - AXIS_SIZE) / state.scale;
    const sysGrid = systemGridRef.current;
    const isSystem = state.mode === 'system' && sysGrid;
    const mapW = isSystem
      ? sysGrid.system.maxX * SYSTEM_CELL_SIZE
      : layer.width * CELL_SIZE;
    const mapH = isSystem
      ? sysGrid.system.maxY * SYSTEM_CELL_SIZE
      : layer.height * CELL_SIZE;
    if (mapW <= viewW) {
      state.viewX = -(viewW - mapW) / 2;
    } else {
      state.viewX = clamp(state.viewX, 0, mapW - viewW);
    }
    if (mapH <= viewH) {
      state.viewY = -(viewH - mapH) / 2;
    } else {
      state.viewY = clamp(state.viewY, 0, mapH - viewH);
    }

    container.position.set(
      AXIS_SIZE - state.viewX * state.scale,
      AXIS_SIZE - state.viewY * state.scale,
    );
    container.scale.set(state.scale);

    const fieldOpacity = clamp((state.scale - 0.3) / 0.7, 0, 1);
    if (galaxyBackgroundRef.current && state.mode === 'galaxy') {
      galaxyBackgroundRef.current.alpha = 0.22 * (1 - fieldOpacity * 0.55);
    }
    if (galaxyFieldLayerRef.current && state.mode === 'galaxy') {
      galaxyFieldLayerRef.current.alpha = 0.1 + fieldOpacity * 0.9;
    }
    if (galaxyIconLayerRef.current && state.mode === 'galaxy') {
      galaxyIconLayerRef.current.alpha = 0.72 + fieldOpacity * 0.28;
    }
    if (galaxyOverlayLayerRef.current && state.mode === 'galaxy') {
      galaxyOverlayLayerRef.current.alpha = 0.35 + fieldOpacity * 0.65;
    }
    if (gridRef.current) {
      gridRef.current.visible =
        showGridRef.current && state.scale * CELL_SIZE >= 14;
    }
    if (sectorGridRef.current) {
      sectorGridRef.current.visible =
        showGridRef.current && state.scale * CELL_SIZE >= 7;
    }

    drawOverlay();
  }, [drawOverlay]);

  const drawSelection = useCallback(() => {
    const g = selectionRef.current;
    if (!g) return;
    g.clear();
    if (!selectedSystem || stateRef.current.mode === 'system') return;

    const field = fields.find(
      (f) =>
        f.starSystem &&
        f.starSystem.cx === selectedSystem.cx &&
        f.starSystem.cy === selectedSystem.cy,
    );
    if (!field) return;

    const x = (field.cx - 1) * CELL_SIZE;
    const y = (field.cy - 1) * CELL_SIZE;
    const lw = Math.max(1, 2 / stateRef.current.scale);
    g.rect(x + lw / 2, y + lw / 2, CELL_SIZE - lw, CELL_SIZE - lw).stroke({
      color: 0xf59e0b,
      width: lw,
      alpha: 0.9,
    });
  }, [selectedSystem, fields]);

  const drawRoutes = useCallback(() => {
    const g = routeGraphicsRef.current;
    if (!g) return;
    g.clear();
    for (const route of routes) {
      const color = parseInt(route.color.replace('#', ''), 16) || 0xfacc15;
      for (const segment of route.segments) {
        const points = [
          { x: segment.fromSystem.cx, y: segment.fromSystem.cy },
          ...(segment.controlPoints ?? []),
          { x: segment.toSystem.cx, y: segment.toSystem.cy },
        ];
        g.moveTo(
          (points[0].x - 0.5) * CELL_SIZE,
          (points[0].y - 0.5) * CELL_SIZE,
        );
        for (let index = 1; index < points.length; index++) {
          g.lineTo(
            (points[index].x - 0.5) * CELL_SIZE,
            (points[index].y - 0.5) * CELL_SIZE,
          );
        }
        g.stroke({ color, width: 4, alpha: 0.08 });
        g.moveTo(
          (points[0].x - 0.5) * CELL_SIZE,
          (points[0].y - 0.5) * CELL_SIZE,
        );
        for (let index = 1; index < points.length; index++) {
          g.lineTo(
            (points[index].x - 0.5) * CELL_SIZE,
            (points[index].y - 0.5) * CELL_SIZE,
          );
        }
        g.stroke({ color, width: 1.2, alpha: 0.5 });
      }
    }
  }, [routes]);

  const drawSectorGrid = useCallback(() => {
    const g = sectorGridRef.current;
    if (!g) return;
    g.clear();
    const sectorSize = layer.sectorSize;
    const cols = Math.ceil(layer.width / sectorSize);
    const rows = Math.ceil(layer.height / sectorSize);
    for (let x = 1; x <= cols; x++) {
      g.moveTo(x * sectorSize * CELL_SIZE, 0).lineTo(
        x * sectorSize * CELL_SIZE,
        layer.height * CELL_SIZE,
      );
    }
    for (let y = 1; y <= rows; y++) {
      g.moveTo(0, y * sectorSize * CELL_SIZE).lineTo(
        layer.width * CELL_SIZE,
        y * sectorSize * CELL_SIZE,
      );
    }
    g.stroke({ color: 0xf59e0b, width: 1, alpha: 0.12 });
  }, [layer]);

  // --- Transition to system ---
  const transitionToSystem = useCallback(
    (system: StarmapSystemListItemDto) => {
      const state = stateRef.current;
      if (state.mode !== 'galaxy') return;

      state.galaxyViewX = state.viewX;
      state.galaxyViewY = state.viewY;
      state.galaxyScale = state.scale;
      state.mode = 'transitioning';

      const app = appRef.current;
      if (!app) return;
      const viewW = app.screen.width - AXIS_SIZE;

      // Target: zoom to the system field, filling ~1/3 of viewport
      const targetScale = Math.min(MAX_SCALE, viewW / (CELL_SIZE * 3));
      const targetX =
        (system.cx - 1) * CELL_SIZE + CELL_SIZE / 2 - viewW / (2 * targetScale);
      const targetY =
        (system.cy - 1) * CELL_SIZE +
        CELL_SIZE / 2 -
        (app.screen.height - AXIS_SIZE) / (2 * targetScale);

      animateTo(targetX, targetY, targetScale, ZOOM_DURATION, () => {
        enterSystemMode();
      });
    },
    [animateTo],
  );

  const enterSystemMode = useCallback(() => {
    const state = stateRef.current;
    const grid = systemGridRef.current;
    state.mode = 'system';

    if (galaxyContainerRef.current) galaxyContainerRef.current.visible = false;
    if (systemContainerRef.current) {
      systemContainerRef.current.visible = true;
      systemContainerRef.current.removeChildren();
      loadSystemTiles(systemContainerRef.current);
    }

    const app = appRef.current;
    if (!app || !grid) return;
    const viewW = app.screen.width - AXIS_SIZE;
    const viewH = app.screen.height - AXIS_SIZE;
    const mapW = grid.system.maxX * SYSTEM_CELL_SIZE;
    const mapH = grid.system.maxY * SYSTEM_CELL_SIZE;
    state.scale = clamp(Math.min(viewW / mapW, viewH / mapH), 0.5, MAX_SCALE);
    state.viewX = 0;
    state.viewY = 0;
    updateView();
  }, [updateView]);

  const enterFocusedSystem = useCallback(
    async (system: StarmapSystemListItemDto) => {
      const state = stateRef.current;
      if (state.mode !== 'galaxy') return;
      state.mode = 'transitioning';
      try {
        const grid = await onEnterSystem(system);
        systemGridRef.current = grid;
        state.mode = 'galaxy';
        transitionToSystem(system);
      } catch {
        state.mode = 'galaxy';
      }
    },
    [onEnterSystem, transitionToSystem],
  );

  // --- Transition back to galaxy ---
  const transitionBackToGalaxy = useCallback(() => {
    const state = stateRef.current;
    if (state.mode !== 'system') return;

    if (systemContainerRef.current) systemContainerRef.current.visible = false;
    if (galaxyContainerRef.current) galaxyContainerRef.current.visible = true;

    state.viewX = state.galaxyViewX;
    state.viewY = state.galaxyViewY;
    state.scale = state.galaxyScale;
    state.mode = 'galaxy';
    updateView();
    drawSelection();
  }, [updateView, drawSelection]);

  // Exit system mode when systemGrid is cleared
  useEffect(() => {
    if (!systemGrid && stateRef.current.mode === 'system') {
      transitionBackToGalaxy();
    }
  }, [systemGrid, transitionBackToGalaxy]);

  // ESC key → exit system
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current.mode === 'system') {
        onExitSystem();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExitSystem]);

  // --- Load system tiles into system container ---
  const loadSystemTiles = useCallback(async (container: Container) => {
    const grid = systemGridRef.current;
    if (!grid) return;
    const { system: sys, fields: sysFields, celestialObjects, colonyShields } = grid;
    const objects = new Map((celestialObjects ?? []).map((o) => [o.id, o]));
    const starTileLayers = buildStarTileLayers(grid);


    // Background
    const bg = new Graphics();
    bg.rect(
      0,
      0,
      sys.maxX * SYSTEM_CELL_SIZE,
      sys.maxY * SYSTEM_CELL_SIZE,
    ).fill({ color: 0x000000 });
    container.addChild(bg);

    const bgLayer = new Container();
    const iconLayer = new Container();
    container.addChild(bgLayer);
    container.addChild(iconLayer);

    const loadPromises = sysFields.map(async (field) => {
      const cellX = (field.sx - 1) * SYSTEM_CELL_SIZE;
      const cellY = (field.sy - 1) * SYSTEM_CELL_SIZE;

      // Background tile
      try {
        const bgUrl = spaceBackgroundTile(field.sx, field.sy);
        const texture = await Assets.load(bgUrl);
        const sprite = new Sprite(texture);
        sprite.position.set(cellX, cellY);
        sprite.width = SYSTEM_CELL_SIZE;
        sprite.height = SYSTEM_CELL_SIZE;
        bgLayer.addChild(sprite);
      } catch {
        const g = new Graphics();
        g.rect(cellX, cellY, SYSTEM_CELL_SIZE, SYSTEM_CELL_SIZE).fill({
          color: 0x0a0a1a,
        });
        bgLayer.addChild(g);
      }

      // Star tiles
      let rendered = false;
      const tileId = starTileLayers
        .map((star) =>
          getStarTileIdAt(
            star.config,
            field.sx,
            field.sy,
            star.center.x,
            star.center.y,
          ),
        )
        .find((id) => id !== null) ?? null;
        if (tileId !== null) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = starTileImage(tileId);
            });
            const texture = Texture.from(img);
            const sprite = new Sprite(texture);
            sprite.position.set(cellX, cellY);
            sprite.width = SYSTEM_CELL_SIZE;
            sprite.height = SYSTEM_CELL_SIZE;
            iconLayer.addChild(sprite);
            rendered = true;
          } catch {
            /* skip */
          }
        }

      // Planet/object icons
      if (!rendered && field.celestialObjectId) {
        const obj = objects.get(field.celestialObjectId);
        if (
          obj?.classId != null &&
          !(obj.classId >= 9001 && obj.classId <= 9005)
        ) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = planetThumbnail(obj.classId!);
            });
            const texture = Texture.from(img);
            const sprite = new Sprite(texture);
            sprite.width = SYSTEM_CELL_SIZE * 0.85;
            sprite.height = SYSTEM_CELL_SIZE * 0.85;
            sprite.position.set(
              cellX + SYSTEM_CELL_SIZE * 0.075,
              cellY + SYSTEM_CELL_SIZE * 0.075,
            );
            iconLayer.addChild(sprite);
          } catch {
            /* skip */
          }
        }
      }
    });

    await Promise.all(loadPromises);

    for (const shield of colonyShields ?? []) {
      if (!shield.shielded) continue;
      const cellX = (shield.posX - 1) * SYSTEM_CELL_SIZE;
      const cellY = (shield.posY - 1) * SYSTEM_CELL_SIZE;
      const overlay = new Graphics();
      overlay
        .circle(
          cellX + SYSTEM_CELL_SIZE / 2,
          cellY + SYSTEM_CELL_SIZE / 2,
          SYSTEM_CELL_SIZE * 0.48,
        )
        .stroke({ color: 0x22d3ee, width: 2, alpha: 0.85 });
      overlay
        .circle(
          cellX + SYSTEM_CELL_SIZE / 2,
          cellY + SYSTEM_CELL_SIZE / 2,
          SYSTEM_CELL_SIZE * 0.36,
        )
        .stroke({ color: 0x67e8f9, width: 1, alpha: 0.45 });
      iconLayer.addChild(overlay);
    }

    // Grid lines
    const gridGfx = new Graphics();
    for (let x = 0; x <= sys.maxX; x++) {
      gridGfx
        .moveTo(x * SYSTEM_CELL_SIZE, 0)
        .lineTo(x * SYSTEM_CELL_SIZE, sys.maxY * SYSTEM_CELL_SIZE);
    }
    for (let y = 0; y <= sys.maxY; y++) {
      gridGfx
        .moveTo(0, y * SYSTEM_CELL_SIZE)
        .lineTo(sys.maxX * SYSTEM_CELL_SIZE, y * SYSTEM_CELL_SIZE);
    }
    gridGfx.stroke({ color: 0x94a3b8, width: 0.5, alpha: 0.08 });
    container.addChild(gridGfx);
  }, []);

  // --- Init Pixi ---
  useEffect(() => {
    if (!containerRef.current) return;

    const ac = new AbortController();
    const app = new Application();
    const initPromise = app
      .init({
        resizeTo: containerRef.current,
        background: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      .then(() => {
        if (ac.signal.aborted || !containerRef.current) return;
        containerRef.current.insertBefore(
          app.canvas as HTMLCanvasElement,
          containerRef.current.firstChild,
        );
        appRef.current = app;

        // Galaxy container
        const galaxyContainer = new Container();
        galaxyContainerRef.current = galaxyContainer;
        app.stage.addChild(galaxyContainer);

        // System container (hidden initially)
        const systemContainer = new Container();
        systemContainer.visible = false;
        systemContainerRef.current = systemContainer;
        app.stage.addChild(systemContainer);

        const routeGfx = new Graphics();
        routeGraphicsRef.current = routeGfx;
        galaxyContainer.addChild(routeGfx);

        const sectorGfx = new Graphics();
        sectorGridRef.current = sectorGfx;
        galaxyContainer.addChild(sectorGfx);

        const selection = new Graphics();
        selectionRef.current = selection;
        galaxyContainer.addChild(selection);

        loadGalaxyTiles(galaxyContainer);
        drawRoutes();
        drawSectorGrid();
        fitViewFn(app);
        setupInteraction(app, ac.signal);
        resizeOverlay();
      });

    return () => {
      ac.abort();
      appRef.current = null;
      galaxyContainerRef.current = null;
      systemContainerRef.current = null;
      gridRef.current = null;
      selectionRef.current = null;
      routeGraphicsRef.current = null;
      sectorGridRef.current = null;
      initPromise.then(() => {
        app.destroy(true, { children: true });
      });
    };
  }, []);

  useEffect(() => {
    if (!appRef.current) return;
    drawRoutes();
    drawSelection();
  }, [drawRoutes, drawSelection]);

  useEffect(() => {
    updateView();
  }, [showGrid, selectedSector, selectedField, updateView]);

  const resizeOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const container = containerRef.current;
    if (!overlay || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    overlay.width = Math.floor(rect.width * dpr);
    overlay.height = Math.floor(rect.height * dpr);
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    drawOverlay();
  }, [drawOverlay]);

  useEffect(() => {
    const onResize = () => resizeOverlay();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resizeOverlay]);

  const loadGalaxyTiles = useCallback(
    async (mapContainer: Container) => {
      const bgLayer = new Container();
      const fieldLayer = new Container();
      const iconLayer = new Container();
      const overlayLayer = new Container();
      galaxyFieldLayerRef.current = fieldLayer;
      galaxyIconLayerRef.current = iconLayer;
      galaxyOverlayLayerRef.current = overlayLayer;
      mapContainer.addChildAt(bgLayer, 0);
      mapContainer.addChildAt(fieldLayer, 1);
      mapContainer.addChildAt(iconLayer, 2);
      mapContainer.addChildAt(overlayLayer, 3);

      const bg = new Graphics();
      bg.rect(0, 0, layer.width * CELL_SIZE, layer.height * CELL_SIZE).fill({
        color: 0x000000,
      });
      bgLayer.addChild(bg);
      try {
        const texture = await Assets.load(galaxyMapBackground());
        const galaxyBackground = new Sprite(texture);
        galaxyBackground.width = layer.width * CELL_SIZE;
        galaxyBackground.height = layer.height * CELL_SIZE;
        galaxyBackground.alpha = 0.22;
        galaxyBackgroundRef.current = galaxyBackground;
        bgLayer.addChild(galaxyBackground);
      } catch {
        // The procedural field background remains usable without the optional image.
      }

      const loadPromises = fields
        .filter((field) => field.fieldType.key !== 'UNKNOWN')
        .map(async (field) => {
          const cellX = (field.cx - 1) * CELL_SIZE;
          const cellY = (field.cy - 1) * CELL_SIZE;
          const tileUrl =
            field.fieldTypeId > 1 && !field.systemTypeId
              ? starTileImage(field.fieldTypeId)
              : spaceBackgroundTile(field.cx, field.cy);
          try {
            const texture = await Assets.load(tileUrl);
            const sprite = new Sprite(texture);
            sprite.position.set(cellX, cellY);
            sprite.width = CELL_SIZE;
            sprite.height = CELL_SIZE;
            fieldLayer.addChild(sprite);
          } catch {
            const g = new Graphics();
            g.rect(cellX, cellY, CELL_SIZE, CELL_SIZE).fill({
              color: FIELD_TYPE_COLORS[field.fieldType.key] ?? 0x0a0a1a,
            });
            fieldLayer.addChild(g);
          }

          if (field.systemTypeId) {
            try {
              const texture = await Assets.load(
                field.starSystem?.isMapOnly
                  ? starWarsMarkerImage(
                      field.starSystem.landmarkKey,
                      field.systemTypeId,
                    )
                  : systemTypeImage(field.systemTypeId),
              );
              const icon = new Sprite(texture);
              const size = field.starSystem?.isMapOnly
                ? CELL_SIZE * 0.6
                : CELL_SIZE * 1.15;
              icon.width = size;
              icon.height = size;
              icon.position.set(
                cellX + (CELL_SIZE - size) / 2,
                cellY + (CELL_SIZE - size) / 2,
              );
              icon.alpha = field.starSystem?.isMapOnly ? 0.85 : 1;
              iconLayer.addChild(icon);
            } catch {
              // System assets are optional; terrain remains interactive.
            }
          }


          if (field.fieldType.key === 'ASTEROID_CLUSTER') {
            const debris = new Graphics();
            debris.circle(
              cellX + CELL_SIZE / 2,
              cellY + CELL_SIZE / 2,
              CELL_SIZE * 0.3,
            ).fill({ color: 0x94a3b8, alpha: 0.22 });
            overlayLayer.addChild(debris);
          }
        });
      await Promise.all(loadPromises);
      for (const wormhole of wormholes) {
        const endpoints = [
          { cx: wormhole.entryCx, cy: wormhole.entryCy, assetId: 12 },
          { cx: wormhole.exitCx, cy: wormhole.exitCy, assetId: 14 },
        ];
        for (const endpoint of endpoints) {
          const glow = new Graphics();
          glow.circle(
            (endpoint.cx - 0.5) * CELL_SIZE,
            (endpoint.cy - 0.5) * CELL_SIZE,
            CELL_SIZE * 0.78,
          ).stroke({
            color: endpoint.assetId === 12 ? 0xd946ef : 0x22d3ee,
            width: 1.2,
            alpha: 0.45,
          });
          overlayLayer.addChild(glow);
          try {
            const texture = await Assets.load(starTileImage(endpoint.assetId));
            const marker = new Sprite(texture);
            const size = CELL_SIZE * 1.45;
            marker.width = size;
            marker.height = size;
            marker.position.set(
              (endpoint.cx - 0.5) * CELL_SIZE - size / 2,
              (endpoint.cy - 0.5) * CELL_SIZE - size / 2,
            );
            marker.alpha = 0.92;
            iconLayer.addChild(marker);
          } catch {
            // The map remains usable without an optional wormhole marker asset.
          }
        }
      }

      const grid = new Graphics();
      gridRef.current = grid;
      for (let x = 0; x <= layer.width; x++) {
        grid
          .moveTo(x * CELL_SIZE, 0)
          .lineTo(x * CELL_SIZE, layer.height * CELL_SIZE);
      }
      for (let y = 0; y <= layer.height; y++) {
        grid
          .moveTo(0, y * CELL_SIZE)
          .lineTo(layer.width * CELL_SIZE, y * CELL_SIZE);
      }
      grid.stroke({ color: 0x94a3b8, width: 0.5, alpha: 0.08 });
      mapContainer.addChild(grid);
    },
    [fields, layer, wormholes],
  );

  const fitViewFn = useCallback(
    (app: Application) => {
      const state = stateRef.current;
      const viewW = app.screen.width - AXIS_SIZE;
      const viewH = app.screen.height - AXIS_SIZE;
      const grid = systemGridRef.current;
      const isSystem = state.mode === 'system' && grid;
      const mapW = isSystem
        ? grid.system.maxX * SYSTEM_CELL_SIZE
        : layer.width * CELL_SIZE;
      const mapH = isSystem
        ? grid.system.maxY * SYSTEM_CELL_SIZE
        : layer.height * CELL_SIZE;
      const minScale = minimumZoomScale(app, layer, state.mode);
      state.scale = clamp(
        Math.min(viewW / mapW, viewH / mapH),
        minScale,
        MAX_SCALE,
      );
      state.viewX = 0;
      state.viewY = 0;
      updateView();
    },
    [layer, updateView],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const state = stateRef.current;
        const app = appRef.current;
        if (!app) return;
        const viewW = app.screen.width - AXIS_SIZE;
        const viewH = app.screen.height - AXIS_SIZE;
        const centerX = state.viewX + viewW / (2 * state.scale);
        const centerY = state.viewY + viewH / (2 * state.scale);
        state.scale = clamp(
          state.scale * 1.3,
          minimumZoomScale(app, layer, state.mode),
          MAX_SCALE,
        );
        state.viewX = centerX - viewW / (2 * state.scale);
        state.viewY = centerY - viewH / (2 * state.scale);
        updateView();
      },
      zoomOut: () => {
        const state = stateRef.current;
        const app = appRef.current;
        if (!app) return;
        const viewW = app.screen.width - AXIS_SIZE;
        const viewH = app.screen.height - AXIS_SIZE;
        const centerX = state.viewX + viewW / (2 * state.scale);
        const centerY = state.viewY + viewH / (2 * state.scale);
        state.scale = clamp(
          state.scale / 1.3,
          minimumZoomScale(app, layer, state.mode),
          MAX_SCALE,
        );
        state.viewX = centerX - viewW / (2 * state.scale);
        state.viewY = centerY - viewH / (2 * state.scale);
        updateView();
      },
      fitView: () => {
        const app = appRef.current;
        if (app) fitViewFn(app);
      },
      enterSystem: () => {
        if (selectedSystem && stateRef.current.mode === 'galaxy') {
          void enterFocusedSystem(selectedSystem);
        }
      },
    }),
    [updateView, fitViewFn, selectedSystem, enterFocusedSystem],
  );

  const setupInteraction = useCallback(
    (app: Application, signal: AbortSignal) => {
      const canvas = app.canvas as HTMLCanvasElement;
      const state = stateRef.current;

      canvas.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          if (!appRef.current || state.mode === 'transitioning') return;
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left - AXIS_SIZE;
          const mouseY = e.clientY - rect.top - AXIS_SIZE;
          const worldX = state.viewX + mouseX / state.scale;
          const worldY = state.viewY + mouseY / state.scale;
          const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
          state.scale = clamp(
            state.scale * factor,
            minimumZoomScale(app, layer, state.mode),
            MAX_SCALE,
          );
          state.viewX = worldX - mouseX / state.scale;
          if (state.mode === 'system' && e.deltaY > 0 && state.scale <= 0.55) {
            onExitSystem();
            return;
          }
          if (state.mode === 'galaxy' && e.deltaY < 0 && state.scale >= 2.4) {
            const focusedField = getFieldAt(worldX, worldY);
            if (focusedField?.starSystem && !focusedField.starSystem.isMapOnly) {
              void enterFocusedSystem(focusedField.starSystem);
              return;
            }
          }
          updateView();
        },
        { passive: false, signal },
      );

      canvas.addEventListener(
        'pointerdown',
        (e) => {
          if (e.button !== 0 || state.mode === 'transitioning') return;
          state.dragging = true;
          state.dragMoved = false;
          state.dragStartX = e.clientX;
          state.dragStartY = e.clientY;
          state.dragViewX = state.viewX;
          state.dragViewY = state.viewY;
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = 'grabbing';
          updateTooltip();
        },
        { signal },
      );

      canvas.addEventListener(
        'pointermove',
        (e) => {
          const rect = canvas.getBoundingClientRect();
          state.mouseX = e.clientX - rect.left;
          state.mouseY = e.clientY - rect.top;

          if (state.dragging) {
            const dx = e.clientX - state.dragStartX;
            const dy = e.clientY - state.dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.dragMoved = true;
            state.viewX = state.dragViewX - dx / state.scale;
            state.viewY = state.dragViewY - dy / state.scale;
            updateView();
            return;
          }

          if (state.mode === 'galaxy') {
            const worldX =
              state.viewX + (state.mouseX - AXIS_SIZE) / state.scale;
            const worldY =
              state.viewY + (state.mouseY - AXIS_SIZE) / state.scale;
            const prev = state.hoveredField;
            state.hoveredField = getFieldAt(worldX, worldY);
            if (state.hoveredField !== prev)
              onFieldHoverRef.current?.(state.hoveredField);
            updateTooltip();
          }
        },
        { signal },
      );

      canvas.addEventListener(
        'pointerup',
        (e) => {
          if (!state.dragging) return;
          state.dragging = false;
          canvas.releasePointerCapture(e.pointerId);
          canvas.style.cursor = 'grab';

          if (!state.dragMoved) {
            handleClick(e, app);
          }
        },
        { signal },
      );

      canvas.addEventListener(
        'pointerleave',
        () => {
          state.hoveredField = null;
          onFieldHoverRef.current?.(null);
          updateTooltip();
        },
        { signal },
      );

      canvas.style.cursor = 'grab';

      canvas.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length === 2) {
            e.preventDefault();
            state.pinching = true;
            state.pinchDist = Math.hypot(
              e.touches[1].clientX - e.touches[0].clientX,
              e.touches[1].clientY - e.touches[0].clientY,
            );
            state.pinchScale = state.scale;
          }
        },
        { passive: false, signal },
      );

      canvas.addEventListener(
        'touchmove',
        (e) => {
          if (e.touches.length === 2 && state.pinching) {
            const dist = Math.hypot(
              e.touches[1].clientX - e.touches[0].clientX,
              e.touches[1].clientY - e.touches[0].clientY,
            );
            state.scale = clamp(
              state.pinchScale * (dist / state.pinchDist),
              minimumZoomScale(app, layer, state.mode),
              MAX_SCALE,
            );
            updateView();
          }
        },
        { passive: false, signal },
      );

      canvas.addEventListener(
        'touchend',
        () => {
          state.pinching = false;
        },
        { signal },
      );
    },
    [updateView, updateTooltip, getFieldAt, enterFocusedSystem, onExitSystem],
  );

  const handleClick = useCallback(
    (e: PointerEvent, app: Application) => {
      const state = stateRef.current;
      if (state.mode === 'transitioning') return;

      const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left - AXIS_SIZE;
      const mouseY = e.clientY - rect.top - AXIS_SIZE;
      const worldX = state.viewX + mouseX / state.scale;
      const worldY = state.viewY + mouseY / state.scale;
      if (state.mode !== 'galaxy') return;

      const field = getFieldAt(worldX, worldY);
      onFieldClickRef.current?.(field);
      if (!field?.starSystem || field.starSystem.isMapOnly) return;
      if (field.starSystem.id === selectedSystem?.id && state.scale >= 3) {
        void enterFocusedSystem(selectedSystem);
        return;
      }
      onSelectSystemRef.current?.(field.starSystem);
    },
    [getFieldAt, selectedSystem, enterFocusedSystem],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-160px)] min-h-[400px] rounded-lg border border-swu-border overflow-hidden bg-black"
    >
      <canvas
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-10"
      />
      <div
        ref={tooltipRef}
        className="absolute z-20 pointer-events-none hidden rounded bg-black/90 border border-swu-border px-2 py-1 text-[11px] text-swu-primary whitespace-nowrap"
      />
    </div>
  );
});
