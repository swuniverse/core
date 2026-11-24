import { DataSource } from 'typeorm';
import { EscapePodService } from '../../modules/spacecraft/escape-pod.service';
import { PlayerTradePostService } from '../../modules/trade/player-trade-post.service';
import { MessagingService } from '../../modules/messaging/messaging.service';
import { closestCrewTradePost } from '../../modules/spacecraft/crew-trade-post';
import { AddCrewAtTradePosts20261116120000 } from '../../database/migrations/20261116120000-add-crew-at-trade-posts';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from './database';

describe('foreign crew recovery (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  async function setup() {
    const rescuer = await createUser(source);
    const owner = await createUser(source);
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Recovery', width: 20, height: 20 });
    const fieldType = await source
      .getRepository('GalaxyFieldType')
      .findOneByOrFail({});
    const at = async (x: number, y: number) => {
      const field = await source
        .getRepository('GalaxyField')
        .save({ layerId: layer.id, cx: x, cy: y, fieldTypeId: fieldType.id });
      return source
        .getRepository('SpaceLocation')
        .findOneByOrFail({ galaxyFieldId: field.id });
    };
    const location = await at(1, 1);
    const shipClass = await source
      .getRepository('ShipClassDef')
      .save({
        key: 'RECOVERY',
        name: 'Recovery',
        category: 'SHIP',
        role: 'SHIP',
      });
    const ship = await source
      .getRepository('Spacecraft')
      .save({
        name: 'Retter',
        userId: rescuer.id,
        shipClassId: shipClass.id,
        locationId: location.id,
        energy: 5,
        crewMax: 1,
        runtimeSystems: {},
      });
    const pod = await source
      .getRepository('EscapePod')
      .save({
        locationId: location.id,
        originSpacecraftId: ship.id,
        originShipName: 'Verloren',
        originShipClassId: shipClass.id,
        presentationKey: 'REBEL_ESCAPE_PODS',
        launchReason: 'COMBAT_DESTRUCTION',
      });
    const member = async (
      userId: number,
      placement: Record<string, unknown> = { escapePodId: pod.id },
    ) => {
      const crew = await source
        .getRepository('Crew')
        .save({ userId, name: `Crew ${userId}` });
      await source
        .getRepository('CrewAssignment')
        .save({ crewId: crew.id, userId, ...placement });
      return crew;
    };
    const postAt = async (
      x: number,
      y: number,
      name: string,
      stationId: number | null = null,
    ) =>
      source
        .getRepository('TradePost')
        .save({
          name,
          networkId: 1,
          ownerId: rescuer.id,
          locationId: (await at(x, y)).id,
          stationId,
        });
    const gateway = { emitToUser: jest.fn() };
    const messaging = new MessagingService(
      source.getRepository('Message') as never,
      source.getRepository('User') as never,
      {} as never,
      gateway as never,
      {} as never,
    );
    const service = new EscapePodService(
      source,
      {
        getEscapePodPresentationForFaction: () => ({
          key: 'REBEL_ESCAPE_PODS',
        }),
      } as never,
      {} as never,
      messaging,
      { initialize: () => ({}) } as never,
    );
    return {
      rescuer,
      owner,
      location,
      shipClass,
      ship,
      pod,
      at,
      member,
      postAt,
      service,
      gateway,
      messaging,
    };
  }

  it('salvages mixed pods, selects the nearest post, stores messages atomically and lists only the crew owner', async () => {
    const h = await setup();
    await h.member(h.rescuer.id);
    await h.member(h.rescuer.id);
    const foreign = await h.member(h.owner.id);
    await h.postAt(10, 10, 'Weit');
    const nearest = await h.postAt(3, 1, 'Naboo');
    const result = await h.service.salvage(h.ship.id, h.rescuer.id, h.pod.id);
    expect(result).toMatchObject({
      salvaged: 1,
      remaining: 1,
      foreign: 1,
      energy: 4,
    });
    expect(
      await source
        .getRepository('CrewAssignment')
        .findOneByOrFail({ crewId: foreign.id }),
    ).toMatchObject({
      tradePostId: nearest.id,
      escapePodId: null,
      spacecraftId: null,
    });
    expect(
      await source
        .getRepository('Message')
        .findOneByOrFail({ recipientId: h.owner.id }),
    ).toMatchObject({ isSystem: true, body: expect.stringContaining('Naboo') });
    const list = await h.service.listCrewAtTradePosts(h.owner.id);
    expect(list).toMatchObject([
      { tradePostId: nearest.id, crewCount: 1, location: { x: 3, y: 1 } },
    ]);
    expect(await h.service.listCrewAtTradePosts(h.rescuer.id)).toEqual([]);
    expect(h.gateway.emitToUser).toHaveBeenCalled();
  });

  it('rolls back the complete mixed salvage without an accessible post or on notification persistence failure', async () => {
    const h = await setup();
    const own = await h.member(h.rescuer.id);
    const foreign = await h.member(h.owner.id);
    await expect(
      h.service.salvage(h.ship.id, h.rescuer.id, h.pod.id),
    ).rejects.toThrow('Kein erreichbarer Handelsposten');
    await h.postAt(2, 1, 'Posten');
    await source.query(
      `CREATE FUNCTION reject_crew_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'message failure'; END $$`,
    );
    await source.query(
      `CREATE TRIGGER reject_crew_message BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION reject_crew_message()`,
    );
    try {
      await expect(
        h.service.salvage(h.ship.id, h.rescuer.id, h.pod.id),
      ).rejects.toThrow('message failure');
    } finally {
      await source.query(`DROP TRIGGER reject_crew_message ON messages`);
      await source.query(`DROP FUNCTION reject_crew_message()`);
    }
    for (const crewId of [own.id, foreign.id])
      expect(
        await source
          .getRepository('CrewAssignment')
          .findOneByOrFail({ crewId }),
      ).toMatchObject({ escapePodId: h.pod.id, tradePostId: null });
    expect(
      (
        await source
          .getRepository('Spacecraft')
          .findOneByOrFail({ id: h.ship.id })
      ).energy,
    ).toBe(5);
    expect(await source.getRepository('Message').count()).toBe(0);
    expect(h.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('honors station denies for the crew owner and ignores ship-specific access grants', async () => {
    const h = await setup();
    const station = await source
      .getRepository('Spacecraft')
      .save({
        name: 'Station',
        kind: 'STATION',
        userId: h.rescuer.id,
        shipClassId: h.shipClass.id,
        locationId: h.location.id,
      });
    const restricted = await h.postAt(2, 1, 'Gesperrt', station.id);
    const publicPost = await h.postAt(4, 1, 'Öffentlich');
    await source.getRepository('DockingPrivilege').save([
      {
        stationId: station.id,
        targetType: 'SHIP',
        targetId: h.ship.id,
        mode: 'ALLOW',
      },
      {
        stationId: station.id,
        targetType: 'USER',
        targetId: h.owner.id,
        mode: 'DENY',
      },
    ]);
    await source.transaction(async (manager) =>
      expect(
        (await closestCrewTradePost(manager, h.location.id, h.owner.id))?.post
          .id,
      ).toBe(publicPost.id),
    );
    await source
      .getRepository('DockingPrivilege')
      .delete({ targetType: 'USER' });
    await source.transaction(async (manager) =>
      expect(
        (await closestCrewTradePost(manager, h.location.id, h.owner.id))?.post
          .id,
      ).toBe(publicPost.id),
    );
    await source
      .getRepository('DockingPrivilege')
      .save({
        stationId: station.id,
        targetType: 'USER',
        targetId: h.owner.id,
        mode: 'ALLOW',
      });
    await source.transaction(async (manager) =>
      expect(
        (await closestCrewTradePost(manager, h.location.id, h.owner.id))?.post
          .id,
      ).toBe(restricted.id),
    );
  });

  it.each(['host', 'crew owner'])(
    'allows %s release and persists a pod and notice while outsiders cannot withdraw',
    async (actor) => {
      const h = await setup();
      const member = await h.member(h.owner.id, {
        spacecraftId: h.ship.id,
        slot: 'COMMAND',
      });
      const outsider = await createUser(source);
      await expect(
        h.service.releaseForeignCrew(h.ship.id, member.id, outsider.id),
      ).rejects.toThrow('Crewmitglied nicht gefunden');
      expect(await h.service.listCrewOnForeignShips(h.owner.id)).toMatchObject([
        { crewId: member.id, shipId: h.ship.id },
      ]);
      const result = await h.service.releaseForeignCrew(
        h.ship.id,
        member.id,
        actor === 'host' ? h.rescuer.id : h.owner.id,
      );
      expect(
        await source
          .getRepository('CrewAssignment')
          .findOneByOrFail({ crewId: member.id }),
      ).toMatchObject({
        escapePodId: result.podId,
        spacecraftId: null,
        slot: null,
      });
      expect(await source.getRepository('Message').count()).toBe(1);
      expect(
        (
          await source
            .getRepository('Spacecraft')
            .findOneByOrFail({ id: h.ship.id })
        ).crew,
      ).toBe(0);
      expect(await h.service.listCrewOnForeignShips(h.owner.id)).toEqual([]);
    },
  );

  it('moves waiting crew into pods before deleting a destroyed station post', async () => {
    const h = await setup();
    const station = await source
      .getRepository('Spacecraft')
      .save({
        name: 'Station',
        kind: 'STATION',
        userId: h.rescuer.id,
        shipClassId: h.shipClass.id,
        locationId: h.location.id,
      });
    const post = await h.postAt(2, 1, 'Stationposten', station.id);
    const member = await h.member(h.owner.id, { tradePostId: post.id });
    const service = new PlayerTradePostService(h.messaging, {} as never);
    await source.transaction(async (manager) =>
      service.destroyForStation(
        manager,
        station as never,
        { manager, afterCommit: [] },
        () => 0,
      ),
    );
    const assignment = await source
      .getRepository('CrewAssignment')
      .findOneByOrFail({ crewId: member.id });
    expect(assignment.tradePostId).toBeNull();
    expect(assignment.escapePodId).not.toBeNull();
    expect(
      await source.getRepository('TradePost').findOneBy({ id: post.id }),
    ).toBeNull();
  });

  it('enforces exactly one location and guards migration rollback while post crew exists', async () => {
    const h = await setup();
    const post = await h.postAt(2, 1, 'Posten');
    const member = await h.member(h.owner.id, { tradePostId: post.id });
    await expect(
      source
        .getRepository('CrewAssignment')
        .update(member.id, { escapePodId: h.pod.id }),
    ).rejects.toThrow('CHK_crew_assignments_single_location');
    await expect(
      source.getRepository('TradePost').delete(post.id),
    ).rejects.toThrow('FK_crew_assignments_trade_post');
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      const migration = new AddCrewAtTradePosts20261116120000();
      await expect(migration.down(runner)).rejects.toThrow('vor dem Rollback');
      await source
        .getRepository('CrewAssignment')
        .update(member.id, { tradePostId: null, escapePodId: h.pod.id });
      await migration.down(runner);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  });
});
