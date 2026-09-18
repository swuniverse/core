import { Fragment } from 'react';
import {
  getGalaxyFieldMarker,
  getGalaxyFieldStyle,
  getSystemFieldStyle,
} from './field-styles';
import {
  planetThumbnail,
  spaceBackgroundTile,
  starTileImage,
  systemTypeImage,
} from '../../lib/assets';
import { getStarTileConfig, getStarTileIdAt } from '../../lib/star-tiles';

interface FieldType {
  id: number;
  key: string;
  name: string;
}

interface GalaxyLocalField {
  id: number;
  cx: number;
  cy: number;
  fieldType: FieldType;
  starSystemId: number | null;
  systemTypeId?: number | null;
  starSystem: { id: number; name: string } | null;
  isPassable?: boolean;
}

interface SystemLocalField {
  id: number;
  sx: number;
  sy: number;
  fieldType: FieldType;
  celestialObjectId: number | null;
  celestialObject: {
    id: number;
    name: string | null;
    objectType: number;
    classId: number | null;
    posX: number;
    posY: number;
    isColonizable?: boolean;
    colonyId?: number | null;
    colonyName?: string | null;
  } | null;
}

export interface FieldSignatureOverlay {
  x: number;
  y: number;
  visibleCount: number;
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
  mode: 'galaxy';
  shipX: number;
  shipY: number;
  sensorRange: number;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  fields: GalaxyLocalField[];
  overlays?: { signatures: FieldSignatureOverlay[] };
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
  context?: LocalMapContext;
}
export interface LocalMapSystem {
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
  overlays?: { signatures: FieldSignatureOverlay[] };
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
  context?: LocalMapContext;
}

export type LocalMapResponse = LocalMapGalaxy | LocalMapSystem;

interface LssMapProps {
  localMap: LocalMapResponse;
  navTarget: { x: number; y: number } | null;
  onFieldClick: (x: number, y: number) => void;
}

const OBJECT_TYPE_EMOJI: Record<number, string> = {
  1: '🪐',
  2: '🌙',
  3: '☄️',
};

export function LssMap({ localMap, navTarget, onFieldClick }: LssMapProps) {
  const { shipX, shipY, sensorRange } = localMap;
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

  const signaturesByPosition = new Map<string, number>(
    (localMap.overlays?.signatures ?? []).map(
      (signature: FieldSignatureOverlay) => [
        `${signature.x},${signature.y}`,
        signature.visibleCount,
      ],
    ),
  );

  // STU's LSS tiles are large enough to inspect and target individually.
  // Keep the map scrollable instead of shrinking tiles as sensor range grows.
  const cellSize = 40;

  return (
    <div className="overflow-auto">
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
                const wreck = localMap.wrecks?.find(
                  (entry) => entry.x === x && entry.y === y,
                );
                const signatureCount = signaturesByPosition.get(`${x},${y}`);
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
                  const fieldTileImage =
                    field.fieldType.key === 'EMPTY_SPACE'
                      ? spaceBackgroundTile(x, y)
                      : starTileImage(field.fieldType.id);
                  const systemAsset = field.systemTypeId
                    ? systemTypeImage(field.systemTypeId)
                    : null;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => onFieldClick(x, y)}
                      style={{ width: cellSize, height: cellSize }}
                      aria-label={`Feld ${x},${y}: ${field.fieldType.name}${field.starSystem ? `, ${field.starSystem.name}` : ''}${isShip ? ', aktuelles Schiff' : ''}${isTarget ? ', Ziel' : ''}${signatureLabel}`}
                      className={[
                        'relative border text-[10px] flex items-center justify-center transition-all',
                        getGalaxyFieldStyle(field.fieldType.key),
                        isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                        isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                        field.starSystemId
                          ? 'shadow-[0_0_8px_rgba(255,220,120,0.3)]'
                          : '',
                      ].join(' ')}
                      title={`[${x},${y}] ${field.fieldType.name}${field.starSystem ? ` · ${field.starSystem.name}` : ''}${signatureLabel}`}
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
                          src={fieldTileImage}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-90"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {wreck
                        ? '✹'
                        : field.starSystemId
                          ? '✦'
                          : getGalaxyFieldMarker(field.fieldType.key)}
                      {signatureCount != null && (
                        <span className="absolute inset-0 z-20 grid place-items-center font-bold text-white drop-shadow-[0_1px_1px_black]">
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
                const fieldTileImage =
                  field.fieldType.key === 'EMPTY_SPACE' ||
                  field.fieldType.key === 'DEEP_SPACE'
                    ? spaceBackgroundTile(x, y)
                    : starTileImage(field.fieldType.id);
                const hasImage = obj?.classId != null;
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
                    aria-label={`Feld ${x},${y}: ${field.celestialObject?.name ?? field.fieldType.name}${isShip ? ', aktuelles Schiff' : ''}${isTarget ? ', Ziel' : ''}${signatureLabel}`}
                    className={[
                      starTileId != null
                        ? 'relative flex items-center justify-center overflow-hidden border-0 rounded-none'
                        : 'relative border rounded-sm text-[10px] flex items-center justify-center transition-all overflow-hidden',
                      getSystemFieldStyle(
                        starTileId != null
                          ? 'EMPTY_SPACE'
                          : field.fieldType.key,
                      ),
                      field.fieldType.key === 'STAR_CORE' && starTileId == null
                        ? 'shadow-[0_0_14px_rgba(255,210,80,0.5)]'
                        : '',
                      isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                      isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                    ].join(' ')}
                  >
                    {starTileId == null && !hasImage && (
                      <img
                        src={fieldTileImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-90"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    {obj?.isColonizable && !isShip && (
                      <span className="absolute right-0.5 top-0.5 z-10 rounded bg-emerald-500/80 px-0.5 text-[7px] leading-none text-black">
                        K
                      </span>
                    )}
                    {wreck ? (
                      <span className="text-amber-300">✹</span>
                    ) : starTileId != null ? (
                      <img
                        src={starTileImage(starTileId)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : hasImage ? (
                      <img
                        src={planetThumbnail(obj!.classId!)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      fallbackLabel
                    )}
                    {signatureCount != null && (
                      <span className="absolute inset-0 z-20 grid place-items-center font-bold text-white drop-shadow-[0_1px_1px_black]">
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
