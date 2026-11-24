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
import { DataSource, Like, type DataSourceOptions } from 'typeorm';
import { ContactMode } from '@swuniverse/shared';
import { AppModule } from '../../app.module';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GameGateway } from '../websocket/game.gateway';
import { GameStatusService } from '../game-status/game-status.service';
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
import { SpacecraftDestructionService } from '../spacecraft/spacecraft-destruction.service';
import { RepairOrphanedOrbitOrders20261115100000 } from '../../database/migrations/20261115100000-repair-orphaned-orbit-orders';
import { SpacecraftModule as InstalledModule } from '../spacecraft/entities/spacecraft-module.entity';
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
    await app.get(GameStatusService).getPublicStatus();
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
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

  describe('field context projection (sc-WP-UI-3a2)', () => {
    const view = async (shipId: number, userId?: number) =>
      (await call('GET', `spacecraft/${shipId}/field-context`, undefined, userId)).body.orbitOrder;
    const available = { available: true, reason: null };
    const rejected = (reason: string) => ({ available: false, reason });

    it('projects available orders, the fleet-wide order and stop with the mutation policy', async () => {
      const target = await colony(3, 4);
      const { fleet, leader, member } = await fleetAt(target);

      await expect(view(leader.id)).resolves.toEqual({
        order: null,
        defend: available,
        blockade: available,
        stop: rejected('Die Flotte hat keinen Orbitauftrag.'),
      });

      expect((await start(leader.id, 'DEFEND')).status).toBe(201);
      const order = { colonyId: target.id, fleetId: fleet.id, mode: 'DEFEND', colonyName: target.name };
      await expect(view(leader.id)).resolves.toEqual({
        order,
        defend: rejected('Diese Flotte verteidigt die Kolonie bereits.'),
        blockade: rejected('Die Flotte hat bereits einen Orbitauftrag.'),
        stop: available,
      });
      await expect(view(member.id)).resolves.toEqual({
        order,
        defend: rejected('Nur Flottenführer können Orbitaufträge erteilen.'),
        blockade: rejected('Nur Flottenführer können Orbitaufträge erteilen.'),
        stop: rejected('Nur Flottenführer können Orbitaufträge erteilen.'),
      });

      expect((await stop(leader.id)).status).toBe(200);
      await expect(view(leader.id)).resolves.toMatchObject({ order: null, defend: available });
    });

    it('projects rejections of other fleets and stays empty outside any orbit without an order', async () => {
      const target = await colony(3, 4);
      const { leader } = await fleetAt(target);
      const rival = await fleetAt(target);
      expect((await start(rival.leader.id, 'BLOCKADE')).status).toBe(201);

      await expect(view(leader.id)).resolves.toEqual({
        order: null,
        defend: rejected('Aktion nicht möglich, die Kolonie wird blockiert!'),
        blockade: available,
        stop: rejected('Die Flotte hat keinen Orbitauftrag.'),
      });

      const { locationId } = await field(8, 8);
      const loner = await source.getRepository(Spacecraft).save({
        name: 'Streuner', userId: actorId, shipClassId, locationId, runtimeSystems: {},
      });
      await expect(view(loner.id)).resolves.toBeNull();
    });
  });

  describe('orbit order lifecycle (sc-WP-UI-3a3)', () => {
    const LOCK = {
      DEFEND: 'Flug während Kolonie-Verteidigung nicht möglich',
      BLOCKADE: 'Flug während Kolonie-Blockierung nicht möglich',
    } as const;
    const ownerEvents = (colonyId: number) =>
      source.getRepository(Message).find({
        where: { recipientId: ownerId, originColonyId: colonyId },
        order: { id: 'ASC' },
      });
    const flyable = async (shipId: number) => {
      await source.getRepository(Spacecraft).update(shipId, { energy: 50 });
      await source.getRepository(InstalledModule).save({
        spacecraftId: shipId,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Sublight',
        isActive: true,
      });
    };
    const findOrbitShips = (value: unknown): Array<Record<string, unknown>> | null => {
      if (!value || typeof value !== 'object') return null;
      if (Array.isArray((value as { orbitShips?: unknown }).orbitShips)) {
        return (value as { orbitShips: Array<Record<string, unknown>> }).orbitShips;
      }
      for (const child of Object.values(value)) {
        const found = findOrbitShips(child);
        if (found) return found;
      }
      return null;
    };

    it.each(['DEFEND', 'BLOCKADE'] as const)(
      'refuses every flight entry of the leader during a %s order without changing state',
      async (mode) => {
        const target = await colony(3, 4);
        const { leader, member } = await fleetAt(target);
        expect((await start(leader.id, mode)).status).toBe(201);
        const before = await source.getRepository(Spacecraft).findOneByOrFail({ id: leader.id });

        for (const [path, body] of [
          [`spacecraft/${leader.id}/navigate`, { targetX: 3, targetY: 5 }],
          [`spacecraft/${leader.id}/fly`, { targetX: 2, targetY: 1 }],
          [`spacecraft/${leader.id}/enter-system`, {}],
          [`spacecraft/${leader.id}/leave-system`, {}],
          [`spacecraft/${leader.id}/wormhole/enter`, {}],
        ] as const) {
          await expect(call('POST', path, body)).resolves.toEqual({
            status: 400,
            body: expect.objectContaining({ message: LOCK[mode] }),
          });
        }
        expect(await source.getRepository(Spacecraft).findOneByOrFail({ id: leader.id })).toMatchObject({
          locationId: before.locationId,
          energy: before.energy,
          status: before.status,
        });
        // Members are not held in orbit (STU): the lock binds the leader only.
        expect((await call('POST', `spacecraft/${member.id}/navigate`, { targetX: 3, targetY: 5 })).body.message).not.toBe(LOCK[mode]);
      },
    );

    it('ends the order with blockade state and owner event when the fleet is dissolved', async () => {
      const target = await colony(3, 4);
      const { fleet, leader } = await fleetAt(target);
      expect((await start(leader.id, 'BLOCKADE')).status).toBe(201);
      expect(await blockaded(target.id)).toBe(true);

      expect((await call('DELETE', `spacecraft/fleets/${fleet.id}`)).status).toBe(200);

      expect(await orders()).toEqual([]);
      expect(await blockaded(target.id)).toBe(false);
      expect((await ownerEvents(target.id)).at(-1)).toMatchObject({
        originEventType: 'ORBIT_BLOCKADE_STOPPED',
        body: expect.stringMatching(
          new RegExp(`^Die Flotte ${fleet.name} von Spieler .+ hat die Blockade der Kolonie ${target.name} aufgehoben$`),
        ),
      });
    });

    it('keeps the order with the fleet on a leader change and frees the former leader', async () => {
      const target = await colony(3, 4);
      const { fleet, leader, member } = await fleetAt(target);
      expect((await start(leader.id, 'DEFEND')).status).toBe(201);

      expect((await call('PATCH', `spacecraft/fleets/${fleet.id}/leader`, { leaderId: member.id })).status).toBe(200);
      expect(await orders()).toEqual([
        expect.objectContaining({ fleetId: fleet.id, spacecraftId: member.id, mode: 'DEFEND' }),
      ]);
      expect((await call('POST', `spacecraft/${leader.id}/leave-fleet`)).status).toBe(201);
      const created = await call('POST', 'spacecraft/fleets/create', { name: 'Neue Flotte', leaderId: leader.id });
      expect(created.status).toBe(201);

      expect((await start(leader.id, 'DEFEND')).status).toBe(201);
      expect((await orders()).map((order) => order.fleetId).sort()).toEqual([fleet.id, created.body.id].sort());
    });

    it('lets the order follow a successor on leader destruction and ends it with the last ship', async () => {
      const target = await colony(3, 4);
      const { fleet, leader, member } = await fleetAt(target);
      expect((await start(leader.id, 'BLOCKADE')).status).toBe(201);
      const destruction = app.get(SpacecraftDestructionService);

      await destruction.destroyFromCombat(leader.id);
      expect(await orders()).toEqual([
        expect.objectContaining({ fleetId: fleet.id, spacecraftId: member.id, mode: 'BLOCKADE' }),
      ]);
      expect(await blockaded(target.id)).toBe(true);

      await destruction.destroyFromCombat(member.id);
      expect(await orders()).toEqual([]);
      expect(await blockaded(target.id)).toBe(false);
      expect((await ownerEvents(target.id)).at(-1)).toMatchObject({ originEventType: 'ORBIT_BLOCKADE_STOPPED' });
    });

    it('ends the order with a tractor message when the leader is towed away', async () => {
      const target = await colony(3, 4);
      await field(3, 5);
      const { fleet, leader } = await fleetAt(target, { members: 1 });
      expect((await start(leader.id, 'DEFEND')).status).toBe(201);
      const tower = await source.getRepository(Spacecraft).save({
        name: 'Schlepper',
        userId: actorId,
        shipClassId,
        locationId: leader.locationId,
        tractoredShipId: leader.id,
        runtimeSystems: { TRACTOR_BEAM: { active: true, integrity: 100, cooldown: 0 } },
      });
      await flyable(tower.id);
      await source.getRepository(InstalledModule).save({
        spacecraftId: tower.id,
        category: 'TRACTOR_BEAM',
        moduleType: 'Tractor',
        isActive: true,
      });

      const towed = await call('POST', `spacecraft/${tower.id}/navigate`, { targetX: 3, targetY: 5 });

      expect(towed.status).toBe(201);
      expect(await orders()).toEqual([]);
      expect((await ownerEvents(target.id)).at(-1)).toMatchObject({ originEventType: 'ORBIT_DEFENSE_STOPPED' });
      const tractorMessages = await source.getRepository(Message).find({
        where: { recipientId: actorId, body: Like('%Traktorstrahl%') },
      });
      expect(tractorMessages.map((message) => message.body)).toEqual([
        `Die ${leader.name} wurde mit dem Traktorstrahl gezogen, daher hat die Flotte ${fleet.name} die Verteidigung der Kolonie ${target.name} eingestellt`,
      ]);
    });

    it('rejects orders at another colony in the view exactly like the mutation', async () => {
      const elsewhere = await colony(1, 1);
      const home = await colony(3, 4, { userId: actorId });
      const { fleet, leader } = await fleetAt(home, { members: 1 });
      await source.getRepository(ColonyOrbitAssignment).save({
        colonyId: elsewhere.id,
        spacecraftId: leader.id,
        fleetId: fleet.id,
        mode: ColonyOrbitAssignmentMode.DEFEND,
      });

      const detail = await call('GET', `colonies/${home.id}`);
      const ship = findOrbitShips(detail.body)?.find((entry) => entry.id === leader.id);
      expect(ship).toMatchObject({ canDefend: false, canBlock: false });
      await expect(start(leader.id, 'DEFEND')).resolves.toEqual({
        status: 400,
        body: expect.objectContaining({ message: 'Die Flotte hat bereits einen Orbitauftrag.' }),
      });
    });

    it('repairs orphaned orders and stale blockade flags (migration)', async () => {
      const target = await colony(3, 4);
      const kept = await fleetAt(target);
      const strayed = await fleetAt(target);
      await source.getRepository(ColonyOrbitAssignment).save([
        { colonyId: target.id, spacecraftId: kept.member.id, fleetId: kept.fleet.id, mode: ColonyOrbitAssignmentMode.DEFEND },
        { colonyId: target.id, spacecraftId: strayed.leader.id, fleetId: strayed.fleet.id, mode: ColonyOrbitAssignmentMode.BLOCKADE },
      ]);
      const { locationId: away } = await field(9, 9);
      await source.getRepository(Spacecraft).update(strayed.leader.id, { locationId: away });
      await source.getRepository(ColonyChangeable).update({ colonyId: target.id }, { isBlockaded: true });

      const runner = source.createQueryRunner();
      try {
        await new RepairOrphanedOrbitOrders20261115100000().up(runner);
        await new RepairOrphanedOrbitOrders20261115100000().up(runner);
      } finally {
        await runner.release();
      }

      expect(await orders()).toEqual([
        expect.objectContaining({ fleetId: kept.fleet.id, spacecraftId: kept.leader.id, mode: 'DEFEND' }),
      ]);
      expect(await blockaded(target.id)).toBe(false);
    });

    it('lets exactly one of a concurrent flight and order start win', async () => {
      const target = await colony(3, 4);
      await field(3, 5);
      const { leader } = await fleetAt(target, { members: 1 });
      await flyable(leader.id);

      const [flight, order] = await Promise.all([
        call('POST', `spacecraft/${leader.id}/navigate`, { targetX: 3, targetY: 5 }),
        start(leader.id, 'DEFEND'),
      ]);

      expect([flight.status < 300, order.status < 300].filter(Boolean)).toHaveLength(1);
      const ship = await source.getRepository(Spacecraft).findOneByOrFail({ id: leader.id });
      const placed = await orders();
      if (order.status < 300) {
        expect(placed).toHaveLength(1);
        expect(ship.locationId).toBe(leader.locationId);
      } else {
        expect(placed).toEqual([]);
        expect(ship.locationId).not.toBe(leader.locationId);
      }
    });
  });
});
