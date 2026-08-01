import { useEffect, useRef, useCallback } from 'react';
import { Application, Container, Sprite, Graphics, Assets } from 'pixi.js';
import type { StarmapSystemFieldDto } from '@swuniverse/shared';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';
import { spaceBackgroundTile, starTileImage } from '../../lib/assets';
import {
  buildStarTileLayers,
  getStarTileIdAt,
  calculateRenderedStarAreaSize,
} from '../../lib/starmap-render';

const CELL = 24;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function SystemViewDialog() {
  const systemGrid = useFullmapEditorStore((s) => s.systemGrid);
  const closeSystemView = useFullmapEditorStore((s) => s.closeSystemView);
  const selectedSystemField = useFullmapEditorStore((s) => s.selectedSystemField);
  const selectSystemField = useFullmapEditorStore((s) => s.selectSystemField);
  const updateSystemField = useFullmapEditorStore((s) => s.updateSystemField);
  const fieldTypes = useFullmapEditorStore((s) => s.fieldTypes);

  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeSystemView(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSystemView]);

  useEffect(() => {
    if (!canvasRef.current || !systemGrid) return;
    const ac = new AbortController();
    const app = new Application();

    const initPromise = app.init({
      resizeTo: canvasRef.current,
      background: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (ac.signal.aborted || !canvasRef.current) return;
      canvasRef.current.insertBefore(app.canvas as HTMLCanvasElement, canvasRef.current.firstChild);
      appRef.current = app;
      renderSystemGrid(app, ac.signal);
    });

    return () => {
      ac.abort();
      appRef.current = null;
      initPromise.then(() => app.destroy(true, { children: true }));
    };
  }, [systemGrid]);

  const renderSystemGrid = useCallback(async (app: Application, signal: AbortSignal) => {
    if (!systemGrid) return;
    const { system, fields } = systemGrid;
    const container = new Container();
    app.stage.addChild(container);

    const state = { viewX: 0, viewY: 0, scale: 1, dragging: false, dragStartX: 0, dragStartY: 0, dragViewX: 0, dragViewY: 0, dragMoved: false };

    const mapW = system.maxX * CELL;
    const mapH = system.maxY * CELL;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, mapW, mapH).fill({ color: 0x050510 });
    container.addChild(bg);

    const tileLayer = new Container();
    const starLayer = new Container();
    const selectionGfx = new Graphics();
    container.addChild(tileLayer);
    container.addChild(starLayer);
    container.addChild(selectionGfx);

    // Background tiles
    const fieldMap = new Map(fields.map((f) => [`${f.sx},${f.sy}`, f]));
    for (const field of fields) {
      const px = (field.sx - 1) * CELL;
      const py = (field.sy - 1) * CELL;
      try {
        const url = spaceBackgroundTile(field.sx, field.sy);
        const texture = await Assets.load(url);
        const sprite = new Sprite(texture);
        sprite.position.set(px, py);
        sprite.width = CELL;
        sprite.height = CELL;
        tileLayer.addChild(sprite);
      } catch { /* skip */ }

      // Field type overlay
      if (field.fieldType.key !== 'EMPTY_SPACE') {
        const colors: Record<string, number> = {
          STAR_CORE: 0xf59e0b,
          PLANET_ORBIT: 0x0ea5e9,
          MOON_ORBIT: 0x6366f1,
          ASTEROID_CLUSTER: 0x78716c,
          NEBULA: 0xd946ef,
        };
        const color = colors[field.fieldType.key] ?? 0x333333;
        const g = new Graphics();
        g.rect(px, py, CELL, CELL).fill({ color, alpha: 0.25 });
        tileLayer.addChild(g);
      }
    }

    // Star tiles
    const starTileLayers = buildStarTileLayers(systemGrid);
    for (const stl of starTileLayers) {
      const renderedSize = calculateRenderedStarAreaSize(stl.config.gridSize, Math.min(system.maxX, system.maxY));
      for (let row = 0; row < renderedSize; row++) {
        for (let col = 0; col < renderedSize; col++) {
          const sx = stl.center.x - Math.floor(renderedSize / 2) + col;
          const sy = stl.center.y - Math.floor(renderedSize / 2) + row;
          if (sx < 1 || sy < 1 || sx > system.maxX || sy > system.maxY) continue;
          const tileId = getStarTileIdAt(stl.config, sx, sy, stl.center.x, stl.center.y);
          if (!tileId) continue;
          try {
            const url = starTileImage(tileId);
            const texture = await Assets.load(url);
            const sprite = new Sprite(texture);
            sprite.position.set((sx - 1) * CELL, (sy - 1) * CELL);
            sprite.width = CELL;
            sprite.height = CELL;
            starLayer.addChild(sprite);
          } catch { /* skip */ }
        }
      }
    }

    // Celestial objects
    for (const obj of systemGrid.celestialObjects ?? []) {
      if (obj.classId && obj.classId >= 9001) continue; // stars handled above
      const px = (obj.posX - 1) * CELL;
      const py = (obj.posY - 1) * CELL;
      const g = new Graphics();
      g.circle(px + CELL / 2, py + CELL / 2, CELL * 0.35).fill({ color: obj.objectType === 1 ? 0x60a5fa : obj.objectType === 2 ? 0xa78bfa : 0x9ca3af });
      starLayer.addChild(g);
    }

    for (const shield of systemGrid.colonyShields ?? []) {
      if (!shield.shielded) continue;
      const px = (shield.posX - 1) * CELL;
      const py = (shield.posY - 1) * CELL;
      const g = new Graphics();
      g.circle(px + CELL / 2, py + CELL / 2, CELL * 0.48).stroke({ color: 0x22d3ee, width: 2, alpha: 0.85 });
      g.circle(px + CELL / 2, py + CELL / 2, CELL * 0.34).stroke({ color: 0x67e8f9, width: 1, alpha: 0.45 });
      starLayer.addChild(g);
    }

    // Grid
    const grid = new Graphics();
    for (let x = 0; x <= system.maxX; x++) grid.moveTo(x * CELL, 0).lineTo(x * CELL, mapH);
    for (let y = 0; y <= system.maxY; y++) grid.moveTo(0, y * CELL).lineTo(mapW, y * CELL);
    grid.stroke({ color: 0xffffff, width: 0.4, alpha: 0.15 });
    container.addChild(grid);
    container.addChild(selectionGfx);

    // Fit view
    const viewW = app.screen.width;
    const viewH = app.screen.height;
    state.scale = clamp(Math.min(viewW / mapW, viewH / mapH) * 0.9, MIN_SCALE, MAX_SCALE);
    state.viewX = -(viewW / state.scale - mapW) / 2;
    state.viewY = -(viewH / state.scale - mapH) / 2;
    applyView();

    function applyView() {
      container.position.set(-state.viewX * state.scale, -state.viewY * state.scale);
      container.scale.set(state.scale);
    }

    // Interaction
    const canvas = app.canvas as HTMLCanvasElement;
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = state.viewX + mx / state.scale;
      const worldY = state.viewY + my / state.scale;
      state.scale = clamp(state.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), MIN_SCALE, MAX_SCALE);
      state.viewX = worldX - mx / state.scale;
      state.viewY = worldY - my / state.scale;
      applyView();
    }, { passive: false, signal });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      state.dragging = true;
      state.dragMoved = false;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.dragViewX = state.viewX;
      state.dragViewY = state.viewY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    }, { signal });

    canvas.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.dragStartX;
      const dy = e.clientY - state.dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.dragMoved = true;
      state.viewX = state.dragViewX - dx / state.scale;
      state.viewY = state.dragViewY - dy / state.scale;
      applyView();
    }, { signal });

    canvas.addEventListener('pointerup', (e) => {
      if (!state.dragging) return;
      state.dragging = false;
      canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = 'grab';
      if (!state.dragMoved) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = state.viewX + mx / state.scale;
        const worldY = state.viewY + my / state.scale;
        const gx = Math.floor(worldX / CELL) + 1;
        const gy = Math.floor(worldY / CELL) + 1;
        const field = fieldMap.get(`${gx},${gy}`) ?? null;
        selectSystemField(field);
        selectionGfx.clear();
        if (field) {
          const fx = (field.sx - 1) * CELL;
          const fy = (field.sy - 1) * CELL;
          selectionGfx.rect(fx + 1, fy + 1, CELL - 2, CELL - 2).stroke({ color: 0xffffff, width: 2 });
        }
      }
    }, { signal });

    canvas.style.cursor = 'grab';
  }, [systemGrid, selectSystemField]);

  if (!systemGrid) return null;

  const systemFieldTypes = fieldTypes.filter((ft) =>
    ['EMPTY_SPACE', 'STAR_CORE', 'PLANET_ORBIT', 'MOON_ORBIT', 'ASTEROID_CLUSTER', 'NEBULA'].includes(ft.key),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeSystemView}>
      <div className="relative w-[90vw] h-[85vh] bg-swu-surface border border-swu-border rounded-lg flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-4 border-b border-swu-border bg-swu-bg/90 z-10">
          <h2 className="text-sm font-bold text-swu-primary">
            Systemansicht: {systemGrid.system.name} ({systemGrid.system.maxX}×{systemGrid.system.maxY})
          </h2>
          <button onClick={closeSystemView} className="text-swu-muted hover:text-white text-lg">✕</button>
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="flex-1 mt-10 bg-black" />

        {/* Right panel */}
        <div className="w-72 mt-10 border-l border-swu-border p-3 overflow-y-auto bg-swu-bg/70">
          {selectedSystemField ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-swu-primary">Feld {selectedSystemField.sx}|{selectedSystemField.sy}</h3>
              <div className="text-xs text-swu-text space-y-0.5">
                <div>ID: {selectedSystemField.id}</div>
                <div>Feldtyp: {selectedSystemField.fieldType.key}</div>
                <div>Passierbar: {selectedSystemField.isPassable ? 'Ja' : 'Nein'}</div>
                <div>Energie: {selectedSystemField.energyCost}</div>
                <div>Schaden: {selectedSystemField.damage}</div>
                <div>Objekt: {selectedSystemField.celestialObject?.name ?? 'Keines'}</div>
                <div>Effekte: {selectedSystemField.effects?.length ? selectedSystemField.effects.join(', ') : 'Keine'}</div>
              </div>

              <div>
                <label className="text-xs text-swu-muted block mb-1">Feldtyp ändern</label>
                <select
                  className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
                  value={selectedSystemField.fieldTypeId}
                  onChange={(e) => updateSystemField(selectedSystemField.id, { fieldTypeId: Number(e.target.value) })}
                >
                  {systemFieldTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>{ft.name} ({ft.key})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-swu-muted block mb-1">Himmelskörper</label>
                <select
                  className="w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-xs text-swu-text"
                  value={selectedSystemField.celestialObjectId ?? ''}
                  onChange={(e) => updateSystemField(selectedSystemField.id, { celestialObjectId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Keiner</option>
                  {(systemGrid.celestialObjects ?? []).map((obj) => (
                    <option key={obj.id} value={obj.id}>{obj.name ?? `${obj.objectType === 1 ? 'Planet' : obj.objectType === 2 ? 'Mond' : 'Asteroid'} #${obj.id}`}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="text-xs text-swu-muted">Feld im System anklicken zum Bearbeiten</div>
          )}
        </div>
      </div>
    </div>
  );
}
