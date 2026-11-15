import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WsEventType } from '@swuniverse/shared';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { AddDatabaseCategoryAwards20261115120000 } from '../../database/migrations/20261115120000-add-database-category-awards';
import { User } from '../auth/user.entity';
import { AwardService } from '../awards/award.service';
import { DatabaseCategoryAward } from '../awards/entities/database-category-award.entity';
import { UserAward } from '../awards/entities/user-award.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { ShipClassDiscovery } from '../spacecraft/entities/ship-class-discovery.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { SYSTEM_TYPE_DEFINITIONS } from '../starmap/starmap-system-types';
import { GameGateway } from '../websocket/game.gateway';
import { DatabaseCompletionService } from './database-completion.service';
import { DatabaseService } from './database.service';

describe('database category completion (PostgreSQL)', () => {
  let dataSource: DataSource;
  let service: DatabaseCompletionService;
  let close: () => Promise<void>;
  const emitToUser = jest.fn();
  const prestige = { change: jest.fn(async () => undefined) };
  let player: User;
  let npc: User;
  let core: Layer;
  let outer: Layer;
  let coreSystems: StarSystem[];

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const dependencies: Type<unknown>[] =
      Reflect.getMetadata('design:paramtypes', DatabaseService) ?? [];
    // Injection tokens (repositories, symbols) the progress queries do not use.
    const realTokens = new Set<unknown>(INTEGRATION_ENTITIES.map((entity) => getRepositoryToken(entity)));
    const injected: Array<{ param: unknown }> =
      Reflect.getMetadata('self:paramtypes', DatabaseService) ?? [];
    const module = await Test.createTestingModule({
      providers: [
        ...dependencies.map((provide) => ({ provide, useValue: {} })),
        ...injected
          .filter(({ param }) => !realTokens.has(param))
          .map(({ param }) => ({ provide: param as string, useValue: {} })),
        ...INTEGRATION_ENTITIES.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: dataSource.getRepository(entity),
        })),
        { provide: DataSource, useValue: dataSource },
        { provide: GameDataService, useValue: new GameDataService() },
        { provide: GameGateway, useValue: { emitToUser, emitToAll: jest.fn() } },
        {
          provide: AwardService,
          useFactory: () =>
            new AwardService(
              dataSource.getRepository(UserAward),
              prestige as unknown as PrestigeService,
              { sendSystem: jest.fn(async () => undefined) } as unknown as MessagingService,
            ),
        },
        DatabaseService,
        DatabaseCompletionService,
      ],
    }).compile();
    service = module.get(DatabaseCompletionService);
    close = () => module.close();
  });
  afterAll(async () => {
    await close?.();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    emitToUser.mockClear();
    prestige.change.mockClear();
    player = await createUser(dataSource);
    npc = await createUser(dataSource, { isNpc: true });
    core = await dataSource.getRepository(Layer).save({ name: 'Kern', width: 10, height: 10, isHidden: false });
    outer = await dataSource.getRepository(Layer).save({ name: 'Rand', width: 10, height: 10, isHidden: false });
    coreSystems = await dataSource.getRepository(StarSystem).save(
      [1, 2].map((cx) => ({ name: `Kern ${cx}`, layerId: core.id, cx, cy: 1, systemTypeId: 1 })),
    );
    await dataSource
      .getRepository(StarSystem)
      .save({ name: 'Rand 1', layerId: outer.id, cx: 1, cy: 1, systemTypeId: 1 });
    // Productive mappings exactly as the migration creates them.
    const runner = dataSource.createQueryRunner();
    try {
      await new AddDatabaseCategoryAwards20261115120000().up(runner);
    } finally {
      await runner.release();
    }
  });

  const explore = (user: User, systems: StarSystem[]) =>
    dataSource
      .getRepository(SystemExploration)
      .save(systems.map((system) => ({ userId: user.id, starSystemId: system.id })));
  const awardsOf = async (user: User) =>
    (await dataSource.getRepository(UserAward).find({ where: { userId: user.id } }))
      .map((award) => award.awardKey)
      .sort();

  it('maintains the productive category mappings with one star system award per layer', async () => {
    const mappings = await dataSource
      .getRepository(DatabaseCategoryAward)
      .find({ relations: ['award'], order: { id: 'ASC' } });
    expect(mappings.map(({ category, layerId, awardKey, award }) => [category, layerId, awardKey, award.prestige])).toEqual([
      ['SHIP_HULLS', null, 'DATABASE_SHIP_HULLS', 25],
      ['PLANET_TYPES', null, 'DATABASE_PLANET_TYPES', 50],
      ['SYSTEM_TYPES', null, 'DATABASE_SYSTEM_TYPES', 75],
      ['SYSTEMS', core.id, `DATABASE_SYSTEMS_L${core.id}`, 25],
      ['SYSTEMS', outer.id, `DATABASE_SYSTEMS_L${outer.id}`, 25],
    ]);
    expect(mappings[3].award.description).toBe('Der Spieler hat sämtliche Sternensysteme der Ebene Kern kartographiert');
    await expect(
      dataSource.query(`INSERT INTO "database_category_awards" ("category", "layerId", "awardKey") VALUES ('REGIONS', NULL, 'DATABASE_SHIP_HULLS')`),
    ).rejects.toThrow();
    await expect(
      dataSource.query(`INSERT INTO "database_category_awards" ("category", "layerId", "awardKey") VALUES ('SYSTEMS', NULL, 'DATABASE_SHIP_HULLS')`),
    ).rejects.toThrow();
  });

  it('grants the layer award only for the completed layer, once, with an award event', async () => {
    await explore(player, [coreSystems[0]]);
    await expect(service.checkCompletion(player.id, 'SYSTEMS', core.id)).resolves.toEqual([]);

    await explore(player, [coreSystems[1]]);
    await expect(service.checkCompletion(player.id, 'SYSTEMS', core.id)).resolves.toEqual([`DATABASE_SYSTEMS_L${core.id}`]);
    await expect(service.checkCompletion(player.id, 'SYSTEMS')).resolves.toEqual([]);

    expect(await awardsOf(player)).toEqual([`DATABASE_SYSTEMS_L${core.id}`]);
    expect(prestige.change).toHaveBeenCalledTimes(1);
    expect(emitToUser).toHaveBeenCalledWith(player.id, WsEventType.AWARD_GRANTED, {
      awardKey: `DATABASE_SYSTEMS_L${core.id}`,
      description: 'Der Spieler hat sämtliche Sternensysteme der Ebene Kern kartographiert',
    });
  });

  it('grants a category without layer once it is complete', async () => {
    await dataSource.getRepository(SystemTypeDiscovery).save(
      SYSTEM_TYPE_DEFINITIONS.slice(1).map((definition) => ({
        userId: player.id,
        systemTypeId: definition.id,
        source: 'SECTOR_SCAN' as const,
      })),
    );
    await expect(service.checkCompletion(player.id, 'SYSTEM_TYPES')).resolves.toEqual([]);

    await dataSource.getRepository(SystemTypeDiscovery).save({
      userId: player.id,
      systemTypeId: SYSTEM_TYPE_DEFINITIONS[0].id,
      source: 'SECTOR_SCAN',
    });
    await expect(service.checkCompletion(player.id, 'SYSTEM_TYPES')).resolves.toEqual(['DATABASE_SYSTEM_TYPES']);
    await expect(service.checkCompletion(player.id, 'SYSTEM_TYPES')).resolves.toEqual([]);
  });

  it('counts only playable ship hulls against the catalog', async () => {
    const [hull, npcHull] = await dataSource.getRepository(ShipClassDef).save([
      { key: 'X_WING', name: 'X-Wing', category: 'FIGHTER', role: 'FIGHTER' },
      { key: 'HUTT_YACHT', name: 'Hutten-Jacht', category: 'FREIGHTER', role: 'TRADER', isNpc: true },
    ]);
    const fieldTypeId = (await dataSource.getRepository(GalaxyFieldType).findOneByOrFail({})).id;
    const field = await dataSource.getRepository(GalaxyField).save({ layerId: core.id, cx: 5, cy: 5, fieldTypeId });
    const { id: locationId } = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: field.id });
    const [scanner, scanned] = await dataSource.getRepository(Spacecraft).save([
      { name: 'Scanner', userId: player.id, shipClassId: hull.id, locationId, runtimeSystems: {} },
      { name: 'Ziel', userId: npc.id, shipClassId: npcHull.id, locationId, runtimeSystems: {} },
    ]);
    const discover = (shipClassId: number) =>
      dataSource.getRepository(ShipClassDiscovery).save({
        userId: player.id,
        shipClassId,
        source: 'TARGET_SCAN',
        sourceSpacecraftId: scanner.id,
        targetSpacecraftId: scanned.id,
      });
    await discover(npcHull.id);
    await expect(service.checkCompletion(player.id, 'SHIP_HULLS')).resolves.toEqual([]);

    await discover(hull.id);
    await expect(service.checkCompletion(player.id, 'SHIP_HULLS')).resolves.toEqual(['DATABASE_SHIP_HULLS']);
  });

  it('never grants awards or prestige to NPC accounts', async () => {
    await explore(npc, coreSystems);

    await expect(service.checkCompletion(npc.id, 'SYSTEMS', core.id)).resolves.toEqual([]);
    expect(await awardsOf(npc)).toEqual([]);
    expect(prestige.change).not.toHaveBeenCalled();
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it('reports progress per category and per visible layer for the hub', async () => {
    await explore(player, coreSystems);
    await service.checkCompletion(player.id, 'SYSTEMS', core.id);

    const progress = await service.progress(player.id);

    expect(progress.filter((row) => row.category === 'SYSTEMS')).toEqual([
      {
        category: 'SYSTEMS',
        layerId: core.id,
        layerName: 'Kern',
        discovered: 2,
        total: 2,
        completed: true,
        awardKey: `DATABASE_SYSTEMS_L${core.id}`,
        awarded: true,
      },
      {
        category: 'SYSTEMS',
        layerId: outer.id,
        layerName: 'Rand',
        discovered: 0,
        total: 1,
        completed: false,
        awardKey: `DATABASE_SYSTEMS_L${outer.id}`,
        awarded: false,
      },
    ]);
    expect(progress.map((row) => row.category)).toEqual([
      'SHIP_HULLS',
      'PLANET_TYPES',
      'SYSTEM_TYPES',
      'SYSTEMS',
      'SYSTEMS',
    ]);
    expect(progress.find((row) => row.category === 'SYSTEM_TYPES')).toMatchObject({
      layerId: null,
      discovered: 0,
      total: SYSTEM_TYPE_DEFINITIONS.length,
      completed: false,
      awardKey: 'DATABASE_SYSTEM_TYPES',
      awarded: false,
    });
  });
});
