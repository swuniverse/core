import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  DataSource,
  type EntitySubscriberInterface,
  type InsertEvent,
} from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Wormhole } from '../starmap/entities/wormhole.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  Spacecraft,
  SpacecraftStatus,
  SpacecraftOperatingMode,
  SpacecraftKind,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { WormholePassageService } from './wormhole-passage.service';
import { ExplorationState, ExplorationLevel } from '../starmap/entities/exploration-state.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { Message } from '../messaging/entities/message.entity';
import { FieldEffect } from '@swuniverse/shared';
import { BadRequestException, type Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import {
  FlightConsequencePipeline,
  FLIGHT_CONSEQUENCES,
} from './flight-consequence-pipeline';
import {
  FieldEffectConsequence,
  STU_CLOCK_TOKEN,
  STU_RANDOM_TOKEN,
} from './field-effect-consequence';
import { ExplorationService } from '../starmap/exploration.service';
import { LayerKnowledgeService } from '../starmap/layer-knowledge.service';
import { FlightSignatureService } from './flight-signature.service';
import { MessagingService } from '../messaging/messaging.service';
import { ShipClassService } from './ship-class.service';
import { GameDataService } from '../game-data/game-data.service';
import { GameGateway } from '../websocket/game.gateway';
import {
  SpacecraftRepairTask,
  RepairTargetType,
  RepairPartsType,
} from './entities/spacecraft-repair-task.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { Fleet } from './entities/fleet.entity';
import {
  CartographyPlan,
  CartographyPlanStatus,
} from './entities/cartography-plan.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { CartographyPlanService } from './cartography-plan.service';
import { SpacecraftTakeover } from './entities/spacecraft-takeover.entity';
import { User } from '../auth/user.entity';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { PrestigeService } from '../prestige/prestige.service';
import { FieldTransitionExecutor } from './field-transition-executor';
import {
  WORMHOLE_ACCESS_POLICY,
  WORMHOLE_RANDOM,
} from './wormhole-passage.service';
import {
  allowAllWormholeAccess,
  type WormholeAccessPolicy,
} from './wormhole-passage-planner';
import { setTimeout as pause } from 'node:timers/promises';
import { SpacecraftService } from './spacecraft.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { StatisticsService } from '../statistics/statistics.service';

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function waitForBlockedTransaction(
  dataSource: DataSource,
  blockerPid: number,
) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows: Array<{ blocked: boolean }> = await dataSource.query(
      `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND $1 = ANY(pg_blocking_pids(pid))) AS blocked`,
      [blockerPid],
    );
    if (rows[0].blocked) return;
    await pause(10);
  }
  throw new Error(
    'Public fleet operation did not wait on the passage transaction',
  );
}

describe('Atomic wormhole passage (PostgreSQL)', () => {
  let dataSource: DataSource;
  let service: WormholePassageService;
  let navigation: SpacecraftService;
  let knowledge: LayerKnowledgeService;
  let close: () => Promise<void>;
  const gateway = { emitToUser: jest.fn() };
  let ship: Spacecraft;
  let origin: SpaceLocation;
  let destination: SpaceLocation;
  let wormhole: Wormhole;
  let policy: WormholeAccessPolicy = allowAllWormholeAccess;
  let random = 0;
  const accessPolicy: WormholeAccessPolicy = {
    allows: (...args) => policy.allows(...args),
  };

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const services = [
      WormholePassageService,
      FlightConsequencePipeline,
      FieldEffectConsequence,
      ExplorationService,
      LayerKnowledgeService,
      FlightSignatureService,
      MessagingService,
      ShipClassService,
      SpacecraftRepairService,
      CartographyPlanService,
      SpacecraftTakeoverService,
      PrestigeService,
      FieldTransitionExecutor,
      SpacecraftService,
      SpacecraftCrewService,
      SpacecraftDestructionService,
      SpacecraftRuntimeStateService,
    ];
    const dependencies: Type<unknown>[] = services.flatMap(
      (service) => Reflect.getMetadata('design:paramtypes', service) ?? [],
    );
    const module = await Test.createTestingModule({
      providers: [
        ...dependencies.map((provide) => ({ provide, useValue: {} })),
        ...INTEGRATION_ENTITIES.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: dataSource.getRepository(entity),
        })),
        ...services,
        { provide: 'BuoyRepository', useValue: {} },
        { provide: 'CrewSkillRepository', useValue: {} },
        {
          provide: StatisticsService,
          useValue: new StatisticsService(dataSource, []),
        },
        { provide: DataSource, useValue: dataSource },
        { provide: GameDataService, useValue: new GameDataService() },
        { provide: GameGateway, useValue: gateway },
        { provide: WORMHOLE_ACCESS_POLICY, useValue: accessPolicy },
        { provide: WORMHOLE_RANDOM, useValue: () => random },
        { provide: STU_RANDOM_TOKEN, useValue: () => 0 },
        { provide: STU_CLOCK_TOKEN, useValue: () => new Date() },
        {
          provide: FLIGHT_CONSEQUENCES,
          useFactory: (effect: FieldEffectConsequence) => [effect],
          inject: [FieldEffectConsequence],
        },
      ],
    }).compile();
    service = module.get(WormholePassageService);
    navigation = module.get(SpacecraftService);
    knowledge = module.get(LayerKnowledgeService);
    close = () => module.close();
  });
  afterAll(async () => {
    await close?.();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(dataSource);
    policy = allowAllWormholeAccess;
    random = 0;
    gateway.emitToUser.mockClear();
    const owner = await createUser(dataSource);
    const shipClass = await dataSource.getRepository(ShipClassDef).save({
      key: 'WORMHOLE_PASSAGE',
      name: 'Passage ship',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const entryLayer = await dataSource
      .getRepository(Layer)
      .save({ name: 'Entry layer', width: 5, height: 5 });
    const exitLayer = await dataSource
      .getRepository(Layer)
      .save({ name: 'Exit layer', width: 5, height: 5 });
    const entry = await dataSource
      .getRepository(GalaxyField)
      .save({ layerId: entryLayer.id, cx: 1, cy: 1, fieldTypeId: 1 });
    const exit = await dataSource
      .getRepository(GalaxyField)
      .save({ layerId: exitLayer.id, cx: 3, cy: 4, fieldTypeId: 1 });
    origin = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: entry.id });
    destination = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: exit.id });
    wormhole = await dataSource.getRepository(Wormhole).save({
      entryLayerId: entryLayer.id,
      entryCx: 1,
      entryCy: 1,
      exitLayerId: exitLayer.id,
      exitCx: 3,
      exitCy: 4,
      isBidirectional: true,
    });
    ship = await dataSource.getRepository(Spacecraft).save({
      name: 'Passage leader',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 71,
      warpdrive: 23,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
      },
    });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: ship.id,
        category: 'SUBLIGHT_ENGINE',
        moduleType: 'Impulse',
      });
  });

  it('deduplicates two outgoing tractor targets belonging to the same secondary fleet', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ userId: ship.userId, leaderId: ship.id, name: 'Two carriers' });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const carrier = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Other carrier',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
      });
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Carried leader',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    const secondary = await dataSource
      .getRepository(Fleet)
      .save({ userId: ship.userId, leaderId: target.id, name: 'Two targets' });
    await dataSource
      .getRepository(Spacecraft)
      .update(target.id, { fleetId: secondary.id });
    const member = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Other target',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: secondary.id,
      });
    for (const participant of [carrier, target, member])
      await dataSource
        .getRepository(SpacecraftModule)
        .save({
          spacecraftId: participant.id,
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Impulse',
        });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: target.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(carrier.id, { tractoredShipId: member.id });
    expect(await service.enter(ship.id, ship.userId)).toMatchObject({
      shipIds: [ship.id, carrier.id, target.id, member.id],
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(8);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(4);
  });

  it('refuses locked refund cargo instead of waiting while passage holds spacecraft locks', async () => {
    await dataSource
      .getRepository(SpacecraftRepairTask)
      .save({
        spacecraftId: ship.id,
        targetType: RepairTargetType.HULL,
        partsType: RepairPartsType.BOTH,
        targetIntegrity: 80,
        spareParts: 3,
        systemComponents: 2,
        completesAt: new Date(Date.now() + 60000),
      });
    const cargo = await dataSource
      .getRepository(CargoItem)
      .save({ spacecraftId: ship.id, commodityId: 10001, amount: 8 });
    const acquired = barrier();
    const release = barrier();
    const blocker = dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(CargoItem, {
        where: { id: cargo.id },
        lock: { mode: 'pessimistic_write' },
      });
      acquired.release();
      await release.promise;
    });
    const deadline = barrier();
    const timer = setTimeout(deadline.release, 2000);
    let pending: Promise<unknown> = Promise.resolve();
    try {
      await acquired.promise;
      pending = service.enter(ship.id, ship.userId).then(
        () => undefined,
        (failure: unknown) => failure,
      );
      expect(
        await Promise.race([
          pending,
          deadline.promise.then(() => 'waited on locked cargo'),
        ]),
      ).toBeInstanceOf(BadRequestException);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      clearTimeout(timer);
      release.release();
      await blocker;
      await pending;
    }
  });

  it('refuses a locked repair task without an inverse ship/repair wait or partial writes', async () => {
    const task = await dataSource
      .getRepository(SpacecraftRepairTask)
      .save({
        spacecraftId: ship.id,
        targetType: RepairTargetType.HULL,
        partsType: RepairPartsType.BOTH,
        targetIntegrity: 80,
        spareParts: 3,
        systemComponents: 2,
        completesAt: new Date(Date.now() + 60000),
      });
    const acquired = barrier();
    const release = barrier();
    const blocker = dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(SpacecraftRepairTask, {
        where: { id: task.id },
        lock: { mode: 'pessimistic_write' },
      });
      acquired.release();
      await release.promise;
    });
    const deadline = barrier();
    const timer = setTimeout(deadline.release, 2000);
    let pending: Promise<unknown> = Promise.resolve();
    try {
      await acquired.promise;
      pending = service.enter(ship.id, ship.userId).then(
        () => undefined,
        (failure: unknown) => failure,
      );
      const error = await Promise.race([
        pending,
        deadline.promise.then(() => 'waited on locked repair'),
      ]);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      clearTimeout(timer);
      release.release();
      await blocker;
      await pending;
    }
  });

  it('refuses secondary fleet contention without waiting or publishing partial passage effects', async () => {
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Locked fleet target',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({
        userId: ship.userId,
        leaderId: target.id,
        name: 'Locked secondary fleet',
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(target.id, { fleetId: fleet.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: target.id });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: target.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    const acquired = barrier();
    const release = barrier();
    const blocker = dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(Fleet, {
        where: { id: fleet.id },
        lock: { mode: 'for_no_key_update' },
      });
      acquired.release();
      await release.promise;
    });
    try {
      await acquired.promise;
      await expect(service.enter(ship.id, ship.userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(await dataSource.getRepository(Spacecraft).find()).toMatchObject([
        { locationId: origin.id },
        { locationId: origin.id },
      ]);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      release.release();
      await blocker;
    }
  });

  it('moves the complete second fleet of an outgoing tractor target without splitting its membership', async () => {
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Second fleet leader',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({
        userId: ship.userId,
        leaderId: target.id,
        name: 'Carried second fleet',
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(target.id, { fleetId: fleet.id });
    const member = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Second fleet member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
      });
    for (const participant of [target, member])
      await dataSource
        .getRepository(SpacecraftModule)
        .save({
          spacecraftId: participant.id,
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Impulse',
        });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: target.id });
    expect(await service.enter(ship.id, ship.userId)).toMatchObject({
      shipIds: [ship.id, target.id, member.id],
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .find({ where: { fleetId: fleet.id } }),
    ).toMatchObject([
      { locationId: destination.id },
      { locationId: destination.id },
    ]);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(6);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(3);
  });

  it.each([
    'inactive',
    'missing',
    'nonlocal selector',
    'ambiguous',
    'one-way reverse',
    'blocked fixed exit',
    'no passable random exit',
    'invalid random',
  ] as const)(
    'refuses %s wormhole selection without durable effects',
    async (invalid) => {
      let selected: number | undefined;
      if (invalid === 'inactive')
        await dataSource
          .getRepository(Wormhole)
          .update(wormhole.id, { isActive: false });
      if (invalid === 'missing')
        await dataSource.getRepository(Wormhole).delete(wormhole.id);
      if (invalid === 'nonlocal selector') selected = wormhole.id + 100;
      if (invalid === 'ambiguous')
        await dataSource
          .getRepository(Wormhole)
          .save({
            entryLayerId: wormhole.entryLayerId,
            entryCx: 1,
            entryCy: 1,
            exitLayerId: wormhole.exitLayerId,
            exitCx: 3,
            exitCy: 4,
          });
      if (invalid === 'one-way reverse') {
        await dataSource
          .getRepository(Wormhole)
          .update(wormhole.id, { isBidirectional: false });
        await dataSource
          .getRepository(Spacecraft)
          .update(ship.id, { locationId: destination.id });
      }
      if (
        invalid === 'blocked fixed exit' ||
        invalid === 'no passable random exit'
      )
        await dataSource
          .getRepository(GalaxyField)
          .update(destination.galaxyFieldId!, { isPassable: false });
      if (invalid === 'no passable random exit' || invalid === 'invalid random')
        await dataSource
          .getRepository(Wormhole)
          .update(wormhole.id, { isRandomExit: true });
      if (invalid === 'invalid random') random = 1;
      const before = await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id });
      await expect(
        service.enter(ship.id, ship.userId, selected),
      ).rejects.toThrow();
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id }),
      ).toEqual(before);
      for (const entity of [
        Message,
        FlightSignature,
        ShipLogEntry,
        ExplorationState,
        LayerKnowledge,
      ])
        expect(await dataSource.getRepository(entity).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    },
  );

  it('uses an explicit local selector when several active wormholes share the entry', async () => {
    await dataSource
      .getRepository(Wormhole)
      .save({
        entryLayerId: wormhole.entryLayerId,
        entryCx: 1,
        entryCy: 1,
        exitLayerId: wormhole.entryLayerId,
        exitCx: 1,
        exitCy: 1,
      });
    expect(
      await service.enter(ship.id, ship.userId, wormhole.id),
    ).toMatchObject({
      wormholeId: wormhole.id,
      direction: 'ENTRY',
      locationId: destination.id,
    });
  });

  it.each([
    'foreign member',
    'remote member',
    'missing impulse',
    'runtime damage',
    'runtime cooldown',
    'active warp',
    'nonleader',
  ] as const)(
    'refuses %s in the complete fleet before any passage mutation',
    async (invalid) => {
      const fleet = await dataSource
        .getRepository(Fleet)
        .save({
          userId: ship.userId,
          leaderId: ship.id,
          name: 'Eligibility fleet',
          isFixed: false,
        });
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { fleetId: fleet.id });
      const member = await dataSource
        .getRepository(Spacecraft)
        .save({
          name: 'Eligibility member',
          userId: ship.userId,
          shipClassId: ship.shipClassId,
          locationId: origin.id,
          fleetId: fleet.id,
          runtimeSystems: {
            SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
          },
        });
      if (invalid !== 'missing impulse')
        await dataSource
          .getRepository(SpacecraftModule)
          .save({
            spacecraftId: member.id,
            category: 'SUBLIGHT_DRIVE',
            moduleType: 'Impulse',
          });
      if (invalid === 'foreign member') {
        const foreign = await createUser(dataSource, {
          username: 'Foreign member owner',
        });
        await dataSource
          .getRepository(Spacecraft)
          .update(member.id, { userId: foreign.id });
      }
      if (invalid === 'remote member')
        await dataSource
          .getRepository(Spacecraft)
          .update(member.id, { locationId: destination.id });
      if (invalid === 'runtime damage')
        await dataSource
          .getRepository(Spacecraft)
          .update(member.id, {
            runtimeSystems: {
              SUBLIGHT_DRIVE: { active: false, integrity: 0, cooldown: 0 },
            },
          });
      if (invalid === 'runtime cooldown')
        await dataSource
          .getRepository(Spacecraft)
          .update(member.id, {
            runtimeSystems: {
              SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 2 },
            },
          });
      if (invalid === 'active warp') {
        await dataSource
          .getRepository(SpacecraftModule)
          .save({
            spacecraftId: member.id,
            category: 'HYPERDRIVE',
            moduleType: 'Hyperdrive',
          });
        await dataSource
          .getRepository(Spacecraft)
          .update(member.id, {
            runtimeSystems: {
              WARPDRIVE: { active: true, integrity: 100, cooldown: 0 },
            },
          });
      }
      const before = await dataSource
        .getRepository(Spacecraft)
        .find({ order: { id: 'ASC' } });
      await expect(
        service.enter(
          invalid === 'nonleader' ? member.id : ship.id,
          ship.userId,
        ),
      ).rejects.toThrow();
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .find({ order: { id: 'ASC' } }),
      ).toEqual(before);
      for (const entity of [
        Message,
        FlightSignature,
        ShipLogEntry,
        ExplorationState,
        LayerKnowledge,
      ])
        expect(await dataSource.getRepository(entity).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    },
  );

  it('rolls back the complete fleet, cartography, takeover prestige, repairs and all arrival records on a downstream failure', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ userId: ship.userId, leaderId: ship.id, name: 'Rollback fleet' });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id, warpdriveMax: 30 });
    const member = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Rollback member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
        energy: 0,
        warpdrive: 7,
        runtimeSystems: {
          SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
        },
      });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: member.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    const system = await dataSource
      .getRepository(StarSystem)
      .save({
        layerId: wormhole.entryLayerId,
        cx: 2,
        cy: 2,
        name: 'Rollback cartography',
        systemTypeId: 1,
      });
    const plan = await dataSource
      .getRepository(CartographyPlan)
      .save({
        userId: ship.userId,
        starSystemId: system.id,
        status: CartographyPlanStatus.FINISHING,
        finalizingSpacecraftId: ship.id,
        finalizationStartedAt: new Date(),
        finalizationTick: 1,
        remainingFieldIds: [],
      });
    const targetOwner = await createUser(dataSource, {
      username: 'Rollback target',
    });
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Stationary takeover target',
        userId: targetOwner.id,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    await dataSource.getRepository(User).update(ship.userId, { prestige: 10 });
    await dataSource
      .getRepository(SpacecraftTakeover)
      .save({
        attackerId: member.id,
        targetId: target.id,
        attackerUserId: ship.userId,
        targetUserId: targetOwner.id,
        ticksRemaining: 5,
        prestigeCost: 7,
      });
    await dataSource
      .getRepository(SpacecraftRepairTask)
      .save({
        spacecraftId: member.id,
        targetType: RepairTargetType.HULL,
        partsType: RepairPartsType.BOTH,
        targetIntegrity: 80,
        spareParts: 3,
        systemComponents: 2,
        completesAt: new Date(Date.now() + 60000),
      });
    await dataSource
      .getRepository(GalaxyField)
      .update(destination.galaxyFieldId!, {
        effects: [FieldEffect.WARPDRIVE_LEAK],
      });
    await dataSource.query(
      `CREATE FUNCTION k7a2_fail_fleet_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.subject = 'Schiffsreparatur abgebrochen' THEN RAISE EXCEPTION 'fleet downstream failure'; END IF; RETURN NEW; END $$`,
    );
    await dataSource.query(
      'CREATE TRIGGER k7a2_fail_fleet_message BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION k7a2_fail_fleet_message()',
    );
    try {
      await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
        'fleet downstream failure',
      );
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .find({ where: { fleetId: fleet.id }, order: { id: 'ASC' } }),
      ).toMatchObject([
        {
          id: ship.id,
          locationId: origin.id,
          energy: 71,
          warpdrive: 23,
          runtimeSystems: { SUBLIGHT_DRIVE: { active: false } },
        },
        {
          id: member.id,
          locationId: origin.id,
          energy: 0,
          warpdrive: 7,
          runtimeSystems: { SUBLIGHT_DRIVE: { active: false } },
        },
      ]);
      expect(
        await dataSource
          .getRepository(CartographyPlan)
          .findOneByOrFail({ id: plan.id }),
      ).toMatchObject({
        status: 'FINISHING',
        finalizingSpacecraftId: ship.id,
        finalizationTick: 1,
      });
      expect(await dataSource.getRepository(SpacecraftTakeover).count()).toBe(
        1,
      );
      expect(
        (
          await dataSource
            .getRepository(User)
            .findOneByOrFail({ id: ship.userId })
        ).prestige,
      ).toBe(10);
      expect(await dataSource.getRepository(SpacecraftRepairTask).count()).toBe(
        1,
      );
      for (const entity of [
        CargoItem,
        Message,
        FlightSignature,
        ShipLogEntry,
        ExplorationState,
        LayerKnowledge,
        SystemExploration,
      ])
        expect(await dataSource.getRepository(entity).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      await dataSource.query(
        'DROP TRIGGER k7a2_fail_fleet_message ON messages',
      );
      await dataSource.query('DROP FUNCTION k7a2_fail_fleet_message()');
    }
  });

  it('never downgrades concurrently upgraded terrain knowledge during passage arrival', async () => {
    const terrain = await dataSource
      .getRepository(ExplorationState)
      .save({
        userId: ship.userId,
        layerId: wormhole.exitLayerId,
        cx: 3,
        cy: 4,
        explorationLevel: ExplorationLevel.TERRAIN,
      });
    let upgraded = false;
    const subscriber: EntitySubscriberInterface<ExplorationState> = {
      listenTo: () => ExplorationState,
      beforeUpdate: async () => {
        if (upgraded) return;
        upgraded = true;
        await dataSource
          .getRepository(ExplorationState)
          .update(terrain.id, { explorationLevel: ExplorationLevel.FULL });
      },
    };
    dataSource.subscribers.push(subscriber);
    try {
      await service.enter(ship.id, ship.userId);
      expect(
        await dataSource
          .getRepository(ExplorationState)
          .findOneByOrFail({ id: terrain.id }),
      ).toMatchObject({ explorationLevel: ExplorationLevel.FULL });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
    }
  });

  it('preserves concurrently explored layer knowledge when passage first observed no knowledge row', async () => {
    const acquired = barrier();
    const release = barrier();
    let paused = false;
    const subscriber: EntitySubscriberInterface<LayerKnowledge> = {
      listenTo: () => LayerKnowledge,
      beforeInsert: async (event) => {
        if (paused || event.entity.status !== 'KNOWN') return;
        paused = true;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const passage = service.enter(ship.id, ship.userId);
    const exploredAt = new Date('2026-11-09T10:00:00.000Z');
    try {
      await Promise.race([
        acquired.promise,
        passage.then(() => {
          throw new Error('Passage did not reach knowledge insertion');
        }),
      ]);
      await knowledge.markExplored(
        ship.userId,
        wormhole.exitLayerId,
        exploredAt,
      );
    } finally {
      release.release();
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      await passage;
    }
    expect(
      await knowledge.get(ship.userId, wormhole.exitLayerId),
    ).toMatchObject({
      status: 'EXPLORED',
      knownAt: exploredAt.toISOString(),
      exploredAt: exploredAt.toISOString(),
    });
  });

  it('rejects ordinary movement loaded before a real passage without orphan arrival or success writes', async () => {
    const next = await dataSource
      .getRepository(GalaxyField)
      .save({ layerId: wormhole.entryLayerId, cx: 2, cy: 1, fieldTypeId: 1 });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: ship.id,
        category: 'HYPERDRIVE',
        moduleType: 'Hyperdrive',
        isActive: false,
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, {
        runtimeSystems: {
          SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
          WARPDRIVE: { active: false, integrity: 100, cooldown: 0 },
        },
      });
    const acquired = barrier();
    const release = barrier();
    let firstLoad = true;
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== ship.id || !firstLoad) return;
        firstLoad = false;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const movement = navigation
      .flyGalaxy(ship.id, ship.userId, next.cx, next.cy)
      .then(
        () => ({}),
        (error: unknown) => ({ error }),
      );
    try {
      await Promise.race([
        acquired.promise,
        movement.then(() => {
          throw new Error('Movement did not load the old snapshot');
        }),
      ]);
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      await service.enter(ship.id, ship.userId);
    } finally {
      release.release();
      const index = dataSource.subscribers.indexOf(subscriber);
      if (index >= 0) dataSource.subscribers.splice(index, 1);
    }
    expect(await movement).toMatchObject({
      error: { message: expect.stringContaining('veraltet') },
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: destination.id, energy: 71, warpdrive: 23 });
    expect(
      await dataSource.getRepository(ExplorationState).find(),
    ).toMatchObject([{ layerId: wormhole.exitLayerId, cx: 3, cy: 4 }]);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
    expect(await dataSource.getRepository(Message).find()).toMatchObject([
      { subject: 'Wurmloch durchflogen' },
    ]);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(1);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
  });

  it('rejects an old-location fleet join after waiting across the real passage commit', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({
        userId: ship.userId,
        leaderId: ship.id,
        name: 'Concurrent passage',
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const joiner = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Old-location joiner',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const subscriber: EntitySubscriberInterface<Message> = {
      listenTo: () => Message,
      afterInsert: async (event: InsertEvent<Message>) => {
        const rows: Array<{ pid: number }> = await event.manager.query(
          'SELECT pg_backend_pid() AS pid',
        );
        blockerPid = rows[0].pid;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const passage = service.enter(ship.id, ship.userId);
    let joining: Promise<{ error?: unknown }> = Promise.resolve({});
    try {
      await Promise.race([
        acquired.promise,
        passage.then(() => {
          throw new Error('Passage did not reach commit barrier');
        }),
      ]);
      joining = navigation.joinFleet(ship.userId, fleet.id, joiner.id).then(
        () => ({}),
        (error: unknown) => ({ error }),
      );
      await waitForBlockedTransaction(dataSource, blockerPid);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      release.release();
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      await passage;
    }
    expect((await joining).error).toBeInstanceOf(Error);
    expect(
      await dataSource.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      { id: ship.id, locationId: destination.id, fleetId: fleet.id },
      { id: joiner.id, locationId: origin.id, fleetId: null },
    ]);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
    expect(await dataSource.getRepository(Message).count()).toBe(1);
  });

  it('refuses a cooling installed impulse even when its stored runtime cooldown is stale', async () => {
    await dataSource
      .getRepository(SpacecraftModule)
      .update({ spacecraftId: ship.id }, { cooldown: 2 });
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Impulsantrieb kühlt noch ab',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(origin.id);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
  });

  it('refuses a destroyed installed impulse even when its stored runtime integrity is stale', async () => {
    await dataSource
      .getRepository(SpacecraftModule)
      .update({ spacecraftId: ship.id }, { integrity: 0 });
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Impulsantrieb zerstört',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(origin.id);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
  });

  it('refuses an origin changed during awaited access checks rather than authorizing a now-nonlocal wormhole', async () => {
    policy = {
      allows: async () => {
        await dataSource
          .getRepository(GalaxyField)
          .update(origin.galaxyFieldId!, { cx: 2 });
        return true;
      },
    };
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Origin state changed',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(origin.id);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('refuses a destination changed during awaited access checks without persisting stale arrival knowledge', async () => {
    policy = {
      allows: async () => {
        await dataSource
          .getRepository(GalaxyField)
          .update(destination.galaxyFieldId!, { cx: 4 });
        return true;
      },
    };
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Destination state changed',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(origin.id);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('does not execute imaginary intermediate fields during a discontinuous passage', async () => {
    await dataSource
      .getRepository(GalaxyField)
      .save({
        layerId: wormhole.exitLayerId,
        cx: 1,
        cy: 4,
        fieldTypeId: 1,
        effects: [FieldEffect.WARPDRIVE_LEAK],
      });
    await dataSource
      .getRepository(GalaxyField)
      .save({
        layerId: wormhole.exitLayerId,
        cx: 2,
        cy: 4,
        fieldTypeId: 1,
        isPassable: false,
      });
    await service.enter(ship.id, ship.userId);
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: destination.id, warpdrive: 23, energy: 71 });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(1);
  });

  it('clears a docking link when passage relocates the ship without adding a flight tariff', async () => {
    const station = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Origin station',
        kind: SpacecraftKind.STATION,
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { dockedAtId: station.id });
    await service.enter(ship.id, ship.userId);
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: destination.id,
      dockedAtId: null,
      energy: 71,
    });
  });

  it.each([
    ['combat', { status: SpacecraftStatus.IN_COMBAT }],
    ['destroyed', { status: SpacecraftStatus.DESTROYED }],
    ['in flight', { status: SpacecraftStatus.IN_FLIGHT }],
    ['standby', { operatingMode: SpacecraftOperatingMode.STANDBY }],
    ['station', { kind: SpacecraftKind.STATION }],
  ] as const)(
    'refuses a %s fleet member without partial departure or movement',
    async (_label, invalid) => {
      const fleet = await dataSource
        .getRepository(Fleet)
        .save({
          userId: ship.userId,
          leaderId: ship.id,
          name: 'Invalid member fleet',
          isFixed: false,
        });
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { fleetId: fleet.id });
      const member = await dataSource
        .getRepository(Spacecraft)
        .save({
          name: 'Invalid member',
          userId: ship.userId,
          shipClassId: ship.shipClassId,
          locationId: origin.id,
          fleetId: fleet.id,
          ...invalid,
        });
      await dataSource
        .getRepository(SpacecraftModule)
        .save({
          spacecraftId: member.id,
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Impulse',
        });
      await expect(service.enter(ship.id, ship.userId)).rejects.toThrow();
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .find({ order: { id: 'ASC' } }),
      ).toMatchObject([
        { id: ship.id, locationId: origin.id, fleetId: fleet.id, energy: 71 },
        { id: member.id, locationId: origin.id, fleetId: fleet.id },
      ]);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    },
  );

  it('moves the entire fleet with its own zero-cost activation and active-drive balances, applying each arrival exactly once', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({
        userId: ship.userId,
        leaderId: ship.id,
        name: 'Complete fleet',
        isFixed: false,
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, {
        fleetId: fleet.id,
        runtimeSystems: {
          SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
        },
      });
    const member = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Zero EPS member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
        energy: 0,
        warpdrive: 7,
      });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: member.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    await dataSource
      .getRepository(GalaxyField)
      .update(destination.galaxyFieldId!, {
        effects: [FieldEffect.WARPDRIVE_LEAK],
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { warpdriveMax: 30 });
    await dataSource
      .getRepository(Spacecraft)
      .update(member.id, { warpdriveMax: 10 });
    await service.enter(ship.id, ship.userId);
    expect(
      await dataSource.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      {
        id: ship.id,
        locationId: destination.id,
        energy: 71,
        warpdrive: 20,
        fleetId: fleet.id,
        runtimeSystems: { SUBLIGHT_DRIVE: { active: true } },
      },
      {
        id: member.id,
        locationId: destination.id,
        energy: 0,
        warpdrive: 6,
        fleetId: fleet.id,
        runtimeSystems: { SUBLIGHT_DRIVE: { active: true } },
      },
    ]);
    expect(await dataSource.getRepository(Message).count()).toBe(4);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(4);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(2);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(1);
    expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(1);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(6);
  });

  it('emits no gateway notification until the transaction containing arrival messages has committed', async () => {
    let reached!: () => void;
    let release!: () => void;
    const paused = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const subscriber: EntitySubscriberInterface<Message> = {
      listenTo: () => Message,
      afterInsert: async (event: InsertEvent<Message>) => {
        if (event.entity.subject !== 'Wurmloch durchflogen') return;
        reached();
        await barrier;
      },
    };
    dataSource.subscribers.push(subscriber);
    const passage = service.enter(ship.id, ship.userId);
    try {
      await Promise.race([
        paused,
        passage.then(() => {
          throw new Error('Passage did not reach notification barrier');
        }),
      ]);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
      expect(
        (
          await dataSource
            .getRepository(Spacecraft)
            .findOneByOrFail({ id: ship.id })
        ).locationId,
      ).toBe(origin.id);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
    } finally {
      release();
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      await passage;
    }
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(destination.id);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
  });

  it('discovers the existing sensor radius around only the arrival field', async () => {
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: ship.id,
        category: 'SENSORS',
        moduleType: 'Sensors',
        isActive: true,
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, {
        runtimeSystems: {
          SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
          LONG_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
        },
      });
    await service.enter(ship.id, ship.userId);
    const terrain = await dataSource
      .getRepository(ExplorationState)
      .find({ order: { cy: 'ASC', cx: 'ASC' } });
    expect(terrain).toHaveLength(28);
    expect(terrain).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cx: 3, cy: 1 }),
        expect.objectContaining({ cx: 6, cy: 4 }),
      ]),
    );
    expect(terrain.every((row) => row.layerId === wormhole.exitLayerId)).toBe(
      true,
    );
  });

  it('cancels an ongoing takeover, refunds prestige and persists both cancellation messages in the passage transaction', async () => {
    const targetOwner = await createUser(dataSource, {
      username: 'Takeover target owner',
    });
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Takeover target',
        userId: targetOwner.id,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
      });
    await dataSource.getRepository(User).update(ship.userId, { prestige: 10 });
    await dataSource
      .getRepository(SpacecraftTakeover)
      .save({
        attackerId: ship.id,
        targetId: target.id,
        attackerUserId: ship.userId,
        targetUserId: targetOwner.id,
        ticksRemaining: 5,
        prestigeCost: 7,
      });
    await service.enter(ship.id, ship.userId);
    expect(await dataSource.getRepository(SpacecraftTakeover).count()).toBe(0);
    expect(
      (
        await dataSource
          .getRepository(User)
          .findOneByOrFail({ id: ship.userId })
      ).prestige,
    ).toBe(17);
    expect(
      await dataSource
        .getRepository(Message)
        .count({ where: { subject: 'Übernahme abgebrochen' } }),
    ).toBe(2);
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: target.id })
      ).locationId,
    ).toBe(origin.id);
  });

  it('resets finalizing cartography in the same successful passage without granting Systementdeckung', async () => {
    const system = await dataSource
      .getRepository(StarSystem)
      .save({
        layerId: wormhole.entryLayerId,
        cx: 2,
        cy: 2,
        name: 'Cartography system',
        systemTypeId: 1,
      });
    const plan = await dataSource
      .getRepository(CartographyPlan)
      .save({
        userId: ship.userId,
        starSystemId: system.id,
        status: CartographyPlanStatus.FINISHING,
        finalizingSpacecraftId: ship.id,
        finalizationStartedAt: new Date(),
        finalizationTick: 1,
        remainingFieldIds: [],
      });
    await service.enter(ship.id, ship.userId);
    expect(
      await dataSource
        .getRepository(CartographyPlan)
        .findOneByOrFail({ id: plan.id }),
    ).toMatchObject({
      status: CartographyPlanStatus.MEASURED,
      finalizingSpacecraftId: null,
      finalizationStartedAt: null,
      finalizationTick: null,
    });
    expect(await dataSource.getRepository(SystemExploration).count()).toBe(0);
  });

  it('uses the complete passable target layer and injected RNG rather than the configured exit alone', async () => {
    const other = await dataSource
      .getRepository(GalaxyField)
      .save({ layerId: wormhole.exitLayerId, cx: 5, cy: 5, fieldTypeId: 1 });
    await dataSource
      .getRepository(GalaxyField)
      .save({
        layerId: wormhole.exitLayerId,
        cx: 2,
        cy: 2,
        fieldTypeId: 1,
        isPassable: false,
      });
    await dataSource
      .getRepository(Wormhole)
      .update(wormhole.id, { isRandomExit: true });
    random = 0.75;
    await service.enter(ship.id, ship.userId);
    const expected = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: other.id });
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(expected.id);
  });

  it('leaves in reverse direction without an installed impulse or any activation or travel resources', async () => {
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: destination.id, energy: 0 });
    await dataSource
      .getRepository(SpacecraftModule)
      .delete({ spacecraftId: ship.id });
    const result = await service.enter(ship.id, ship.userId);
    expect(result.direction).toBe('EXIT');
    const persisted = await dataSource
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: ship.id });
    expect(persisted).toMatchObject({
      locationId: origin.id,
      energy: 0,
      warpdrive: 23,
    });
    expect(persisted.runtimeSystems.SUBLIGHT_DRIVE).toBeUndefined();
  });

  it('rolls back all arrival writes, activation, repair refunds and messages when a final downstream cancellation message fails', async () => {
    await dataSource
      .getRepository(GalaxyField)
      .update(destination.galaxyFieldId!, {
        effects: [FieldEffect.WARPDRIVE_LEAK],
      });
    await dataSource
      .getRepository(SpacecraftRepairTask)
      .save({
        spacecraftId: ship.id,
        targetType: RepairTargetType.HULL,
        partsType: RepairPartsType.BOTH,
        targetIntegrity: 80,
        spareParts: 3,
        systemComponents: 2,
        completesAt: new Date(Date.now() + 60000),
      });
    await dataSource.query(
      `CREATE FUNCTION k7a2_fail_message() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.subject = 'Schiffsreparatur abgebrochen' THEN RAISE EXCEPTION 'downstream cancellation failure'; END IF; RETURN NEW; END $$`,
    );
    await dataSource.query(
      `CREATE TRIGGER k7a2_fail_message BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION k7a2_fail_message()`,
    );
    try {
      await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
        'downstream cancellation failure',
      );
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id }),
      ).toMatchObject({
        locationId: origin.id,
        energy: 71,
        warpdrive: 23,
        runtimeSystems: { SUBLIGHT_DRIVE: { active: false } },
      });
      expect(await dataSource.getRepository(SpacecraftRepairTask).count()).toBe(
        1,
      );
      expect(await dataSource.getRepository(CargoItem).count()).toBe(0);
      expect(await dataSource.getRepository(Message).count()).toBe(0);
      expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
      expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(0);
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
      expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(0);
      expect(gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      await dataSource.query('DROP TRIGGER k7a2_fail_message ON messages');
      await dataSource.query('DROP FUNCTION k7a2_fail_message()');
    }
  });

  it('supplies stable detached deeply frozen hydrated snapshots to the awaited access policy', async () => {
    policy = {
      allows: async (snapshot, hole) => {
        expect(snapshot).not.toBe(ship);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(snapshot.modules)).toBe(true);
        expect(Object.isFrozen(snapshot.runtimeSystems.SUBLIGHT_DRIVE)).toBe(
          true,
        );
        expect(Object.isFrozen(snapshot.location?.galaxyField)).toBe(true);
        expect(snapshot.location?.galaxyField?.fieldType).toMatchObject({
          id: 1,
        });
        expect(Object.isFrozen(snapshot.location?.galaxyField?.fieldType)).toBe(
          true,
        );
        expect(Object.isFrozen(hole)).toBe(true);
        const createdAt = snapshot.createdAt.getTime();
        expect(() => snapshot.createdAt.setTime(0)).toThrow();
        await Promise.resolve();
        expect(snapshot.createdAt.getTime()).toBe(createdAt);
        expect(() => {
          snapshot.energy = 999;
        }).toThrow();
        return false;
      },
    };
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Berechtigung',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).energy,
    ).toBe(71);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
  });

  it('includes a nonfleet outgoing tractor target in the same validated atomic passage', async () => {
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Carried ship',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        energy: 0,
      });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: target.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: target.id });
    await service.enter(ship.id, ship.userId);
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: target.id })
      ).locationId,
    ).toBe(destination.id);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(4);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(2);
  });

  it('moves and validates the outgoing tractor target, deduplicating a target already in the fleet', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ userId: ship.userId, leaderId: ship.id, name: 'Towed fleet' });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const target = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Towed member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
        energy: 0,
      });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: target.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: target.id });
    await service.enter(ship.id, ship.userId);
    expect(
      await dataSource.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      {
        id: ship.id,
        locationId: destination.id,
        energy: 71,
        tractoredShipId: target.id,
      },
      {
        id: target.id,
        locationId: destination.id,
        energy: 0,
        fleetId: fleet.id,
      },
    ]);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(4);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(2);
  });

  it('refuses a ship held by an external tractor without any arrival effects', async () => {
    await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Tractor holder',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        tractoredShipId: ship.id,
      });
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Traktorstrahl',
    );
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id })
      ).locationId,
    ).toBe(origin.id);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
  });

  it('rejects the entire nonfixed fleet when a member lacks its own required crew before any mutation', async () => {
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({
        userId: ship.userId,
        leaderId: ship.id,
        name: 'Atomic fleet',
        isFixed: false,
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const member = await dataSource
      .getRepository(Spacecraft)
      .save({
        name: 'Crewless member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        locationId: origin.id,
        fleetId: fleet.id,
        crewRequired: 1,
        energy: 0,
        runtimeSystems: {
          SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
        },
      });
    await dataSource
      .getRepository(SpacecraftModule)
      .save({
        spacecraftId: member.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Impulse',
      });
    await expect(service.enter(ship.id, ship.userId)).rejects.toThrow(
      'Not enough crew',
    );
    expect(
      await dataSource.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      {
        id: ship.id,
        locationId: origin.id,
        energy: 71,
        fleetId: fleet.id,
        runtimeSystems: { SUBLIGHT_DRIVE: { active: false } },
      },
      {
        id: member.id,
        locationId: origin.id,
        energy: 0,
        fleetId: fleet.id,
        runtimeSystems: { SUBLIGHT_DRIVE: { active: false } },
      },
    ]);
    expect(await dataSource.getRepository(Message).count()).toBe(0);
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ShipLogEntry).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
    expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(0);
  });

  it('cancels a running repair and refunds its own parts with the passage and cancellation message', async () => {
    await dataSource
      .getRepository(SpacecraftRepairTask)
      .save({
        spacecraftId: ship.id,
        targetType: RepairTargetType.HULL,
        partsType: RepairPartsType.BOTH,
        targetIntegrity: 80,
        spareParts: 3,
        systemComponents: 2,
        completesAt: new Date(Date.now() + 60000),
      });
    await service.enter(ship.id, ship.userId);
    expect(await dataSource.getRepository(SpacecraftRepairTask).count()).toBe(
      0,
    );
    expect(
      await dataSource
        .getRepository(CargoItem)
        .find({ order: { commodityId: 'ASC' } }),
    ).toMatchObject([
      { spacecraftId: ship.id, commodityId: 10001, amount: 3 },
      { spacecraftId: ship.id, commodityId: 10002, amount: 2 },
    ]);
    expect(
      await dataSource
        .getRepository(Message)
        .count({ where: { subject: 'Schiffsreparatur abgebrochen' } }),
    ).toBe(1);
  });

  it('applies destination consequences, terrain, mandatory knowledge, signatures, log and durable messages exactly once', async () => {
    await dataSource
      .getRepository(GalaxyField)
      .update(destination.galaxyFieldId!, {
        effects: [FieldEffect.WARPDRIVE_LEAK],
      });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { warpdriveMax: 30 });
    await service.enter(ship.id, ship.userId);
    const persisted = await dataSource
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: ship.id });
    expect(persisted.warpdrive).toBe(20);
    const terrain = await dataSource.getRepository(ExplorationState).find();
    expect(terrain).toHaveLength(1);
    expect(terrain[0]).toMatchObject({
      userId: ship.userId,
      layerId: wormhole.exitLayerId,
      cx: 3,
      cy: 4,
      explorationLevel: ExplorationLevel.TERRAIN,
    });
    expect(await dataSource.getRepository(SystemExploration).count()).toBe(0);
    expect(await dataSource.getRepository(LayerKnowledge).find()).toMatchObject(
      [{ userId: ship.userId, layerId: wormhole.exitLayerId, status: 'KNOWN' }],
    );
    expect(
      await dataSource
        .getRepository(FlightSignature)
        .find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      {
        spacecraftId: ship.id,
        locationId: origin.id,
        fromDirection: null,
        toDirection: null,
      },
      {
        spacecraftId: ship.id,
        locationId: destination.id,
        fromDirection: null,
        toDirection: null,
      },
    ]);
    expect(await dataSource.getRepository(ShipLogEntry).find()).toMatchObject([
      { spacecraftId: ship.id, body: 'Wurmloch durchflogen' },
    ]);
    expect(
      await dataSource.getRepository(Message).find({ order: { id: 'ASC' } }),
    ).toMatchObject([
      { recipientId: ship.userId, subject: 'Feldeffekt' },
      { recipientId: ship.userId, subject: 'Wurmloch durchflogen' },
    ]);
  });

  it('relocates a ship to the exit and activates its own impulse without passage EPS or warp cost', async () => {
    await service.enter(ship.id, ship.userId, wormhole.id);
    const persisted = await dataSource
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: ship.id });
    expect(persisted.locationId).toBe(destination.id);
    expect(persisted.energy).toBe(71);
    expect(persisted.warpdrive).toBe(23);
    expect(persisted.runtimeSystems.SUBLIGHT_DRIVE).toMatchObject({
      active: true,
      integrity: 100,
      cooldown: 0,
    });
  });
});
