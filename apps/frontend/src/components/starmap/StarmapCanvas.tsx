import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
  useState,
} from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type {
  HyperspaceRouteDto,
  StarmapGalaxyFieldDto,
  StarmapLayerDto,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
  StarmapWormholeDto,
} from '@swuniverse/shared';
import {
  galaxyMapBackground,
  planetThumbnail,
  spaceBackgroundTile,
  starTileImage,
  starWarsMarkerImage,
  systemTypeImage,
} from '../../lib/assets';
import {
  buildStarTileLayers,
  canLoadInlineSystem,
  getInlineSystemPlacement,
  getStarTileIdAt,
  STARMAP_CELL_SIZE,
} from '../../lib/starmap-render';

const CELL_SIZE = STARMAP_CELL_SIZE;
const MIN_SCALE = 0.08;
const INLINE_SYSTEM_SCALE = 3;
const MAX_SCALE = 30;
const AXIS_SIZE = 34;

export interface StarmapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  openSystem: () => void;
}

export interface ColonizationTargetHint {
  celestialObjectId: number;
  canColonize: boolean;
  reasons: string[];
}

interface StarmapCanvasProps {
  layer: Pick<StarmapLayerDto, 'id' | 'name' | 'width' | 'height' | 'sectorSize'>;
  fields: StarmapGalaxyFieldDto[];
  routes: HyperspaceRouteDto[];
  selectedSystem: StarmapSystemListItemDto | null;
  openedSystemIds: number[];
  systemGrids: Map<number, StarmapSystemGridDto>;
  wormholes: StarmapWormholeDto[];
  onSelectSystem: (system: StarmapSystemListItemDto) => void;
  onOpenSystem: (system: StarmapSystemListItemDto) => Promise<StarmapSystemGridDto | null>;
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

const isStarClass = (classId: number) => classId >= 9001 && classId <= 9005;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const StarmapCanvas = forwardRef<StarmapCanvasHandle, StarmapCanvasProps>(
  function StarmapCanvas(
    {
      layer,
      fields,
      routes,
      selectedSystem,
      systemGrids,
      openedSystemIds,
      wormholes,
      onSelectSystem,
      onOpenSystem,
      onFieldHover,
      onFieldClick,
      selectedField,
      selectedSector,
      showGrid = true,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);
    const galaxyRef = useRef<Container | null>(null);
    const routeRef = useRef<Graphics | null>(null);
    const gridRef = useRef<Graphics | null>(null);
    const sectorRef = useRef<Graphics | null>(null);
    const selectionRef = useRef<Graphics | null>(null);
    const inlineSystemsRef = useRef<Container | null>(null);
    const [ready, setReady] = useState(false);
    const stateRef = useRef({
      viewX: 0,
      viewY: 0,
      scale: 1,
      dragging: false,
      dragMoved: false,
      dragStartX: 0,
      dragStartY: 0,
      dragViewX: 0,
      dragViewY: 0,
      mouseX: 0,
      mouseY: 0,
      hoveredField: null as StarmapGalaxyFieldDto | null,
    });
    const fieldsRef = useRef(fields);
    const selectedSystemRef = useRef(selectedSystem);
    const systemGridsRef = useRef(systemGrids);
    const openedSystemIdsRef = useRef(openedSystemIds);
    const onOpenSystemRef = useRef(onOpenSystem);
    const onSelectSystemRef = useRef(onSelectSystem);
    const onFieldHoverRef = useRef(onFieldHover);
    const onFieldClickRef = useRef(onFieldClick);
    const selectedFieldRef = useRef(selectedField);
    const selectedSectorRef = useRef(selectedSector);
    const showGridRef = useRef(showGrid);

    useEffect(() => { fieldsRef.current = fields; }, [fields]);
    useEffect(() => { selectedSystemRef.current = selectedSystem; }, [selectedSystem]);
    useEffect(() => { systemGridsRef.current = systemGrids; }, [systemGrids]);
    useEffect(() => { openedSystemIdsRef.current = openedSystemIds; }, [openedSystemIds]);
    useEffect(() => { onOpenSystemRef.current = onOpenSystem; }, [onOpenSystem]);
    useEffect(() => { onSelectSystemRef.current = onSelectSystem; }, [onSelectSystem]);
    useEffect(() => { onFieldHoverRef.current = onFieldHover; }, [onFieldHover]);
    useEffect(() => { onFieldClickRef.current = onFieldClick; }, [onFieldClick]);
    useEffect(() => { selectedFieldRef.current = selectedField; }, [selectedField]);
    useEffect(() => { selectedSectorRef.current = selectedSector; }, [selectedSector]);
    useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);

    const getFieldAt = useCallback((worldX: number, worldY: number) => {
      const cx = Math.floor(worldX / CELL_SIZE) + 1;
      const cy = Math.floor(worldY / CELL_SIZE) + 1;
      return fieldsRef.current.find((field) => field.cx === cx && field.cy === cy) ?? null;
    }, []);

    const drawOverlay = useCallback(() => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      const state = stateRef.current;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(8, 8, 24, 0.95)';
      context.fillRect(0, 0, width, AXIS_SIZE);
      context.fillRect(0, AXIS_SIZE, AXIS_SIZE, height - AXIS_SIZE);
      const field = selectedFieldRef.current;
      if (field) {
        context.strokeStyle = '#ffffff';
        context.lineWidth = 2;
        context.strokeRect(
          AXIS_SIZE + ((field.cx - 1) * CELL_SIZE - state.viewX) * state.scale,
          AXIS_SIZE + ((field.cy - 1) * CELL_SIZE - state.viewY) * state.scale,
          CELL_SIZE * state.scale,
          CELL_SIZE * state.scale,
        );
      }
      const sector = selectedSectorRef.current;
      if (sector) {
        const size = layer.sectorSize * CELL_SIZE * state.scale;
        context.strokeStyle = '#6b8ba4';
        context.setLineDash([8, 4]);
        context.strokeRect(
          AXIS_SIZE + (sector.x * layer.sectorSize * CELL_SIZE - state.viewX) * state.scale,
          AXIS_SIZE + (sector.y * layer.sectorSize * CELL_SIZE - state.viewY) * state.scale,
          size,
          size,
        );
        context.setLineDash([]);
      }
    }, [layer]);

    const updateView = useCallback(() => {
      const app = appRef.current;
      const container = galaxyRef.current;
      if (!app || !container || container.destroyed) return;
      const state = stateRef.current;
      const viewWidth = (app.screen.width - AXIS_SIZE) / state.scale;
      const viewHeight = (app.screen.height - AXIS_SIZE) / state.scale;
      const mapWidth = layer.width * CELL_SIZE;
      const mapHeight = layer.height * CELL_SIZE;
      state.viewX = mapWidth <= viewWidth ? -(viewWidth - mapWidth) / 2 : clamp(state.viewX, 0, mapWidth - viewWidth);
      state.viewY = mapHeight <= viewHeight ? -(viewHeight - mapHeight) / 2 : clamp(state.viewY, 0, mapHeight - viewHeight);
      container.position.set(AXIS_SIZE - state.viewX * state.scale, AXIS_SIZE - state.viewY * state.scale);
      container.scale.set(state.scale);
      if (gridRef.current) gridRef.current.visible = showGridRef.current && state.scale * CELL_SIZE >= 14;
      if (inlineSystemsRef.current) {
        inlineSystemsRef.current.visible = state.scale >= INLINE_SYSTEM_SCALE;
      }
      if (sectorRef.current) sectorRef.current.visible = showGridRef.current && state.scale * CELL_SIZE >= 7;
      drawOverlay();
    }, [drawOverlay, layer]);

    const fitView = useCallback(() => {
      const app = appRef.current;
      if (!app) return;
      const state = stateRef.current;
      state.scale = clamp(
        Math.min((app.screen.width - AXIS_SIZE) / (layer.width * CELL_SIZE), (app.screen.height - AXIS_SIZE) / (layer.height * CELL_SIZE)),
        MIN_SCALE,
        MAX_SCALE,
      );
      state.viewX = 0;
      state.viewY = 0;
      updateView();
    }, [layer, updateView]);

    const drawRoutes = useCallback(() => {
      const graphics = routeRef.current;
      if (!graphics) return;
      graphics.clear();
      for (const route of routes) {
        const color = parseInt(route.color.replace('#', ''), 16) || 0xfacc15;
        for (const segment of route.segments) {
          const points = [{ x: segment.fromSystem.cx, y: segment.fromSystem.cy }, ...(segment.controlPoints ?? []), { x: segment.toSystem.cx, y: segment.toSystem.cy }];
          graphics.moveTo((points[0].x - 0.5) * CELL_SIZE, (points[0].y - 0.5) * CELL_SIZE);
          for (const point of points.slice(1)) graphics.lineTo((point.x - 0.5) * CELL_SIZE, (point.y - 0.5) * CELL_SIZE);
          graphics.stroke({ color, width: 1.2, alpha: 0.5 });
        }
      }
    }, [routes]);

    const drawSelection = useCallback(() => {
      const graphics = selectionRef.current;
      if (!graphics) return;
      graphics.clear();
      const system = selectedSystemRef.current;
      if (!system) return;
      const lineWidth = Math.max(1, 2 / stateRef.current.scale);
      graphics.rect((system.cx - 1) * CELL_SIZE + lineWidth / 2, (system.cy - 1) * CELL_SIZE + lineWidth / 2, CELL_SIZE - lineWidth, CELL_SIZE - lineWidth).stroke({ color: 0xf59e0b, width: lineWidth, alpha: 0.9 });
    }, []);

    const loadInlineSystem = useCallback(async (container: Container, grid: StarmapSystemGridDto, anchor: StarmapSystemListItemDto) => {
      const placement = getInlineSystemPlacement(grid, anchor);
      const { system, fields: systemFields, celestialObjects, colonyShields } = grid;
      const objects = new Map((celestialObjects ?? []).map((object) => [object.id, object]));
      const stars = buildStarTileLayers(grid);
      const label = `${anchor.name} · ${anchor.cx}|${anchor.cy}`;
      if (label.length * placement.fieldPixelSize * 0.75 <= placement.frame.width) {
        const nameplate = new Text({
          text: label,
          style: { fill: 0xfbbf24, fontSize: placement.fieldPixelSize * 0.75 },
        });
        nameplate.position.set(placement.frame.x + placement.fieldPixelSize, placement.frame.y + placement.fieldPixelSize * 0.25);
        container.addChild(nameplate);
      }
      const frame = new Graphics();
      frame.rect(placement.frame.x, placement.frame.y, placement.frame.width, placement.frame.height).fill({ color: 0x000000, alpha: 0.95 });
      frame.rect(placement.frame.x, placement.frame.y, placement.frame.width, placement.frame.height).stroke({ color: 0xf59e0b, width: 0.8, alpha: 0.9 });
      container.addChild(frame);
      const backgrounds = new Container();
      const icons = new Container();
      container.addChild(backgrounds, icons);
      const at = (x: number, y: number) => ({ x: placement.grid.x + (x - 1) * placement.fieldPixelSize, y: placement.grid.y + (y - 1) * placement.fieldPixelSize });
      await Promise.all(systemFields.map(async (field) => {
        const position = at(field.sx, field.sy);
        try {
          const sprite = new Sprite(await Assets.load(spaceBackgroundTile(field.sx, field.sy)));
          sprite.position.set(position.x, position.y);
          sprite.width = placement.fieldPixelSize;
          sprite.height = placement.fieldPixelSize;
          backgrounds.addChild(sprite);
        } catch {
          const fallback = new Graphics();
          fallback.rect(position.x, position.y, placement.fieldPixelSize, placement.fieldPixelSize).fill({ color: 0x0a0a1a });
          backgrounds.addChild(fallback);
        }
        const tileId = stars.map((star) => getStarTileIdAt(star.config, field.sx, field.sy, star.center.x, star.center.y)).find((id) => id !== null) ?? null;
        if (tileId !== null) {
          try {
            const sprite = new Sprite(await Assets.load(starTileImage(tileId)));
            sprite.position.set(position.x, position.y);
            sprite.width = placement.fieldPixelSize;
            sprite.height = placement.fieldPixelSize;
            icons.addChild(sprite);
            return;
          } catch { /* optional star asset */ }
        }
        const object = field.celestialObjectId ? objects.get(field.celestialObjectId) : undefined;
        if (object?.classId != null && !isStarClass(object.classId)) {
          try {
          const classId = object.classId;
            const image = new Image();
            image.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject();
              image.src = planetThumbnail(classId);
            });
            const sprite = new Sprite(Texture.from(image));
            sprite.position.set(position.x + placement.fieldPixelSize * 0.075, position.y + placement.fieldPixelSize * 0.075);
            sprite.width = placement.fieldPixelSize * 0.85;
            sprite.height = placement.fieldPixelSize * 0.85;
            icons.addChild(sprite);
          } catch { /* optional celestial asset */ }
        }
      }));
      for (const shield of colonyShields ?? []) {
        if (!shield.shielded) continue;
        const position = at(shield.posX, shield.posY);
        const graphic = new Graphics();
        graphic.circle(position.x + placement.fieldPixelSize / 2, position.y + placement.fieldPixelSize / 2, placement.fieldPixelSize * 0.48).stroke({ color: 0x22d3ee, width: 0.5, alpha: 0.85 });
        icons.addChild(graphic);
      }
      const localGrid = new Graphics();
      for (let x = 0; x <= system.maxX; x++) localGrid.moveTo(placement.grid.x + x * placement.fieldPixelSize, placement.grid.y).lineTo(placement.grid.x + x * placement.fieldPixelSize, placement.grid.y + placement.grid.height);
      for (let y = 0; y <= system.maxY; y++) localGrid.moveTo(placement.grid.x, placement.grid.y + y * placement.fieldPixelSize).lineTo(placement.grid.x + placement.grid.width, placement.grid.y + y * placement.fieldPixelSize);
      localGrid.stroke({ color: 0xfbbf24, width: 0.2, alpha: 0.22 });
      container.addChild(localGrid);
    }, []);

    const renderInlineSystems = useCallback(() => {
      const container = inlineSystemsRef.current;
      if (!container) return;
      container.removeChildren();
      for (const id of openedSystemIdsRef.current) {
        const grid = systemGridsRef.current.get(id);
        const anchor = fieldsRef.current.find((field) => field.starSystem?.id === id)?.starSystem;
        if (grid && anchor) void loadInlineSystem(container, grid, anchor);
      }
    }, [loadInlineSystem]);

    const renderGalaxy = useCallback(async (container: Container) => {
      const base = new Graphics();
      base.rect(0, 0, layer.width * CELL_SIZE, layer.height * CELL_SIZE).fill({ color: 0x000000 });
      container.addChild(base);
      try {
        const background = new Sprite(await Assets.load(galaxyMapBackground()));
        background.width = layer.width * CELL_SIZE;
        background.height = layer.height * CELL_SIZE;
        background.alpha = 0.22;
        container.addChild(background);
      } catch { /* procedural fields remain */ }
      const terrain = new Container();
      const icons = new Container();
      container.addChild(terrain, icons);
      await Promise.all(fields.map(async (field) => {
        if (field.fieldType.key === 'UNKNOWN') return;
        const x = (field.cx - 1) * CELL_SIZE;
        const y = (field.cy - 1) * CELL_SIZE;
        try {
          const sprite = new Sprite(await Assets.load(field.fieldTypeId > 1 && !field.systemTypeId ? starTileImage(field.fieldTypeId) : spaceBackgroundTile(field.cx, field.cy)));
          sprite.position.set(x, y);
          sprite.width = CELL_SIZE;
          sprite.height = CELL_SIZE;
          terrain.addChild(sprite);
        } catch {
          const fallback = new Graphics();
          fallback.rect(x, y, CELL_SIZE, CELL_SIZE).fill({ color: FIELD_TYPE_COLORS[field.fieldType.key] ?? 0x0a0a1a });
          terrain.addChild(fallback);
        }
        if (!field.systemTypeId) return;
        try {
          const sprite = new Sprite(await Assets.load(field.starSystem?.isMapOnly ? starWarsMarkerImage(field.starSystem.landmarkKey, field.systemTypeId) : systemTypeImage(field.systemTypeId)));
          const size = field.starSystem?.isMapOnly ? CELL_SIZE * 0.6 : CELL_SIZE * 1.15;
          sprite.position.set(x + (CELL_SIZE - size) / 2, y + (CELL_SIZE - size) / 2);
          sprite.width = size;
          sprite.height = size;
          icons.addChild(sprite);
        } catch { /* optional system asset */ }
      }));
      for (const wormhole of wormholes) {
        for (const endpoint of [{ cx: wormhole.entryCx, cy: wormhole.entryCy }, { cx: wormhole.exitCx, cy: wormhole.exitCy }]) {
          const glow = new Graphics();
          glow.circle((endpoint.cx - 0.5) * CELL_SIZE, (endpoint.cy - 0.5) * CELL_SIZE, CELL_SIZE * 0.78).stroke({ color: 0x22d3ee, width: 1.2, alpha: 0.45 });
          icons.addChild(glow);
        }
      }
    }, [fields, layer, wormholes]);

    useEffect(() => {
      if (!containerRef.current) return;
      const abort = new AbortController();
      const app = new Application();
      const initPromise = app.init({
        resizeTo: containerRef.current,
        background: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      }).then(() => {
        if (abort.signal.aborted || !containerRef.current) return;
        containerRef.current.insertBefore(app.canvas as HTMLCanvasElement, containerRef.current.firstChild);
        appRef.current = app;
        const galaxy = new Container();
        galaxyRef.current = galaxy;
        setReady(true);
        app.stage.addChild(galaxy);
        void renderGalaxy(galaxy).then(() => {
          if (abort.signal.aborted) return;
          const routesLayer = new Graphics();
          routeRef.current = routesLayer;
          galaxy.addChild(routesLayer);
          const inlineLayer = new Container();
          inlineSystemsRef.current = inlineLayer;
          galaxy.addChild(inlineLayer);
          const sector = new Graphics();
          sectorRef.current = sector;
          galaxy.addChild(sector);
          const grid = new Graphics();
          gridRef.current = grid;
          galaxy.addChild(grid);
          const selection = new Graphics();
          selectionRef.current = selection;
          galaxy.addChild(selection);
          for (let x = 0; x <= layer.width; x++) grid.moveTo(x * CELL_SIZE, 0).lineTo(x * CELL_SIZE, layer.height * CELL_SIZE);
          for (let y = 0; y <= layer.height; y++) grid.moveTo(0, y * CELL_SIZE).lineTo(layer.width * CELL_SIZE, y * CELL_SIZE);
          grid.stroke({ color: 0x94a3b8, width: 0.5, alpha: 0.08 });
          for (let x = 1; x * layer.sectorSize < layer.width; x++) sector.moveTo(x * layer.sectorSize * CELL_SIZE, 0).lineTo(x * layer.sectorSize * CELL_SIZE, layer.height * CELL_SIZE);
          for (let y = 1; y * layer.sectorSize < layer.height; y++) sector.moveTo(0, y * layer.sectorSize * CELL_SIZE).lineTo(layer.width * CELL_SIZE, y * layer.sectorSize * CELL_SIZE);
          sector.stroke({ color: 0xf59e0b, width: 1, alpha: 0.12 });
          drawRoutes();
          drawSelection();
          renderInlineSystems();
          fitView();
        });
      });
      return () => {
        abort.abort();
        appRef.current = null;
        galaxyRef.current = null;
        setReady(false);
        void initPromise.then(() => app.destroy(true, { children: true }));
      };
    }, [drawRoutes, drawSelection, fitView, layer, renderGalaxy]);

    useEffect(() => { drawRoutes(); }, [drawRoutes]);
    useEffect(() => { drawSelection(); }, [drawSelection, selectedSystem]);
    useEffect(() => { renderInlineSystems(); }, [renderInlineSystems, openedSystemIds, systemGrids]);
    useEffect(() => { updateView(); }, [selectedField, selectedSector, showGrid, updateView]);

    useEffect(() => {
      if (!ready) return;
      const canvas = appRef.current?.canvas as HTMLCanvasElement | undefined;
      if (!canvas) return;
      const abort = new AbortController();
      const toWorld = (event: PointerEvent | WheelEvent) => {
        const rect = canvas.getBoundingClientRect();
        const state = stateRef.current;
        return {
          mouseX: event.clientX - rect.left - AXIS_SIZE,
          mouseY: event.clientY - rect.top - AXIS_SIZE,
          worldX: state.viewX + (event.clientX - rect.left - AXIS_SIZE) / state.scale,
          worldY: state.viewY + (event.clientY - rect.top - AXIS_SIZE) / state.scale,
        };
      };
      canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const state = stateRef.current;
        const point = toWorld(event);
        if (event.deltaY < 0 && state.scale >= 2.4) {
          const field = getFieldAt(point.worldX, point.worldY);
          if (field?.starSystem && canLoadInlineSystem(field.starSystem)) void onOpenSystemRef.current(field.starSystem);
        }
        state.scale = clamp(state.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_SCALE, MAX_SCALE);
        state.viewX = point.worldX - point.mouseX / state.scale;
        state.viewY = point.worldY - point.mouseY / state.scale;
        updateView();
      }, { passive: false, signal: abort.signal });
      canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const state = stateRef.current;
        state.dragging = true;
        state.dragMoved = false;
        state.dragStartX = event.clientX;
        state.dragStartY = event.clientY;
        state.dragViewX = state.viewX;
        state.dragViewY = state.viewY;
        canvas.setPointerCapture(event.pointerId);
      }, { signal: abort.signal });
      canvas.addEventListener('pointermove', (event) => {
        const state = stateRef.current;
        const rect = canvas.getBoundingClientRect();
        state.mouseX = event.clientX - rect.left;
        state.mouseY = event.clientY - rect.top;
        if (state.dragging) {
          const dx = event.clientX - state.dragStartX;
          const dy = event.clientY - state.dragStartY;
          state.dragMoved ||= Math.abs(dx) > 3 || Math.abs(dy) > 3;
          state.viewX = state.dragViewX - dx / state.scale;
          state.viewY = state.dragViewY - dy / state.scale;
          updateView();
          return;
        }
        const point = toWorld(event);
        const field = getFieldAt(point.worldX, point.worldY);
        if (field !== state.hoveredField) onFieldHoverRef.current?.(field);
        state.hoveredField = field;
        const tooltip = tooltipRef.current;
        if (tooltip && field) {
          tooltip.textContent = `${field.cx}, ${field.cy}${field.starSystem ? ` · ${field.starSystem.name}` : ''}`;
          tooltip.style.display = 'block';
          tooltip.style.left = `${state.mouseX + 12}px`;
          tooltip.style.top = `${state.mouseY + 12}px`;
        }
      }, { signal: abort.signal });
      canvas.addEventListener('pointerup', (event) => {
        const state = stateRef.current;
        state.dragging = false;
        canvas.releasePointerCapture(event.pointerId);
        if (!state.dragMoved) {
          const point = toWorld(event);
          const field = getFieldAt(point.worldX, point.worldY);
          onFieldClickRef.current?.(field);
          if (field?.starSystem && canLoadInlineSystem(field.starSystem)) {
            if (field.starSystem.id === selectedSystemRef.current?.id && state.scale >= 3) void onOpenSystemRef.current(field.starSystem);
            else onSelectSystemRef.current(field.starSystem);
          }
        }
      }, { signal: abort.signal });
      canvas.addEventListener('pointerleave', () => {
        stateRef.current.hoveredField = null;
        onFieldHoverRef.current?.(null);
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      }, { signal: abort.signal });
      return () => abort.abort();
    }, [getFieldAt, updateView, ready]);

    useEffect(() => {
      const resize = () => {
        const canvas = overlayRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        drawOverlay();
      };
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }, [drawOverlay]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => { stateRef.current.scale = clamp(stateRef.current.scale * 1.3, MIN_SCALE, MAX_SCALE); updateView(); },
      zoomOut: () => { stateRef.current.scale = clamp(stateRef.current.scale / 1.3, MIN_SCALE, MAX_SCALE); updateView(); },
      fitView,
      openSystem: () => {
        const system = selectedSystemRef.current;
        if (system && canLoadInlineSystem(system)) void onOpenSystemRef.current(system);
      },
    }), [fitView, updateView]);

    return (
      <div ref={containerRef} className="relative w-full h-[calc(100vh-160px)] min-h-[400px] rounded-lg border border-swu-border overflow-hidden bg-black">
        <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none z-10" />
        <div ref={tooltipRef} className="absolute z-20 pointer-events-none hidden rounded bg-black/90 border border-swu-border px-2 py-1 text-[11px] text-swu-primary whitespace-nowrap" />
      </div>
    );
  },
);