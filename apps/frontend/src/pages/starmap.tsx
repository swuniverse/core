import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type HyperspaceRouteDto,
  type StarmapGalaxyFieldDto,
  type StarmapLayerDto,
  type StarmapSystemGridDto,
  type StarmapSystemListItemDto,
} from '@swuniverse/shared';
import { api } from '../services/api';
import { StarmapCanvas, type StarmapCanvasHandle } from '../components/starmap/StarmapCanvas';
import { StarmapControlPanel } from '../components/starmap/StarmapControlPanel';

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
  const [systemGrid, setSystemGrid] = useState<SystemGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<GalaxyField | null>(null);
  const [selectedSector, setSelectedSector] = useState<{ x: number; y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<StarmapCanvasHandle>(null);

  useEffect(() => {
    api.get<Layer[]>('/starmap/layers').then(async (data) => {
      setLayers(data);
      if (data.length > 0) {
        setSelectedLayer(data[0]);
        const [loadedFields, loadedRoutes] = await Promise.all([
          api.get<GalaxyField[]>(`/starmap/layers/${data[0].id}/fields`),
          api.get<HyperspaceRoute[]>(`/starmap/layers/${data[0].id}/hyperspace-routes`),
        ]);
        setFields(loadedFields);
        setHyperspaceRoutes(loadedRoutes);
      }
      setLoading(false);
    });
  }, []);

  async function selectLayer(layer: Layer) {
    setSelectedLayer(layer);
    setSelectedSystem(null);
    setSystemGrid(null);
    setLoading(true);
    const [loadedFields, loadedRoutes] = await Promise.all([
      api.get<GalaxyField[]>(`/starmap/layers/${layer.id}/fields`),
      api.get<HyperspaceRoute[]>(`/starmap/layers/${layer.id}/hyperspace-routes`),
    ]);
    setFields(loadedFields);
    setHyperspaceRoutes(loadedRoutes);
    setLoading(false);
  }

  function selectSystem(system: StarSystem) {
    setSelectedSystem(system);
  }

  async function enterSystemView() {
    if (!selectedSystem) return;
    const grid = await api.get<SystemGrid>(`/starmap/systems/${selectedSystem.id}/grid`);
    setSystemGrid(grid);
    canvasRef.current?.enterSystem();
  }

  async function refreshData() {
    if (!selectedLayer) return;
    const [loadedFields, loadedRoutes] = await Promise.all([
      api.get<GalaxyField[]>(`/starmap/layers/${selectedLayer.id}/fields`),
      api.get<HyperspaceRoute[]>(`/starmap/layers/${selectedLayer.id}/hyperspace-routes`),
    ]);
    setFields(loadedFields);
    setHyperspaceRoutes(loadedRoutes);
  }

  function exitSystem() {
    setSelectedSystem(null);
    setSystemGrid(null);
  }

  const visibleHyperspaceRoutes = useMemo(
    () => hyperspaceRoutes.filter((route) => !hiddenRouteIds.includes(route.id)),
    [hiddenRouteIds, hyperspaceRoutes],
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-primary">Starmap</h1>
        <p className="mt-4 text-swu-muted">Lade Karte...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col p-4 gap-3">
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
        {systemGrid && (
          <button
            className="text-xs text-swu-accent border border-swu-border rounded px-2 py-1 hover:bg-swu-accent/10"
            onClick={exitSystem}
          >
            ← Zur Karte
          </button>
        )}
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
              systemGrid={systemGrid}
              onSelectSystem={(system) => void selectSystem(system)}
              onExitSystem={exitSystem}
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
              onEnterSystem={() => void enterSystemView()}
              inSystemMode={!!systemGrid}
            />
          )}
          {/* Hyperspace routes */}
          {!systemGrid && hyperspaceRoutes.length > 0 && (
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
