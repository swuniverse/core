import type { Spacecraft } from './entities/spacecraft.entity';

export type SpacecraftField =
  | { scope: 'SYSTEM'; systemId: number; x: number; y: number }
  | { scope: 'GALAXY'; layerId: number; x: number; y: number };

export function resolveSpacecraftField(
  ship: Pick<
    Spacecraft,
    | 'inSystem'
    | 'starSystemId'
    | 'currentSystemFieldX'
    | 'currentSystemFieldY'
    | 'currentLayerId'
    | 'posX'
    | 'posY'
  >,
): SpacecraftField | null {
  if (ship.inSystem) {
    if (
      ship.starSystemId == null ||
      ship.currentSystemFieldX == null ||
      ship.currentSystemFieldY == null
    ) {
      return null;
    }
    return {
      scope: 'SYSTEM',
      systemId: ship.starSystemId,
      x: ship.currentSystemFieldX,
      y: ship.currentSystemFieldY,
    };
  }
  if (ship.currentLayerId == null) return null;
  return {
    scope: 'GALAXY',
    layerId: ship.currentLayerId,
    x: ship.posX,
    y: ship.posY,
  };
}

export function matchesColonyOrbit(
  ship: Pick<
    Spacecraft,
    | 'inSystem'
    | 'starSystemId'
    | 'currentSystemFieldX'
    | 'currentSystemFieldY'
    | 'currentLayerId'
    | 'posX'
    | 'posY'
    | 'celestialObjectId'
  >,
  colony: {
    starSystemId: number | null;
    posX: number;
    posY: number;
    celestialObjectId: number | null;
  },
): boolean {
  const field = resolveSpacecraftField(ship);
  if (field?.scope === 'SYSTEM') {
    return (
      field.systemId === colony.starSystemId &&
      field.x === colony.posX &&
      field.y === colony.posY
    );
  }
  // ponytail: legacy fixtures without system-field coordinates use their object link.
  return (
    ship.starSystemId === colony.starSystemId &&
    ship.celestialObjectId != null &&
    ship.celestialObjectId === colony.celestialObjectId
  );
}

export function sameSpacecraftField(
  left: Parameters<typeof resolveSpacecraftField>[0],
  right: Parameters<typeof resolveSpacecraftField>[0],
): boolean {
  const a = resolveSpacecraftField(left);
  const b = resolveSpacecraftField(right);
  if (!a || !b || a.scope !== b.scope || a.x !== b.x || a.y !== b.y) {
    return false;
  }
  if (a.scope === 'SYSTEM' && b.scope === 'SYSTEM') {
    return a.systemId === b.systemId;
  }
  if (a.scope === 'GALAXY' && b.scope === 'GALAXY') {
    return a.layerId === b.layerId;
  }
  return false;
}
