import { getGalaxyFieldStyle, getSystemFieldStyle } from './field-styles';
import { planetThumbnail } from '../../lib/assets';

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
  fields: SystemLocalField[];
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
  for (const s of localMap.ships ?? []) {
    const key = `${s.posX},${s.posY}`;
    if (!shipsByPos.has(key)) shipsByPos.set(key, []);
    shipsByPos.get(key)!.push(s);
  }

  const cellSize = sensorRange <= 3 ? 28 : sensorRange <= 5 ? 24 : 20;

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-px min-w-max"
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
                      {isShip
                        ? '🚀'
                        : shipsByPos.has(`${x},${y}`)
                          ? '⚔'
                          : field.starSystemId
                            ? '★'
                            : field.fieldType.key === 'NEBULA'
                              ? '·'
                              : ''}
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
                const obj = field.celestialObject;
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
                      'relative border rounded-sm text-[10px] flex items-center justify-center transition-all overflow-hidden',
                      getSystemFieldStyle(field.fieldType.key),
                      field.fieldType.key === 'STAR_CORE'
                        ? 'shadow-[0_0_14px_rgba(255,210,80,0.5)]'
                        : '',
                      isShip ? 'ring-2 ring-emerald-400 z-10' : '',
                      isTarget ? 'ring-2 ring-swu-accent z-10' : '',
                    ].join(' ')}
                    title={`[${x},${y}] ${field.fieldType.name}${obj ? ` · ${obj.name || 'Object'}` : ''}`}
                  >
                    {isShip ? (
                      '🚀'
                    ) : shipsByPos.has(`${x},${y}`) ? (
                      '⚔'
                    ) : hasImage ? (
                      <img
                        src={planetThumbnail(obj!.classId!)}
                        alt=""
                        className="w-full h-full object-contain"
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
