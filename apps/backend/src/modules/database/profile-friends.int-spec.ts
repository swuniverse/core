import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AllianceRole, ContactMode, Faction, type ProfileFriendDto } from '@swuniverse/shared';
import { DataSource } from 'typeorm';
import { createUser } from '../../testing/integration/database';
import { createIntegrationDataSource, INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { AllianceService } from '../alliance/alliance.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { User } from '../auth/user.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { RpgPlotMember } from '../rpg/rpg-plot-member.entity';
import { RpgPlotService } from '../rpg/rpg-plot.service';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { FactionEntity } from '../faction/entities/faction.entity';
import { ContactService } from '../contacts/contact.service';
import { Contact } from '../contacts/entities/contact.entity';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';

describe('profile friends (Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let database: DataSource;
  let app: INestApplication;
  const jwt = new JwtService({ secret: 'profile-friends-test' });

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    database = createIntegrationDataSource(container.getConnectionUri());
    database.setOptions({ migrations: [], entities: [...INTEGRATION_ENTITIES, Contact, UserSetting, RpgPlot, RpgPlotMember], synchronize: true });
    await database.initialize();
    const users = database.getRepository(User);
    const alliance = new AllianceService(new TypeOrmAllianceStore(database), {} as never);
    const contacts = new ContactService(database.getRepository(Contact), users, {} as never);
    const count = { count: async () => 0 };
    const service = new DatabaseService(
      users, count as never, database.getRepository(Spacecraft), count as never,
      {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
      { findAll: async () => [] } as never, {} as never, {} as never, {} as never,
      alliance, {} as never, {} as never, {} as never, {} as never, {} as never,
      { find: async () => [] } as never,
      { newestAccessibleForColonies: async () => [] } as never,
      {} as never, {} as never, {} as never, {} as never,
      { registerVisit: async () => undefined } as never,
      {} as never, [], contacts, new UserSettingsReader(database.getRepository(UserSetting)),
      new RpgPlotService(database.getRepository(RpgPlot), database.getRepository(RpgPlotMember), users, {} as never),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [DatabaseController],
      providers: [
        { provide: DatabaseService, useValue: service },
        JwtStrategy,
        { provide: ConfigService, useValue: { get: () => 'profile-friends-test' } },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).useMocker(() => ({})).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await database?.destroy();
    await container?.stop();
  });

  async function profile(viewer: User, targetId: number) {
    const response = await fetch(`${await app.getUrl()}/database/settlers/${targetId}`, {
      headers: { Authorization: `Bearer ${jwt.sign({ sub: viewer.id })}` },
    });
    return { status: response.status, body: await response.json() as { friends: ProfileFriendDto[] } };
  }

  it('returns all target plot memberships active first and target RPG behavior', async () => {
    const owner = await createUser(database, { username: 'plot-owner' });
    const viewer = await createUser(database, { username: 'plot-viewer' });
    await database.getRepository(UserSetting).save({
      userId: owner.id, key: 'rpg_behavior', value: '2',
    });
    const plots = database.getRepository(RpgPlot);
    const active = await plots.save(plots.create({
      creatorId: owner.id, title: 'Active plot', description: '', endedAt: null,
      startedAt: new Date('2026-01-02T00:00:00.000Z'),
    }));
    const ended = await plots.save(plots.create({
      creatorId: owner.id, title: 'Ended plot', description: '', endedAt: new Date(),
      startedAt: new Date('2026-01-03T00:00:00.000Z'),
    }));
    const outsider = await createUser(database, { username: 'plot-outsider' });
    const unrelated = await plots.save(plots.create({
      creatorId: outsider.id, title: 'Other creator plot', description: '', endedAt: null,
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
    const notMember = await plots.save(plots.create({
      creatorId: outsider.id, title: 'Not a member', description: '', endedAt: null,
    }));
    const memberships = database.getRepository(RpgPlotMember);
    await memberships.save([
      { plotId: ended.id, userId: owner.id },
      { plotId: unrelated.id, userId: owner.id },
      { plotId: active.id, userId: owner.id },
      { plotId: notMember.id, userId: outsider.id },
    ]);

    const response = await profile(viewer, owner.id);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      rpgBehavior: 2,
      plots: [
        { id: active.id, title: 'Active plot', endedAt: null },
        { id: unrelated.id, title: 'Other creator plot', endedAt: null },
        { id: ended.id, title: 'Ended plot' },
      ],
    });
  });

  it('includes current alliance members and inbound FRIEND contacts only', async () => {
    const faction = (await database.getRepository(FactionEntity).save({
      key: Faction.REBEL_ALLIANCE,
      name: 'Rebellenallianz',
      colorPrimary: '#ffffff',
      colorSecondary: '#000000',
    })).id;
    const owner = await createUser(database, { username: 'owner', factionId: faction });
    const member = await createUser(database, { username: 'member', displayName: 'Alliance Friend', avatar: '/avatar.png', factionId: faction });
    const inbound = await createUser(database, { username: 'inbound', factionId: faction });
    const neutral = await createUser(database, { username: 'neutral', factionId: faction });
    const enemy = await createUser(database, { username: 'enemy', factionId: faction });
    const outbound = await createUser(database, { username: 'outbound', factionId: faction });
    const store = new TypeOrmAllianceStore(database);
    const alliance = await store.insertAlliance({ name: 'Test', description: '', factionId: faction });
    await store.insertMembership({ allianceId: alliance.id, userId: owner.id, role: AllianceRole.PRESIDENT });
    await store.insertMembership({ allianceId: alliance.id, userId: member.id, role: AllianceRole.NONE });
    const contacts = database.getRepository(Contact);
    await contacts.save([
      { userId: member.id, contactUserId: owner.id, mode: ContactMode.FRIEND, comment: 'private' },
      { userId: inbound.id, contactUserId: owner.id, mode: ContactMode.FRIEND },
      { userId: neutral.id, contactUserId: owner.id, mode: ContactMode.NEUTRAL, treatAsFriend: true },
      { userId: enemy.id, contactUserId: owner.id, mode: ContactMode.ENEMY },
      { userId: owner.id, contactUserId: outbound.id, mode: ContactMode.FRIEND },
    ]);

    const response = await profile(outbound, owner.id);
    expect(response.status).toBe(200);
    expect(response.body.friends).toEqual([
      { id: member.id, name: 'Alliance Friend', avatar: '/avatar.png' },
      { id: inbound.id, name: 'inbound', avatar: null },
    ]);
    expect(response.body).toMatchObject({ rpgBehavior: 0, plots: [] });
    expect((await fetch(`${await app.getUrl()}/database/settlers/${owner.id}`)).status).toBe(401);
    expect((await profile(owner, 999999)).status).toBe(404);
    await store.deleteMembership(alliance.id, member.id);
    await contacts.delete({ userId: member.id, contactUserId: owner.id });
    expect((await profile(owner, owner.id)).body.friends).toEqual([
      { id: inbound.id, name: 'inbound', avatar: null },
    ]);
    await store.deleteMembership(alliance.id, owner.id);
    await contacts.delete({ userId: inbound.id, contactUserId: owner.id });
    expect((await profile(owner, owner.id)).body.friends).toEqual([]);
  });
});
