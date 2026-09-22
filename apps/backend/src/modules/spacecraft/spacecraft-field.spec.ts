import {
  projectSpacecraftLocationToGalaxy,
  resolveContextualCelestialObject,
  resolveContextualCelestialObjectId,
  resolveSpacecraftLocation,
  sameSpaceLocation,
  sameSpacecraftLocation,
} from './spacecraft-field';

describe('spacecraft location helpers', () => {
  it('resolves a canonical system-field relation', () => {
    expect(
      resolveSpacecraftLocation({
        location: {
          id: 11,
          kind: 'SYSTEM_FIELD',
          systemField: {
            starSystemId: 7,
            sx: 8,
            sy: 9,
            celestialObjectId: 10,
          },
        },
      } as never),
    ).toEqual({ locationId: 11, scope: 'SYSTEM', systemId: 7, x: 8, y: 9 });
  });

  it('resolves a canonical galaxy-field relation', () => {
    expect(
      resolveSpacecraftLocation({
        location: {
          id: 12,
          kind: 'GALAXY_FIELD',
          galaxyField: { layerId: 4, cx: 5, cy: 6 },
        },
      } as never),
    ).toEqual({ locationId: 12, scope: 'GALAXY', layerId: 4, x: 5, y: 6 });
  });

  it('compares scope, parent and coordinates', () => {
    expect(
      sameSpaceLocation(
        { scope: 'SYSTEM', systemId: 1, x: 2, y: 3 },
        { scope: 'SYSTEM', systemId: 1, x: 2, y: 3 },
      ),
    ).toBe(true);
    expect(
      sameSpaceLocation(
        { scope: 'SYSTEM', systemId: 1, x: 2, y: 3 },
        { scope: 'SYSTEM', systemId: 2, x: 2, y: 3 },
      ),
    ).toBe(false);
    expect(
      sameSpaceLocation(
        { scope: 'GALAXY', layerId: 1, x: 2, y: 3 },
        { scope: 'SYSTEM', systemId: 1, x: 2, y: 3 },
      ),
    ).toBe(false);
  });

  it('compares canonical location ids', () => {
    expect(
      sameSpacecraftLocation(
        { locationId: 10 } as never,
        { locationId: 11 } as never,
      ),
    ).toBe(false);
    expect(
      sameSpacecraftLocation(
        { locationId: 10 } as never,
        { locationId: 10 } as never,
      ),
    ).toBe(true);
  });

  it('projects a system location through its related galaxy field', () => {
    expect(
      projectSpacecraftLocationToGalaxy({
        location: {
          kind: 'SYSTEM_FIELD',
          systemField: {
            starSystemId: 7,
            sx: 8,
            sy: 9,
            starSystem: { layerId: 4, cx: 5, cy: 6 },
          },
        },
      } as never),
    ).toEqual({ scope: 'GALAXY', layerId: 4, x: 5, y: 6 });
  });

  it('derives the contextual object from the canonical system field', () => {
    const celestialObject = { id: 10 } as never;
    expect(
      resolveContextualCelestialObject({
        location: {
          kind: 'SYSTEM_FIELD',
          systemField: {
            starSystemId: 7,
            sx: 8,
            sy: 9,
            celestialObject,
          },
        },
      } as never),
    ).toBe(celestialObject);
    expect(
      resolveContextualCelestialObjectId({
        location: {
          kind: 'SYSTEM_FIELD',
          systemField: {
            starSystemId: 7,
            sx: 8,
            sy: 9,
            celestialObjectId: 10,
          },
        },
      } as never),
    ).toBe(10);
  });
});
