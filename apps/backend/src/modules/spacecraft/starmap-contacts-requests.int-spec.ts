import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';
import type { StarmapContactsDto } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ALLIANCE_STORE } from '../alliance/alliance.store';
import {
  NoPersonalContactStatusPort,
  PERSONAL_CONTACT_STATUS,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import { TypeOrmAllianceStore } from '../alliance/typeorm-alliance.store';
import { ColonizationService } from '../colonization/colonization.service';
import { GameDataService } from '../game-data/game-data.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipColonyContextService } from './ship-colony-context.service';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { SpacecraftService } from './spacecraft.service';
import { SpacecraftController } from './spacecraft.controller';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { TransferService } from './transfer.service';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const JWT_SECRET = 'integration-secret';
const SPACE_FIELD_TYPE_ID = 1;

/** Controller collaborators the starmap contact routes never touch. */
const UNRELATED_SPACECRAFT_SERVICES = [
  SpacecraftService,
  TransferService,
  SpacecraftScanService,
  GameDataService,
  ColonizationService,
  ShipColonyContextService,
  SpacecraftCommunicationService,
  SpacecraftEngineeringService,
  SpacecraftDestructionService,
];

/**
 * Direct HTTP requests against the real controllers, JWT guard and Postgres:
 * the server alone decides contacts and detail levels, whatever the client
 * sends.
 */
describe('starmap contact requests (Postgres, HTTP)', () => {
  let dataSource: DataSource;
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
  });

  async function startApp() {
    const config = {
      get: (key: string) =>
        ({
          JWT_SECRET,
        })[key],
    };
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [SpacecraftController],
      providers: [
        { provide: ConfigService, useValue: config },
        JwtStrategy,
        StarmapVisibilityService,
        RelationshipResolverService,
        {
          provide: PERSONAL_CONTACT_STATUS,
          useClass: NoPersonalContactStatusPort,
        },
        {
          provide: ALLIANCE_STORE,
          useFactory: () => new TypeOrmAllianceStore(dataSource),
        },
        {
          provide: getRepositoryToken(Spacecraft),
          useFactory: () => dataSource.getRepository(Spacecraft),
        },
        {
          provide: getRepositoryToken(Layer),
          useFactory: () => dataSource.getRepository(Layer),
        },
        ...UNRELATED_SPACECRAFT_SERVICES.map((service) => ({
          provide: service,
          useValue: {},
        })),
      ],
    }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    return app;
  }

  const jwt = new JwtService({ secret: JWT_SECRET });

  async function request<T>(
    app: INestApplication,
    viewer: User | null,
    path: string,
  ): Promise<{ status: number; body: T }> {
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      headers: viewer
        ? {
            Authorization: `Bearer ${jwt.sign({
              sub: viewer.id,
              username: viewer.username,
              faction: viewer.faction,
            })}`,
          }
        : {},
    });
    return { status: response.status, body: (await response.json()) as T };
  }

  // --- World -----------------------------------------------------------

  async function world() {
    const store = new TypeOrmAllianceStore(dataSource);
    const player = (username: string, faction = Faction.REBEL_ALLIANCE) =>
      createUser(dataSource, {
        username,
        faction,
        factionId: faction === Faction.REBEL_ALLIANCE ? rebels : empire,
      });
    const president = await player('leia');
    const vice = await player('mon');
    const diplomat = await player('bail');
    const member = await player('han');
    const loner = await player('lando');
    const imperial = await player('vader', Faction.GALACTIC_EMPIRE);
    const partner = await player('wedge');

    const rogue = await store.insertAlliance({
      name: 'Rogue Squadron',
      description: '',
      factionId: rebels,
    });
    await store.updateAlliance(rogue.id, { color: '#ff8800' });
    for (const [user, role] of [
      [president, PRESIDENT],
      [vice, VICE],
      [diplomat, DIPLOMAT],
      [member, NONE],
    ] as const) {
      await store.insertMembership({
        allianceId: rogue.id,
        userId: user.id,
        role,
      });
    }
    const red = await store.insertAlliance({
      name: 'Red Squadron',
      description: '',
      factionId: rebels,
    });
    await store.insertMembership({
      allianceId: red.id,
      userId: partner.id,
      role: PRESIDENT,
    });
    const proposal = await store.insertRelationshipProposal({
      senderAllianceId: rogue.id,
      recipientAllianceId: red.id,
      type: AllianceRelationshipType.ALLIANCE,
      contract: '',
      treatAsFriend: false,
      shareLivePositions: true,
    });
    await store.transaction((tx) => tx.acceptRelationshipProposal(proposal.id));

    const layers = dataSource.getRepository(Layer);
    const core = await layers.save({ name: 'Core', width: 50, height: 50 });
    const outer = await layers.save({ name: 'Outer', width: 50, height: 50 });
    const cell = async (layerId: number, x: number) => {
      const field = await dataSource.getRepository(GalaxyField).save({
        layerId,
        cx: x,
        cy: 1,
        fieldTypeId: SPACE_FIELD_TYPE_ID,
      });
      return dataSource
        .getRepository(SpaceLocation)
        .findOneByOrFail({ galaxyFieldId: field.id });
    };
    const ships = dataSource.getRepository(Spacecraft);
    const owners = [
      president,
      vice,
      diplomat,
      member,
      loner,
      imperial,
      partner,
    ];
    for (const [index, owner] of owners.entries()) {
      const location = await cell(core.id, index + 1);
      await ships.save({
        name: `${owner.username}-ship`,
        shipClassId: 1,
        userId: owner.id,
        locationId: location.id,
      });
    }
    await ships.save({
      name: 'han-far-ship',
      shipClassId: 1,
      userId: member.id,
      locationId: (await cell(outer.id, 1)).id,
    });

    return {
      president,
      vice,
      diplomat,
      member,
      loner,
      imperial,
      partner,
      rogue,
      core,
      outer,
    };
  }

  /** `ship:reason[+details]`, sorted. */
  const summary = (dto: StarmapContactsDto) =>
    dto.contacts
      .map(
        (contact) =>
          `${contact.spacecraftName}:${contact.reason}` +
          (contact.management ? '+details' : ''),
      )
      .sort();

  const ROGUE_SHIPS = ['bail-ship', 'han-ship', 'leia-ship', 'mon-ship'];

  describe('with a running app', () => {
    let app: INestApplication;
    beforeEach(async () => {
      app = await startApp();
    });
    afterEach(() => app.close());

    it('delivers exactly the permitted contacts and details per role', async () => {
      const w = await world();
      const contacts = async (viewer: User) => {
        const { status, body } = await request<StarmapContactsDto>(
          app,
          viewer,
          `/spacecraft/starmap-contacts?layerId=${w.core.id}`,
        );
        expect(status).toBe(200);
        return summary(body);
      };
      const allianceView = (own: string, details: boolean) => [
        ...ROGUE_SHIPS.map((name) =>
          name === own
            ? `${name}:OWN+details`
            : `${name}:ALLIANCE${details ? '+details' : ''}`,
        ),
        'wedge-ship:SHARED_LIVE_POSITION',
      ];

      expect(await contacts(w.president)).toEqual(
        allianceView('leia-ship', true),
      );
      expect(await contacts(w.vice)).toEqual(allianceView('mon-ship', true));
      expect(await contacts(w.diplomat)).toEqual(
        allianceView('bail-ship', false),
      );
      expect(await contacts(w.member)).toEqual(allianceView('han-ship', false));
      expect(await contacts(w.loner)).toEqual(['lando-ship:OWN+details']);
      expect(await contacts(w.imperial)).toEqual(['vader-ship:OWN+details']);
      expect(await contacts(w.partner)).toEqual([
        ...ROGUE_SHIPS.map((name) => `${name}:SHARED_LIVE_POSITION`),
        'wedge-ship:OWN+details',
      ]);
    });

    it('never transmits private ship data or details beyond the level', async () => {
      const w = await world();
      const { body } = await request<StarmapContactsDto>(
        app,
        w.member,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}`,
      );
      const leiaShip = body.contacts.find(
        (contact) => contact.spacecraftName === 'leia-ship',
      );
      expect(Object.keys(leiaShip ?? {}).sort()).toEqual([
        'alliance',
        'galaxyCell',
        'location',
        'ownerId',
        'ownerName',
        'reason',
        'shipClassId',
        'spacecraftId',
        'spacecraftName',
        'stance',
      ]);
    });

    it('ignores manipulated parameters that name other viewers, roles or details', async () => {
      const w = await world();
      const honest = await request<StarmapContactsDto>(
        app,
        w.member,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}`,
      );
      const manipulated = await request<StarmapContactsDto>(
        app,
        w.member,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}` +
          `&viewerId=${w.president.id}&userId=${w.president.id}` +
          `&sub=${w.president.id}&role=PRESIDENT&details=true` +
          `&management=true&allianceId=${w.rogue.id}&reason=OWN` +
          `&includeAll=true`,
      );
      expect(manipulated.status).toBe(200);
      expect(manipulated.body).toEqual(honest.body);
      expect(
        manipulated.body.contacts.filter((contact) => contact.management),
      ).toEqual([expect.objectContaining({ spacecraftName: 'han-ship' })]);

      const twoLayers = await request<StarmapContactsDto>(
        app,
        w.member,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}&layerId=${w.outer.id}`,
      );
      expect(twoLayers.status).toBe(400);

      const loner = await request<StarmapContactsDto>(
        app,
        w.loner,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}` +
          `&viewerId=${w.president.id}&allianceId=${w.rogue.id}`,
      );
      expect(summary(loner.body)).toEqual(['lando-ship:OWN+details']);
    });

    it('limits contacts to the requested layer and rejects invalid layers', async () => {
      const w = await world();
      const outer = await request<StarmapContactsDto>(
        app,
        w.president,
        `/spacecraft/starmap-contacts?layerId=${w.outer.id}`,
      );
      expect(summary(outer.body)).toEqual(['han-far-ship:ALLIANCE+details']);

      for (const query of ['', '?layerId=abc', '?layerId=999999']) {
        const { status } = await request(
          app,
          w.president,
          `/spacecraft/starmap-contacts${query}`,
        );
        expect([400, 404]).toContain(status);
      }
    });

    it('rejects requests without a valid token', async () => {
      const w = await world();
      const { status } = await request(
        app,
        null,
        `/spacecraft/starmap-contacts?layerId=${w.core.id}`,
      );
      expect(status).toBe(401);
    });

    it('keeps the shared live position route limited to shared positions', async () => {
      const w = await world();
      const { body } = await request<Array<{ spacecraftName: string }>>(
        app,
        w.president,
        '/spacecraft/shared-live-positions',
      );
      expect(body.map((position) => position.spacecraftName)).toEqual([
        'wedge-ship',
      ]);
    });
  });
});
