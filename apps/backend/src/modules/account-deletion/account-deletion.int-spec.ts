import 'reflect-metadata';
import { type DynamicModule, type INestApplication } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AllianceRole, Faction, FORUM_DELETED_AUTHOR_NAME } from '@swuniverse/shared';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import type { User } from '../auth/user.entity';
import { HolonetService } from '../holonet/holonet.service';
import { MessagingService } from '../messaging/messaging.service';
import { GameGateway } from '../websocket/game.gateway';
import { PlayerDeletionService } from './player-deletion.service';

/**
 * sh-AP-05b/05c through the production module graph, so every registered
 * deletion handler runs in its real order against the real schema.
 */
describe('Account deletion with game content (PostgreSQL, AppModule)', () => {
  let app: INestApplication;
  let source: DataSource;
  let deletions: PlayerDeletionService;

  let doomed: User;
  let other: User;
  let third: User;
  let locationId: number;
  let shipClassId: number;

  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    const core = imports.find((item) => item.module === TypeOrmModule)?.imports?.[0] as DynamicModule | undefined;
    const optionsProvider = core?.providers?.find(
      (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === 'TypeOrmModuleOptions',
    );
    if (!optionsProvider) throw new Error('Production datasource configuration missing');
    const config = {
      get: (key: string) =>
        ({
          DATABASE_URL: process.env.INTEGRATION_DATABASE_URL,
          JWT_SECRET: 'account-deletion-test-secret',
          NODE_ENV: 'production',
          EMAIL_BLOCKLIST_PEPPER: 'integration-pepper',
          GAME_TIMEZONE: 'UTC',
        })[key],
    };
    const optionsModule = await Test.createTestingModule({
      providers: [optionsProvider, { provide: ConfigService, useValue: config }],
    }).compile();
    const options = optionsModule.get<DataSourceOptions>('TypeOrmModuleOptions');
    await optionsModule.close();
    source = await new DataSource(options).initialize();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(DataSource)
      .useValue(source)
      .overrideProvider(GameGateway)
      .useValue({ emitToUser: jest.fn(), emitToAll: jest.fn() })
      .compile();
    app = module.createNestApplication({ logger: ['error'] });
    await app.init();
    deletions = app.get(PlayerDeletionService);
    // Migrations plus the full AppModule bootstrap exceed the default hook timeout.
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    doomed = await createUser(source, { username: 'Doomed', faction: Faction.REBEL_ALLIANCE });
    other = await createUser(source, { username: 'Other', faction: Faction.REBEL_ALLIANCE });
    third = await createUser(source, { username: 'Third', faction: Faction.REBEL_ALLIANCE });
    const layer = await source.getRepository('Layer').save({ name: 'Rand', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    shipClassId = (await source.getRepository('ShipClassDef').save({
      key: 'DELETION_FRIGATE', name: 'Fregatte', category: 'FRIGATE', role: 'ESCORT',
    }) as unknown as { id: number }).id;
  });

  const count = (entity: string, where: Record<string, unknown>) => source.getRepository(entity).countBy(where);

  describe('account and communication (sh-AP-05b)', () => {
    it('keeps what others see under "Gelöschter Siedler" and removes personal data', async () => {
      const messaging = app.get(MessagingService);
      await messaging.send(doomed.id, other.id, 'Hallo', 'von Doomed');
      await messaging.send(other.id, doomed.id, 'Antwort', 'an Doomed');

      const holonet = app.get(HolonetService);
      const post = await source.getRepository('HolonetPost').save({ authorId: doomed.id, title: 'Bericht', body: 'Text' }) as unknown as { id: number };
      const foreignPost = await source.getRepository('HolonetPost').save({ authorId: other.id, title: 'Fremd', body: 'Text' }) as unknown as { id: number };
      await source.getRepository('HolonetComment').save({ postId: foreignPost.id, authorId: doomed.id, body: 'Kommentar' });
      await source.getRepository('HolonetRating').save({ postId: foreignPost.id, userId: doomed.id, value: 1 });
      await source.getRepository('HolonetCheckpoint').save({ userId: doomed.id, lastReadPostId: post.id });

      const alliance = await source.getRepository('Alliance').save({
        name: 'Rebellen', factionId: await factionId(source, Faction.REBEL_ALLIANCE),
      }) as unknown as { id: number };
      await source.getRepository('AllianceMembership').save([
        { allianceId: alliance.id, userId: other.id, role: AllianceRole.PRESIDENT },
        { allianceId: alliance.id, userId: doomed.id, role: AllianceRole.NONE },
      ]);

      await source.getRepository('UserSetting').save({ userId: doomed.id, key: 'show_pm_read_receipt', value: 'false' });
      await source.getRepository('Note').save({ userId: doomed.id, title: 'Notiz', text: 'geheim' });
      await source.getRepository('PrestigeHistoryEntry').save({ userId: doomed.id, amount: 5, description: 'Prestige' });
      await source.getRepository('News').save({ title: 'News', text: 'Text', authorId: doomed.id });

      await deletions.delete(doomed.id);

      expect(await count('User', { id: doomed.id })).toBe(0);
      const inbox = await messaging.getInbox(other.id);
      expect(inbox.data.find((message) => message.subject === 'Hallo')).toMatchObject({
        senderId: null, sender: { username: FORUM_DELETED_AUTHOR_NAME },
      });
      // The alliance announced the departure before the account went.
      expect(inbox.data.map((message) => message.body)).toContain('Der Siedler Doomed hat die Allianz verlassen');
      expect(await count('Message', { recipientId: doomed.id })).toBe(0);

      expect(await holonet.findOne(post.id)).toMatchObject({ authorId: null, author: { username: FORUM_DELETED_AUTHOR_NAME } });
      expect((await holonet.getComments(foreignPost.id)).data).toEqual([
        expect.objectContaining({ body: 'Kommentar', authorId: null, author: expect.objectContaining({ username: FORUM_DELETED_AUTHOR_NAME }) }),
      ]);
      expect(await count('HolonetRating', { userId: doomed.id })).toBe(0);
      expect(await count('HolonetCheckpoint', { userId: doomed.id })).toBe(0);

      expect(await source.getRepository('AllianceMembership').findBy({ allianceId: alliance.id })).toEqual([
        expect.objectContaining({ userId: other.id, role: AllianceRole.PRESIDENT }),
      ]);
      for (const entity of ['UserSetting', 'Note', 'PrestigeHistoryEntry']) {
        expect(await count(entity, { userId: doomed.id })).toBe(0);
      }
      expect(await source.getRepository('News').findOneByOrFail({ title: 'News' })).toMatchObject({ authorId: null });
    });

    it('lets the alliance succeed a deleted president', async () => {
      const alliance = await source.getRepository('Alliance').save({
        name: 'Rebellen', factionId: await factionId(source, Faction.REBEL_ALLIANCE),
      }) as unknown as { id: number };
      await source.getRepository('AllianceMembership').save([
        { allianceId: alliance.id, userId: doomed.id, role: AllianceRole.PRESIDENT },
        { allianceId: alliance.id, userId: other.id, role: AllianceRole.VICE },
      ]);

      await deletions.delete(doomed.id);

      expect(await source.getRepository('AllianceMembership').findBy({ allianceId: alliance.id })).toEqual([
        expect.objectContaining({ userId: other.id, role: AllianceRole.PRESIDENT }),
      ]);
    });
  });

  describe('colonies (sh-AP-05d)', () => {
    async function colony(name: string, values: Record<string, unknown> = {}) {
      const saved = await source.getRepository('Colony').save({ name, userId: doomed.id, colonyClassId: 1, ...values }) as unknown as { id: number };
      await source.getRepository('ColonyChangeable').save({ colonyId: saved.id, workers: 12, isBlockaded: true, immigrationEnabled: true });
      await source.getRepository('ColonyField').save({ colonyId: saved.id, fieldIndex: 0, fieldType: 1, buildingId: 82010100, isActive: true });
      await source.getRepository('ColonyStorage').save({ colonyId: saved.id, commodityId: 2, amount: 500 });
      await source.getRepository('ColonyFabricationQueue').save({
        colonyId: saved.id, userId: doomed.id, queueType: 'MODULE', itemKey: 'laser', buildingFunctionId: 1, finishesAt: new Date(Date.now() + 3_600_000),
      });
      const crew = await source.getRepository('Crew').save({ userId: doomed.id, name: 'Siedler' }) as unknown as { id: number };
      await source.getRepository('CrewAssignment').save({ crewId: crew.id, userId: doomed.id, colonyId: saved.id });
      return saved;
    }

    it('turns every colony, the starter colony included, into an ownerless ruin with buildings and storage', async () => {
      const home = await colony('Heimat');
      const outpost = await colony('Außenposten');
      await source.getRepository('User').update(doomed.id, { starterColonyId: home.id });
      const oldRuin = await source.getRepository('Colony').save({
        name: 'Alte Ruine', userId: doomed.id, colonyClassId: 1, isAbandoned: true, previousUserId: doomed.id, abandonedAt: new Date(),
      }) as unknown as { id: number };
      const besieger = await source.getRepository('Spacecraft').save({ name: 'Belagerer', userId: other.id, shipClassId, locationId, runtimeSystems: {} }) as unknown as { id: number };
      const fleet = await source.getRepository('Fleet').save({ name: 'Blockade', userId: other.id, leaderId: besieger.id }) as unknown as { id: number };
      await source.getRepository('ColonyOrbitAssignment').save({ colonyId: outpost.id, spacecraftId: besieger.id, fleetId: fleet.id, mode: 'BLOCKADE' });
      // Legacy table without entity, see migration 20261013120000.
      await source.query(
        `INSERT INTO "colony_events" ("colonyId", "userId", "type", "title", "message") VALUES ($1, $2, 'COLONY_FOUNDED', 'Gegründet', 'Heimat')`,
        [home.id, doomed.id],
      );

      await deletions.delete(doomed.id);

      expect(await count('User', { id: doomed.id })).toBe(0);
      for (const id of [home.id, outpost.id]) {
        expect(await source.getRepository('Colony').findOneByOrFail({ id })).toMatchObject({
          userId: null, previousUserId: null, isAbandoned: true, abandonedAt: expect.any(Date),
        });
        expect(await source.getRepository('ColonyField').findOneByOrFail({ colonyId: id })).toMatchObject({ buildingId: 82010100, isActive: false });
        expect(await source.getRepository('ColonyStorage').findOneByOrFail({ colonyId: id })).toMatchObject({ commodityId: 2, amount: 500 });
        expect(await source.getRepository('ColonyChangeable').findOneByOrFail({ colonyId: id })).toMatchObject({ workers: 0, isBlockaded: false });
        expect(await count('ColonyFabricationQueue', { colonyId: id })).toBe(0);
        expect(await count('CrewAssignment', { colonyId: id })).toBe(0);
      }
      expect(await source.getRepository('Colony').findOneByOrFail({ id: oldRuin.id })).toMatchObject({ userId: null, previousUserId: null, isAbandoned: true });
      expect(await count('ColonyOrbitAssignment', { colonyId: outpost.id })).toBe(0);
      expect(await count('Crew', { userId: doomed.id })).toBe(0);
      expect(await source.query(`SELECT 1 FROM "colony_events" WHERE "userId" = $1`, [doomed.id])).toEqual([]);
      expect(await count('Spacecraft', { id: besieger.id })).toBe(1);
    });
  });

  describe('ships and knowledge (sh-AP-05c)', () => {
    async function ship(userId: number, values: Record<string, unknown> = {}) {
      return source.getRepository('Spacecraft').save({
        name: 'Schiff', userId, shipClassId, locationId, runtimeSystems: {}, hullMax: 100, ...values,
      }) as unknown as Promise<{ id: number }>;
    }

    it('removes ships without wrecks, crew, fleets, plans and knowledge, and keeps others untouched', async () => {
      const own = await ship(doomed.id, { name: 'Eigen' });
      const fleet = await source.getRepository('Fleet').save({ name: 'Flotte', userId: doomed.id, leaderId: own.id }) as unknown as { id: number };
      await source.getRepository('Spacecraft').update(own.id, { fleetId: fleet.id });
      await source.getRepository('CargoItem').save({ spacecraftId: own.id, commodityId: 5, amount: 10 });
      const shipCrew = await source.getRepository('Crew').save({ userId: doomed.id, name: 'Pilot' }) as unknown as { id: number };
      await source.getRepository('CrewAssignment').save({ crewId: shipCrew.id, userId: doomed.id, spacecraftId: own.id });
      const pod = await source.getRepository('EscapePod').save({
        locationId, originSpacecraftId: 999, originShipName: 'Alt', originShipClassId: shipClassId, presentationKey: 'POD', launchReason: 'COMBAT_DESTRUCTION',
      }) as unknown as { id: number };
      const podCrew = await source.getRepository('Crew').save({ userId: doomed.id, name: 'Überlebender' }) as unknown as { id: number };
      await source.getRepository('CrewAssignment').save({ crewId: podCrew.id, userId: doomed.id, escapePodId: pod.id });

      const foreign = await ship(other.id, { name: 'Fremd', tractoredShipId: own.id, runtimeSystems: { TRACTOR_BEAM: { active: true } } });
      const foreignCrew = await source.getRepository('Crew').save({ userId: other.id, name: 'Fremder' }) as unknown as { id: number };
      await source.getRepository('CrewAssignment').save({ crewId: foreignCrew.id, userId: other.id, spacecraftId: foreign.id });

      const usedPlan = await source.getRepository('ColonyShipBuildplan').save({ userId: doomed.id, shipClassId, name: 'Geteilt', signature: 'a' }) as unknown as { id: number };
      const ownPlan = await source.getRepository('ColonyShipBuildplan').save({ userId: doomed.id, shipClassId, name: 'Eigen', signature: 'b' }) as unknown as { id: number };
      await source.getRepository('Spacecraft').update(foreign.id, { buildPlanId: usedPlan.id });
      await source.getRepository('Spacecraft').update(own.id, { buildPlanId: ownPlan.id });

      await source.getRepository('ShipClassDiscovery').save({ userId: doomed.id, shipClassId, source: 'TARGET_SCAN', sourceSpacecraftId: own.id, targetSpacecraftId: foreign.id });
      await source.getRepository('ShipClassDiscovery').save({ userId: other.id, shipClassId, source: 'TARGET_SCAN', sourceSpacecraftId: foreign.id, targetSpacecraftId: own.id });
      await source.getRepository('Research').save({ userId: doomed.id, techId: 1 });
      await source.getRepository('ResearchRewardGrant').save({ userId: doomed.id, techId: 1 });

      await deletions.delete(doomed.id);

      expect(await count('Spacecraft', { userId: doomed.id })).toBe(0);
      expect(await count('SpacecraftWreck', {})).toBe(0);
      expect(await count('CargoItem', { spacecraftId: own.id })).toBe(0);
      expect(await count('Fleet', { id: fleet.id })).toBe(0);
      expect(await count('Crew', { userId: doomed.id })).toBe(0);
      expect(await count('EscapePod', { id: pod.id })).toBe(0);
      expect(await count('CrewAssignment', { crewId: foreignCrew.id, spacecraftId: foreign.id })).toBe(1);

      expect(await source.getRepository('Spacecraft').findOneByOrFail({ id: foreign.id })).toMatchObject({
        tractoredShipId: null, runtimeSystems: { TRACTOR_BEAM: { active: false } },
      });
      expect(await source.getRepository('ColonyShipBuildplan').findOneBy({ id: usedPlan.id })).toMatchObject({ userId: null });
      expect(await count('ColonyShipBuildplan', { id: ownPlan.id })).toBe(0);
      for (const entity of ['ShipClassDiscovery', 'Research', 'ResearchRewardGrant']) {
        expect(await count(entity, { userId: doomed.id })).toBe(0);
      }
      expect(await count('ShipClassDiscovery', { userId: other.id })).toBe(1);
      expect(await count('User', { id: third.id })).toBe(1);
    });

    it('lifts the blockade of the deleted fleet and keeps foreign trade posts of the player abandoned', async () => {
      const colony = await source.getRepository('Colony').save({
        name: 'Ziel', userId: other.id, colonyClassId: 1,
      }) as unknown as { id: number };
      await source.getRepository('ColonyChangeable').save({ colonyId: colony.id, isBlockaded: true });
      const leader = await ship(doomed.id);
      const fleet = await source.getRepository('Fleet').save({ name: 'Blockade', userId: doomed.id, leaderId: leader.id }) as unknown as { id: number };
      await source.getRepository('ColonyOrbitAssignment').save({ colonyId: colony.id, spacecraftId: leader.id, fleetId: fleet.id, mode: 'BLOCKADE' });
      const station = await ship(doomed.id, { kind: 'STATION', stationRole: 'OUTPOST' });
      const post = await source.getRepository('TradePost').save({
        name: 'Posten', networkId: doomed.id, ownerId: doomed.id, locationId, stationId: station.id,
      }) as unknown as { id: number };

      await deletions.delete(doomed.id);

      expect(await source.getRepository('ColonyChangeable').findOneByOrFail({ colonyId: colony.id })).toMatchObject({ isBlockaded: false });
      expect(await source.getRepository('TradePost').findOneByOrFail({ id: post.id })).toMatchObject({ ownerId: null, stationId: null });
    });
  });
});
