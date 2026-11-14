import 'reflect-metadata';
import {
  INestApplication,
  ValidationPipe,
  type DynamicModule,
} from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { ContactMode } from '@swuniverse/shared';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GameGateway } from '../websocket/game.gateway';
import { User } from '../auth/user.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Message } from '../messaging/entities/message.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { Fleet } from '../spacecraft/entities/fleet.entity';
import { Colony } from './entities/colony.entity';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import {
  ColonyOrbitAssignment,
  ColonyOrbitAssignmentMode,
} from './entities/colony-orbit-assignment.entity';

const JWT_SECRET = 'orbit-order-http-test-secret';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('Ship-based colony orbit orders through the production application (PostgreSQL, HTTP)', () => {
  let app: INestApplication;
  let source: DataSource;
  const jwt = new JwtService({ secret: JWT_SECRET });

  let actorId: number;
  let ownerId: number;
  let systemId: number;
  let shipClassId: number;
  let fieldTypeId: number;
  let fieldCounter = 0;

  beforeAll(async () => {
    const migrations = await connectIntegrationDatabase();
    await resetDatabase(migrations);
    await migrations.destroy();
    const imports: DynamicModule[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    );
    const databaseModule = imports.find((item) => item.module === TypeOrmModule);
    const core = databaseModule?.imports?.[0] as DynamicModule | undefined;
    const optionsProvider = core?.providers?.find(
      (provider) =>
        typeof provider === 'object' &&
        'provide' in provider &&
        provider.provide === 'TypeOrmModuleOptions',
    );
    if (!optionsProvider) {
      throw new Error('Production datasource configuration missing');
    }
    const config = {
      get: (key: string) =>
        ({
          DATABASE_URL: process.env.INTEGRATION_DATABASE_URL,
          JWT_SECRET,
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
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    // Migrations plus the full AppModule bootstrap exceed the default hook timeout.
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(source);
    actorId = (await createUser(source)).id;
    ownerId = (await createUser(source)).id;
    const layer = await source
      .getRepository(Layer)
      .save({ name: 'Outer Rim', width: 10, height: 10 });
    systemId = (
      await source.getRepository(StarSystem).save({
        name: 'Kashyyyk',
        cx: 1,
        cy: 1,
        layerId: layer.id,
        systemTypeId: 1,
      })
    ).id;
    // Migration-seeded reference data, preserved by resetDatabase.
    fieldTypeId = (await source.getRepository(GalaxyFieldType).findOneByOrFail({}))
      .id;
    shipClassId = (
      await source.getRepository(ShipClassDef).save({
        key: 'ORBIT_ORDER_FRIGATE',
        name: 'Fregatte',
        category: 'FRIGATE',
        role: 'ESCORT',
      })
    ).id;
  });

  async function field(sx: number, sy: number) {
    fieldCounter += 1;
    const systemField = await source.getRepository(SystemField).save({
      starSystemId: systemId,
      sx,
      sy,
      fieldTypeId,
    });
    const location = await source
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: systemField.id });
    return { systemField, locationId: location.id };
  }

  async function colony(
    sx: number,
    sy: number,
    values: Partial<Colony> = {},
  ): Promise<Colony> {
    const { systemField } = await field(sx, sy);
    const saved = await source.getRepository(Colony).save({
      name: `Kolonie ${fieldCounter}`,
      userId: ownerId,
      starSystemId: systemId,
      systemFieldId: systemField.id,
      posX: sx,
      posY: sy,
      colonyClassId: 1,
      ...values,
    });
    await source
      .getRepository(ColonyChangeable)
      .save({ colonyId: saved.id, isBlockaded: false });
    return saved;
  }

  async function fleetAt(
    colonyRow: Colony,
    { userId = actorId, members = 2 } = {},
  ) {
    const location = await source.getRepository(SpaceLocation).findOneByOrFail({
      systemFieldId: colonyRow.systemFieldId ?? undefined,
    });
    const ships: Spacecraft[] = [];
    for (let index = 0; index < members; index += 1) {
      ships.push(
        await source.getRepository(Spacecraft).save({
          name: `Schiff ${index + 1}`,
          userId,
          shipClassId,
          locationId: location.id,
          runtimeSystems: {},
        }),
      );
    }
    const fleet = await source.getRepository(Fleet).save({
      name: `Flotte ${userId}-${ships[0].id}`,
      userId,
      leaderId: ships[0].id,
    });
    await source
      .getRepository(Spacecraft)
      .update(
        ships.map((ship) => ship.id),
        { fleetId: fleet.id },
      );
    return { fleet, leader: ships[0], member: ships[1] };
  }

  async function call(
    method: 'POST' | 'DELETE',
    path: string,
    body?: unknown,
    userId = actorId,
  ) {
    const response = await fetch(`${await app.getUrl()}/api/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: userId, username: 'pilot', faction: 'REBEL_ALLIANCE' })}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  const start = (shipId: number, mode: string, userId?: number) =>
    call('POST', `spacecraft/${shipId}/orbit-order`, { mode }, userId);
  const stop = (shipId: number, userId?: number) =>
    call('DELETE', `spacecraft/${shipId}/orbit-order`, undefined, userId);
  const orders = () => source.getRepository(ColonyOrbitAssignment).find();
  const blockaded = async (colonyId: number) =>
    (await source.getRepository(ColonyChangeable).findOneByOrFail({ colonyId }))
      .isBlockaded;

  it.each([
    ['own', async () => actorId],
    ['friend', async () => {
      await source.getRepository(Contact).save({ userId: actorId, contactUserId: ownerId, mode: ContactMode.FRIEND });
      return ownerId;
    }],
    ['neutral', async () => ownerId],
    ['enemy', async () => {
      await source.getRepository(Contact).save({ userId: actorId, contactUserId: ownerId, mode: ContactMode.ENEMY });
      return ownerId;
    }],
  ] as const)(
    'defends and blockades a %s colony fleet-wide and ends the order from the ship',
    async (_stance, arrangeOwner) => {
      const colonyOwnerId = await arrangeOwner();
      const target = await colony(3, 4, { userId: colonyOwnerId });
      const { fleet, leader } = await fleetAt(target);

      const defended = await start(leader.id, 'DEFEND');
      expect(defended).toEqual({
        status: 201,
        body: {
          order: { colonyId: target.id, fleetId: fleet.id, mode: 'DEFEND' },
          message: `Die Kolonie ${target.name} wird nun von der Flotte ${fleet.name} verteidigt`,
        },
      });

      const stopped = await stop(leader.id);
      expect(stopped.status).toBe(200);
      expect(stopped.body).toEqual({
        cleared: true,
        order: { colonyId: target.id, fleetId: fleet.id, mode: 'DEFEND' },
        message: `Die Flotte ${fleet.name} hat die Verteidigung der Kolonie ${target.name} beendet`,
      });

      const blocked = await start(leader.id, 'BLOCKADE');
      expect(blocked.status).toBe(201);
      expect(await blockaded(target.id)).toBe(true);
      expect(await orders()).toEqual([
        expect.objectContaining({ colonyId: target.id, fleetId: fleet.id, spacecraftId: leader.id, mode: 'BLOCKADE' }),
      ]);

      const messages = await source.getRepository(Message).find({
        where: { recipientId: colonyOwnerId, originColonyId: target.id },
        order: { id: 'ASC' },
      });
      expect(messages.map((message) => message.originEventType)).toEqual([
        'ORBIT_DEFENSE_STARTED',
        'ORBIT_DEFENSE_STOPPED',
        'ORBIT_BLOCKADE_STARTED',
      ]);

      await stop(leader.id);
      expect(await blockaded(target.id)).toBe(false);
      expect(await orders()).toEqual([]);
    },
  );

  it('rejects free and abandoned colonies and ships outside any colony orbit', async () => {
    const free = await colony(1, 1, { userId: null });
    const abandoned = await colony(2, 1, { isAbandoned: true, previousUserId: ownerId });
    for (const target of [free, abandoned]) {
      const { leader } = await fleetAt(target);
      await expect(start(leader.id, 'DEFEND')).resolves.toEqual({
        status: 400,
        body: expect.objectContaining({ message: 'Die Kolonie ist unbewohnt.' }),
      });
    }
    const { locationId } = await field(8, 8);
    const loner = await source.getRepository(Spacecraft).save({
      name: 'Streuner', userId: actorId, shipClassId, locationId, runtimeSystems: {},
    });
    const lonerFleet = await source.getRepository(Fleet).save({ name: 'Solo', userId: actorId, leaderId: loner.id });
    await source.getRepository(Spacecraft).update(loner.id, { fleetId: lonerFleet.id });
    await expect(start(loner.id, 'BLOCKADE')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Das Schiff befindet sich nicht im Orbit dieser Kolonie.' }),
    });
    expect(await orders()).toEqual([]);
  });

  it('enforces actor, fleet leader and idle state', async () => {
    const target = await colony(3, 4);
    const { leader, member } = await fleetAt(target);

    expect((await start(leader.id, 'DEFEND', ownerId)).status).toBe(404);
    await expect(start(member.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Nur Flottenführer können Orbitaufträge erteilen.' }),
    });
    await source.getRepository(Spacecraft).update(leader.id, { status: SpacecraftStatus.IN_COMBAT });
    await expect(start(leader.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Das Schiff ist nicht einsatzbereit.' }),
    });
    await source.getRepository(Spacecraft).update(leader.id, { status: SpacecraftStatus.DESTROYED });
    await expect(start(leader.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Das Schiff ist zerstört.' }),
    });
    expect((await start(leader.id, 'INVASION')).status).toBe(400);
    expect(await orders()).toEqual([]);
  });

  it('honours effective vacation of the colony owner for both orders only after the delay', async () => {
    const target = await colony(3, 4);
    const { leader } = await fleetAt(target);
    await source.getRepository(User).update(ownerId, {
      vacationMode: true,
      vacationStartedAt: new Date(Date.now() - 3 * DAY_MS),
    });
    for (const mode of ['DEFEND', 'BLOCKADE']) {
      await expect(start(leader.id, mode)).resolves.toEqual({
        status: 400,
        body: expect.objectContaining({ message: 'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!' }),
      });
    }
    await source.getRepository(User).update(ownerId, { vacationStartedAt: new Date() });
    expect((await start(leader.id, 'BLOCKADE')).status).toBe(201);
  });

  it('rejects opposing orders of other fleets and a second order of the same fleet', async () => {
    const target = await colony(3, 4);
    const other = await colony(5, 5);
    const defender = await fleetAt(target, { userId: ownerId });
    const attacker = await fleetAt(target);
    expect((await start(defender.leader.id, 'DEFEND', ownerId)).status).toBe(201);

    await expect(start(attacker.leader.id, 'BLOCKADE')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Aktion nicht möglich, die Kolonie wird verteidigt!' }),
    });
    expect((await start(attacker.leader.id, 'DEFEND')).status).toBe(201);
    await expect(start(attacker.leader.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Diese Flotte verteidigt die Kolonie bereits.' }),
    });
    await expect(start(attacker.leader.id, 'BLOCKADE')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Die Flotte hat bereits einen Orbitauftrag.' }),
    });

    await stop(defender.leader.id, ownerId);
    await stop(attacker.leader.id);
    expect((await start(attacker.leader.id, 'BLOCKADE')).status).toBe(201);
    const second = await fleetAt(target);
    await expect(start(second.leader.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Aktion nicht möglich, die Kolonie wird blockiert!' }),
    });

    // An order the fleet holds at another colony also blocks a new start here.
    await source.getRepository(ColonyOrbitAssignment).update(
      { fleetId: attacker.fleet.id },
      { colonyId: other.id },
    );
    await expect(start(attacker.leader.id, 'DEFEND')).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Die Flotte hat bereits einen Orbitauftrag.' }),
    });
  });

  it('blocks blockades but not defense on active orbital defense', async () => {
    const target = await colony(3, 4);
    const { leader } = await fleetAt(target);
    const service = app.get(ColonyOrbitService);
    jest.spyOn(service, 'hasActiveOrbitalDefense').mockReturnValue(true);
    try {
      await expect(start(leader.id, 'BLOCKADE')).resolves.toEqual({
        status: 400,
        body: expect.objectContaining({ message: 'Aktion nicht möglich, die Kolonie verfügt über aktive Orbitalverteidigung' }),
      });
      expect((await start(leader.id, 'DEFEND')).status).toBe(201);
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('serializes concurrent starts of opposing orders to exactly one winner', async () => {
    const target = await colony(3, 4);
    const defender = await fleetAt(target);
    const attacker = await fleetAt(target, { userId: ownerId });
    // GameStatusService lazily inserts its row; warm it so the parallel
    // requests only race on the orbit order itself.
    await expect(stop(defender.leader.id)).resolves.toEqual(
      expect.objectContaining({ status: 200 }),
    );

    const results = await Promise.all([
      start(defender.leader.id, 'DEFEND'),
      start(attacker.leader.id, 'BLOCKADE', ownerId),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
    expect(await orders()).toHaveLength(1);
  });

  it('keeps the colony routes as aliases of the same policy', async () => {
    const target = await colony(3, 4);
    const other = await colony(6, 6);
    const { fleet, leader } = await fleetAt(target);

    const legacy = await call('POST', `colonies/${target.id}/orbit/ships/${leader.id}/defend`);
    expect(legacy.status).toBe(201);
    expect(legacy.body).toEqual(
      expect.objectContaining({ colonyId: target.id, fleetId: fleet.id, mode: ColonyOrbitAssignmentMode.DEFEND }),
    );
    await expect(
      call('DELETE', `colonies/${other.id}/orbit/ships/${leader.id}/order`),
    ).resolves.toEqual({ status: 200, body: { cleared: false } });
    await expect(
      call('DELETE', `colonies/${target.id}/orbit/ships/${leader.id}/order`),
    ).resolves.toEqual({ status: 200, body: { cleared: true } });
    await expect(
      call('POST', `colonies/${other.id}/orbit/ships/${leader.id}/blockade`),
    ).resolves.toEqual({
      status: 400,
      body: expect.objectContaining({ message: 'Das Schiff befindet sich nicht im Orbit dieser Kolonie.' }),
    });
    expect(
      (await call('POST', `colonies/${target.id}/orbit/ships/${leader.id}/blockade`)).status,
    ).toBe(201);
    expect(await blockaded(target.id)).toBe(true);
  });
});
