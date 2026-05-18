import { useEffect, useMemo, useState } from 'react';
import type {
  StarmapGalaxyFieldDto,
  StarmapLayerDto,
  StarmapSectorDto,
  StarmapSystemDetailDto,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
} from '@swuniverse/shared';
import { api } from '../services/api';

type Layer = Pick<
  StarmapLayerDto,
  'id' | 'name' | 'width' | 'height' | 'sectorSize'
>;
type SectorSummary = StarmapSectorDto;
type GalaxyField = StarmapGalaxyFieldDto;
type StarSystem = StarmapSystemListItemDto;
type SystemDetail = StarmapSystemDetailDto;
type SystemGrid = StarmapSystemGridDto;

type ViewMode = 'galaxy' | 'sector' | 'system';

const OBJECT_TYPE_ICONS: Record<number, string> = {
  1: '🪐',
  2: '🌙',
  3: '☄️',
};

const OBJECT_TYPE_NAMES: Record<number, string> = {
  1: 'Planet',
  2: 'Moon',
  3: 'Asteroid',
};

const SECTOR_FIELD_STYLES: Record<string, string> = {
  EMPTY_SPACE:
    'bg-[radial-gradient(circle_at_center,_rgba(120,150,255,0.14),_rgba(0,0,0,0.95)_70%)] border-slate-800',
  STAR_SYSTEM:
    'bg-[radial-gradient(circle_at_center,_rgba(255,210,90,0.45),_rgba(25,18,0,0.96)_70%)] border-amber-500/80',
  NEBULA:
    'bg-[radial-gradient(circle_at_35%_35%,_rgba(110,255,180,0.45),_rgba(15,20,35,0.95)_70%)] border-emerald-400/50',
  ASTEROID_FIELD:
    'bg-[radial-gradient(circle_at_center,_rgba(160,160,160,0.28),_rgba(0,0,0,0.95)_70%)] border-stone-500/70',
  BLOCKED: 'bg-red-950/80 border-red-700',
};

const SYSTEM_FIELD_STYLES: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-950 border-slate-900 text-slate-500',
  DEEP_SPACE: 'bg-slate-950 border-slate-800 text-slate-400',
  STAR_CORE: 'bg-amber-500/40 border-amber-300 text-amber-100',
  PLANET_ORBIT: 'bg-sky-900/70 border-sky-500 text-sky-100',
  MOON_ORBIT: 'bg-indigo-900/70 border-indigo-400 text-indigo-100',
  ASTEROID_CLUSTER: 'bg-stone-700/70 border-stone-400 text-stone-100',
  NEBULA: 'bg-fuchsia-900/60 border-fuchsia-500 text-fuchsia-100',
};

function getSectorFieldClasses(field: GalaxyField, isActive: boolean): string {
  const base =
    SECTOR_FIELD_STYLES[field.fieldType.key] ||
    'bg-[radial-gradient(circle_at_center,_rgba(80,90,140,0.12),_rgba(0,0,0,0.95)_72%)] border-slate-900';

  return [
    'relative h-7 w-7 border text-[10px] flex items-center justify-center transition-all',
    base,
    field.starSystemId ? 'shadow-[0_0_10px_rgba(255,220,120,0.25)]' : '',
    isActive ? 'ring-2 ring-swu-accent z-10' : '',
  ].join(' ');
}

function getSystemFieldClasses(key: string | undefined): string {
  return (
    SYSTEM_FIELD_STYLES[key ?? ''] ||
    'bg-swu-bg border-swu-border/40 text-swu-muted'
  );
}

export function StarmapPage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [selectedSector, setSelectedSector] = useState<SectorSummary | null>(
    null,
  );
  const [sectorFields, setSectorFields] = useState<GalaxyField[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<StarSystem | null>(null);
  const [systemDetail, setSystemDetail] = useState<SystemDetail | null>(null);
  const [systemGrid, setSystemGrid] = useState<SystemGrid | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('galaxy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Layer[]>('/starmap/layers').then(async (data) => {
      setLayers(data);
      if (data.length > 0) {
        setSelectedLayer(data[0]);
        const loadedSectors = await api.get<SectorSummary[]>(
          `/starmap/layers/${data[0].id}/sectors`,
        );
        setSectors(loadedSectors);
      }
      setLoading(false);
    });
  }, []);

  async function selectLayer(layer: Layer) {
    setSelectedLayer(layer);
    setSelectedSector(null);
    setSelectedSystem(null);
    setSystemDetail(null);
    setSystemGrid(null);
    setViewMode('galaxy');
    const loadedSectors = await api.get<SectorSummary[]>(
      `/starmap/layers/${layer.id}/sectors`,
    );
    setSectors(loadedSectors);
    setSectorFields([]);
  }

  async function selectSector(sector: SectorSummary) {
    setSelectedSector(sector);
    setSelectedSystem(null);
    setSystemDetail(null);
    setSystemGrid(null);
    const fields = await api.get<GalaxyField[]>(
      `/starmap/layers/${sector.layerId}/sectors/${sector.sectorX}/${sector.sectorY}`,
    );
    setSectorFields(fields);
    setViewMode('sector');
  }

  async function selectSystem(system: StarSystem) {
    setSelectedSystem(system);
    const [detail, grid] = await Promise.all([
      api.get<SystemDetail>(`/starmap/systems/${system.id}`),
      api.get<SystemGrid>(`/starmap/systems/${system.id}/grid`),
    ]);
    setSystemDetail(detail);
    setSystemGrid(grid);
    setViewMode('system');
  }

  const celestialObjectsById = useMemo(
    () =>
      new Map(
        (systemGrid?.celestialObjects ?? []).map((object) => [
          object.id,
          object,
        ]),
      ),
    [systemGrid],
  );

  const systemsInSector = useMemo(() => {
    const seen = new Map<number, StarSystem>();
    for (const field of sectorFields) {
      if (field.starSystem) {
        seen.set(field.starSystem.id, field.starSystem);
      }
    }
    return [...seen.values()].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  }, [sectorFields]);

  if (loading)
    return <div className="p-6 text-swu-muted">Loading starmap...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-swu-accent">Starmap</h1>
        {selectedLayer && (
          <span className="text-sm text-swu-muted">{selectedLayer.name}</span>
        )}
        {layers.length > 0 && (
          <select
            value={selectedLayer?.id || ''}
            onChange={(e) => {
              const layer = layers.find(
                (entry) => entry.id === Number(e.target.value),
              );
              if (layer) void selectLayer(layer);
            }}
            className="bg-swu-bg border border-swu-border rounded px-3 py-1 text-sm text-swu-primary"
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-swu-muted">
        <button
          disabled={!selectedLayer}
          onClick={() => setViewMode('galaxy')}
          className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
        >
          Karte
        </button>
        <span>/</span>
        <button
          disabled={!selectedSector}
          onClick={() => selectedSector && setViewMode('sector')}
          className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
        >
          {selectedSector
            ? `Sektor ${selectedSector.sectorY * Math.ceil((selectedLayer?.width ?? 0) / (selectedLayer?.sectorSize ?? 1)) + selectedSector.sectorX + 1}`
            : 'Sektor'}
        </button>
        <span>/</span>
        <button
          disabled={!selectedSystem}
          onClick={() => selectedSystem && setViewMode('system')}
          className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
        >
          {selectedSystem?.name ?? 'System'}
        </button>
      </div>

      {viewMode === 'galaxy' && selectedLayer && (
        <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
          <div className="mb-3 text-sm text-swu-muted">
            Karte · Sektorenübersicht
          </div>
          <div
            className="grid gap-px overflow-auto"
            style={{
              gridTemplateColumns: `56px repeat(${Math.ceil(selectedLayer.width / selectedLayer.sectorSize)}, minmax(120px, 1fr))`,
            }}
          >
            <div className="bg-swu-bg/50 p-2 text-xs font-bold text-swu-muted">
              x|y
            </div>
            {Array.from(
              {
                length: Math.ceil(
                  selectedLayer.width / selectedLayer.sectorSize,
                ),
              },
              (_, i) => (
                <div
                  key={`x-${i}`}
                  className="bg-swu-bg/50 p-2 text-center text-xs font-bold text-swu-muted"
                >
                  {(i + 1) * selectedLayer.sectorSize}
                </div>
              ),
            )}
            {Array.from(
              {
                length: Math.ceil(
                  selectedLayer.height / selectedLayer.sectorSize,
                ),
              },
              (_, row) => (
                <>
                  <div
                    key={`y-${row}`}
                    className="bg-swu-bg/50 p-2 text-xs font-bold text-swu-muted"
                  >
                    {(row + 1) * selectedLayer.sectorSize}
                  </div>
                  {Array.from(
                    {
                      length: Math.ceil(
                        selectedLayer.width / selectedLayer.sectorSize,
                      ),
                    },
                    (_, col) => {
                      const sector = sectors.find(
                        (entry) =>
                          entry.sectorX === col && entry.sectorY === row,
                      );
                      if (!sector) {
                        return (
                          <div
                            key={`empty-${row}-${col}`}
                            className="min-h-[64px] bg-swu-bg/30"
                          />
                        );
                      }
                      return (
                        <button
                          key={`${sector.sectorX}-${sector.sectorY}`}
                          onClick={() => void selectSector(sector)}
                          className="min-h-[64px] border border-swu-border bg-swu-bg/40 px-3 py-2 text-left hover:border-swu-accent hover:bg-swu-accent/5"
                        >
                          <div className="font-semibold text-swu-primary">
                            Sektor{' '}
                            {sector.sectorY *
                              Math.ceil(
                                selectedLayer.width / selectedLayer.sectorSize,
                              ) +
                              sector.sectorX +
                              1}
                          </div>
                          <div className="mt-1 text-[11px] text-swu-muted">
                            [{sector.minX}-{sector.maxX}] · [{sector.minY}-
                            {sector.maxY}]
                          </div>
                          <div className="mt-1 text-[11px] text-swu-muted">
                            {sector.systemCount} Systeme
                          </div>
                        </button>
                      );
                    },
                  )}
                </>
              ),
            )}
          </div>
        </div>
      )}

      {viewMode === 'sector' && selectedSector && (
        <div className="flex gap-4">
          <div className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
            <div className="mb-3 text-sm text-swu-muted">
              Sektoransicht · [{selectedSector.minX}-{selectedSector.maxX}] / [
              {selectedSector.minY}-{selectedSector.maxY}]
            </div>
            <div
              className="grid gap-px min-w-max"
              style={{
                gridTemplateColumns: `48px repeat(${selectedSector.maxX - selectedSector.minX + 1}, 28px)`,
              }}
            >
              <div className="bg-swu-bg/50 text-xs text-swu-muted flex items-center justify-center">
                x|y
              </div>
              {Array.from(
                { length: selectedSector.maxX - selectedSector.minX + 1 },
                (_, i) => (
                  <div
                    key={`sx-${i}`}
                    className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
                  >
                    {selectedSector.minX + i}
                  </div>
                ),
              )}
              {Array.from(
                { length: selectedSector.maxY - selectedSector.minY + 1 },
                (_, row) => {
                  const y = selectedSector.minY + row;
                  return (
                    <>
                      <div
                        key={`sy-${y}`}
                        className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
                      >
                        {y}
                      </div>
                      {Array.from(
                        {
                          length:
                            selectedSector.maxX - selectedSector.minX + 1,
                        },
                        (_, col) => {
                          const x = selectedSector.minX + col;
                          const field = sectorFields.find(
                            (entry) => entry.cx === x && entry.cy === y,
                          );
                          if (!field) {
                            return (
                              <div
                                key={`field-empty-${x}-${y}`}
                                className="h-7 w-7 bg-black"
                              />
                            );
                          }
                          const isActive =
                            selectedSystem?.cx === field.starSystem?.cx &&
                            selectedSystem?.cy === field.starSystem?.cy;
                          return (
                            <button
                              key={field.id}
                              onClick={() => {
                                if (field.starSystem) {
                                  void selectSystem(field.starSystem);
                                }
                              }}
                              className={getSectorFieldClasses(field, isActive)}
                              title={`${field.cx},${field.cy} · ${field.fieldType.name}${field.starSystem ? ` · ${field.starSystem.name}` : ''}${field.adminRegionKey ? ` · ${field.adminRegionKey}` : ''}`}
                            >
                              {field.starSystemId
                                ? '★'
                                : field.fieldType.key === 'NEBULA'
                                  ? '·'
                                  : ''}
                              {field.adminRegionKey && (
                                <span className="absolute bottom-0.5 right-0.5 text-[7px] text-cyan-200/80">
                                  {field.adminRegionKey
                                    .replace('SYS_', '')
                                    .slice(0, 1)}
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </>
                  );
                },
              )}
            </div>
          </div>

          <div className="w-80 space-y-4">
            <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
              <h3 className="font-bold text-swu-accent">Sektor</h3>
              <div className="mt-2 text-xs text-swu-muted space-y-1">
                <p>Felder: {sectorFields.length}</p>
                <p>Systeme: {systemsInSector.length}</p>
                <p>
                  Koordinaten: [{selectedSector.minX}-{selectedSector.maxX}] / [
                  {selectedSector.minY}-{selectedSector.maxY}]
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
              <h4 className="text-xs font-bold text-swu-muted mb-2">
                Systeme in Sektor
              </h4>
              <div className="space-y-2">
                {systemsInSector.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => void selectSystem(system)}
                    className="w-full rounded border border-swu-border bg-swu-bg/40 px-3 py-2 text-left text-xs hover:border-swu-accent hover:bg-swu-accent/5"
                  >
                    <div className="font-semibold text-swu-primary">
                      {system.name}
                    </div>
                    <div className="mt-1 text-[11px] text-swu-muted">
                      [{system.cx},{system.cy}] · {system.maxX}x{system.maxY}
                    </div>
                  </button>
                ))}
                {systemsInSector.length === 0 && (
                  <p className="text-xs text-swu-muted">
                    Keine Systeme in diesem Sektor.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'system' && systemDetail && selectedSystem && (
        <div className="flex gap-4">
          <div className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
            <div className="mb-3 text-sm text-swu-muted">
              Sternensystem / {systemDetail.name}
            </div>
            {systemGrid && (
              <div
                className="grid gap-px min-w-max"
                style={{
                  gridTemplateColumns: `40px repeat(${systemGrid.system.maxX}, 24px)`,
                }}
              >
                <div className="bg-swu-bg/50 text-xs text-swu-muted flex items-center justify-center">
                  x|y
                </div>
                {Array.from({ length: systemGrid.system.maxX }, (_, i) => (
                  <div
                    key={`gx-${i}`}
                    className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
                  >
                    {i + 1}
                  </div>
                ))}

                {Array.from({ length: systemGrid.system.maxY }, (_, row) => {
                  const y = row + 1;
                  return (
                    <>
                      <div
                        key={`gy-${y}`}
                        className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
                      >
                        {y}
                      </div>
                      {Array.from(
                        { length: systemGrid.system.maxX },
                        (_, col) => {
                          const x = col + 1;
                          const field = systemGrid.fields.find(
                            (entry) => entry.sx === x && entry.sy === y,
                          );
                          if (!field) {
                            return (
                              <div
                                key={`sys-empty-${x}-${y}`}
                                className="h-6 w-6 bg-black"
                              />
                            );
                          }
                          const object = field.celestialObjectId
                            ? celestialObjectsById.get(field.celestialObjectId)
                            : null;
                          const label = object
                            ? OBJECT_TYPE_ICONS[object.objectType] || '●'
                            : field.fieldType.key === 'STAR_CORE'
                              ? '✦'
                              : field.fieldType.key === 'ASTEROID_CLUSTER'
                                ? '·'
                                : '';

                          return (
                            <div
                              key={field.id}
                              className={[
                                'relative h-6 w-6 rounded-sm border flex items-center justify-center text-[10px]',
                                getSystemFieldClasses(field.fieldType.key),
                                field.regionKey === 'STAR_CORE'
                                  ? 'shadow-[0_0_22px_rgba(255,210,80,0.6)] scale-105 z-10'
                                  : '',
                                field.borderMask ? 'border-slate-600' : '',
                              ].join(' ')}
                              title={`${field.sx},${field.sy} · ${field.fieldType.name}${field.regionKey ? ` · ${field.regionKey}` : ''}${object ? ` · ${object.name || OBJECT_TYPE_NAMES[object.objectType]}` : ''}`}
                            >
                              {label}
                            </div>
                          );
                        },
                      )}
                    </>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-80 space-y-4">
            <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
              <div className="font-semibold text-swu-primary">
                {systemDetail.name}
              </div>
              <div className="mt-2 text-xs text-swu-muted space-y-1">
                <p>Typ: {selectedSystem.systemTypeId}</p>
                <p>
                  Koordinaten: {systemDetail.cx}|{systemDetail.cy}
                </p>
                <p>
                  Größe: {systemDetail.maxX}x{systemDetail.maxY}
                </p>
                <p>Objekte: {systemDetail.celestialObjects.length}</p>
              </div>
            </div>
            <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
              <h4 className="text-xs font-bold text-swu-muted mb-2">Objekte</h4>
              <div className="space-y-1">
                {systemDetail.celestialObjects.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center gap-2 p-1.5 bg-swu-bg/50 rounded border border-swu-border/50"
                  >
                    <span className="text-sm">
                      {OBJECT_TYPE_ICONS[obj.objectType] || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-swu-primary truncate">
                        {obj.name || OBJECT_TYPE_NAMES[obj.objectType]}
                      </p>
                      <p className="text-[10px] text-swu-muted">
                        {OBJECT_TYPE_NAMES[obj.objectType]} · [{obj.posX},
                        {obj.posY}]
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {layers.length === 0 && (
        <p className="text-swu-muted">
          No explored regions yet. Galaxy not seeded.
        </p>
      )}
    </div>
  );
}
