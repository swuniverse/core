import { DataSource } from 'typeorm';
import type { User } from '../../modules/auth/user.entity';
import { TradeShoutboxService } from '../../modules/trade/trade-shoutbox.service';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

const HOUR_MS = 60 * 60 * 1000;

/** tmw-T6: one shoutbox per trade network (STU `AddShoutBoxEntry`, `ShowShoutBoxList`). */
describe('trade shoutbox (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let player: User;
  let posts: { network1: number; network2: number };
  let service: TradeShoutboxService;
  let clock: number;

  beforeEach(async () => {
    clock = Date.parse('2026-11-13T12:00:00Z');
    const npc = await createUser(source, { isNpc: true });
    player = await createUser(source, { username: 'Lando' });
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 2, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const locations: number[] = [];
    for (const cx of [1, 2]) {
      const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx, cy: 1, fieldTypeId: fieldType.id });
      locations.push((await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id);
    }
    posts = {
      network1: (await source.getRepository('TradePost').save({ name: 'Mos Eisley', networkId: 1, ownerId: npc.id, locationId: locations[0] })).id,
      network2: (await source.getRepository('TradePost').save({ name: 'Anchorhead', networkId: 2, ownerId: npc.id, locationId: locations[1] })).id,
    };
    await license(player, posts.network1);
    service = new TradeShoutboxService(source, () => new Date(clock));
  });

  const license = (user: User, tradePostId: number, expiresAt = new Date(clock + 24 * HOUR_MS)) =>
    source.getRepository('TradeLicense').save({ tradePostId, userId: user.id, startsAt: new Date(clock - HOUR_MS), expiresAt, warningSentAt: null });

  /** Each post one second later, so the rate limit stays out of the way. */
  async function post(message: string, user = player, networkId = 1) {
    clock += 15_000;
    return service.post(networkId, user.id, message);
  }

  it('lists the newest entries of the network with player and time', async () => {
    await post('Verkaufe Tibanna');
    const other = await createUser(source, { username: 'Han' });
    await license(other, posts.network1);
    await post('Suche Durastahl', other);

    expect(await service.list(1, player.id)).toEqual({
      networkId: 1,
      networkName: 'Imperiales Versorgungsnetz',
      entries: [
        { id: expect.any(Number), userId: other.id, username: 'Han', message: 'Suche Durastahl', createdAt: new Date(clock).toISOString() },
        { id: expect.any(Number), userId: player.id, username: 'Lando', message: 'Verkaufe Tibanna', createdAt: new Date(clock - 15_000).toISOString() },
      ],
    });
  });

  it('requires a valid license at a post of the network to read and write', async () => {
    await expect(service.list(2, player.id)).rejects.toThrow('Du benötigst eine gültige Lizenz in diesem Handelsnetz');
    await expect(post('Hallo', player, 2)).rejects.toThrow('Du benötigst eine gültige Lizenz in diesem Handelsnetz');
    await source.getRepository('TradeLicense').update({ userId: player.id }, { expiresAt: new Date(clock - 1000) });
    await expect(service.list(1, player.id)).rejects.toThrow('Du benötigst eine gültige Lizenz in diesem Handelsnetz');
    expect(await source.getRepository('TradeShoutboxEntry').count()).toBe(0);
  });

  it('strips HTML, trims, cuts to 200 characters and rejects empty messages', async () => {
    await post('  <b>Fett</b> <script>alert(1)</script>und <a href="x">Link</a>  ');
    await post('ä'.repeat(250));

    const messages = (await service.list(1, player.id)).entries.map((entry) => entry.message);
    expect(messages).toEqual(['ä'.repeat(200), 'Fett alert(1)und Link']);
    await expect(post('<i></i>   ')).rejects.toThrow('Die Nachricht ist leer');
    await expect(service.post(1, player.id, 42 as never)).rejects.toThrow('Die Nachricht ist leer');
  });

  it('keeps only the newest 30 entries per network', async () => {
    await license(player, posts.network2);
    await post('Anderes Netz', player, 2);
    for (let index = 1; index <= 32; index++) await post(`Eintrag ${index}`);

    const entries = (await service.list(1, player.id)).entries;
    expect(entries).toHaveLength(30);
    expect(entries[0].message).toBe('Eintrag 32');
    expect(entries.at(-1)?.message).toBe('Eintrag 3');
    expect((await service.list(2, player.id)).entries.map((entry) => entry.message)).toEqual(['Anderes Netz']);
  });

  it('limits a player to five entries per minute and network', async () => {
    for (let index = 1; index <= 5; index++) await service.post(1, player.id, `Schnell ${index}`);

    await expect(service.post(1, player.id, 'Zu schnell')).rejects.toThrow('Du schreibst zu schnell. Bitte warte einen Moment');
    clock += 60_001;
    await expect(service.post(1, player.id, 'Wieder da')).resolves.toBeDefined();
  });

  it('keeps the 30-entry limit under concurrent posts', async () => {
    const users = await Promise.all(Array.from({ length: 8 }, (_, index) => createUser(source, { username: `Händler ${index}` })));
    for (const user of users) await license(user, posts.network1);
    for (let index = 0; index < 26; index++) await post(`Alt ${index}`);

    await Promise.all(users.map((user) => service.post(1, user.id, `Neu von ${user.username}`)));

    expect(await source.getRepository('TradeShoutboxEntry').countBy({ networkId: 1 })).toBe(30);
  });
});
