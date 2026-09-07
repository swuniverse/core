import {
  getGalaxyFieldMarker,
  getGalaxyFieldStyle,
  getSystemFieldStyle,
} from './field-styles';
import { planetThumbnail, spaceBackgroundTile, starTileImage } from '../../lib/assets';
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
  } | null;
}

export interface NearbyShip {
  id: number;
  name: string;
  userId: number;
  username: string | null;
  shipClassId: number;
  posX: number;
  posY: number;
  status: string;
  onSameField: boolean;
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
}

export interface LocalMapGalaxy {
  mode: 'galaxy';
  shipX: number;
  shipY: number;
  sensorRange: number;
  fields: GalaxyLocalField[];
  ships?: NearbyShip[];
  canEnterSystem: boolean;
  canLeaveSystem: boolean;
  context?: LocalMapContext;
}
export interface LocalMapSystem {
  mode: 'system';
  shipX: number;
  shipY: number;
  sensorRange: number;
  systemId: number;
  systemName: string | null;
  systemTypeId?: number;
  fields: SystemLocalField[];
  stars?: Array<{
    centerX: number;
    centerY: number;
    role: 'primary' | 'secondary';
  }>;
  ships?: NearbyShip[];
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
  const gridSize = 2 * sensorRange + 1;
  const minX = shipX - sensorRange;
  const minY = shipY - sensorRange;

  const shipsByPos = new Map<string, NearbyShip[]>();
  for (const ship of localMap.ships ?? []) {
    const key = `${ship.posX},${ship.posY}`;
    const shipsAtPosition = shipsByPos.get(key);
    if (shipsAtPosition) shipsAtPosition.push(ship);
    else shipsByPos.set(key, [ship]);
  }

  const cellSize = sensorRange <= 3 ? 28 : sensorRange <= 5 ? 24 : 20;

  return (
    <div className="overflow-auto">
      <div className="grid min-w-max"
        style={{
          gridTemplateColumns: `32px repeat(${gridSize}, ${cellSize}px)`,
        }}
      >
        <div className="bg-swu-bg/50 text-[9px] text-swu-muted flex items-center justify-center">
          x|y
        </div>
        {Array.from({ length: gridSize }, (_, i) => (
          <div
            key={`hx-${i}`}
            className="bg-swu-bg/50 text-[9px] text-swu-muted flex items-center justify-center"
          >
            {minX + i}
          </div>
        ))}

        {Array.from({ length: gridSize }, (_, row) => {
          const y = minY + row;
          return (
            <>
              <div
                key={`hy-${y}`}
                className="bg-swu-bg/50 text-[9px] text-swu-muted flex items-center justify-center"
              >
                {y}
              </div>
              {Array.from({ length: gridSize }, (_, col) => {
                const x = minX + col;
                const isShip = x === shipX && y === shipY;
                const isTarget = navTarget?.x === x && navTarget?.y === y;

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
                  return (
                    <button
                      key={field.id}
                      onClick={() => onFieldClick(x, y)}
                      style={{ width: cellSize, height: cellSize }}
                      className={[
                        'relative border text-[10px] flex items-center justify-center transition-all',
                        getGalaxyFieldStyle(field.fieldType.key),
                        isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                        isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                        field.starSystemId
                          ? 'shadow-[0_0_8px_rgba(255,220,120,0.3)]'
                          : '',
                      ].join(' ')}
                      title={`[${x},${y}] ${field.fieldType.name}${field.starSystem ? ` · ${field.starSystem.name}` : ''}`}
                    >
                      <img
                        src={fieldTileImage}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-90"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                      {isShip
                        ? '▲'
                        : shipsByPos.has(`${x},${y}`)
                          ? '◆'
                          : field.starSystemId
                            ? '✦'
                            : getGalaxyFieldMarker(field.fieldType.key)}
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
                    ? getStarTileConfig(localMap.systemTypeId) ?? null
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
                    onClick={() => onFieldClick(x, y)}
                    style={{ width: cellSize, height: cellSize }}
                    className={[
                      starTileId != null
                        ? 'relative flex items-center justify-center overflow-hidden border-0 rounded-none'
                        : 'relative border rounded-sm text-[10px] flex items-center justify-center transition-all overflow-hidden',
                      getSystemFieldStyle(
                        starTileId != null ? 'EMPTY_SPACE' : field.fieldType.key,
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
                    {isShip ? (
                      '▲'
                    ) : shipsByPos.has(`${x},${y}`) ? (
                      '◆'
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
                  </button>
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}
