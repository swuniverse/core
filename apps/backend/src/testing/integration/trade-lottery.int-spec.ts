import { DataSource, type EntityManager } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import type { User } from '../../modules/auth/user.entity';
import { NpcKey } from '../../modules/auth/npc-account.service';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { PrestigeService } from '../../modules/prestige/prestige.service';
import { TradeLotteryService } from '../../modules/trade/trade-lottery.service';
import { LotteryAwardListener } from '../../modules/trade/lottery-award.listener';
import { AwardService } from '../../modules/awards/award.service';
import { AWARD_CATALOG } from '../../modules/awards/award.catalog';
import { connectIntegrationDatabase, createUser, factionId, resetDatabase } from './database';

const AURODIUM = 50;
const HOUR_MS = 60 * 60 * 1000;

/** tmw-T9: Hutt Cartel lottery (STU `BuyLotteryTickets`, `EndLotteryPeriod`). */
describe('Hutt Cartel lottery (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  let rebels: number;
  let empire: number;
  let player: User;
  let postId: number;
  let locationId: number;
  let clock: Date;
  let rolls: number[];
  let ships: Array<{ userId: number; buildplanId: number; locationId: number; name?: string }>;
  let drawn: Array<{ period: string; winnerUserId: number }>;
  let service: TradeLotteryService;

  beforeEach(async () => {
    clock = new Date('2026-11-13T12:00:00+01:00');
    rolls = [];
    ships = [];
    drawn = [];
    rebels = await factionId(source, Faction.REBEL_ALLIANCE);
    empire = await factionId(source, Faction.GALACTIC_EMPIRE);
    const hutts = await createUser(source, { isNpc: true, npcKey: NpcKey.HUTT_CARTEL });
    player = await rebel('Lando');
    const layer = await source.getRepository('Layer').save({ name: 'Handel', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    locationId = (await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id })).id;
    postId = (await source.getRepository('TradePost').save({ name: 'Hutten-Handelsposten', networkId: 3, ownerId: hutts.id, locationId })).id;
    await license(player);

    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      { emitToUser: () => undefined } as never,
      {} as never,
    );
    service = new TradeLotteryService(
      source,
      new PrestigeService(source.getRepository('PrestigeHistoryEntry') as never),
      messaging,
      () => clock,
      { integer: (min: number, max: number) => {
        const next = rolls.shift();
        return next === undefined ? max : Math.min(max, Math.max(min, next));
      } },
    );
    service.registerShipFactory({
      createShip: async (_manager: EntityManager, input) => { ships.push(input); },
      grantBuildplan: async () => undefined,
    });
    service.onDrawn((event) => { drawn.push(event); });
  });

  const rebel = (username: string) =>
    createUser(source, { username, faction: Faction.REBEL_ALLIANCE, factionId: rebels });

  const license = (user: User) =>
    source.getRepository('TradeLicense').save({ tradePostId: postId, userId: user.id, startsAt: new Date(clock.getTime() - HOUR_MS), expiresAt: new Date(clock.getTime() + 30 * 24 * HOUR_MS), warningSentAt: null });

  const aurodium = async (user: User) =>
    (await source.getRepository('TradeAccountStorage').findOneBy({ tradePostId: postId, userId: user.id, commodityId: AURODIUM }))?.amount ?? 0;

  const tickets = (user: User, period: string, count: number) =>
    source.getRepository('LotteryTicket').save(Array.from({ length: count }, () => ({ userId: user.id, period, isWinner: null })));

  describe('buying tickets', () => {
    it('pays one Aurodium per ticket at the Hutt post and creates tickets of the current period', async () => {
      await source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: player.id, commodityId: AURODIUM, amount: 10 });

      expect(await service.buy(player.id, 4)).toEqual({ message: '4 Lotterielos(e) wurde gekauft' });

      expect(await aurodium(player)).toBe(6);
      expect(await source.getRepository('LotteryTicket').find()).toMatchObject(
        Array.from({ length: 4 }, () => ({ userId: player.id, period: '2026.11', isWinner: null })),
      );
      expect(await service.overview(player.id)).toMatchObject({
        hasLicense: true, period: '2026.11', tickets: 4, ownTickets: 4, jackpot: 4, aurodium: 6,
      });
    });

    it('applies the STU checks', async () => {
      const unlicensed = await rebel('Han');
      const npc = await createUser(source, { isNpc: true });
      await license(npc);
      await source.getRepository('TradeAccountStorage').save({ tradePostId: postId, userId: player.id, commodityId: AURODIUM, amount: 2 });

      await expect(service.buy(unlicensed.id, 1)).rejects.toThrow('Um Lotterielose zu kaufen, wird eine Handelslizenz beim Hutten-Kartell benötigt');
      await expect(service.buy(npc.id, 1)).rejects.toThrow('NPCs können keine Lose kaufen');
      await expect(service.buy(player.id, 3)).rejects.toThrow('Nicht genügend Aurodium auf diesem Handelsposten vorhanden');
      await expect(service.buy(player.id, 0)).rejects.toThrow('Anzahl muss eine positive ganze Zahl sein');
      expect(await aurodium(player)).toBe(2);
      expect(await source.getRepository('LotteryTicket').count()).toBe(0);
      expect(await service.overview(unlicensed.id)).toMatchObject({ hasLicense: false, notice: 'Um Lotterielose zu kaufen, wird eine Handelslizenz beim Hutten-Kartell benötigt' });
    });
  });

  describe('drawing', () => {
    let han: User;
    let tarkin: User;

    beforeEach(async () => {
      han = await rebel('Han');
      tarkin = await createUser(source, { username: 'Tarkin', faction: Faction.GALACTIC_EMPIRE, factionId: empire });
      await tickets(player, '2026.11', 3);
      await tickets(han, '2026.11', 1);
      await tickets(tarkin, '2026.11', 1);
      // An older period that is not drawn again.
      await tickets(player, '2026.10', 2);
      const shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'LOTTO', name: 'Glücksfrachter', category: 'SHIP', role: 'FREIGHTER' })).id;
      const plans = source.getRepository('AdminShipBuildplan');
      const rebelPlan = (await plans.save({ name: 'Rebellenpreis', shipClassId, moduleSelections: [] })).id;
      const rebelPlan2 = (await plans.save({ name: 'Rebellenhauptpreis', shipClassId, moduleSelections: [] })).id;
      const empirePlan = (await plans.save({ name: 'Imperiumspreis', shipClassId, moduleSelections: [] })).id;
      await source.getRepository('LotteryWinnerBuildplan').save([
        { factionId: rebels, buildplanId: rebelPlan, chance: 30 },
        { factionId: rebels, buildplanId: rebelPlan2, chance: 70 },
        { factionId: empire, buildplanId: empirePlan, chance: 100 },
      ]);
    });

    const firstOfDecember = new Date('2026-12-01T03:00:00+01:00');

    it('draws only on the first of the month', async () => {
      clock = new Date('2026-11-30T03:00:00+01:00');
      expect(await service.draw(clock)).toBeNull();
      expect(await source.getRepository('LotteryTicket').countBy({ isWinner: true })).toBe(0);
    });

    it('pays the jackpot, prestige and a faction ship to a random winner and tells the others', async () => {
      clock = firstOfDecember;
      // Winner index 1 (Lando's second ticket); ship roll 50 picks the 70% plan; free tickets never.
      rolls = [1, 50];

      expect(await service.draw(clock)).toEqual({ period: '2026.11', tickets: 5, jackpot: 4, winnerUserId: player.id });

      expect(await aurodium(player)).toBe(4);
      expect(await source.getRepository('User').findOneByOrFail({ id: player.id })).toMatchObject({ prestige: 3 });
      expect(await source.getRepository('PrestigeHistoryEntry').find()).toMatchObject([
        { userId: player.id, amount: 3, description: '3 Prestige erhalten für den Erwerb von 3 Losen in der letzten Lotterieziehung' },
      ]);
      const winners = await source.getRepository('LotteryTicket').find({ where: { period: '2026.11', isWinner: true } });
      expect(winners).toHaveLength(1);
      expect(await source.getRepository('LotteryTicket').countBy({ period: '2026.11', isWinner: false })).toBe(4);
      expect(await source.getRepository('LotteryTicket').countBy({ period: '2026.10', isWinner: true })).toBe(0);
      const rebelPlan2 = await source.getRepository('AdminShipBuildplan').findOneByOrFail({ name: 'Rebellenhauptpreis' });
      expect(ships).toEqual([{ userId: player.id, buildplanId: rebelPlan2.id, locationId, name: 'Lotteriegewinn (01.12.2026)' }]);

      const messages = await source.getRepository('Message').find({ order: { recipientId: 'ASC', id: 'ASC' } });
      expect(messages.map((message) => [message.recipientId, message.body])).toEqual(expect.arrayContaining([
        [player.id, "Du hast 4 Aurodium in der Lotterie gewonnen.\nEs waren 5 Lose im Topf.\nDer Gewinn wartet auf dich am Handelsposten 'Hutten-Handelsposten'"],
        [player.id, "Als zusätzlicher Lotteriegewinn wurde dir ein Schiff der Glücksfrachter-Klasse am Handelsposten 'Hutten-Handelsposten' überstellt."],
        [han.id, 'Lando hat 4 Aurodium in der Lotterie gewonnen.\nEs waren 5 Lose im Topf.\nViel Glück beim nächsten Mal!'],
        [tarkin.id, 'Lando hat 4 Aurodium in der Lotterie gewonnen.\nEs waren 5 Lose im Topf.\nViel Glück beim nächsten Mal!'],
      ]));
      expect(messages).toHaveLength(4);
      expect(drawn).toEqual([{ period: '2026.11', winnerUserId: player.id }]);
      expect(await service.overview(player.id, clock)).toMatchObject({
        period: '2026.12',
        lastDraw: { period: '2026.11', tickets: 5, jackpot: 4, winner: { id: player.id, username: 'Lando' }, ownTickets: 3 },
      });
    });

    it('draws each period only once', async () => {
      clock = firstOfDecember;
      rolls = [4];
      await service.draw(clock);
      rolls = [0];

      expect(await service.draw(new Date(clock.getTime() + HOUR_MS))).toBeNull();

      expect(await source.getRepository('LotteryTicket').countBy({ isWinner: true })).toBe(1);
      expect(drawn).toHaveLength(1);
      expect(await aurodium(tarkin)).toBe(4);
    });

    it('builds the ship of the winner faction and skips factions without prizes', async () => {
      clock = firstOfDecember;
      rolls = [4];
      await service.draw(clock);
      const empirePlan = await source.getRepository('AdminShipBuildplan').findOneByOrFail({ name: 'Imperiumspreis' });
      expect(ships).toEqual([expect.objectContaining({ userId: tarkin.id, buildplanId: empirePlan.id })]);

      await source.getRepository('LotteryWinnerBuildplan').delete({ factionId: rebels });
      await tickets(han, '2026.12', 1);
      ships = [];
      rolls = [0];
      await service.draw(new Date('2027-01-01T03:00:00+01:00'));
      expect(ships).toEqual([]);
    });

    it('hands out free tickets for the new period, more likely to newer players', async () => {
      clock = firstOfDecember;
      // Winner Lando, his ship roll, then one roll per player by id: Lando 0 %, Han 3.3 %, Tarkin 6.7 %.
      rolls = [0, 1, 1, 50, 3];
      await service.draw(clock);

      expect(await source.getRepository('LotteryTicket').find({ where: { period: '2026.12' } })).toMatchObject([{ userId: tarkin.id, isWinner: null }]);
      expect(await source.getRepository('Message').findOneByOrFail({ recipientId: tarkin.id, body: 'Du hast ein Gratislos für den aktuellen Lotteriezeitraum erhalten. Möge das Glück mit dir sein!' })).toBeTruthy();
    });

    describe('award (soc-G2c)', () => {
      beforeEach(async () => {
        // The award catalog is seeded by migration; resetDatabase empties it.
        const catalog = AWARD_CATALOG.find((entry) => entry.key === 'LOTTERY_WINNER');
        await source.getRepository('Award').save({ ...catalog, image: '/favicon.ico' });
        const awards = new AwardService(
          source.getRepository('UserAward') as never,
          new PrestigeService(source.getRepository('PrestigeHistoryEntry') as never),
          { sendSystem: async () => undefined } as never,
        );
        new LotteryAwardListener(service, awards).onModuleInit();
      });

      const award = () => source.getRepository('UserAward').findOneBy({ userId: player.id, awardKey: 'LOTTERY_WINNER' });

      it('grants LOTTERY_WINNER to the winner once per period and counts repeated wins', async () => {
        rolls = [0];
        await service.draw(firstOfDecember);
        expect(await award()).toMatchObject({ count: 1 });

        rolls = [0];
        await service.draw(new Date(firstOfDecember.getTime() + HOUR_MS));
        expect(await award()).toMatchObject({ count: 1 });

        await tickets(player, '2026.12', 1);
        rolls = [0];
        await service.draw(new Date('2027-01-01T03:00:00+01:00'));
        expect(await award()).toMatchObject({ count: 2 });
        expect(await source.getRepository('UserAward').countBy({ awardKey: 'LOTTERY_WINNER' })).toBe(1);
      });

      it('grants nothing without a draw', async () => {
        await source.getRepository('LotteryTicket').delete({ period: '2026.11' });
        await service.draw(firstOfDecember);
        await service.draw(new Date('2026-11-15T03:00:00+01:00'));

        expect(await source.getRepository('UserAward').countBy({ awardKey: 'LOTTERY_WINNER' })).toBe(0);
      });
    });

    it('does nothing without tickets of the last period', async () => {
      await source.getRepository('LotteryTicket').delete({ period: '2026.11' });
      expect(await service.draw(firstOfDecember)).toBeNull();
      expect(await source.getRepository('Message').count()).toBe(0);
    });
  });

  it('lets admins maintain the winner buildplans', async () => {
    const shipClassId = (await source.getRepository('ShipClassDef').save({ key: 'LOTTO2', name: 'Preis', category: 'SHIP', role: 'FREIGHTER' })).id;
    const plan = (await source.getRepository('AdminShipBuildplan').save({ name: 'Preisplan', shipClassId, moduleSelections: [] })).id;

    const created = await service.addWinnerBuildplan({ factionId: rebels, buildplanId: plan, chance: 25 });
    expect(await service.listWinnerBuildplans()).toEqual([{ id: created.id, factionId: rebels, buildplanId: plan, chance: 25 }]);
    await expect(service.addWinnerBuildplan({ factionId: rebels, buildplanId: plan, chance: 0 })).rejects.toThrow('Chance muss eine positive ganze Zahl sein');
    await expect(service.addWinnerBuildplan({ factionId: rebels, buildplanId: plan + 99, chance: 5 })).rejects.toThrow('Bauplan nicht gefunden');
    await service.removeWinnerBuildplan(created.id);
    expect(await service.listWinnerBuildplans()).toEqual([]);
  });
});
