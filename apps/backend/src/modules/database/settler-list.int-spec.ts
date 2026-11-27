import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DATABASE_SETTLER_PAGE_SIZE, Faction } from '@swuniverse/shared';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { User } from '../auth/user.entity';
import { FactionService } from '../faction/faction.service';
import { DatabaseService } from './database.service';
import { parseSettlerListQuery } from './settler-list.query';

describe('settler list (PostgreSQL, tmw-AUD-05)', () => {
  let dataSource: DataSource;
  let service: DatabaseService;
  let close: () => Promise<void>;
  let rebelId: number;
  let empireId: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const dependencies: Type<unknown>[] =
      Reflect.getMetadata('design:paramtypes', DatabaseService) ?? [];
    const realTokens = new Set<unknown>(
      INTEGRATION_ENTITIES.map((entity) => getRepositoryToken(entity)),
    );
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
        {
          provide: FactionService,
          useValue: {
            findAll: () => dataSource.getRepository('FactionEntity').find(),
          },
        },
        DatabaseService,
      ],
    }).compile();
    service = module.get(DatabaseService);
    close = () => module.close();
  });

  afterAll(async () => {
    await close?.();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebelId = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    empireId = await factionId(dataSource, Faction.GALACTIC_EMPIRE);
  });

  const list = (raw: Parameters<typeof parseSettlerListQuery>[0] = {}) =>
    service.getSettlers(parseSettlerListQuery(raw));
  const names = (page: Awaited<ReturnType<typeof list>>) => page.entries.map((entry) => entry.username);
  const settler = (username: string, overrides: Partial<User> = {}) =>
    createUser(dataSource, { username, ...overrides });

  it('pages 25 settlers per page, sorted by id, and leaves out NPC accounts', async () => {
    await settler('npc', { isNpc: true });
    for (let n = 1; n <= DATABASE_SETTLER_PAGE_SIZE + 5; n += 1) await settler(`s${n}`);

    const first = await list();
    const second = await list({ page: '2' });

    expect(first).toMatchObject({ page: 1, pageCount: 2, total: 30 });
    expect(first.entries).toHaveLength(25);
    expect(names(first)[0]).toBe('s1');
    expect(names(second)).toEqual(['s26', 's27', 's28', 's29', 's30']);
    expect([...names(first), ...names(second)]).not.toContain('npc');
  });

  it('clamps a page beyond the end to the last page', async () => {
    await settler('only');
    expect(await list({ page: '9' })).toMatchObject({ page: 1, pageCount: 1, total: 1 });
  });

  it('sorts by id, faction and alliance in both directions', async () => {
    const store = new TypeOrmAllianceStore(dataSource);
    const alpha = await store.insertAlliance({ name: 'Alpha', description: '', factionId: rebelId });
    const beta = await store.insertAlliance({ name: 'Beta', description: '', factionId: rebelId });
    const a = await settler('a', { factionId: empireId, faction: Faction.GALACTIC_EMPIRE });
    await settler('b', { factionId: rebelId, faction: Faction.REBEL_ALLIANCE });
    const c = await settler('c', { factionId: rebelId, faction: Faction.REBEL_ALLIANCE });
    await store.insertMembership({ allianceId: beta.id, userId: a.id });
    await store.insertMembership({ allianceId: alpha.id, userId: c.id });

    expect(names(await list({ sort: 'id', order: 'desc' }))).toEqual(['c', 'b', 'a']);
    const rebelsFirst = rebelId < empireId;
    expect(names(await list({ sort: 'faction' }))).toEqual(rebelsFirst ? ['b', 'c', 'a'] : ['a', 'b', 'c']);
    expect(names(await list({ sort: 'faction', order: 'desc' }))).toEqual(
      rebelsFirst ? ['a', 'b', 'c'] : ['b', 'c', 'a'],
    );
    // Alpha was created first; players without an alliance come last in both directions.
    expect(names(await list({ sort: 'alliance' }))).toEqual(['c', 'a', 'b']);
    expect(names(await list({ sort: 'alliance', order: 'desc' }))).toEqual(['a', 'c', 'b']);
  });

  it('returns avatar, faction and alliance of every row', async () => {
    const store = new TypeOrmAllianceStore(dataSource);
    const alliance = await store.insertAlliance({ name: 'Rebellen', description: '', factionId: rebelId });
    const leia = await settler('leia', { factionId: rebelId, faction: Faction.REBEL_ALLIANCE, avatar: 'leia.png' });
    await store.insertMembership({ allianceId: alliance.id, userId: leia.id });
    await settler('lone');

    const { entries } = await list();

    expect(entries[0]).toMatchObject({
      id: leia.id,
      avatar: 'leia.png',
      faction: Faction.REBEL_ALLIANCE,
      alliance: { id: alliance.id, name: 'Rebellen' },
    });
    expect(entries[1]).toMatchObject({ username: 'lone', alliance: null, factionName: 'Unbekannt' });
    expect(entries[0]).not.toHaveProperty('email');
    expect(entries[0]).not.toHaveProperty('prestige');
  });

  it('searches names case-insensitively, by display name and by exact id, without paging', async () => {
    for (let n = 1; n <= DATABASE_SETTLER_PAGE_SIZE + 3; n += 1) await settler(`Pilot${n}`);
    const luke = await settler('luke', { displayName: 'Skywalker' });
    await settler('100%');

    const pilots = await list({ search: 'pilot' });
    expect(pilots).toMatchObject({ page: 1, pageCount: 1, total: DATABASE_SETTLER_PAGE_SIZE + 3 });
    expect(pilots.entries).toHaveLength(DATABASE_SETTLER_PAGE_SIZE + 3);
    expect(names(await list({ search: 'SKYWALK' }))).toEqual(['luke']);
    expect(names(await list({ search: String(luke.id) }))).toEqual(['luke']);
    // LIKE wildcards are plain characters.
    expect(names(await list({ search: '%' }))).toEqual(['100%']);
    expect(names(await list({ search: 'unknown' }))).toEqual([]);
    expect(await list({ search: '99999999999999999999' })).toMatchObject({ total: 0 });
  });

  it('does not find NPC accounts by name or id', async () => {
    const npc = await settler('Hutten', { isNpc: true });
    expect((await list({ search: 'Hutten' })).total).toBe(0);
    expect((await list({ search: String(npc.id) })).total).toBe(0);
  });
});
