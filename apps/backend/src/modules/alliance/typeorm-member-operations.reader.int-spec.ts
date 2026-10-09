import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { ColonySocialService } from '../colony/colony-social.service';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyCrewTrainingQueue } from '../colony/entities/colony-crew-training-queue.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { GameDataService } from '../game-data/game-data.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { TypeOrmMemberOperationsReader } from './typeorm-member-operations.reader';

const SPACE_FIELD_TYPE_ID = 1;

describe('member operations reader (Postgres)', () => {
  let dataSource: DataSource;
  let reader: TypeOrmMemberOperationsReader;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const gameData = new GameDataService();
    gameData.onModuleInit();
    const stats = new ColonyStatsService(gameData);
    const crew = new ColonyCrewService(
      dataSource.getRepository(Colony),
      dataSource.getRepository(ColonyChangeable),
      dataSource.getRepository(ColonyCrewTrainingQueue),
      dataSource.getRepository(Crew),
      dataSource.getRepository(CrewAssignment),
      dataSource.getRepository(Spacecraft),
      stats,
      new ColonySocialService(gameData),
    );
    reader = new TypeOrmMemberOperationsReader(
      dataSource,
      crew,
      stats,
      gameData,
    );
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
  });

  const rebel = (overrides: Partial<User> = {}) =>
    createUser(dataSource, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
      ...overrides,
    });

  async function world() {
    const layer = await dataSource
      .getRepository(Layer)
      .save({ name: 'L', width: 100, height: 100 });
    const starSystem = await dataSource.getRepository(StarSystem).save({
      name: 'Hoth',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      systemTypeId: 1,
    });
    const systemField = await dataSource.getRepository(SystemField).save({
      starSystemId: starSystem.id,
      sx: 3,
      sy: 4,
      fieldTypeId: SPACE_FIELD_TYPE_ID,
    });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: systemField.id });
    const galaxyField = await dataSource.getRepository(GalaxyField).save({
      layerId: layer.id,
      cx: 7,
      cy: 8,
      fieldTypeId: SPACE_FIELD_TYPE_ID,
    });
    const galaxyLocation = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: galaxyField.id });
    const shipClass = await dataSource
      .getRepository(ShipClassDef)
      .save({ key: 'x-wing', name: 'X-Wing', category: 'FIGHTER', role: 'X' });
    return { starSystem, location, galaxyLocation, shipClass, layer };
  }

  const colony = (
    userId: number,
    starSystemId: number,
    overrides: Partial<Colony> = {},
  ) =>
    dataSource.getRepository(Colony).save({
      name: 'Basis',
      userId,
      starSystemId,
      posX: 2,
      posY: 5,
      colonyClassId: 1,
      energy: 7,
      energyMax: 70,
      population: 11,
      populationMax: 90,
      storageUsed: 12,
      storageMax: 3500,
      ...overrides,
    });

  it('loads colonies, ships, crew and activity of several players bundled', async () => {
    const { starSystem, location, galaxyLocation, shipClass } = await world();
    const leia = await rebel({
      username: 'leia',
      lastActiveAt: new Date('2026-10-08T10:00:00.000Z'),
    });
    const han = await rebel({ username: 'han' });
    const lando = await rebel({ username: 'lando' });

    await colony(leia.id, starSystem.id, { name: 'Hoth Base' });
    await colony(leia.id, starSystem.id, {
      name: 'Aufgegeben',
      isAbandoned: true,
    });
    await colony(han.id, starSystem.id, { name: 'Corellia' });
    await colony(lando.id, starSystem.id, { name: 'Nicht angefragt' });

    const ships = dataSource.getRepository(Spacecraft);
    const base = { shipClassId: shipClass.id };
    await ships.save({
      ...base,
      name: 'Red 5',
      userId: leia.id,
      locationId: location.id,
    });
    await ships.save({
      ...base,
      name: 'Wrack',
      userId: leia.id,
      locationId: location.id,
      status: SpacecraftStatus.DESTROYED,
    });
    await ships.save({
      ...base,
      name: 'Falke',
      userId: han.id,
      locationId: galaxyLocation.id,
    });

    const crewRepo = dataSource.getRepository(Crew);
    for (let i = 0; i < 3; i += 1) {
      const member = await crewRepo.save(
        crewRepo.create({
          userId: leia.id,
          type: CrewType.CREWMAN,
          name: `C${i}`,
        }),
      );
      await dataSource.getRepository(CrewAssignment).save({
        crewId: member.id,
        userId: leia.id,
        colonyId: null,
        spacecraftId: null,
        slot: CrewType.CREWMAN,
      });
    }

    const result = await reader.memberOperations([leia.id, han.id]);
    expect(result.map((r) => r.userId)).toEqual([leia.id, han.id]);

    const [l, h] = result;
    expect(l.lastActiveAt?.toISOString()).toBe('2026-10-08T10:00:00.000Z');
    expect(l.crew.assigned).toBe(3);
    expect(typeof l.crew.limit).toBe('number');
    expect(l.colonies.map((c) => c.name)).toEqual(['Hoth Base']);
    expect(l.colonies[0]).toMatchObject({
      location: { scope: 'SYSTEM', systemId: starSystem.id, x: 2, y: 5 },
    });
    expect(l.ships.map((s) => s.name)).toEqual(['Red 5']);
    expect(l.ships[0]).toMatchObject({
      shipClassName: 'X-Wing',
      location: { scope: 'SYSTEM', systemId: starSystem.id, x: 3, y: 4 },
    });

    expect(h.lastActiveAt).toBeNull();
    expect(h.crew).toEqual({ assigned: 0, limit: expect.any(Number) });
    expect(h.colonies.map((c) => c.name)).toEqual(['Corellia']);
    expect(h.ships[0].location).toMatchObject({ scope: 'GALAXY', x: 7, y: 8 });
  });

  it('returns an empty list for no players', async () => {
    await expect(reader.memberOperations([])).resolves.toEqual([]);
  });

  it('reads the stock of an active colony and nothing for abandoned or missing ones', async () => {
    const { starSystem } = await world();
    const leia = await rebel({ username: 'leia' });
    const active = await colony(leia.id, starSystem.id);
    const gone = await colony(leia.id, starSystem.id, { isAbandoned: true });
    const storage = dataSource.getRepository(ColonyStorage);
    await storage.save([
      { colonyId: active.id, commodityId: 2, amount: 30 },
      { colonyId: active.id, commodityId: 1, amount: 5 },
      { colonyId: active.id, commodityId: 3, amount: 0 },
      { colonyId: gone.id, commodityId: 1, amount: 9 },
    ]);

    const stock = await reader.colonyStock(active.id);
    expect(stock).toMatchObject({ colonyId: active.id, userId: leia.id });
    expect(stock?.items.map((i) => [i.commodityId, i.amount])).toEqual([
      [1, 5],
      [2, 30],
    ]);
    expect(stock?.items[0].name).toEqual(expect.any(String));
    await expect(reader.colonyStock(gone.id)).resolves.toBeNull();
    await expect(reader.colonyStock(999999)).resolves.toBeNull();
  });
});
