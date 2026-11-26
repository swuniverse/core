import { FieldEffect } from '@swuniverse/shared';
import { GalaxyFieldDetailsQuery } from './galaxy-field-details.query';
import { InfluenceSourceType } from './entities/influence-area.entity';
import type { GalaxyField } from './entities/galaxy-field.entity';

const repo = (rows: unknown[] = []) => ({ find: jest.fn(async () => rows) });

function field(overrides: Partial<GalaxyField>): GalaxyField {
  return {
    id: 1,
    cx: 1,
    cy: 1,
    regionId: null,
    starSystemId: null,
    adminRegionKey: null,
    effects: null,
    isPassable: true,
    passableOverride: null,
    fieldType: { effects: null },
    ...overrides,
  } as GalaxyField;
}

function setup() {
  const repos = {
    influence: repo([
      { id: 1, cx: 1, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 50, strength: 0.9 },
      { id: 2, cx: 1, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 51, strength: 0.4 },
      { id: 3, cx: 2, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 51, strength: 0.8 },
      { id: 4, cx: 3, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 50, strength: 0.8 },
      { id: 5, cx: 4, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 99, strength: 0.9 },
      { id: 6, cx: 4, cy: 1, sourceType: InfluenceSourceType.STATION, sourceId: 51, strength: 0.2 },
    ]),
    spacecraft: repo([
      { id: 50, userId: 7 },
      { id: 51, userId: 8 },
    ]),
    users: repo([
      { id: 7, username: 'Mon Mothma' },
      { id: 8, username: 'Lando' },
    ]),
    memberships: repo([{ userId: 7, alliance: { id: 3, name: 'Rebellenallianz' } }]),
    posts: repo([
      { id: 20, name: 'Posten Bespin', locationId: 200 },
      { id: 21, name: 'Verlassener Posten', ownerId: null, locationId: 201 },
      { id: 22, name: 'Posten Tatooine', locationId: 202 },
    ]),
    conditions: repo([{ tradePostId: 20, commodityId: 5, amount: 100, durationDays: 7 }]),
    locations: repo([
      { id: 200, galaxyFieldId: 1, systemField: null },
      { id: 201, galaxyFieldId: 2, systemField: null },
      { id: 202, galaxyFieldId: null, systemField: { starSystemId: 90 } },
    ]),
    regions: repo([{ id: 4, name: 'Kernwelten', description: 'Zentrum', colorKey: 'core' }]),
    regionDiscoveries: repo([{ userId: 7, mapRegionId: 4 }]),
    systemExplorations: repo([{ starSystemId: 90 }]),
  };
  const query = new GalaxyFieldDetailsQuery(
    repos.influence as never,
    repos.spacecraft as never,
    repos.users as never,
    repos.memberships as never,
    repos.posts as never,
    repos.conditions as never,
    repos.locations as never,
    repos.regions as never,
    repos.regionDiscoveries as never,
    repos.systemExplorations as never,
    { getCommodity: (id: number) => (id === 5 ? { name: 'Tibanna' } : undefined) } as never,
  );
  return { query, repos };
}

describe('GalaxyFieldDetailsQuery', () => {
  it('names the alliance and player of the strongest station influence', async () => {
    const { query } = setup();
    const details = await query.load(7, 1, [
      field({ id: 1, cx: 1 }),
      field({ id: 2, cx: 2 }),
    ]);

    expect(details.get(1)?.territoryOwner).toEqual({
      playerId: 7,
      playerName: 'Mon Mothma',
      allianceId: 3,
      allianceName: 'Rebellenallianz',
    });
    expect(details.get(2)?.territoryOwner).toEqual({
      playerId: 8,
      playerName: 'Lando',
      allianceId: null,
      allianceName: null,
    });
  });

  it('falls back to the strongest station that still exists', async () => {
    const { query, repos } = setup();
    const details = await query.load(7, 1, [field({ id: 4, cx: 4 })]);

    expect(details.get(4)?.territoryOwner?.playerName).toBe('Lando');
    expect(repos.spacecraft.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ kind: 'STATION' }) }),
    );
  });

  it('has no territory owner in admin regions or without station influence', async () => {
    const { query } = setup();
    const details = await query.load(7, 1, [
      field({ id: 3, cx: 3, adminRegionKey: 'imperial-core' }),
      field({ id: 4, cx: 9 }),
    ]);

    expect(details.get(3)?.territoryOwner).toBeNull();
    expect(details.get(4)?.territoryOwner).toBeNull();
  });

  it('lists trade posts with their license condition, abandoned ones by name, system posts on the system field', async () => {
    const { query } = setup();
    const details = await query.load(7, 1, [
      field({ id: 1, cx: 1 }),
      field({ id: 2, cx: 2 }),
      field({ id: 5, cx: 5, starSystemId: 90 }),
      field({ id: 6, cx: 6 }),
    ]);

    expect(details.get(1)?.tradePost).toEqual({
      id: 20,
      name: 'Posten Bespin',
      licenseCondition: { commodityId: 5, commodityName: 'Tibanna', amount: 100, durationDays: 7 },
    });
    expect(details.get(2)?.tradePost).toEqual({
      id: 21,
      name: 'Verlassener Posten',
      licenseCondition: null,
    });
    expect(details.get(5)?.tradePost?.name).toBe('Posten Tatooine');
    expect(details.get(6)?.tradePost).toBeNull();
  });

  it('reveals region and database link only after the viewer discovered them', async () => {
    const { query, repos } = setup();
    repos.regionDiscoveries.find.mockResolvedValueOnce([]);
    repos.systemExplorations.find.mockResolvedValueOnce([]);
    const unknown = await query.load(7, 1, [field({ id: 5, regionId: 4, starSystemId: 90 })]);
    expect(unknown.get(5)).toMatchObject({ region: null, databaseSystemId: null });

    const known = await query.load(7, 1, [field({ id: 5, regionId: 4, starSystemId: 90 })]);
    for (const knowledge of [repos.regionDiscoveries, repos.systemExplorations]) {
      expect(knowledge.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) }),
      );
    }
    expect(known.get(5)).toMatchObject({
      region: { id: 4, name: 'Kernwelten', description: 'Zentrum' },
      databaseSystemId: 90,
    });
  });

  it('describes field and field-type effects in German and derives impassability', async () => {
    const { query } = setup();
    const details = await query.load(7, 1, [
      field({
        id: 1,
        effects: [FieldEffect.EPS_LEAK, 'UNKNOWN_EFFECT'],
        fieldType: { effects: [FieldEffect.CLOAK_UNUSEABLE, FieldEffect.EPS_LEAK] } as never,
        isPassable: true,
        passableOverride: false,
      }),
    ]);

    expect(details.get(1)).toMatchObject({
      effectTexts: ['Leck am EPS', 'Ausfall der Tarnung'],
      isImpassable: true,
    });
  });

  it('loads each source once per layer, independent of the field count', async () => {
    const { query, repos } = setup();
    await query.load(
      7,
      1,
      Array.from({ length: 50 }, (_, i) =>
        field({ id: i + 1, cx: i + 1, regionId: 4, starSystemId: i === 0 ? 90 : null }),
      ),
    );

    for (const sourceRepo of Object.values(repos)) {
      expect(sourceRepo.find).toHaveBeenCalledTimes(1);
    }
  });
});
