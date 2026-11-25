import { buildNebulaCloudIndex, isNebulaCloudSpace } from '@swuniverse/shared';
import type { NebulaVisualDto } from '@swuniverse/shared';
import { Fragment, useEffect, useMemo } from 'react';
import {
  fieldEffectDefinition,
  knownFieldEffects,
  type AnomalyViewDto,
  type FieldEffect,
} from '@swuniverse/shared';
import {
  getGalaxyFieldMarker,
  getGalaxyFieldStyle,
  getSystemFieldStyle,
} from './field-styles';
import { PlanetImg } from '../PlanetImg';
import { AnomalyMarkers, formatAnomaly } from '../starmap/AnomalyMarker';
import {
  planetThumbnail,
  starTileImage,
  systemTypeImage,
} from '../../lib/assets';
import { isStarObject } from '../../lib/starmap-render';
import { terrainAppearance, nebulaEdgeMask } from '../../lib/map-terrain';
import { getStarTileConfig, getStarTileIdAt } from '../../lib/star-tiles';
import { getNebulaCloudDomStyle } from '../../lib/nebula-cloud';

interface FieldType {
  id: number;
  key: string;
  name: string;
  category?: string | null;
  energyCost?: number;
  damage?: number;
  effects?: string[] | null;
}

interface GalaxyLocalField {
  nebulaVisual?: NebulaVisualDto | null;
  nebulaTexture?: string;
  id?: number;
  cx: number;
  cy: number;
  redacted?: boolean;
  fieldType?: FieldType;
  starSystemId?: number | null;
  systemTypeId?: number | null;
  starSystem?: { id: number; name: string } | null;
  regionName?: string | null;
  isPassable?: boolean;
  effects?: string[] | null;
  anomalies?: AnomalyViewDto[];
  energyCost?: number;
  damage?: number;
}

interface SystemLocalField {
  id?: number;
  sx: number;
  sy: number;
  redacted?: boolean;
  fieldType?: FieldType;
  celestialObjectId?: number | null;
  celestialObject?: {
    id: number;
    name: string | null;
    objectType: number;
    classId: number | null;
    posX: number;
    posY: number;
    isColonizable?: boolean;
    shielded?: boolean;
    colonyId?: number | null;
    colonyName?: string | null;
  } | null;
  effects?: string[] | null;
  anomalies?: AnomalyViewDto[];
  energyCost?: number;
  damage?: number;
}

export type FieldSignatureOverlay =
  | { x: number; y: number; state: 'COUNT'; count: number }
  | { x: number; y: number; state: 'DUBIOUS' };

export interface SubspaceTraceOverlay {
  signatureId: number;
  spacecraftId?: number;
  x: number;
  y: number;
  directions: Array<'NORTH' | 'EAST' | 'SOUTH' | 'WEST'>;
  analyzed: boolean;
}

interface LocalMapOverlays {
  signatures: FieldSignatureOverlay[];
  subspaceTraces?: SubspaceTraceOverlay[];
}

export interface LocalMapContext {
  layerId: number | null;
  sectorX: number | null;
  sectorY: number | null;
  sectorNumber: number | null;
  coordinates: { x: number | null; y: number | null };
  galaxyCoordinates: { x: number | null; y: number | null };
  sensorRange: number;
  factionZone: string | null;
  adminRegionKey: string | null;
  systemName: string | null;
  nearestSystem: { id: number; name: string; cx: number; cy: number } | null;
  nearbyRouteNames: string[];
  lssMode?: 'DISABLED' | 'TERRITORY' | 'IMPASSABLE' | 'CARTOGRAPHY';
  cartography?: {
    systemId: number | null;
    explored: boolean;
    progress: number;
    surveyedFields: number;
    totalFields: number;
  };
}

export interface LocalMapGalaxy {
  tachyonScanExpiresAt?: number | null;
  mode: 'galaxy';
  shipX: number;
  shipY: number;
  sensorRange: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  fields: GalaxyLocalField[];
  overlays?: LocalMapOverlays;
  entrySystem?: { id: number; name: string; x: number; y: number } | null;
  wrecks?: Array<{
    id: number;
    x: number;
    y: number;
    hull: number;
    cargo?: Array<{ commodityId: number; amount: number }>;
  }>;
  canEnterSystem: boolean;
  canLeaveSystem: boolean;
  warning?: string;
  context?: LocalMapContext;
}
export interface LocalMapSystem {
  tachyonScanExpiresAt?: number | null;
  mode: 'system';
  shipX: number;
  shipY: number;
  sensorRange: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  systemId: number;
  systemName: string | null;
  systemTypeId?: number;
  fields: SystemLocalField[];
  stars?: Array<{
    centerX: number;
    centerY: number;
    role: 'primary' | 'secondary';
  }>;
  overlays?: LocalMapOverlays;
  wrecks?: Array<{
    id: number;
    x: number;
    y: number;
    hull: number;
    cargo?: Array<{ commodityId: number; amount: number }>;
  }>;
  entrySystem?: { id: number; name: string; x: number; y: number } | null;
  canEnterSystem: boolean;
  canLeaveSystem: boolean;
  warning?: string;
  context?: LocalMapContext;
}

export type LocalMapResponse = LocalMapGalaxy | LocalMapSystem;

interface LssMapProps {
  localMap: LocalMapResponse;
  navTarget: { x: number; y: number } | null;
  cartographyPoints?: Array<{ x: number; y: number }>;
  /** Replaces the plain ring marker on the ship's own field. */
  shipCursorUrl?: string | null;
  /** Clockwise rotation of the cursor in degrees; 0 = pointing right. */
  shipHeading?: number;
  onFieldClick: (x: number, y: number) => void;
  onScanExpired?: () => void;
}

function fieldEffects(field: {
  effects?: string[] | null;
  fieldType?: FieldType;
}): FieldEffect[] {
  return knownFieldEffects(field.effects ?? field.fieldType?.effects);
}

function anomalyText(field: { anomalies?: AnomalyViewDto[] }): string {
  return field.anomalies?.length
    ? `, Anomalie: ${field.anomalies.map(formatAnomaly).join(', ')}`
    : '';
}

function fieldEffectText(field: {
  effects?: string[] | null;
  fieldType?: FieldType;
}): string {
  const descriptions = fieldEffects(field).map(
    (effect) => fieldEffectDefinition(effect).description,
  );
  return descriptions.length > 0 ? `, Effekte: ${descriptions.join(', ')}` : '';
}

const OBJECT_TYPE_EMOJI: Record<number, string> = {
  1: '🪐',
  2: '🌙',
  3: '☄️',
};

const TRACE_ROTATION = {
  NORTH: 90,
  EAST: 180,
  SOUTH: 270,
  WEST: 0,
} as const;

function SubspaceTraces({ traces }: { traces: SubspaceTraceOverlay[] }) {
  return (
    <>
      {traces.map((trace) => (
        <span
          key={trace.signatureId}
          aria-label={`Subraumspur auf Feld ${trace.x},${trace.y}: ${trace.directions.join(', ')}${trace.analyzed ? ', analysiert' : ''}`}
          className={`pointer-events-none absolute inset-0 z-10 ${trace.analyzed ? 'text-amber-300' : 'text-cyan-300/80'}`}
        >
          {trace.directions.map((direction) => (
            <span
              key={direction}
              className="absolute left-1/2 top-1/2 h-0.5 w-1/2 origin-left bg-current"
              style={{ transform: `rotate(${TRACE_ROTATION[direction]}deg)` }}
            />
          ))}
        </span>
      ))}
    </>
  );
}

export function LssMap({
  localMap,
  navTarget,
  cartographyPoints = [],
  shipCursorUrl = null,
  shipHeading = 0,
  onFieldClick,
  onScanExpired,
}: LssMapProps) {
  const nebulaCloudIndex = useMemo(() => {
    if (localMap.mode !== 'galaxy') return buildNebulaCloudIndex([]);
    return buildNebulaCloudIndex(localMap.fields.flatMap((field) => (
      !field.redacted &&
      field.fieldType?.key !== 'UNKNOWN' &&
      field.fieldType?.category === 'nebula' &&
      field.nebulaVisual
        ? [{ x: field.cx, y: field.cy, visual: field.nebulaVisual }]
        : []
    )));
  }, [localMap]);
  useEffect(() => {
    const expiresAt = localMap.tachyonScanExpiresAt;
    if (expiresAt == null || !onScanExpired) return;
    const timer = setTimeout(
      onScanExpired,
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [localMap.tachyonScanExpiresAt, onScanExpired]);
  const { shipX, shipY, sensorRange } = localMap;
  const cartographyPointKeys = new Set(
    cartographyPoints.map(({ x, y }) => `${x}:${y}`),
  );
  const bounds = localMap.bounds ?? {
    minX: Math.max(1, shipX - sensorRange),
    maxX: shipX + sensorRange,
    minY: Math.max(1, shipY - sensorRange),
    maxY: shipY + sensorRange,
  };
  const xValues = Array.from(
    { length: bounds.maxX - bounds.minX + 1 },
    (_, index) => bounds.minX + index,
  );
  const yValues = Array.from(
    { length: bounds.maxY - bounds.minY + 1 },
    (_, index) => bounds.minY + index,
  );

  const visibleTerrain = new Map(localMap.fields.filter((field) => !field.redacted && field.fieldType && field.fieldType.key !== 'UNKNOWN').map((field) => [
    'cx' in field ? `${field.cx},${field.cy}` : `${field.sx},${field.sy}`, field.fieldType,
  ]));
  const terrainNeighbors = (x: number, y: number) => [
    visibleTerrain.get(`${x},${y - 1}`),
    visibleTerrain.get(`${x + 1},${y}`),
    visibleTerrain.get(`${x},${y + 1}`),
    visibleTerrain.get(`${x - 1},${y}`),
    visibleTerrain.get(`${x - 1},${y - 1}`),
    visibleTerrain.get(`${x + 1},${y - 1}`),
    visibleTerrain.get(`${x + 1},${y + 1}`),
    visibleTerrain.get(`${x - 1},${y + 1}`),
  ];
  const terrainMask = (x: number, y: number, type: FieldType) => {
    const neighbors = terrainNeighbors(x, y);
    return nebulaEdgeMask(type, {
      top: neighbors[0], right: neighbors[1],
      bottom: neighbors[2], left: neighbors[3],
    });
  };
  const tracesByPosition = new Map<string, SubspaceTraceOverlay[]>();
  for (const trace of localMap.overlays?.subspaceTraces ?? []) {
    const key = `${trace.x},${trace.y}`;
    tracesByPosition.set(key, [...(tracesByPosition.get(key) ?? []), trace]);
  }
  const signaturesByPosition = new Map<string, string | number>(
    (localMap.overlays?.signatures ?? []).map(
      (signature: FieldSignatureOverlay) => [
        `${signature.x},${signature.y}`,
        signature.state === 'DUBIOUS' ? '!' : signature.count,
      ],
    ),
  );

  // STU's LSS tiles are large enough to inspect and target individually.
  // Keep the map scrollable instead of shrinking tiles as sensor range grows.
  const cellSize = 40;

  return (
    <div className="overflow-auto">
      {localMap.warning && (
        <div className="mb-2 border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          {localMap.warning}
        </div>
      )}
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `40px repeat(${xValues.length}, ${cellSize}px)`,
        }}
      >
        <div className="bg-swu-bg/50 text-sm font-bold text-swu-muted flex items-center justify-center">
          x|y
        </div>
        {xValues.map((x) => (
          <div
            key={`hx-${x}`}
            className="bg-swu-bg/50 text-sm font-bold text-swu-muted flex items-center justify-center"
          >
            {x}
          </div>
        ))}

        {yValues.map((y) => {
          return (
            <Fragment key={`row-${y}`}>
              <div className="bg-swu-bg/50 text-sm font-bold text-swu-muted flex items-center justify-center">
                {y}
              </div>
              {xValues.map((x) => {
                const isShip = x === shipX && y === shipY;
                const isTarget = navTarget?.x === x && navTarget?.y === y;
                const isCartographyPoint = cartographyPointKeys.has(
                  `${x}:${y}`,
                );
                const signatureCount = signaturesByPosition.get(`${x},${y}`);
                const subspaceTraces = tracesByPosition.get(`${x},${y}`) ?? [];
                const signatureLabel = signatureCount
                  ? `, ${signatureCount} sichtbare ${signatureCount === 1 ? 'Signatur' : 'Signaturen'}`
                  : '';

                if (localMap.mode === 'galaxy') {
                  const field = localMap.fields.find(
                    (f) => f.cx === x && f.cy === y,
                  );
                  if (!field) {
                    return (
                      <div
                        key={`void-${x}-${y}`}
                        className="bg-black border border-slate-900/50"
                        style={{ width: cellSize, height: cellSize }}
                      />
                    );
                  }
                  if (field.redacted || !field.fieldType || field.fieldType.key === 'UNKNOWN') {
                    return (
                      <div
                        key={`redacted-${x}-${y}`}
                        aria-label={`Feld ${x},${y}: Sensordaten blockiert`}
                        className="bg-black border border-slate-900/50"
                        style={{ width: cellSize, height: cellSize }}
                      />
                    );
                  }
                  const hasActiveNebulaVisual = field.fieldType.category === 'nebula' && Boolean(field.nebulaVisual);
                  const canReceiveCloud = hasActiveNebulaVisual || isNebulaCloudSpace(field.fieldType);
                  const nebulaStyle = field.nebulaTexture
                    ? { backgroundImage: `url(${field.nebulaTexture})`, backgroundSize: '100% 100%' }
                    : canReceiveCloud
                      ? getNebulaCloudDomStyle(nebulaCloudIndex, x, y)
                      : undefined;
                  const edgeMask = nebulaStyle ? undefined : terrainMask(x, y, field.fieldType);
                  const terrain = terrainAppearance(nebulaStyle ? { id: 1, key: 'EMPTY_SPACE' } : field.fieldType, x, y);
                  const fieldTileImage = terrain.image;
                  const systemAsset = field.systemTypeId
                    ? systemTypeImage(field.systemTypeId)
                    : null;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => onFieldClick(x, y)}
                      style={{ width: cellSize, height: cellSize }}
                      aria-label={`Feld ${x},${y}: ${field.fieldType.name}${field.starSystem ? `, ${field.starSystem.name}` : ''}${field.regionName ? `, Region: ${field.regionName}` : ''}${isShip ? ', aktuelles Schiff' : ''}${isTarget ? ', Ziel' : ''}${isCartographyPoint ? ', verbleibender Messpunkt' : ''}${signatureLabel}${anomalyText(field)}${fieldEffectText(field)}`}
                      className={[
                        'relative border text-[10px] flex items-center justify-center transition-all',
                        getGalaxyFieldStyle(field.fieldType.key),
                        isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                        isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                        isCartographyPoint
                          ? 'ring-2 ring-red-400/70 ring-inset z-10'
                          : '',
                        field.starSystemId
                          ? 'shadow-[0_0_8px_rgba(255,220,120,0.3)]'
                          : '',
                      ].join(' ')}
                      title={`[${x},${y}] ${field.fieldType.name}${field.starSystem ? ` · ${field.starSystem.name}` : ''}${field.regionName ? ` · Region: ${field.regionName}` : ''}${signatureLabel}${anomalyText(field)}`}
                    >
                      {systemAsset ? (
                        <img
                          src={systemAsset}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <img
                          src={fieldTileImage ?? undefined}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ opacity: terrain.alpha, filter: terrain.filter, ...(!nebulaStyle ? edgeMask : undefined) }}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {nebulaStyle && <div className="absolute inset-0" style={nebulaStyle} />}
                      {field.starSystemId
                        ? '✦'
                        : getGalaxyFieldMarker(field.fieldType.key)}
                      <AnomalyMarkers anomalies={field.anomalies} />
                      <SubspaceTraces traces={subspaceTraces} />
                      {isShip && shipCursorUrl && (
                        <img
                          src={shipCursorUrl}
                          alt=""
                          data-testid="ship-cursor"
                          style={{ transform: `rotate(${shipHeading}deg)` }}
                          className="pointer-events-none absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_3px_black]"
                        />
                      )}
                      {signatureCount != null && (
                        <span
                          className={[
                            'absolute z-40 font-bold text-white drop-shadow-[0_1px_1px_black]',
                            isShip && shipCursorUrl
                              ? 'bottom-0 right-0.5 text-xs leading-none'
                              : 'inset-0 grid place-items-center',
                          ].join(' ')}
                        >
                          {signatureCount}
                        </span>
                      )}
                    </button>
                  );
                }

                const field = localMap.fields.find(
                  (f) => f.sx === x && f.sy === y,
                );
                if (!field) {
                  return (
                    <div
                      key={`void-${x}-${y}`}
                      className="bg-black border border-slate-900/50"
                      style={{ width: cellSize, height: cellSize }}
                    />
                  );
                }
                if (field.redacted || !field.fieldType) {
                  return (
                    <div
                      key={`redacted-${x}-${y}`}
                      aria-label={`Feld ${x},${y}: Sensordaten blockiert`}
                      className="bg-black border border-slate-900/50"
                      style={{ width: cellSize, height: cellSize }}
                    />
                  );
                }
                const starConfig =
                  localMap.systemTypeId != null
                    ? (getStarTileConfig(localMap.systemTypeId) ?? null)
                    : null;
                const matchedStar = starConfig
                  ? localMap.stars?.find((star) => {
                      const config =
                        star.role === 'secondary'
                          ? starConfig.secondary
                          : starConfig.primary;
                      return (
                        config != null &&
                        getStarTileIdAt(
                          config,
                          x,
                          y,
                          star.centerX,
                          star.centerY,
                        ) != null
                      );
                    })
                  : undefined;
                const starTileId =
                  matchedStar && starConfig
                    ? getStarTileIdAt(
                        matchedStar.role === 'secondary'
                          ? (starConfig.secondary ?? starConfig.primary)
                          : starConfig.primary,
                        x,
                        y,
                        matchedStar.centerX,
                        matchedStar.centerY,
                      )
                    : null;
                const obj = field.celestialObject;
                const showStarTile =
                  starTileId != null &&
                  (obj == null || isStarObject(obj.classId));
                const starTileAsset =
                  showStarTile && starTileId != null
                    ? starTileImage(starTileId)
                    : null;
                const objectAsset =
                  obj?.classId != null ? planetThumbnail(obj.classId) : null;
                const terrain = terrainAppearance(field.fieldType, x, y);
                const fieldTileImage = terrain.image;
                const fallbackLabel = obj
                  ? OBJECT_TYPE_EMOJI[obj.objectType] || '●'
                  : field.fieldType.key === 'STAR_CORE'
                    ? '✦'
                    : field.fieldType.key === 'ASTEROID_CLUSTER'
                      ? '·'
                      : '';

                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => onFieldClick(x, y)}
                    style={{ width: cellSize, height: cellSize }}
                    aria-label={`Feld ${x},${y}: ${field.celestialObject?.name ?? field.fieldType.name}${isShip ? ', aktuelles Schiff' : ''}${isTarget ? ', Ziel' : ''}${isCartographyPoint ? ', verbleibender Messpunkt' : ''}${signatureLabel}${anomalyText(field)}${fieldEffectText(field)}`}
                    className={[
                      showStarTile
                        ? 'relative flex items-center justify-center overflow-hidden border-0 rounded-none'
                        : 'relative border rounded-sm text-[10px] flex items-center justify-center transition-all overflow-hidden',
                      getSystemFieldStyle(
                        showStarTile ? 'EMPTY_SPACE' : field.fieldType.key,
                      ),
                      field.fieldType.key === 'STAR_CORE' && !showStarTile
                        ? 'shadow-[0_0_14px_rgba(255,210,80,0.5)]'
                        : '',
                      isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                      isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                      isCartographyPoint
                        ? 'ring-2 ring-red-400/70 ring-inset z-10'
                        : '',
                    ].join(' ')}
                  >
                    {obj?.isColonizable && !isShip && (
                      <span className="absolute right-0.5 top-0.5 z-10 rounded bg-emerald-500/80 px-0.5 text-[7px] leading-none text-black">K</span>
                    )}
                    {starTileAsset ? (
                      <img
                        src={starTileAsset}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : objectAsset ? (
                      <PlanetImg
                        classId={obj!.classId!}
                        name={obj!.name}
                        objectType={obj!.objectType}
                        shielded={obj!.shielded}
                        thumbnail
                        className="relative z-10 h-full w-full object-contain"
                      />
                    ) : (
                      fallbackLabel
                    )}
                    {!starTileAsset && fieldTileImage && <img src={fieldTileImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: terrain.alpha, filter: terrain.filter, ...terrainMask(x, y, field.fieldType) }} />}
                    <AnomalyMarkers anomalies={field.anomalies} />
                    <SubspaceTraces traces={subspaceTraces} />
                    {isShip && shipCursorUrl && (
                      <img
                        src={shipCursorUrl}
                        alt=""
                        data-testid="ship-cursor"
                        style={{ transform: `rotate(${shipHeading}deg)` }}
                        className="pointer-events-none absolute inset-0 z-30 h-full w-full object-contain drop-shadow-[0_0_3px_black]"
                      />
                    )}
                    {signatureCount != null && (
                      <span
                        className={[
                          'absolute z-40 font-bold text-white drop-shadow-[0_1px_1px_black]',
                          isShip && shipCursorUrl
                            ? 'bottom-0 right-0.5 text-xs leading-none'
                            : 'inset-0 grid place-items-center',
                        ].join(' ')}
                      >
                        {signatureCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
