import { useEffect, useMemo, useState } from 'react';
import {
  getStuClassLabel,
  type StarmapGalaxyFieldDto,
  type StarmapLayerDto,
  type StarmapSectorDto,
  type StarmapSystemDetailDto,
  type StarmapSystemGridDto,
  type StarmapSystemListItemDto,
} from '@swuniverse/shared';
import { api } from '../services/api';
import {
  planetThumbnail,
  spaceBackgroundTile,
  starTileImage,
  systemTypeImage,
} from '../lib/assets';
import {
  getStarTileConfig,
  getStarTileIdAt,
  getSystemTypeName,
  type StarAssetConfig,
} from '../lib/star-tiles';

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

type StarTileLayer = {
  key: 'primary' | 'secondary';
  config: StarAssetConfig;
  center: { x: number; y: number };
};

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

const SECTOR_OVERLAY_STYLES: Record<string, string> = {
  NEBULA:
    'after:absolute after:inset-0 after:bg-emerald-500/20 after:rounded-sm',
  ASTEROID_FIELD:
    'after:absolute after:inset-0 after:bg-stone-400/15 after:rounded-sm',
  BLOCKED: 'after:absolute after:inset-0 after:bg-red-900/60 after:rounded-sm',
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
  const overlay = SECTOR_OVERLAY_STYLES[field.fieldType.key] || '';

  return [
    'relative h-7 w-7 border-0 text-[10px] flex items-center justify-center transition-all bg-center overflow-hidden',
    overlay,
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

function isStarObject(classId: number | null | undefined): boolean {
  return classId != null && classId >= 9001 && classId <= 9005;
}

function getObjectTypeName(
  objectType: number,
  classId?: number | null,
): string {
  if (classId === 9001) return 'Stern A';
  if (classId === 9002) return 'Stern B';
  if (isStarObject(classId)) return 'Stern';
  const classLabel = getStuClassLabel(classId);
  const typeName = OBJECT_TYPE_NAMES[objectType] ?? 'Objekt';
  return classId == null ? typeName : `${typeName} Klasse ${classLabel}`;
}

function getSystemTypeDisplayName(
  system: SystemDetail,
  selectedSystem: StarSystem,
): string {
  const name =
    system.systemTypeName ??
    selectedSystem.systemTypeName ??
    getSystemTypeName(system.systemTypeId);
  if (!name) return String(system.systemTypeId);
  return name.replace(/^Typ\s+/i, '');
}

function calculateRenderedStarAreaSize(
  assetGridSize: number,
  systemGridSize: number,
): number {
  const scaled = Math.ceil(assetGridSize / 3);
  const maxStarArea = Math.floor(systemGridSize / 6);
  return Math.min(Math.max(scaled, 2), maxStarArea);
}

function calculateFallbackBinaryStarCenters(
  systemGridSize: number,
  primary: StarAssetConfig,
  secondary: StarAssetConfig,
): { primary: { x: number; y: number }; secondary: { x: number; y: number } } {
  const gridCenter = Math.floor(systemGridSize / 2);
  const primaryRadius = Math.floor(
    calculateRenderedStarAreaSize(primary.gridSize, systemGridSize) / 2,
  );
  const secondaryRadius = Math.floor(
    calculateRenderedStarAreaSize(secondary.gridSize, systemGridSize) / 2,
  );
  const minSeparation = primaryRadius + secondaryRadius + 2;
  const offsetDistance = Math.max(3, Math.floor(minSeparation / 2));

  return {
    primary: {
      x: Math.max(primaryRadius + 1, gridCenter - offsetDistance),
      y: Math.max(primaryRadius + 1, gridCenter - offsetDistance),
    },
    secondary: {
      x: Math.min(
        systemGridSize - secondaryRadius,
        gridCenter + offsetDistance,
      ),
      y: Math.min(
        systemGridSize - secondaryRadius,
        gridCenter + offsetDistance,
      ),
    },
  };
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

  const starTileLayers = useMemo<StarTileLayer[]>(() => {
    if (!systemGrid) return [];
    const config = getStarTileConfig(systemGrid.system.systemTypeId);
    if (!config) return [];

    const starObjects = (systemGrid.celestialObjects ?? []).filter(
      (o) => o.classId != null && o.classId >= 9001 && o.classId <= 9005,
    );

    const fallbackCenter = {
      x: Math.ceil(systemGrid.system.maxX / 2),
      y: Math.ceil(systemGrid.system.maxY / 2),
    };

    const primaryObject =
      starObjects.find((o) => o.classId === 9001) ?? starObjects[0];
    const primaryCenter = primaryObject
      ? { x: primaryObject.posX, y: primaryObject.posY }
      : fallbackCenter;

    if (!config.secondary) {
      return [
        { key: 'primary', config: config.primary, center: primaryCenter },
      ];
    }

    const fallbackBinaryCenters = calculateFallbackBinaryStarCenters(
      Math.min(systemGrid.system.maxX, systemGrid.system.maxY),
      config.primary,
      config.secondary,
    );
    const secondaryObject =
      starObjects.find((o) => o.classId === 9002) ??
      starObjects.find((o) => o.id !== primaryObject?.id);

    return [
      {
        key: 'primary',
        config: config.primary,
        center: primaryObject
          ? { x: primaryObject.posX, y: primaryObject.posY }
          : fallbackBinaryCenters.primary,
      },
      {
        key: 'secondary',
        config: config.secondary,
        center: secondaryObject
          ? { x: secondaryObject.posX, y: secondaryObject.posY }
          : fallbackBinaryCenters.secondary,
      },
    ];
  }, [systemGrid]);

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
              className="grid min-w-max"
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
                          length: selectedSector.maxX - selectedSector.minX + 1,
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
                          const isActive = !!(
                            selectedSystem &&
                            field.starSystem &&
                            selectedSystem.cx === field.starSystem.cx &&
                            selectedSystem.cy === field.starSystem.cy
                          );
                          return (
                            <button
                              key={field.id}
                              onClick={() => {
                                if (field.starSystem) {
                                  void selectSystem(field.starSystem);
                                }
                              }}
                              className={getSectorFieldClasses(field, isActive)}
                              style={{
                                backgroundImage: `url(${spaceBackgroundTile(field.cx, field.cy)})`,
                                backgroundSize: '107%',
                              }}
                              title={`${field.cx},${field.cy} · ${field.fieldType.name}${field.starSystem ? ` · ${field.starSystem.name}` : ''}${field.adminRegionKey ? ` · ${field.adminRegionKey}` : ''}`}
                            >
                              {field.systemTypeId ? (
                                <img
                                  src={systemTypeImage(field.systemTypeId)}
                                  alt=""
                                  className="w-full h-full object-contain absolute inset-0"
                                />
                              ) : field.fieldType.key === 'NEBULA' ? (
                                <span className="text-emerald-300/60">·</span>
                              ) : null}
                              {field.adminRegionKey && (
                                <span className="absolute bottom-0.5 right-0.5 text-[7px] text-cyan-200/80 z-10">
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

                          const starTileId =
                            starTileLayers
                              .map((layer) =>
                                getStarTileIdAt(
                                  layer.config,
                                  field.sx,
                                  field.sy,
                                  layer.center.x,
                                  layer.center.y,
                                ),
                              )
                              .find(
                                (tileId): tileId is number => tileId !== null,
                              ) ?? null;

                          const hasImage =
                            object?.classId != null && !starTileId;
                          const fallbackLabel =
                            !starTileId && object
                              ? OBJECT_TYPE_ICONS[object.objectType] || '●'
                              : !starTileId &&
                                  field.fieldType.key === 'ASTEROID_CLUSTER'
                                ? '·'
                                : '';

                          return (
                            <div
                              key={field.id}
                              className={[
                                'relative h-6 w-6 rounded-sm border-0 flex items-center justify-center text-[10px] overflow-hidden',
                                starTileId
                                  ? ''
                                  : getSystemFieldClasses(field.fieldType.key),
                                field.borderMask
                                  ? 'border border-slate-600'
                                  : '',
                              ].join(' ')}
                              style={{
                                backgroundImage: `url(${spaceBackgroundTile(field.sx, field.sy)})`,
                                backgroundSize: 'cover',
                              }}
                              title={`${field.sx},${field.sy} · ${field.fieldType.name}${field.regionKey ? ` · ${field.regionKey}` : ''}${object ? ` · ${object.name || getObjectTypeName(object.objectType, object.classId)}` : ''}`}
                            >
                              {starTileId ? (
                                <img
                                  src={starTileImage(starTileId)}
                                  alt=""
                                  className="absolute inset-0 w-full h-full"
                                />
                              ) : hasImage ? (
                                <img
                                  src={planetThumbnail(object!.classId!)}
                                  alt=""
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                fallbackLabel
                              )}
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
                <p title={`ID: ${systemDetail.systemTypeId}`}>
                  {getSystemTypeDisplayName(systemDetail, selectedSystem)}
                </p>
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
                    {obj.classId != null && !isStarObject(obj.classId) ? (
                      <img
                        src={planetThumbnail(obj.classId)}
                        alt=""
                        className="w-6 h-6 object-contain shrink-0"
                      />
                    ) : (
                      <span className="text-sm w-6 h-6 shrink-0 flex items-center justify-center">
                        {isStarObject(obj.classId)
                          ? '✦'
                          : OBJECT_TYPE_ICONS[obj.objectType] || '?'}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-swu-primary truncate">
                        {obj.name ||
                          getObjectTypeName(obj.objectType, obj.classId)}
                      </p>
                      <p className="text-[10px] text-swu-muted">
                        {getObjectTypeName(obj.objectType, obj.classId)} · [
                        {obj.posX},{obj.posY}]
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
