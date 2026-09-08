import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type HyperspaceRouteDto,
  type StarmapGalaxyFieldDto,
  type StarmapLayerDto,
  type StarmapSystemGridDto,
  type StarmapSystemListItemDto,
  type StarmapWormholeDto,
} from '@swuniverse/shared';
import { api } from '../services/api';
import { StarmapCanvas, type StarmapCanvasHandle } from '../components/starmap/StarmapCanvas';
import { StarmapControlPanel } from '../components/starmap/StarmapControlPanel';
import { canLoadInlineSystem } from '../lib/starmap-render';

type Layer = Pick<
  StarmapLayerDto,
  'id' | 'name' | 'width' | 'height' | 'sectorSize'
>;
type GalaxyField = StarmapGalaxyFieldDto;
type StarSystem = StarmapSystemListItemDto;
type SystemGrid = StarmapSystemGridDto;
type HyperspaceRoute = HyperspaceRouteDto;

export function StarmapPage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [fields, setFields] = useState<GalaxyField[]>([]);
  const [hyperspaceRoutes, setHyperspaceRoutes] = useState<HyperspaceRoute[]>([]);
  const [hiddenRouteIds, setHiddenRouteIds] = useState<number[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);
  const [systemGrids, setSystemGrids] = useState<Map<number, SystemGrid>>(() => new Map());
  const [openedSystemIds, setOpenedSystemIds] = useState<number[]>([]);
  const [wormholes, setWormholes] = useState<StarmapWormholeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<GalaxyField | null>(null);
  const [selectedSector, setSelectedSector] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<StarmapCanvasHandle>(null);
  const systemGridsRef = useRef<Map<number, SystemGrid>>(new Map());
  const openingSystemsRef = useRef<Map<number, Promise<SystemGrid>>>(new Map());
  const openedSystemIdsRef = useRef<number[]>([]);

  useEffect(() => {
    api.get<Layer[]>('/starmap/layers').then(async (data) => {
      setLayers(data);
      if (data.length > 0) {
        setSelectedLayer(data[0]);
        const [loadedFields, loadedRoutes, loadedWormholes] = await Promise.all([
          api.get<GalaxyField[]>(`/starmap/layers/${data[0].id}/fields`),
          api.get<HyperspaceRoute[]>(`/starmap/layers/${data[0].id}/hyperspace-routes`),
          api.get<StarmapWormholeDto[]>(`/starmap/layers/${data[0].id}/wormholes`),
        ]);
        setFields(loadedFields);
        setHyperspaceRoutes(loadedRoutes);
        setWormholes(loadedWormholes);
      }
      setLoading(false);
    });
  }, []);

  async function selectLayer(layer: Layer) {
    setSelectedLayer(layer);
    setSelectedSystem(null);
    systemGridsRef.current = new Map();
    openingSystemsRef.current.clear();
    setSystemGrids(new Map());
    openedSystemIdsRef.current = [];
    setOpenedSystemIds([]);
    setLoading(true);
    const [loadedFields, loadedRoutes, loadedWormholes] = await Promise.all([
      api.get<GalaxyField[]>(`/starmap/layers/${layer.id}/fields`),
      api.get<HyperspaceRoute[]>(`/starmap/layers/${layer.id}/hyperspace-routes`),
      api.get<StarmapWormholeDto[]>(`/starmap/layers/${layer.id}/wormholes`),
    ]);
    setFields(loadedFields);
    setHyperspaceRoutes(loadedRoutes);
    setWormholes(loadedWormholes);
  }

  function selectSystem(system: StarSystem) {
    setSelectedSystem(system);
  }

  const openSystem = useCallback(async (system: StarSystem): Promise<SystemGrid | null> => {
    if (!canLoadInlineSystem(system)) return null;
    setSelectedSystem(system);
    const cached = systemGridsRef.current.get(system.id);
    if (cached) return cached;
    const pending = openingSystemsRef.current.get(system.id);
    if (pending) return pending;
    const request = api.get<SystemGrid>(`/starmap/systems/${system.id}/grid`);
    openingSystemsRef.current.set(system.id, request);
    try {
      const grid = await request;
      const grids = new Map(systemGridsRef.current).set(system.id, grid);
      systemGridsRef.current = grids;
      setSystemGrids(grids);
      const openedIds = openedSystemIdsRef.current.includes(system.id)
        ? openedSystemIdsRef.current
        : [...openedSystemIdsRef.current, system.id];
      openedSystemIdsRef.current = openedIds;
      setOpenedSystemIds(openedIds);
      return grid;
    } finally {
      openingSystemsRef.current.delete(system.id);
    }
  }, []);

  useEffect(() => {
    const systems = Array.from(
      new Map(
        fields
          .map((field) => field.starSystem)
          .filter((system): system is StarSystem => !!system && canLoadInlineSystem(system))
          .map((system) => [system.id, system]),
      ).values(),
    );
    if (systems.length === 0) return;
    let cancelled = false;
    void Promise.all(
      systems.map(async (system) => {
        const cached = systemGridsRef.current.get(system.id);
        if (cached) return [system.id, cached] as const;
        return [system.id, await api.get<SystemGrid>(`/starmap/systems/${system.id}/grid`)] as const;
      }),
    ).then((loadedGrids) => {
      if (cancelled) return;
      const grids = new Map(loadedGrids);
      systemGridsRef.current = grids;
      setSystemGrids(grids);
      const ids = systems.map((system) => system.id);
      openedSystemIdsRef.current = ids;
      setOpenedSystemIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [fields]);


  async function refreshData() {
    if (!selectedLayer) return;
    const [loadedFields, loadedRoutes, loadedWormholes] = await Promise.all([
      api.get<GalaxyField[]>(`/starmap/layers/${selectedLayer.id}/fields`),
      api.get<HyperspaceRoute[]>(`/starmap/layers/${selectedLayer.id}/hyperspace-routes`),
      api.get<StarmapWormholeDto[]>(`/starmap/layers/${selectedLayer.id}/wormholes`),
    ]);
    setFields(loadedFields);
    setHyperspaceRoutes(loadedRoutes);
    setWormholes(loadedWormholes);
  }


  const visibleHyperspaceRoutes = useMemo(
    () => hyperspaceRoutes.filter((route) => !hiddenRouteIds.includes(route.id)),
    [hiddenRouteIds, hyperspaceRoutes],
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-primary" style={{ fontFamily: 'var(--font-swu-display)' }}>Starmap</h1>
        <p className="mt-4 text-swu-muted">Lade Karte...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-60px)] flex-col p-4 gap-3">
      {/* Header toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        {layers.length > 1 ? (
          <select
            className="bg-swu-bg border border-swu-border text-swu-primary text-xs rounded px-2 py-1"
            value={selectedLayer?.id ?? ''}
            onChange={(e) => {
              const layer = layers.find((l) => l.id === Number(e.target.value));
              if (layer) void selectLayer(layer);
            }}
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        ) : selectedLayer ? (
          <span className="text-xs text-swu-muted border border-swu-border rounded px-2 py-1">{selectedLayer.name}</span>
        ) : null}
        <button
          className="text-xs text-swu-primary border border-swu-border rounded px-2 py-1 hover:bg-swu-accent/10"
          onClick={() => void refreshData()}
        >
          Aktualisieren
        </button>
        <button
          className="text-xs text-swu-primary border border-swu-border rounded px-2 py-1 hover:bg-swu-accent/10"
          onClick={() => canvasRef.current?.fitView()}
        >
          Einpassen
        </button>
      </div>

      {/* Main */}
      <div className="flex flex-1 min-h-0 gap-3">
        <div className="flex-1 min-w-0">
          {selectedLayer && (
            <StarmapCanvas
              ref={canvasRef}
              layer={selectedLayer}
              fields={fields}
              routes={visibleHyperspaceRoutes}
              selectedSystem={selectedSystem}
              openedSystemIds={openedSystemIds}
              systemGrids={systemGrids}
              onSelectSystem={selectSystem}
              onOpenSystem={openSystem}
              wormholes={wormholes}
              onFieldClick={setSelectedField}
              selectedField={selectedField}
              selectedSector={selectedSector}
              showGrid={showGrid}
            />
          )}
        </div>

        {/* Side panel */}
        <aside className="w-64 shrink-0 space-y-3 overflow-y-auto">
          {selectedLayer && (
            <StarmapControlPanel
              layer={selectedLayer}
              showGrid={showGrid}
              onToggleGrid={setShowGrid}
              selectedSector={selectedSector}
              onSelectSector={setSelectedSector}
              onZoomIn={() => canvasRef.current?.zoomIn()}
              onZoomOut={() => canvasRef.current?.zoomOut()}
              selectedField={selectedField}
              selectedSystem={selectedSystem}
              onOpenSystem={() => selectedSystem && void openSystem(selectedSystem)}
            />
          )}
          {/* Hyperspace routes */}
          {hyperspaceRoutes.length > 0 && (
            <div className="rounded-lg border border-swu-border bg-swu-surface p-3">
              <h4 className="text-xs font-bold text-swu-muted mb-2">Hyperrouten</h4>
              <div className="space-y-1">
                {hyperspaceRoutes.map((route) => (
                  <label key={route.id} className="flex items-center gap-2 text-xs text-swu-muted">
                    <input
                      type="checkbox"
                      checked={!hiddenRouteIds.includes(route.id)}
                      onChange={(e) => {
                        setHiddenRouteIds((ids) =>
                          e.target.checked
                            ? ids.filter((id) => id !== route.id)
                            : [...ids, route.id],
                        );
                      }}
                    />
                    <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: route.color }} />
                    <span>{route.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}


        </aside>
      </div>

      {layers.length === 0 && <p className="text-swu-muted">Galaxy not seeded.</p>}
    </div>
  );
}
