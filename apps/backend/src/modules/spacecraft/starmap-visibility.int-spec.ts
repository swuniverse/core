import { DataSource } from 'typeorm';
import {
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';
import type { StarmapContactDto } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { AllianceInfrastructureCapabilityService } from '../alliance/alliance-infrastructure-capability.service';
import { AllianceService } from '../alliance/alliance.service';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { StarmapVisibilityService } from './starmap-visibility.service';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

/** Space field type seeded by migrations. */
const SPACE_FIELD_TYPE_ID = 1;

describe('starmap contacts (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let alliances: AllianceService;
  let rebels: number;
  let empire: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    empire = await factionId(dataSource, Faction.GALACTIC_EMPIRE);
    store = new TypeOrmAllianceStore(dataSource);
    alliances = new AllianceService(store, {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  // --- World building -------------------------------------------------

  const rebel = (username: string, overrides: Partial<User> = {}) =>
    createUser(dataSource, {
      username,
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
      ...overrides,
    });

  const imperial = (username: string) =>
    createUser(dataSource, {
      username,
      faction: Faction.GALACTIC_EMPIRE,
      factionId: empire,
    });

  async function layer(name: string) {
    return dataSource
      .getRepository(Layer)
      .save({ name, width: 100, height: 100 });
  }

  async function galaxyLocation(layerId: number, x: number, y: number) {
    const field = await dataSource.getRepository(GalaxyField).save({
      layerId,
      cx: x,
      cy: y,
      fieldTypeId: SPACE_FIELD_TYPE_ID,
    });
    // A database trigger creates the space location of every field.
    return dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: field.id });
  }

  async function systemLocation(
    layerId: number,
    system: { name: string; x: number; y: number },
    sx: number,
    sy: number,
  ) {
    const starSystem = await dataSource.getRepository(StarSystem).save({
      name: system.name,
      layerId,
      cx: system.x,
      cy: system.y,
      systemTypeId: 1,
    });
    const field = await dataSource.getRepository(SystemField).save({
      starSystemId: starSystem.id,
      sx,
      sy,
      fieldTypeId: SPACE_FIELD_TYPE_ID,
    });
    return dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
  }

  async function ship(
    name: string,
    owner: User,
    location: SpaceLocation,
    overrides: Partial<Spacecraft> = {},
  ) {
    return dataSource.getRepository(Spacecraft).save({
      name,
      shipClassId: 1,
      userId: owner.id,
      locationId: location.id,
      ...overrides,
    });
  }

  async function alliance(
    name: string,
    members: Array<[User, AllianceRole]>,
    { color = null as string | null, faction = rebels } = {},
  ) {
    const created = await store.insertAlliance({
      name,
      description: '',
      factionId: faction,
    });
    if (color) await store.updateAlliance(created.id, { color });
    for (const [member, role] of members) {
      await store.insertMembership({
        allianceId: created.id,
        userId: member.id,
        role,
      });
    }
    return created;
  }

  /** Active ALLIANCE relationship, proposed and accepted like in the game. */
  async function relate(
    proposer: User,
    proposerAllianceId: number,
    acceptor: User,
    acceptorAllianceId: number,
    permissions = { treatAsFriend: false, shareLivePositions: true },
  ) {
    const { id } = await alliances.proposeRelationship(
      proposer.id,
      proposerAllianceId,
      {
        recipientAllianceId: acceptorAllianceId,
        type: AllianceRelationshipType.ALLIANCE,
        permissions,
      },
    );
    await alliances.acceptRelationshipProposal(acceptor.id, id);
  }

  function visibility({ enabled = true } = {}) {
    return new StarmapVisibilityService(
      dataSource.getRepository(Spacecraft),
      new RelationshipResolverService(store, new NoPersonalContactStatusPort()),
      dataSource.getRepository(Layer),
      new AllianceInfrastructureCapabilityService({
        get: () => (enabled ? 'true' : undefined),
      } as never),
    );
  }

  /** `name:reason[:stance][+details]`, sorted, for compact expectations. */
  const summary = (contacts: StarmapContactDto[]) =>
    contacts
      .map(
        (contact) =>
          `${contact.spacecraftName}:${contact.reason}` +
          (contact.stance ? `:${contact.stance}` : '') +
          (contact.management ? '+details' : ''),
      )
      .sort();

  it('derives contacts from membership, relationship and layer', async () => {
    const leia = await rebel('leia');
    const han = await rebel('han');
    const mon = await rebel('mon');
    const lando = await rebel('lando');
    const vader = await imperial('vader');
    const rogue = await alliance(
      'Rogue Squadron',
      [
        [leia, PRESIDENT],
        [han, NONE],
      ],
      { color: '#ff8800' },
    );
    const red = await alliance('Red Squadron', [[mon, PRESIDENT]]);
    await relate(leia, rogue.id, mon, red.id);

    const core = await layer('Core');
    const outer = await layer('Outer Rim');
    const yavin = await galaxyLocation(core.id, 10, 11);
    await ship('Tantive', leia, yavin);
    await ship(
      'Falcon',
      han,
      await systemLocation(core.id, { name: 'Kessel', x: 40, y: 41 }, 12, 13),
    );
    await ship('Red Five', mon, await galaxyLocation(core.id, 20, 21));
    await ship('Far Away', han, await galaxyLocation(outer.id, 1, 1));
    await ship('Wreck', han, yavin, { status: SpacecraftStatus.DESTROYED });
    await ship('Lando Ship', lando, yavin);
    await ship('Devastator', vader, yavin);

    const result = await visibility().listContacts(leia.id, core.id);

    expect(result.allianceContactsActive).toBe(true);
    expect(summary(result.contacts)).toEqual([
      'Falcon:ALLIANCE:FRIEND+details',
      'Red Five:SHARED_LIVE_POSITION:NEUTRAL',
      'Tantive:OWN+details',
    ]);
    const falcon = result.contacts.find((c) => c.spacecraftName === 'Falcon');
    expect(falcon).toMatchObject({
      ownerName: 'han',
      galaxyCell: { layerId: core.id, x: 40, y: 41 },
      location: { scope: 'SYSTEM', x: 12, y: 13 },
      alliance: { id: rogue.id, name: 'Rogue Squadron', color: '#ff8800' },
    });
  });

  describe('takes effect with the next request, without a cleanup step', () => {
    async function world() {
      const leia = await rebel('leia');
      const han = await rebel('han');
      const luke = await rebel('luke');
      const mon = await rebel('mon');
      const wedge = await rebel('wedge');
      const rogue = await alliance('Rogue Squadron', [
        [leia, PRESIDENT],
        [han, NONE],
      ]);
      await store.updateAlliance(rogue.id, { acceptsApplications: true });
      const red = await alliance('Red Squadron', [
        [mon, PRESIDENT],
        [wedge, NONE],
      ]);
      await relate(leia, rogue.id, mon, red.id);
      const core = await layer('Core');
      const cell = await galaxyLocation(core.id, 5, 5);
      await ship('Tantive', leia, cell);
      await ship('Falcon', han, cell);
      await ship('X-Wing', luke, cell);
      await ship('Red Five', mon, cell);
      await ship('Red Two', wedge, cell);
      const contactsOf = async (viewer: User) =>
        summary((await visibility().listContacts(viewer.id, core.id)).contacts);
      return { leia, han, luke, mon, wedge, rogue, red, contactsOf };
    }

    it('joining makes the new member and the alliance visible to each other', async () => {
      const { leia, luke, rogue, contactsOf } = await world();
      expect(await contactsOf(luke)).toEqual(['X-Wing:OWN+details']);

      await alliances.apply(luke.id, rogue.id);
      const [application] = await store.listApplicationsOfPlayer(luke.id);
      await alliances.acceptApplication(leia.id, application.id);

      expect(await contactsOf(luke)).toEqual([
        'Falcon:ALLIANCE:FRIEND',
        'Red Five:SHARED_LIVE_POSITION:NEUTRAL',
        'Red Two:SHARED_LIVE_POSITION:NEUTRAL',
        'Tantive:ALLIANCE:FRIEND',
        'X-Wing:OWN+details',
      ]);
      expect(await contactsOf(leia)).toContain(
        'X-Wing:ALLIANCE:FRIEND+details',
      );
    });

    it('leaving removes alliance and partner ships in both directions', async () => {
      const { leia, han, mon, contactsOf } = await world();

      await alliances.leave(han.id);

      expect(await contactsOf(han)).toEqual(['Falcon:OWN+details']);
      expect(await contactsOf(leia)).not.toContain(
        'Falcon:ALLIANCE:FRIEND+details',
      );
      expect(await contactsOf(mon)).not.toContain(
        'Falcon:SHARED_LIVE_POSITION:NEUTRAL',
      );
    });

    it('kicking removes alliance and partner ships in both directions', async () => {
      const { leia, han, rogue, contactsOf } = await world();

      await alliances.kick(leia.id, rogue.id, han.id);

      expect(await contactsOf(han)).toEqual(['Falcon:OWN+details']);
      expect(await contactsOf(leia)).toEqual([
        'Red Five:SHARED_LIVE_POSITION:NEUTRAL',
        'Red Two:SHARED_LIVE_POSITION:NEUTRAL',
        'Tantive:OWN+details',
      ]);
    });

    it('dissolving leaves no alliance or partner view behind', async () => {
      const { leia, han, mon, rogue, contactsOf } = await world();

      await alliances.dissolve(leia.id, rogue.id);

      expect(await contactsOf(leia)).toEqual(['Tantive:OWN+details']);
      expect(await contactsOf(han)).toEqual(['Falcon:OWN+details']);
      expect(await contactsOf(mon)).toEqual([
        'Red Five:OWN+details',
        'Red Two:ALLIANCE:FRIEND+details',
      ]);
    });

    it('an office change grants or withdraws management details', async () => {
      const { leia, han, rogue, contactsOf } = await world();
      expect(await contactsOf(han)).toContain('Tantive:ALLIANCE:FRIEND');

      await alliances.setRole(leia.id, rogue.id, han.id, VICE);
      expect(await contactsOf(han)).toContain(
        'Tantive:ALLIANCE:FRIEND+details',
      );

      await alliances.setRole(leia.id, rogue.id, han.id, DIPLOMAT);
      expect(await contactsOf(han)).toContain('Tantive:ALLIANCE:FRIEND');

      await alliances.transferPresidency(leia.id, rogue.id, han.id);
      expect(await contactsOf(han)).toContain(
        'Tantive:ALLIANCE:FRIEND+details',
      );
      expect(await contactsOf(leia)).toContain('Falcon:ALLIANCE:FRIEND');
    });

    it('war hides the former partners and keeps own alliance ships', async () => {
      const { leia, mon, rogue, red, contactsOf } = await world();

      await alliances.declareWar(mon.id, red.id, rogue.id);

      expect(await contactsOf(leia)).toEqual([
        'Falcon:ALLIANCE:FRIEND+details',
        'Tantive:OWN+details',
      ]);
      expect(await contactsOf(mon)).toEqual([
        'Red Five:OWN+details',
        'Red Two:ALLIANCE:FRIEND+details',
      ]);
    });

    it('ending the relationship hides the partner ships on both sides', async () => {
      const { leia, mon, rogue, contactsOf } = await world();
      const [relationship] = await store.listActiveRelationships(rogue.id);

      await alliances.endRelationship(mon.id, relationship.id);

      expect(await contactsOf(leia)).toEqual([
        'Falcon:ALLIANCE:FRIEND+details',
        'Tantive:OWN+details',
      ]);
      expect(await contactsOf(mon)).not.toContain(
        'Tantive:SHARED_LIVE_POSITION:NEUTRAL',
      );
    });

    it('revoking live position sharing hides the partner ships on both sides', async () => {
      const { leia, mon, rogue, contactsOf } = await world();
      const [relationship] = await store.listActiveRelationships(rogue.id);

      const { id } = await alliances.proposeRelationshipChange(
        leia.id,
        relationship.id,
        { permissions: { treatAsFriend: false, shareLivePositions: false } },
      );
      expect(await contactsOf(leia)).toContain(
        'Red Five:SHARED_LIVE_POSITION:NEUTRAL',
      );
      await alliances.acceptRelationshipChange(mon.id, id);

      expect(await contactsOf(leia)).toEqual([
        'Falcon:ALLIANCE:FRIEND+details',
        'Tantive:OWN+details',
      ]);
      expect(await contactsOf(mon)).toEqual([
        'Red Five:OWN+details',
        'Red Two:ALLIANCE:FRIEND+details',
      ]);
    });
  });

  // The response time is bounded by a fixed number of queries per request:
  // one batched stance resolution, never one lookup per member or ship.
  describe('large alliances', () => {
    /** Leia presides an alliance of `members` players with `shipsEach` ships each. */
    async function largeAlliance(members: number, shipsEach: number) {
      const leia = await rebel(`leia-${members}-${shipsEach}`);
      const mates: User[] = [];
      for (let index = 0; index < members - 1; index += 1) {
        mates.push(await rebel(`mate-${members}-${shipsEach}-${index}`));
      }
      await alliance(`Fleet ${members}x${shipsEach}`, [
        [leia, PRESIDENT],
        ...mates.map((mate) => [mate, NONE] as [User, AllianceRole]),
      ]);
      const core = await layer('Core');
      const cell = await galaxyLocation(core.id, 1, 1);
      const rows = [leia, ...mates].flatMap((owner) =>
        Array.from({ length: shipsEach }, (_, index) => ({
          name: `${owner.username}-${index}`,
          shipClassId: 1,
          userId: owner.id,
          locationId: cell.id,
        })),
      );
      await dataSource.getRepository(Spacecraft).insert(rows);
      return { leia, core };
    }

    async function measure(members: number, shipsEach: number) {
      const { leia, core } = await largeAlliance(members, shipsEach);
      const queries = jest.spyOn(dataSource.logger, 'logQuery');
      const result = await visibility().listContacts(leia.id, core.id);
      const queryCount = queries.mock.calls.length;
      queries.mockRestore();
      expect(result.contacts).toHaveLength(members * shipsEach);
      return queryCount;
    }

    it('does not issue more queries for more ships', async () => {
      const few = await measure(20, 1);
      await resetDatabase(dataSource);
      const many = await measure(20, 10);
      expect(many).toBe(few);
    });

    it('does not issue more queries for more members', async () => {
      const small = await measure(5, 2);
      await resetDatabase(dataSource);
      const large = await measure(100, 2);
      expect(large).toBe(small);
    });
  });
});
