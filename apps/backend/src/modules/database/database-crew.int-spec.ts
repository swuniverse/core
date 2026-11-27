import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CrewRank } from '../spacecraft/crew-rank';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Colony } from '../colony/entities/colony.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { User } from '../auth/user.entity';
import { CrewSkill } from '../spacecraft/entities/crew-skill.entity';
import { EscapePod, EscapePodLaunchReason } from '../spacecraft/entities/escape-pod.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { Spacecraft, SpacecraftKind } from '../spacecraft/entities/spacecraft.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradePost } from '../trade/entities/trade-post.entity';
import { DatabaseCrewService } from './database-crew.service';

describe('crew overview (PostgreSQL, tmw-AUD-07)', () => {
  let dataSource: DataSource;
  let service: DatabaseCrewService;
  let me: User;
  let other: User;
  let shipClassId: number;
  let locationId: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    service = new DatabaseCrewService(dataSource);
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    me = await createUser(dataSource, { username: 'me' });
    other = await createUser(dataSource, { username: 'other' });
    const layer = await dataSource.getRepository(Layer).save({ name: 'Kern', width: 5, height: 5, isHidden: false });
    const fieldTypeId = (await dataSource.getRepository(GalaxyFieldType).findOneByOrFail({})).id;
    const field = await dataSource.getRepository(GalaxyField).save({ layerId: layer.id, cx: 2, cy: 3, fieldTypeId });
    locationId = (await dataSource.getRepository(SpaceLocation).findOneByOrFail({ galaxyFieldId: field.id })).id;
    shipClassId = (
      await dataSource.getRepository(ShipClassDef).save({ key: 'TEST_FRIGATE', name: 'Fregatte', category: 'FRIGATE', role: 'ESCORT' })
    ).id;
  });

  const ship = (user: User, values: Partial<Spacecraft> = {}) =>
    dataSource.getRepository(Spacecraft).save({
      name: 'Schiff', userId: user.id, shipClassId, locationId, runtimeSystems: {}, hullMax: 100, ...values,
    } as Partial<Spacecraft> as Spacecraft);
  const colony = (user: User, name = 'Kolonie') =>
    dataSource.getRepository(Colony).save({ name, userId: user.id, colonyClassId: 1 } as Partial<Colony> as Colony);
  const pod = () =>
    dataSource.getRepository(EscapePod).save({
      locationId, originSpacecraftId: 999, originShipName: 'Altschiff', originShipClassId: shipClassId,
      presentationKey: 'POD', launchReason: EscapePodLaunchReason.COMBAT_DESTRUCTION,
    } as Partial<EscapePod> as EscapePod);
  const crew = async (
    owner: User,
    name: string,
    place: Partial<CrewAssignment>,
    extra: { rank?: CrewRank; skills?: Array<[CrewType, number]> } = {},
  ) => {
    const member = await dataSource.getRepository(Crew).save({ userId: owner.id, name, rank: extra.rank ?? CrewRank.CADET } as Crew);
    await dataSource.getRepository(CrewAssignment).save({ crewId: member.id, userId: owner.id, ...place } as CrewAssignment);
    for (const [position, expertise] of extra.skills ?? []) {
      await dataSource.getRepository(CrewSkill).save({ crewId: member.id, position, expertise });
    }
    return member;
  };
  const byName = async () => new Map((await service.list(me.id)).members.map((member) => [member.name, member]));

  it('describes each place of service and leaves out everyone else’s crew', async () => {
    const own = await ship(me, { name: 'Eigenschiff' });
    const ownStation = await ship(me, { name: 'Eigenstation', kind: SpacecraftKind.STATION });
    const foreignStation = await ship(other, { name: 'Fremdstation', kind: SpacecraftKind.STATION });
    const myColony = await colony(me, 'Heimat');
    const podRow = await pod();
    const post = await dataSource.getRepository(TradePost).save({
      name: 'Posten', networkId: other.id, ownerId: other.id, locationId, stationId: foreignStation.id,
    } as Partial<TradePost> as TradePost);

    await crew(me, 'Kapitän', { spacecraftId: own.id, slot: CrewType.CAPTAIN }, {
      rank: CrewRank.ENSIGN, skills: [[CrewType.CAPTAIN, 400], [CrewType.SECURITY, 120]],
    });
    await crew(me, 'Wache', { spacecraftId: ownStation.id, slot: CrewType.SECURITY });
    await crew(me, 'Siedler', { colonyId: myColony.id });
    await crew(me, 'Überlebender', { escapePodId: podRow.id, slot: null });
    await crew(me, 'Gast aktiv', { spacecraftId: foreignStation.id, slot: CrewType.TECHNICAL });
    await crew(me, 'Gast ohne Posten', { spacecraftId: foreignStation.id, slot: null });
    await crew(me, 'Wartender', { tradePostId: post.id });
    await crew(other, 'Fremder an Bord', { spacecraftId: own.id, slot: CrewType.COMMAND });
    await crew(other, 'Fremder Siedler', { colonyId: (await colony(other)).id });

    const members = await byName();

    expect([...members.keys()].sort()).toEqual(
      ['Gast aktiv', 'Gast ohne Posten', 'Kapitän', 'Siedler', 'Überlebender', 'Wache', 'Wartender'].sort(),
    );
    expect(members.get('Kapitän')).toMatchObject({
      rank: CrewRank.ENSIGN,
      rankLabel: 'Fähnrich',
      highestExpertise: 400,
      position: CrewType.CAPTAIN,
      positionLabel: 'Captain',
      location: { type: 'SHIP', id: own.id, name: 'Eigenschiff', shipClassId, shipClassKey: 'TEST_FRIGATE' },
      inEscapePod: false,
      onForeignStation: false,
    });
    expect(members.get('Kapitän')?.skills.map((skill) => skill.expertise)).toEqual([400, 120]);
    expect(members.get('Kapitän')?.location?.sector).toMatchObject({ scope: 'GALAXY', x: 2, y: 3 });
    expect(members.get('Wache')).toMatchObject({ location: { type: 'STATION' }, onForeignStation: false });
    expect(members.get('Siedler')).toMatchObject({
      position: null,
      location: { type: 'COLONY', id: myColony.id, name: 'Heimat', sector: null },
    });
    expect(members.get('Überlebender')).toMatchObject({
      inEscapePod: true,
      position: null,
      location: { type: 'ESCAPE_POD', id: podRow.id, name: 'Altschiff' },
    });
    expect(members.get('Gast aktiv')).toMatchObject({ onForeignStation: true, onForeignStationInactive: false });
    expect(members.get('Gast ohne Posten')).toMatchObject({ onForeignStation: true, onForeignStationInactive: true });
    expect(members.get('Wartender')).toMatchObject({
      location: { type: 'TRADE_POST', name: 'Posten' },
      onForeignStation: true,
      onForeignStationInactive: true,
    });
  });

  it('reports the ranks and positions the filters need', async () => {
    const { ranks, positions, members } = await service.list(me.id);

    expect(members).toEqual([]);
    expect(ranks[0]).toEqual({ rank: CrewRank.CADET, label: 'Kadett', expertise: 0 });
    expect(positions.map((entry) => entry.position)).toContain(CrewType.NAVIGATION);
  });

  describe('dismissal', () => {
    const left = (name: string) => dataSource.getRepository(Crew).findOneBy({ name });

    it('removes only the own crew, refreshes ship crew and drops emptied pods', async () => {
      const own = await ship(me, { crew: 3 });
      const foreignHost = await ship(other, { crew: 2 });
      const emptyingPod = await pod();
      const sharedPod = await pod();
      const a = await crew(me, 'A', { spacecraftId: own.id, slot: CrewType.CAPTAIN }, { skills: [[CrewType.CAPTAIN, 5]] });
      await crew(me, 'B', { spacecraftId: own.id, slot: CrewType.SECURITY });
      await crew(me, 'C', { spacecraftId: own.id, slot: null });
      const onPod = await crew(me, 'Kapselcrew', { escapePodId: emptyingPod.id });
      const onSharedPod = await crew(me, 'Geteilt', { escapePodId: sharedPod.id });
      await crew(other, 'Bleibt in Kapsel', { escapePodId: sharedPod.id });
      const guest = await crew(me, 'Gast', { spacecraftId: foreignHost.id, slot: CrewType.TECHNICAL });
      const foreign = await crew(other, 'Fremd', { spacecraftId: foreignHost.id, slot: null });

      const result = await service.dismiss(me.id, [a.id, onPod.id, onSharedPod.id, guest.id, foreign.id, 987654, a.id]);

      expect(result).toEqual({ dismissed: 4, skippedIds: [foreign.id, 987654], removedEscapePods: 1 });
      expect(await left('A')).toBeNull();
      expect(await dataSource.getRepository(CrewSkill).countBy({ crewId: a.id })).toBe(0);
      expect(await dataSource.getRepository(CrewAssignment).countBy({ crewId: a.id })).toBe(0);
      expect(await left('B')).not.toBeNull();
      expect(await left('Fremd')).not.toBeNull();
      expect(await left('Bleibt in Kapsel')).not.toBeNull();
      expect((await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: own.id })).crew).toBe(2);
      expect((await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: foreignHost.id })).crew).toBe(1);
      expect(await dataSource.getRepository(EscapePod).existsBy({ id: emptyingPod.id })).toBe(false);
      expect(await dataSource.getRepository(EscapePod).existsBy({ id: sharedPod.id })).toBe(true);
    });

    it('dismisses nothing for foreign ids and rejects oversized requests', async () => {
      const foreign = await crew(other, 'Fremd', { colonyId: (await colony(other)).id });

      await expect(service.dismiss(me.id, [foreign.id])).resolves.toEqual({
        dismissed: 0, skippedIds: [foreign.id], removedEscapePods: 0,
      });
      expect(await left('Fremd')).not.toBeNull();
      await expect(service.dismiss(me.id, Array.from({ length: 501 }, (_, i) => i + 1))).rejects.toThrow(/höchstens 500/);
    });
  });
});
