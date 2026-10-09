import { DataSource } from 'typeorm';
import { AllianceRelationshipType, Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { AllianceService } from '../alliance/alliance.service';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { CargoItem } from './entities/cargo-item.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { TransferService } from './transfer.service';

const { FRIENDSHIP, ALLIANCE } = AllianceRelationshipType;

/** Space field type seeded by migrations. */
const SPACE_FIELD_TYPE_ID = 1;
const FRIENDS_ONLY = 'Transfer nur zwischen Freunden erlaubt';

/**
 * End-to-end effect of Siedler relationships on the existing consumers of the
 * relationship resolver (ship transfers, protected-ship supply, shared live
 * positions), against real Postgres: a Siedler relationship takes effect
 * with the next request and disappears once a Siedler founds or joins an
 * alliance.
 */
describe('Siedler relationships reach the game consumers (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let alliances: AllianceService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    store = new TypeOrmAllianceStore(dataSource);
    alliances = new AllianceService(store, {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
  });

  const rebel = (username: string) =>
    createUser(dataSource, {
      username,
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
    });

  const resolver = () =>
    new RelationshipResolverService(store, new NoPersonalContactStatusPort());

  async function sharedCell() {
    const layer = await dataSource
      .getRepository(Layer)
      .save({ name: 'Core', width: 100, height: 100 });
    const field = await dataSource.getRepository(GalaxyField).save({
      layerId: layer.id,
      cx: 5,
      cy: 5,
      fieldTypeId: SPACE_FIELD_TYPE_ID,
    });
    // A database trigger creates the space location of every field.
    return dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: field.id });
  }

  const ship = (
    name: string,
    owner: User,
    location: SpaceLocation,
    overrides: Partial<Spacecraft> = {},
  ) =>
    dataSource.getRepository(Spacecraft).save({
      name,
      shipClassId: 1,
      userId: owner.id,
      locationId: location.id,
      ...overrides,
    });

  /** Proposed by `proposer`, accepted by `acceptor`, between two Siedler. */
  async function settle(
    proposer: User,
    acceptor: User,
    type: AllianceRelationshipType,
    permissions = { treatAsFriend: true, shareLivePositions: false },
  ) {
    const { id } = await alliances.proposeSettlerRelationship(proposer.id, {
      recipientPlayerId: acceptor.id,
      type,
      permissions,
    });
    await alliances.acceptRelationshipProposal(acceptor.id, id);
  }

  async function foundAlliance(founder: User, name: string) {
    const { id } = await alliances.found(founder.id, { name, description: '' });
    await store.updateAlliance(id, { acceptsApplications: true });
    return id;
  }

  async function join(applicant: User, president: User, allianceId: number) {
    await alliances.apply(applicant.id, allianceId);
    const [application] = await store.listApplicationsForAlliance(allianceId);
    await alliances.acceptApplication(president.id, application.id);
  }

  /** Only the quote reads the resolver, so the other collaborators are unused. */
  function transfers() {
    return new TransferService(
      dataSource.getRepository(CargoItem),
      null as never,
      dataSource,
      null as never,
      null as never,
      { getCommodity: () => undefined } as never,
      resolver(),
    );
  }

  function visibility() {
    return new StarmapVisibilityService(
      dataSource.getRepository(Spacecraft),
      resolver(),
      dataSource.getRepository(Layer),
    );
  }

  describe('ship transfers', () => {
    it('a Siedler friendship allows them and a war ends them', async () => {
      const han = await rebel('han');
      const lando = await rebel('lando');
      const cell = await sharedCell();
      const falcon = await ship('Falcon', han, cell);
      const ladyLuck = await ship('Lady Luck', lando, cell);
      const quote = () =>
        transfers().getShipTransferQuote(falcon.id, han.id, ladyLuck.id);
      expect(await quote()).toMatchObject({
        available: false,
        reason: FRIENDS_ONLY,
      });

      await settle(han, lando, FRIENDSHIP);
      expect(await quote()).toMatchObject({ available: true, reason: null });

      await alliances.declareSettlerWar(lando.id, han.id);
      expect(await quote()).toMatchObject({
        available: false,
        reason: FRIENDS_ONLY,
      });
    });

    it('a friendship ends with the Siedler founding an alliance', async () => {
      const han = await rebel('han');
      const lando = await rebel('lando');
      const cell = await sharedCell();
      const falcon = await ship('Falcon', han, cell);
      const ladyLuck = await ship('Lady Luck', lando, cell);
      await settle(han, lando, FRIENDSHIP);
      const quote = () =>
        transfers().getShipTransferQuote(falcon.id, han.id, ladyLuck.id);
      expect(await quote()).toMatchObject({ available: true });

      await foundAlliance(han, 'Neue Hoffnung');

      expect(await quote()).toMatchObject({
        available: false,
        reason: FRIENDS_ONLY,
      });
    });
  });

  describe('supply of a protected ship', () => {
    it('a Siedler friend may supply a ship with raised shields until the Siedler joins an alliance', async () => {
      const han = await rebel('han');
      const lando = await rebel('lando');
      const leia = await rebel('leia');
      const cell = await sharedCell();
      const falcon = await ship('Falcon', han, cell);
      const shielded = await ship('Lady Luck', lando, cell, {
        runtimeSystems: { SHIELDS: { active: true } },
      });
      const supply = () =>
        transfers().getShipTransferQuote(
          falcon.id,
          han.id,
          shielded.id,
          'TO_TARGET',
        );
      expect(await supply()).toMatchObject({ available: false });

      await settle(han, lando, FRIENDSHIP);
      expect(await supply()).toMatchObject({ available: true });

      const rogue = await foundAlliance(leia, 'Rogue Squadron');
      await join(han, leia, rogue);

      expect(await supply()).toMatchObject({
        available: false,
        reason: FRIENDS_ONLY,
      });
    });
  });

  describe('shared live positions', () => {
    async function world() {
      const han = await rebel('han');
      const lando = await rebel('lando');
      const leia = await rebel('leia');
      const cell = await sharedCell();
      await ship('Falcon', han, cell);
      await ship('Lady Luck', lando, cell);
      const names = async (viewer: User) =>
        (await visibility().listSharedLivePositions(viewer.id))
          .map((position) => position.spacecraftName)
          .sort();
      return { han, lando, leia, names };
    }

    it('shows a partner while the Siedler alliance shares positions and hides it when a Siedler joins an alliance', async () => {
      const { han, lando, leia, names } = await world();
      expect(await names(han)).toEqual([]);

      await settle(han, lando, ALLIANCE, {
        treatAsFriend: true,
        shareLivePositions: true,
      });
      expect(await names(han)).toEqual(['Lady Luck']);
      expect(await names(lando)).toEqual(['Falcon']);

      const rogue = await foundAlliance(leia, 'Rogue Squadron');
      await join(lando, leia, rogue);

      expect(await names(han)).toEqual([]);
      expect(await names(lando)).toEqual([]);
    });

    it('shares nothing for an agreement without the permission, nor after war', async () => {
      const { han, lando, names } = await world();

      await settle(han, lando, FRIENDSHIP);
      expect(await names(han)).toEqual([]);

      await alliances.declareSettlerWar(han.id, lando.id);
      expect(await names(han)).toEqual([]);
    });
  });
});
