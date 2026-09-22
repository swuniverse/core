import { resolveColonyLocation } from '../colony/colony-location';
import type { CelestialObject } from '../starmap/entities/celestial-object.entity';

export type SpaceLocationDto =
  | {
      scope: 'SYSTEM';
      locationId?: number;
      systemId: number;
      x: number;
      y: number;
    }
  | {
      scope: 'GALAXY';
      locationId?: number;
      layerId: number;
      x: number;
      y: number;
    };

export type SpacecraftField = SpaceLocationDto;

export type CanonicalSpaceLocation = {
  id?: number;
  kind: 'GALAXY_FIELD' | 'SYSTEM_FIELD';
  galaxyField?: {
    layerId: number;
    cx: number;
    cy: number;
    starSystemId?: number | null;
  } | null;
  systemField?: {
    starSystemId: number;
    sx: number;
    sy: number;
    celestialObjectId?: number | null;
    celestialObject?: CelestialObject | null;
    starSystem?: {
      layerId: number;
      cx: number;
      cy: number;
    };
  } | null;
};

export function resolveSpaceLocation(
  location: CanonicalSpaceLocation | null | undefined,
): SpaceLocationDto | null {
  if (location?.kind === 'SYSTEM_FIELD' && location.systemField) {
    return {
      scope: 'SYSTEM',
      locationId: location.id,
      systemId: location.systemField.starSystemId,
      x: location.systemField.sx,
      y: location.systemField.sy,
    };
  }
  if (location?.kind === 'GALAXY_FIELD' && location.galaxyField) {
    return {
      scope: 'GALAXY',
      locationId: location.id,
      layerId: location.galaxyField.layerId,
      x: location.galaxyField.cx,
      y: location.galaxyField.cy,
    };
  }
  return null;
}

export type SpacecraftLocationSource = {
  locationId?: number;
  location: CanonicalSpaceLocation;
};

export function resolveSpacecraftLocation(
  ship: SpacecraftLocationSource,
): SpaceLocationDto | null {
  return resolveSpaceLocation(ship.location);
}

export function resolveSpacecraftField(
  ship: SpacecraftLocationSource,
): SpacecraftField | null {
  return resolveSpacecraftLocation(ship);
}

export function sameSpaceLocation(
  left: SpaceLocationDto | null | undefined,
  right: SpaceLocationDto | null | undefined,
): boolean {
  if (
    !left ||
    !right ||
    left.scope !== right.scope ||
    left.x !== right.x ||
    left.y !== right.y
  ) {
    return false;
  }
  if (left.scope === 'SYSTEM' && right.scope === 'SYSTEM') {
    return left.systemId === right.systemId;
  }
  if (left.scope === 'GALAXY' && right.scope === 'GALAXY') {
    return left.layerId === right.layerId;
  }
  return false;
}

export function projectSpacecraftLocationToGalaxy(
  ship: SpacecraftLocationSource,
): Extract<SpaceLocationDto, { scope: 'GALAXY' }> | null {
  const location = ship.location;
  if (location?.kind === 'SYSTEM_FIELD') {
    const galaxyField =
      location.galaxyField ?? location.systemField?.starSystem;
    if (galaxyField) {
      return {
        scope: 'GALAXY',
        layerId: galaxyField.layerId,
        x: galaxyField.cx,
        y: galaxyField.cy,
      };
    }
    return null;
  }

  const resolved = resolveSpacecraftLocation(ship);
  return resolved?.scope === 'GALAXY' ? resolved : null;
}

export function resolveContextualCelestialObject(
  ship: SpacecraftLocationSource,
): CelestialObject | null {
  return ship.location.kind === 'SYSTEM_FIELD'
    ? (ship.location.systemField?.celestialObject ?? null)
    : null;
}

export function resolveContextualCelestialObjectId(
  ship: SpacecraftLocationSource,
): number | null {
  return ship.location.kind === 'SYSTEM_FIELD'
    ? (ship.location.systemField?.celestialObjectId ?? null)
    : null;
}

export function matchesColonyOrbit(
  ship: SpacecraftLocationSource,
  colony: {
    starSystemId: number | null;
    posX: number;
    posY: number;
    celestialObjectId: number | null;
    systemFieldId?: number | null;
    systemField?: {
      starSystemId: number;
      sx: number;
      sy: number;
    } | null;
  },
): boolean {
  const shipLocation = resolveSpacecraftLocation(ship);
  const colonyLocation = resolveColonyLocation(colony);
  if (shipLocation?.scope === 'SYSTEM' && colonyLocation) {
    return sameSpaceLocation(shipLocation, colonyLocation);
  }

  return false;
}

export function sameSpacecraftField(
  left: Parameters<typeof resolveSpacecraftField>[0],
  right: Parameters<typeof resolveSpacecraftField>[0],
): boolean {
  return sameSpaceLocation(
    resolveSpacecraftField(left),
    resolveSpacecraftField(right),
  );
}

export function sameSpacecraftLocation(
  left: SpacecraftLocationSource,
  right: SpacecraftLocationSource,
): boolean {
  if (left.locationId != null && right.locationId != null) {
    return left.locationId === right.locationId;
  }
  return sameSpaceLocation(
    resolveSpacecraftLocation(left),
    resolveSpacecraftLocation(right),
  );
}
