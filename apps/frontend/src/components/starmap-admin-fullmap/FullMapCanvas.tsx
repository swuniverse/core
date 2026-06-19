import { useEffect, useRef, useCallback } from 'react';
import { Application, Container, Sprite, Graphics, Assets, Text, TextStyle } from 'pixi.js';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';
import { spaceBackgroundTile, systemTypeImage, starTileImage } from '../../lib/assets';

const CELL = 30;
const MIN_SCALE = 0.05;
const MAX_SCALE = 6;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function FullMapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const galaxyRef = useRef<Container | null>(null);
  const gridGfxRef = useRef<Graphics | null>(null);
  const selectionGfxRef = useRef<Graphics | null>(null);
  const overlayContainerRef = useRef<Container | null>(null);
  const fieldMapRef = useRef<Map<string, StarmapGalaxyFieldDto>>(new Map());

  const rectGfxRef = useRef<Graphics | null>(null);
  const stateRef = useRef({
    viewX: 0,
    viewY: 0,
    scale: 1,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragViewX: 0,
    dragViewY: 0,
    dragMoved: false,
    mouseX: 0,
    mouseY: 0,
    hoveredField: null as StarmapGalaxyFieldDto | null,
    cmdDragging: false,
    rectDragging: false,
    rectStartWorldX: 0,
    rectStartWorldY: 0,
  });

  const fields = useFullmapEditorStore((s) => s.fields);
  const layers = useFullmapEditorStore((s) => s.layers);
  const selectedLayerId = useFullmapEditorStore((s) => s.selectedLayerId);
  const overlays = useFullmapEditorStore((s) => s.overlays);
  const tool = useFullmapEditorStore((s) => s.tool);
  const rectSelect = useFullmapEditorStore((s) => s.rectSelect);
  const selectField = useFullmapEditorStore((s) => s.selectField);
  const applyToField = useFullmapEditorStore((s) => s.applyToField);
  const toggleFieldSelection = useFullmapEditorStore((s) => s.toggleFieldSelection);
  const addFieldToSelection = useFullmapEditorStore((s) => s.addFieldToSelection);
  const clearSelection = useFullmapEditorStore((s) => s.clearSelection);
  const selectedFieldIds = useFullmapEditorStore((s) => s.selectedFieldIds);
  const selectedField = useFullmapEditorStore((s) => s.selectedField);

  const layer = layers.find((l) => l.id === selectedLayerId);

  // Keep refs in sync
  const toolRef = useRef(tool);
  const rectSelectRef = useRef(rectSelect);
  const selectFieldRef = useRef(selectField);
  const applyToFieldRef = useRef(applyToField);
  const toggleFieldSelectionRef = useRef(toggleFieldSelection);
  const addFieldToSelectionRef = useRef(addFieldToSelection);
  const clearSelectionRef = useRef(clearSelection);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { rectSelectRef.current = rectSelect; }, [rectSelect]);
  useEffect(() => { selectFieldRef.current = selectField; }, [selectField]);
  useEffect(() => { applyToFieldRef.current = applyToField; }, [applyToField]);
  useEffect(() => { toggleFieldSelectionRef.current = toggleFieldSelection; }, [toggleFieldSelection]);
  useEffect(() => { addFieldToSelectionRef.current = addFieldToSelection; }, [addFieldToSelection]);
  useEffect(() => { clearSelectionRef.current = clearSelection; }, [clearSelection]);

  useEffect(() => {
    fieldMapRef.current = new Map(fields.map((f) => [`${f.cx},${f.cy}`, f]));
  }, [fields]);

  const getFieldAt = useCallback((worldX: number, worldY: number) => {
    const gx = Math.floor(worldX / CELL) + 1;
    const gy = Math.floor(worldY / CELL) + 1;
    return fieldMapRef.current.get(`${gx},${gy}`) ?? null;
  }, []);

  const updateView = useCallback(() => {
    const app = appRef.current;
    const container = galaxyRef.current;
    if (!app || !container) return;
    const state = stateRef.current;
    container.position.set(-state.viewX * state.scale, -state.viewY * state.scale);
    container.scale.set(state.scale);
    if (gridGfxRef.current) {
      gridGfxRef.current.visible = overlays.grid && state.scale * CELL >= 5;
    }
  }, [overlays.grid]);

  const updateTooltip = useCallback(() => {
    const tooltip = tooltipRef.current;
    const state = stateRef.current;
    if (!tooltip) return;
    if (state.dragging || !state.hoveredField) {
      tooltip.style.display = 'none';
      return;
    }
    const f = state.hoveredField;
    let text = `${f.cx}|${f.cy}`;
    if (f.fieldType.name) text += ` · ${f.fieldType.name}`;
    if (f.starSystem) text += ` · ${f.starSystem.name}`;
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    tooltip.style.left = `${state.mouseX + 12}px`;
    tooltip.style.top = `${state.mouseY + 12}px`;
  }, []);

  // Draw selection highlights
  const drawSelections = useCallback(() => {
    const g = selectionGfxRef.current;
    if (!g) return;
    g.clear();
    // Active single selection (white border like STU)
    if (selectedField) {
      const x = (selectedField.cx - 1) * CELL;
      const y = (selectedField.cy - 1) * CELL;
      g.rect(x + 1, y + 1, CELL - 2, CELL - 2).stroke({ color: 0xffffff, width: 2, alpha: 1 });
    }
    // Multi-selection (yellow)
    for (const id of selectedFieldIds) {
      const field = fields.find((f) => f.id === id);
      if (!field) continue;
      const x = (field.cx - 1) * CELL;
      const y = (field.cy - 1) * CELL;
      g.rect(x, y, CELL, CELL).stroke({ color: 0xffe06b, width: 2, alpha: 0.9 });
    }
  }, [selectedField, selectedFieldIds, fields]);

  useEffect(() => { drawSelections(); }, [drawSelections]);

  // Draw impassable overlay
  const drawImpassableOverlay = useCallback(() => {
    const container = overlayContainerRef.current;
    if (!container) return;
    container.removeChildren();
    if (!overlays.impassable) return;

    const style = new TextStyle({ fontSize: 10, fill: 0xffffff, fontWeight: 'bold' });
    for (const field of fields) {
      const isImpassable = field.passableOverride === false || (!field.passableOverride && !field.fieldType.passable);
      if (!isImpassable) continue;
      const x = (field.cx - 1) * CELL;
      const y = (field.cy - 1) * CELL;
      const g = new Graphics();
      g.rect(x, y, CELL, CELL).fill({ color: 0xff2266, alpha: 0.3 });
      container.addChild(g);
      const t = new Text({ text: '!', style });
      t.position.set(x + CELL / 2 - 3, y + CELL / 2 - 6);
      container.addChild(t);
    }
  }, [fields, overlays.impassable]);

  useEffect(() => { drawImpassableOverlay(); }, [drawImpassableOverlay]);

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  // Init Pixi (only on layer change)
  useEffect(() => {
    if (!containerRef.current || !layer) return;
    const ac = new AbortController();
    const app = new Application();

    const initPromise = app.init({
      resizeTo: containerRef.current,
      background: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (ac.signal.aborted || !containerRef.current) return;
      containerRef.current.insertBefore(app.canvas as HTMLCanvasElement, containerRef.current.firstChild);
      appRef.current = app;

      const galaxyContainer = new Container();
      galaxyRef.current = galaxyContainer;
      app.stage.addChild(galaxyContainer);

      const overlayContainer = new Container();
      overlayContainerRef.current = overlayContainer;
      galaxyContainer.addChild(overlayContainer);

      const selection = new Graphics();
      selectionGfxRef.current = selection;
      galaxyContainer.addChild(selection);

      const rectGfx = new Graphics();
      rectGfxRef.current = rectGfx;
      galaxyContainer.addChild(rectGfx);

      loadTiles(galaxyContainer);
      fitView(app);
      setupInteraction(app, ac.signal);
    });

    return () => {
      ac.abort();
      appRef.current = null;
      galaxyRef.current = null;
      gridGfxRef.current = null;
      selectionGfxRef.current = null;
      initPromise.then(() => app.destroy(true, { children: true }));
    };
  }, [layer?.id]);

  // Reload tiles without resetting view when fields change (but not on initial mount)
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    const container = galaxyRef.current;
    if (!container || !appRef.current) return;
    container.removeChildren();
    const overlayContainer = new Container();
    overlayContainerRef.current = overlayContainer;
    container.addChild(overlayContainer);
    const selection = new Graphics();
    selectionGfxRef.current = selection;
    const rectGfx = new Graphics();
    rectGfxRef.current = rectGfx;
    container.addChild(rectGfx);
    loadTiles(container);
    drawSelections();
    drawImpassableOverlay();
  }, [fields]);

  const loadTiles = useCallback(async (container: Container) => {
    if (!layer) return;
    const bg = new Graphics();
    bg.rect(0, 0, layer.width * CELL, layer.height * CELL).fill({ color: 0x000000 });
    container.addChildAt(bg, 0);

    const tileLayer = new Container();
    const iconLayer = new Container();
    container.addChild(tileLayer);
    container.addChild(iconLayer);

    const loadPromises = fields
      .filter((f) => f.fieldType.key !== 'UNKNOWN')
      .map(async (field) => {
        const cx = (field.cx - 1) * CELL;
        const cy = (field.cy - 1) * CELL;

        // Use field type tile image; fall back to procedural background for basic space (id=1)
        const tileUrl = field.fieldTypeId > 1 && !field.systemTypeId
          ? starTileImage(field.fieldTypeId)
          : spaceBackgroundTile(field.cx, field.cy);
        try {
          const texture = await Assets.load(tileUrl);
          const sprite = new Sprite(texture);
          sprite.position.set(cx, cy);
          sprite.width = CELL;
          sprite.height = CELL;
          tileLayer.addChild(sprite);
        } catch {
          // Fallback: try procedural background, then black rect
          try {
            const bgUrl = spaceBackgroundTile(field.cx, field.cy);
            const texture = await Assets.load(bgUrl);
            const sprite = new Sprite(texture);
            sprite.position.set(cx, cy);
            sprite.width = CELL;
            sprite.height = CELL;
            tileLayer.addChild(sprite);
          } catch {
            const g = new Graphics();
            g.rect(cx, cy, CELL, CELL).fill({ color: 0x0a0a1a });
            tileLayer.addChild(g);
          }
        }

        if (field.systemTypeId) {
          try {
            const iconUrl = systemTypeImage(field.systemTypeId);
            const texture = await Assets.load(iconUrl);
            const sprite = new Sprite(texture);
            const s = CELL * 0.8;
            sprite.width = s;
            sprite.height = s;
            sprite.position.set(cx + (CELL - s) / 2, cy + (CELL - s) / 2);
            iconLayer.addChild(sprite);
          } catch { /* skip */ }
        }
      });

    await Promise.all(loadPromises);

    // Grid
    const grid = new Graphics();
    gridGfxRef.current = grid;
    for (let x = 0; x <= layer.width; x++) {
      grid.moveTo(x * CELL, 0).lineTo(x * CELL, layer.height * CELL);
    }
    for (let y = 0; y <= layer.height; y++) {
      grid.moveTo(0, y * CELL).lineTo(layer.width * CELL, y * CELL);
    }
    grid.stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });
    container.addChild(grid);

    // Selection + rect overlay on top
    if (selectionGfxRef.current) {
      container.addChild(selectionGfxRef.current);
    }
    if (rectGfxRef.current) {
      container.addChild(rectGfxRef.current);
    }
  }, [fields, layer]);

  const fitView = useCallback((app: Application) => {
    if (!layer) return;
    const state = stateRef.current;
    const viewW = app.screen.width;
    const viewH = app.screen.height;
    const mapW = layer.width * CELL;
    const mapH = layer.height * CELL;
    state.scale = clamp(Math.min(viewW / mapW, viewH / mapH), MIN_SCALE, MAX_SCALE);
    state.viewX = -(viewW / state.scale - mapW) / 2;
    state.viewY = -(viewH / state.scale - mapH) / 2;
    updateView();
  }, [layer, updateView]);

  const setupInteraction = useCallback((app: Application, signal: AbortSignal) => {
    const canvas = app.canvas as HTMLCanvasElement;
    const state = stateRef.current;

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = state.viewX + mx / state.scale;
      const worldY = state.viewY + my / state.scale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      state.scale = clamp(state.scale * factor, MIN_SCALE, MAX_SCALE);
      state.viewX = worldX - mx / state.scale;
      state.viewY = worldY - my / state.scale;
      updateView();
    }, { passive: false, signal });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = state.viewX + mx / state.scale;
      const worldY = state.viewY + my / state.scale;

      if (e.metaKey || e.ctrlKey) {
        // Cmd+click/drag → multi-select mode (add only, no toggle)
        state.cmdDragging = true;
        state.dragging = true;
        state.dragMoved = false;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'crosshair';
        const field = getFieldAt(worldX, worldY);
        if (field) addFieldToSelectionRef.current(field.id);
      } else if (useFullmapEditorStore.getState().rectSelect) {
        // Rect select mode
        state.rectDragging = true;
        state.dragging = true;
        state.dragMoved = false;
        state.rectStartWorldX = worldX;
        state.rectStartWorldY = worldY;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'crosshair';
      } else {
        // Normal pan
        state.dragging = true;
        state.dragMoved = false;
        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        state.dragViewX = state.viewX;
        state.dragViewY = state.viewY;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = 'grabbing';
      }
      updateTooltip();
    }, { signal });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      state.mouseX = e.clientX - rect.left;
      state.mouseY = e.clientY - rect.top;
      const worldX = state.viewX + state.mouseX / state.scale;
      const worldY = state.viewY + state.mouseY / state.scale;

      if (state.cmdDragging) {
        state.dragMoved = true;
        const field = getFieldAt(worldX, worldY);
        if (field) addFieldToSelectionRef.current(field.id);
        return;
      }

      if (state.rectDragging) {
        state.dragMoved = true;
        // Draw selection rectangle
        const g = rectGfxRef.current;
        if (g) {
          g.clear();
          const x1 = Math.min(state.rectStartWorldX, worldX);
          const y1 = Math.min(state.rectStartWorldY, worldY);
          const w = Math.abs(worldX - state.rectStartWorldX);
          const h = Math.abs(worldY - state.rectStartWorldY);
          g.rect(x1, y1, w, h).fill({ color: 0xffcc00, alpha: 0.12 });
          g.rect(x1, y1, w, h).stroke({ color: 0xffcc00, width: 2 / state.scale, alpha: 0.9 });
        }
        return;
      }

      if (state.dragging) {
        const dx = e.clientX - state.dragStartX;
        const dy = e.clientY - state.dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.dragMoved = true;
        state.viewX = state.dragViewX - dx / state.scale;
        state.viewY = state.dragViewY - dy / state.scale;
        updateView();
        return;
      }

      state.hoveredField = getFieldAt(worldX, worldY);
      updateTooltip();
    }, { signal });

    canvas.addEventListener('pointerup', (e) => {
      if (!state.dragging) return;
      const wasCmd = state.cmdDragging;
      const wasRect = state.rectDragging;
      state.dragging = false;
      state.cmdDragging = false;
      state.rectDragging = false;
      canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = toolRef.current === 'select' ? 'grab' : 'crosshair';

      if (wasRect && state.dragMoved) {
        // Select all fields in rectangle
        const rect2 = canvas.getBoundingClientRect();
        const mx = e.clientX - rect2.left;
        const my = e.clientY - rect2.top;
        const endWorldX = state.viewX + mx / state.scale;
        const endWorldY = state.viewY + my / state.scale;
        const x1 = Math.min(state.rectStartWorldX, endWorldX);
        const y1 = Math.min(state.rectStartWorldY, endWorldY);
        const x2 = Math.max(state.rectStartWorldX, endWorldX);
        const y2 = Math.max(state.rectStartWorldY, endWorldY);
        const minCx = Math.floor(x1 / CELL) + 1;
        const minCy = Math.floor(y1 / CELL) + 1;
        const maxCx = Math.floor(x2 / CELL) + 1;
        const maxCy = Math.floor(y2 / CELL) + 1;
        for (let cy = minCy; cy <= maxCy; cy++) {
          for (let cx = minCx; cx <= maxCx; cx++) {
            const f = fieldMapRef.current.get(`${cx},${cy}`);
            if (f) addFieldToSelectionRef.current(f.id);
          }
        }
        // Clear rect graphic
        rectGfxRef.current?.clear();
        return;
      }

      if (wasCmd) return;

      if (!state.dragMoved) {
        const rect2 = canvas.getBoundingClientRect();
        const mx = e.clientX - rect2.left;
        const my = e.clientY - rect2.top;
        const worldX = state.viewX + mx / state.scale;
        const worldY = state.viewY + my / state.scale;
        const field = getFieldAt(worldX, worldY);
        if (field) handleFieldClick(field, false);
      }
    }, { signal });

    canvas.addEventListener('pointerleave', () => {
      state.hoveredField = null;
      updateTooltip();
    }, { signal });

    canvas.style.cursor = 'grab';
  }, [updateView, updateTooltip, getFieldAt]);

  const handleFieldClick = useCallback((field: StarmapGalaxyFieldDto, multi: boolean) => {
    const currentTool = toolRef.current;
    if (currentTool === 'select') {
      if (multi) {
        toggleFieldSelectionRef.current(field.id);
      } else {
        clearSelectionRef.current();
        selectFieldRef.current(field);
      }
    } else {
      void applyToFieldRef.current(field.id);
    }
  }, []);

  // Update cursor based on tool
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const canvas = app.canvas as HTMLCanvasElement;
    canvas.style.cursor = tool === 'select' ? 'grab' : 'crosshair';
  }, [tool]);

  // Update grid visibility when overlay changes
  useEffect(() => {
    if (gridGfxRef.current) {
      gridGfxRef.current.visible = overlays.grid && stateRef.current.scale * CELL >= 5;
    }
  }, [overlays.grid]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[420px] overflow-hidden border border-swu-border bg-black max-md:h-[70vh]"
    >
      <div
        ref={tooltipRef}
        className="absolute z-20 pointer-events-none hidden rounded bg-black/95 border border-swu-border px-2 py-1 text-[11px] text-swu-primary whitespace-nowrap"
      />
    </div>
  );
}
