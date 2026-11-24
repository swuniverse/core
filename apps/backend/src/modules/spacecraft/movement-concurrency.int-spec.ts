import type { CombatReportDto } from '@swuniverse/shared';
import 'reflect-metadata';
import { setTimeout as pause } from 'node:timers/promises';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { GameDataService } from '../game-data/game-data.service';
import { FactionEntity } from '../faction/entities/faction.entity';
import { ShipClassService } from './ship-class.service';
import { SpacecraftService } from './spacecraft.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { CartographyPlanService } from './cartography-plan.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { FieldTransitionExecutor } from './field-transition-executor';
import {
  MOVEMENT_REACTIONS,
  type MovementReaction,
} from './movement-reaction.port';
import {
  FlightConsequencePipeline,
  FLIGHT_CONSEQUENCES,
  type FlightConsequence,
} from './flight-consequence-pipeline';
import { FieldEffectConsequence } from './field-effect-consequence';
import { DeflectorConsequence } from './deflector-consequence';
import { MapRegion } from '../starmap/entities/map-region.entity';
import { FieldEffectQuery } from '../starmap/field-effect-query';
import {
  CartographyPlan,
  CartographyPlanStatus,
} from './entities/cartography-plan.entity';
import { regionTarget } from './cartography-plan.service';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import type { CrewEnhancementService } from './crew-enhancement.service';
import { FlightSignatureService } from './flight-signature.service';
import { LastCombatReportService } from './last-combat-report.service';
import { AnomalyRegistry } from '../anomaly/anomaly-registry';
import { AnomalyFlightConsequence } from '../anomaly/anomaly-flight-consequence';
import { IonStormHandler } from '../anomaly/ion-storm.handler';
import type { AnomalyRandom } from '../anomaly/stu-random';
import { Anomaly } from '../anomaly/entities/anomaly.entity';
import { AnomalyType } from '../anomaly/entities/anomaly-type.entity';
import { SpacecraftIonStormEffects } from './ion-storm-effects';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { Message } from '../messaging/entities/message.entity';
import { User } from '../auth/user.entity';

import { StatisticsService } from '../statistics/statistics.service';
import { GameGateway } from '../websocket/game.gateway';
import { MessagingService } from '../messaging/messaging.service';
import { ExplorationService } from '../starmap/exploration.service';
import { LayerKnowledgeService } from '../starmap/layer-knowledge.service';
import { FlightSignature } from './entities/flight-signature.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { SpacecraftStatus } from './entities/spacecraft.entity';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { FieldEffect } from '@swuniverse/shared';
import { DataSource, Like, type EntitySubscriberInterface } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { captureMovementState } from './movement-state';

// Sensors start OFF like STU (sc-AUD-02); flights beyond one field need long-range sensors.
const SENSORS_ON = {
  LONG_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
  SHORT_RANGE_SENSORS: { active: true, integrity: 100, cooldown: 0 },
};

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/** Fail promptly when the movement aborts before reaching the controlled load. */
async function waitForControlledLoad(
  acquired: Promise<void>,
  pending: Promise<unknown>,
): Promise<void> {
  await Promise.race([
    acquired,
    pending.then((result) => {
      if (result && typeof result === 'object' && 'error' in result)
        throw result.error;
      throw new Error('Movement completed before the controlled load');
    }),
  ]);
}

const battleReport = (text: string): CombatReportDto => ({
  parties: { attacker: [], defender: [] },
  rounds: [{ number: 1, lines: [{ kind: 'INFO', text, emphasis: 'neutral' }] }],
  outcome: { winner: 'ATTACKER', destroyedShipIds: [] },
});

async function waitForBlockedTransaction(
  dataSource: DataSource,
  blockerPid: number,
) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows: Array<{ blocked: boolean }> = await dataSource.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_stat_activity
         WHERE datname = current_database() AND $1 = ANY(pg_blocking_pids(pid))
       ) AS blocked`,
      [blockerPid],
    );
    if (rows[0].blocked) return;
    await pause(10);
  }
  throw new Error(
    'Production movement save did not wait on the controlled transaction',
  );
}

async function movementService(dataSource: DataSource) {
  const realServices = [
    SpacecraftService,
    SpacecraftCrewService,
    SpacecraftTakeoverService,
    SpacecraftDestructionService,
    SpacecraftRepairService,
    CartographyPlanService,
    SpacecraftRuntimeStateService,
    FieldTransitionExecutor,
    FlightConsequencePipeline,
    ExplorationService,
    LayerKnowledgeService,
    LastCombatReportService,
  ];
  const dependencies: Type<unknown>[] = realServices.flatMap(
    (service) => Reflect.getMetadata('design:paramtypes', service) ?? [],
  );
  const gameData = new GameDataService();
  const classes = new ShipClassService(
    dataSource.getRepository(ShipClassDef),
    dataSource.getRepository(FactionEntity),
    gameData,
  );
  const gateway = { emitToUser: jest.fn(), emitToAll: jest.fn() };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const effect = new FieldEffectConsequence(
    messaging as unknown as MessagingService,
    gateway as unknown as GameGateway,
    () => 0,
  );
  const reactions: MovementReaction[] = [];
  const consequences: FlightConsequence[] = [effect];
  const module = await Test.createTestingModule({
    providers: [
      ...dependencies.map((provide) => ({ provide, useValue: {} })),
      { provide: MOVEMENT_REACTIONS, useValue: reactions },
      ...INTEGRATION_ENTITIES.map((entity) => ({
        provide: getRepositoryToken(entity),
        useValue: dataSource.getRepository(entity),
      })),
      { provide: 'BuoyRepository', useValue: {} },
      { provide: 'CrewSkillRepository', useValue: {} },
      ...realServices,
      { provide: FLIGHT_CONSEQUENCES, useValue: consequences },
      { provide: DataSource, useValue: dataSource },
      { provide: GameDataService, useValue: gameData },
      { provide: ShipClassService, useValue: classes },
      { provide: GameGateway, useValue: gateway },
      { provide: MessagingService, useValue: messaging },
      {
        provide: FlightSignatureService,
        useValue: new FlightSignatureService(
          dataSource.getRepository(FlightSignature),
          classes,
        ),
      },
      {
        provide: StatisticsService,
        useValue: new StatisticsService(dataSource, []),
      },
    ],
  }).compile();
  return {
    service: module.get(SpacecraftService),
    gateway,
    messaging,
    reactions,
    consequences,
    effect,
    close: () => module.close(),
  };
}

describe('Movement original-state persistence (PostgreSQL)', () => {
  let dataSource: DataSource;
  let persistence: SpacecraftDestructionService;
  let close: () => Promise<void>;
  let ship: Spacecraft;
  let locations: SpaceLocation[];
  let fixture: Awaited<ReturnType<typeof movementService>>;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const dependencies: Array<new (...args: never[]) => unknown> =
      Reflect.getMetadata('design:paramtypes', SpacecraftDestructionService);
    const module = await Test.createTestingModule({
      providers: [
        ...dependencies.map((provide) => ({ provide, useValue: {} })),
        { provide: DataSource, useValue: dataSource },
        SpacecraftDestructionService,
      ],
    }).compile();
    persistence = module.get(SpacecraftDestructionService);
    close = () => module.close();
    fixture = await movementService(dataSource);
  });
  afterAll(async () => {
    await close?.();
    await fixture?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(dataSource);
    fixture.messaging.sendSystem.mockClear();
    fixture.reactions.length = 0;
    fixture.consequences.splice(0, fixture.consequences.length, fixture.effect);
    fixture.gateway.emitToUser.mockClear();
    fixture.gateway.emitToAll.mockClear();
    const owner = await createUser(dataSource);
    const shipClass = await dataSource.getRepository(ShipClassDef).save({
      key: 'MOVEMENT_CONCURRENCY',
      name: 'Movement test ship',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const layer = await dataSource.getRepository(Layer).save({
      name: 'Movement test layer',
      width: 5,
      height: 5,
    });
    locations = [];
    for (const cx of [1, 2, 3]) {
      const field = await dataSource.getRepository(GalaxyField).save({
        layerId: layer.id,
        cx,
        cy: 1,
        fieldTypeId: 1,
      });
      locations.push(
        await dataSource
          .getRepository(SpaceLocation)
          .findOneByOrFail({ galaxyFieldId: field.id }),
      );
    }
    ship = await dataSource.getRepository(Spacecraft).save({
      name: 'Moving ship',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: locations[0].id,
      energy: 71,
      runtimeSystems: {
        ...SENSORS_ON,
        SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 0 },
      },
    });
  });

  it('does not detach an incapable member when the leader resources became stale before fleet preparation', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const fleet = await dataSource.getRepository(Fleet).save({
      name: 'Stale preparation',
      userId: ship.userId,
      leaderId: ship.id,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const member = await dataSource.getRepository(Spacecraft).save({
      name: 'Blocked member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      fleetId: fleet.id,
      locationId: locations[0].id,
      status: SpacecraftStatus.DESTROYED,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== ship.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: member.id }),
    ).toMatchObject({ fleetId: fleet.id });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('rejects galaxy flight when its originally installed drive was removed before the step', async () => {
    const drive = await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource.getRepository(SpacecraftModule).delete(drive.id);
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
  });

  it('rejects a step when a previously remote attached member arrives at the selected origin', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const fleet = await dataSource.getRepository(Fleet).save({
      name: 'Remote selection',
      userId: ship.userId,
      leaderId: ship.id,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const remote = await dataSource.getRepository(Spacecraft).save({
      name: 'Remote member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      fleetId: fleet.id,
      locationId: locations[2].id,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(remote.id, { locationId: locations[0].id });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: remote.id }),
    ).toMatchObject({ locationId: locations[0].id, fleetId: fleet.id });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
  });

  it('does not overwrite unrelated battery or name changes during a valid movement step', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1);
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { battery: 23, name: 'Renamed during flight' });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: locations[1].id,
      energy: 70,
      battery: 23,
      name: 'Renamed during flight',
    });
  });

  it('rejects a leader captured by a tractor after the original eligibility check', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const tractor = await dataSource.getRepository(Spacecraft).save({
      name: 'New tractor',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: locations[0].id,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource.transaction(async (manager) => {
        await manager.findOneOrFail(Spacecraft, {
          where: { id: ship.id },
          lock: { mode: 'pessimistic_write' },
        });
        await manager.update(Spacecraft, tractor.id, {
          tractoredShipId: ship.id,
        });
      });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
  });

  it('rejects a runtime-only drive cooldown change through galaxy flight without step effects', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    const runtimeSystems = {
      ...SENSORS_ON,
      WARPDRIVE: { active: false, integrity: 100, cooldown: 3 },
    };
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { runtimeSystems });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: locations[0].id,
      energy: 71,
      runtimeSystems,
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
    expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(0);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('rejects lost crew eligibility without overwriting a completed crew transfer', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const crew = await dataSource
      .getRepository(Crew)
      .save({ userId: ship.userId, name: 'Flight crew' });
    await dataSource
      .getRepository(CrewAssignment)
      .save({ crewId: crew.id, userId: ship.userId, spacecraftId: ship.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { crewRequired: 1 });
    const receiver = await dataSource.getRepository(Spacecraft).save({
      name: 'Crew receiver',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: locations[0].id,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource.transaction(async (manager) => {
        await manager.findOneOrFail(Spacecraft, {
          where: { id: ship.id },
          lock: { mode: 'pessimistic_write' },
        });
        await manager.update(CrewAssignment, crew.id, {
          spacecraftId: receiver.id,
        });
      });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(CrewAssignment)
        .findOneByOrFail({ crewId: crew.id }),
    ).toMatchObject({ spacecraftId: receiver.id });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
  });

  it('rejects a fleet step when a new member joins after the original participant selection', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ name: 'Joining fleet', userId: ship.userId, leaderId: ship.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const joiner = await dataSource.getRepository(Spacecraft).save({
      name: 'Joiner',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: locations[0].id,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await fixture.service.joinFleet(ship.userId, fleet.id, joiner.id);
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ locationId: locations[0].id, fleetId: fleet.id });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
  });

  it('preserves the first committed field when a later field becomes stale', async () => {
    await dataSource.getRepository(SpacecraftModule).save([
      {
        spacecraftId: ship.id,
        category: 'HYPERDRIVE',
        moduleType: 'Hyperdrive',
        isActive: true,
      },
      {
        spacecraftId: ship.id,
        category: 'SENSORS',
        moduleType: 'Sensors',
        isActive: true,
      },
    ]);
    const fieldId = locations[2].galaxyFieldId;
    if (fieldId == null)
      throw new Error('Galaxy fixture location missing field');
    await dataSource
      .getRepository(GalaxyField)
      .update(fieldId, { effects: [FieldEffect.EPS_LEAK] });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[2].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 3, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id }),
      ).toMatchObject({ locationId: locations[1].id, energy: 70 });
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[1].id, energy: 44 });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('refuses a terminally destroyed leader without stale rejection or step effects', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[1].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { status: SpacecraftStatus.DESTROYED, hull: 0 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({ message: 'Ship is destroyed' }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: locations[0].id,
      energy: 71,
      status: SpacecraftStatus.DESTROYED,
      hull: 0,
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('keeps terminal destruction distinct during fleet preparation and does not detach a member', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const fleet = await dataSource.getRepository(Fleet).save({
      name: 'Destroyed leader',
      userId: ship.userId,
      leaderId: ship.id,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { fleetId: fleet.id });
    const member = await dataSource.getRepository(Spacecraft).save({
      name: 'Blocked member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      fleetId: fleet.id,
      locationId: locations[0].id,
      status: SpacecraftStatus.DESTROYED,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== ship.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { status: SpacecraftStatus.DESTROYED, hull: 0 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    expect(await pending).toEqual({
      error: expect.objectContaining({ message: 'Ship is destroyed' }),
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: member.id }),
    ).toMatchObject({ fleetId: fleet.id });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('allows a valid second field after the previous committed field consequence changed EPS', async () => {
    await dataSource.getRepository(SpacecraftModule).save([
      {
        spacecraftId: ship.id,
        category: 'HYPERDRIVE',
        moduleType: 'Hyperdrive',
        isActive: true,
      },
      {
        spacecraftId: ship.id,
        category: 'SENSORS',
        moduleType: 'Sensors',
        isActive: true,
      },
    ]);
    const fieldId = locations[1].galaxyFieldId;
    if (fieldId == null)
      throw new Error('Galaxy fixture location missing field');
    await dataSource
      .getRepository(GalaxyField)
      .update(fieldId, { effects: [FieldEffect.EPS_LEAK] });
    await expect(
      fixture.service.flyGalaxy(ship.id, ship.userId, 3, 1),
    ).resolves.toMatchObject({
      ship: { locationId: locations[2].id, energy: 64 },
      movement: { stopReason: 'ARRIVED', completedSteps: 2 },
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(4);
    expect(fixture.messaging.sendSystem).toHaveBeenCalledTimes(1);
  });

  it('rejects a runtime-only conflict without relocating or restoring the old drive', async () => {
    const repo = dataSource.getRepository(Spacecraft);
    const original = await repo.findOneByOrFail({ id: ship.id });
    const stale = Object.assign(new Spacecraft(), original, {
      locationId: locations[1].id,
      energy: 70,
    });
    const runtimeSystems = {
      ...SENSORS_ON,
      SUBLIGHT_DRIVE: { active: false, integrity: 100, cooldown: 3 },
    };
    await repo.update(ship.id, { runtimeSystems });
    await expect(
      persistence.saveUnlessDestroyed(stale, captureMovementState(original)),
    ).rejects.toThrow('veraltet');
    expect(await repo.findOneByOrFail({ id: ship.id })).toMatchObject({
      locationId: locations[0].id,
      energy: 71,
      runtimeSystems,
    });
  });

  it('retains missing and terminal destruction refusal separately from stale rejection', async () => {
    const repo = dataSource.getRepository(Spacecraft);
    const original = await repo.findOneByOrFail({ id: ship.id });
    const stale = Object.assign(new Spacecraft(), original, {
      locationId: locations[1].id,
      energy: 70,
    });
    await repo.update(ship.id, { status: SpacecraftStatus.DESTROYED, hull: 0 });
    await expect(
      persistence.saveUnlessDestroyed(stale, captureMovementState(original)),
    ).resolves.toBe(false);
    expect(await repo.findOneByOrFail({ id: ship.id })).toMatchObject({
      status: SpacecraftStatus.DESTROYED,
      hull: 0,
      locationId: locations[0].id,
      energy: 71,
    });
    await repo.delete(ship.id);
    await expect(
      persistence.saveUnlessDestroyed(stale, captureMovementState(original)),
    ).resolves.toBe(false);
  });

  it('combat survivor persistence intentionally saves combat changes without movement preconditions', async () => {
    const repo = dataSource.getRepository(Spacecraft);
    await repo.update(ship.id, { status: SpacecraftStatus.IN_COMBAT });
    const survivor = await repo.findOneByOrFail({ id: ship.id });
    survivor.hull = 20;
    survivor.shields = 0;
    survivor.energy = 40;
    await expect(persistence.saveCombatSurvivor(survivor)).resolves.toBe(true);
    expect(await repo.findOneByOrFail({ id: ship.id })).toMatchObject({
      status: SpacecraftStatus.IDLE,
      hull: 20,
      shields: 0,
      energy: 40,
    });
    await repo.update(ship.id, { status: SpacecraftStatus.DESTROYED });
    await expect(persistence.saveCombatSurvivor(survivor)).resolves.toBe(false);
  });

  it('navigates two fields when the towed ship is also a selected fleet member', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Overlapping tractor fleet',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 3,
      maxY: 1,
      systemTypeId: 1,
    });
    const fields = await dataSource.getRepository(SystemField).save(
      [1, 2, 3].map((sx) => ({
        starSystemId: system.id,
        sx,
        sy: 1,
        fieldTypeId: 1,
      })),
    );
    const systemLocations = await Promise.all(
      fields.map((field) =>
        dataSource
          .getRepository(SpaceLocation)
          .findOneByOrFail({ systemFieldId: field.id }),
      ),
    );
    const fleet = await dataSource.getRepository(Fleet).save({
      name: 'Towed member fleet',
      userId: ship.userId,
      leaderId: ship.id,
    });
    const member = await dataSource.getRepository(Spacecraft).save({
      name: 'Towed fleet member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      fleetId: fleet.id,
      locationId: systemLocations[0].id,
      energy: 53,
      status: SpacecraftStatus.IDLE,
      runtimeSystems: { ...SENSORS_ON },
    });
    await dataSource.getRepository(SpacecraftModule).save([
      {
        spacecraftId: ship.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Sublight',
        isActive: true,
      },
      {
        spacecraftId: ship.id,
        category: 'SENSORS',
        moduleType: 'Sensors',
        isActive: true,
      },
      {
        spacecraftId: ship.id,
        category: 'TRACTOR_BEAM',
        moduleType: 'Tractor',
        isActive: true,
      },
      {
        spacecraftId: member.id,
        category: 'SUBLIGHT_DRIVE',
        moduleType: 'Sublight',
        isActive: false,
      },
    ]);
    // An already active tractor may target an owned local IDLE fleet member.
    await dataSource.getRepository(Spacecraft).update(ship.id, {
      fleetId: fleet.id,
      locationId: systemLocations[0].id,
      tractoredShipId: member.id,
      runtimeSystems: {
        ...SENSORS_ON,
        TRACTOR_BEAM: { active: true, integrity: 100, cooldown: 0 },
      },
    });

    await expect(
      fixture.service.navigate(ship.id, ship.userId, 3, 1),
    ).resolves.toMatchObject({
      ship: {
        locationId: systemLocations[2].id,
        energy: 67,
        status: SpacecraftStatus.IDLE,
        fleetId: fleet.id,
        tractoredShipId: member.id,
      },
      movement: { stopReason: 'ARRIVED', movedShipIds: [ship.id, member.id] },
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: member.id }),
    ).toMatchObject({
      locationId: systemLocations[2].id,
      energy: 51,
      status: SpacecraftStatus.IDLE,
      fleetId: fleet.id,
      runtimeSystems: {
        ...SENSORS_ON,
        SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({
      locationId: systemLocations[2].id,
      energy: 67,
      tractoredShipId: member.id,
      runtimeSystems: {
        ...SENSORS_ON,
        TRACTOR_BEAM: { active: true },
        SUBLIGHT_DRIVE: { active: true },
      },
    });
    const signatures = await dataSource
      .getRepository(FlightSignature)
      .find({ order: { id: 'ASC' } });
    expect(
      signatures.map(
        ({ spacecraftId, locationId, fromDirection, toDirection }) => ({
          spacecraftId,
          locationId,
          fromDirection,
          toDirection,
        }),
      ),
    ).toEqual([
      {
        spacecraftId: ship.id,
        locationId: systemLocations[0].id,
        fromDirection: null,
        toDirection: 'EAST',
      },
      {
        spacecraftId: ship.id,
        locationId: systemLocations[1].id,
        fromDirection: 'WEST',
        toDirection: null,
      },
      {
        spacecraftId: member.id,
        locationId: systemLocations[0].id,
        fromDirection: null,
        toDirection: 'EAST',
      },
      {
        spacecraftId: member.id,
        locationId: systemLocations[1].id,
        fromDirection: 'WEST',
        toDirection: null,
      },
      {
        spacecraftId: ship.id,
        locationId: systemLocations[1].id,
        fromDirection: null,
        toDirection: 'EAST',
      },
      {
        spacecraftId: ship.id,
        locationId: systemLocations[2].id,
        fromDirection: 'WEST',
        toDirection: null,
      },
      {
        spacecraftId: member.id,
        locationId: systemLocations[1].id,
        fromDirection: null,
        toDirection: 'EAST',
      },
      {
        spacecraftId: member.id,
        locationId: systemLocations[2].id,
        fromDirection: 'WEST',
        toDirection: null,
      },
    ]);
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('navigation refuses a stale directly saved tractor target before signatures and field effects', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Tractor system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 2,
      maxY: 1,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    await dataSource.getRepository(SystemField).save({
      starSystemId: system.id,
      sx: 2,
      sy: 1,
      fieldTypeId: 1,
      effects: [FieldEffect.EPS_LEAK],
    });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    const target = await dataSource.getRepository(Spacecraft).save({
      name: 'Tractor target',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: location.id,
      energy: 53,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: location.id, tractoredShipId: target.id });
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SUBLIGHT_DRIVE',
      moduleType: 'Sublight',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== target.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.navigate(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(target.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: target.id }),
    ).toMatchObject({ locationId: location.id, energy: 44 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: location.id, energy: 71 });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('preserves nonstale movement costs and allows successive fields', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SENSORS',
      moduleType: 'Sensors',
      isActive: true,
    });
    const { ship: moved, movement } = await fixture.service.flyGalaxy(
      ship.id,
      ship.userId,
      3,
      1,
    );
    expect(movement).toEqual({
      plannedSteps: 2,
      completedSteps: 2,
      stopReason: 'ARRIVED',
      movedShipIds: [ship.id],
      destroyedShipIds: [],
      combatReports: [],
    });
    expect(moved).toMatchObject({
      locationId: locations[2].id,
      energy: 69,
      status: SpacecraftStatus.IDLE,
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(4);
    expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(1);
    expect(
      await dataSource.getRepository(ExplorationState).count(),
    ).toBeGreaterThan(0);
  });

  it('system exit refuses a stale direct member without signatures or leader movement', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Exit system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 1,
      maxY: 1,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: location.id });
    const member = await dataSource.getRepository(Spacecraft).save({
      name: 'Member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: location.id,
      energy: 53,
    });
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ name: 'Exit fleet', userId: ship.userId, leaderId: ship.id });
    await dataSource
      .getRepository(Spacecraft)
      .update([ship.id, member.id], { fleetId: fleet.id });
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.id !== locations[0].id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.leaveSystem(ship.id, ship.userId).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(member.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: member.id }),
    ).toMatchObject({ locationId: location.id, energy: 44 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: location.id, energy: 71 });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
  });

  it('system entry refuses a stale direct fleet member without moving the leader or emitting signatures', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Entry system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 1,
      maxY: 1,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const galaxyFieldId = locations[0].galaxyFieldId;
    if (galaxyFieldId == null)
      throw new Error('Galaxy fixture location missing field');
    await dataSource
      .getRepository(GalaxyField)
      .update(galaxyFieldId, { starSystemId: system.id });
    const member = await dataSource.getRepository(Spacecraft).save({
      name: 'Member',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: locations[0].id,
      energy: 53,
    });
    const fleet = await dataSource
      .getRepository(Fleet)
      .save({ name: 'Movement fleet', userId: ship.userId, leaderId: ship.id });
    await dataSource
      .getRepository(Spacecraft)
      .update([ship.id, member.id], { fleetId: fleet.id });
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SUBLIGHT_DRIVE',
      moduleType: 'Sublight',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<SpaceLocation> = {
      listenTo: () => SpaceLocation,
      afterLoad: async (loaded) => {
        if (loaded.systemFieldId !== field.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.enterSystem(ship.id, ship.userId).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(member.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: member.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 44 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[0].id, energy: 71 });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
  });

  it('system navigation rejects a resource-only conflict before signatures or field effects', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Movement system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 5,
      maxY: 5,
      systemTypeId: 1,
    });
    const field = await dataSource.getRepository(SystemField).save({
      starSystemId: system.id,
      sx: 1,
      sy: 1,
      fieldTypeId: 1,
    });
    await dataSource.getRepository(SystemField).save({
      starSystemId: system.id,
      sx: 2,
      sy: 1,
      fieldTypeId: 1,
      effects: [FieldEffect.EPS_LEAK],
    });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: location.id });
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'SUBLIGHT_DRIVE',
      moduleType: 'Sublight',
      isActive: true,
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== ship.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.navigate(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: location.id, energy: 44 });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
  });

  it('galaxy flight rejects a relocated origin without signatures, discovery or field effects', async () => {
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: ship.id,
      category: 'HYPERDRIVE',
      moduleType: 'Hyperdrive',
      isActive: true,
    });
    const galaxyFieldId = locations[1].galaxyFieldId;
    if (galaxyFieldId == null)
      throw new Error('Galaxy fixture location missing field');
    await dataSource.getRepository(GalaxyField).update(galaxyFieldId, {
      effects: [FieldEffect.EPS_LEAK],
    });
    const acquired = barrier();
    const release = barrier();
    const subscriber: EntitySubscriberInterface<Spacecraft> = {
      listenTo: () => Spacecraft,
      afterLoad: async (loaded) => {
        if (loaded.id !== ship.id) return;
        acquired.release();
        await release.promise;
      },
    };
    dataSource.subscribers.push(subscriber);
    const pending = fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await waitForControlledLoad(acquired.promise, pending);
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { locationId: locations[2].id, energy: 44 });
    } finally {
      dataSource.subscribers.splice(
        dataSource.subscribers.indexOf(subscriber),
        1,
      );
      release.release();
    }
    const result = await pending;
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: ship.id }),
    ).toMatchObject({ locationId: locations[2].id, energy: 44 });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
    expect(await dataSource.getRepository(FlightSignature).count()).toBe(0);
    expect(await dataSource.getRepository(ExplorationState).count()).toBe(0);
    expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(0);
    expect(fixture.messaging.sendSystem).not.toHaveBeenCalled();
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('rejects an old movement snapshot after waiting for a committed relocation', async () => {
    const repo = dataSource.getRepository(Spacecraft);
    const original = await repo.findOneByOrFail({ id: ship.id });
    const stale = Object.assign(new Spacecraft(), structuredClone(original));
    stale.locationId = locations[2].id;
    stale.energy = 70;
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const relocation = dataSource.transaction(async (manager) => {
      const rows: Array<{ pid: number }> = await manager.query(
        'SELECT pg_backend_pid() AS pid',
      );
      blockerPid = rows[0].pid;
      await manager.findOneOrFail(Spacecraft, {
        where: { id: ship.id },
        lock: { mode: 'pessimistic_write' },
      });
      await manager.update(Spacecraft, ship.id, {
        locationId: locations[1].id,
        runtimeSystems: {
          ...SENSORS_ON,
          SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
        },
      });
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    const pending = persistence
      .saveUnlessDestroyed(stale, captureMovementState(original))
      .then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
    try {
      await waitForBlockedTransaction(dataSource, blockerPid);
    } finally {
      release.release();
      await relocation;
    }
    const result = await pending;
    expect(await repo.findOneByOrFail({ id: ship.id })).toMatchObject({
      locationId: locations[1].id,
      energy: 71,
      runtimeSystems: {
        ...SENSORS_ON,
        SUBLIGHT_DRIVE: { active: true, integrity: 100, cooldown: 0 },
      },
    });
    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('veraltet'),
      }),
    });
  });

  it('tows the held ship out of a system and counts it in the long range sensor view (sc-WP-TRACT-1d)', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Tow system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 1,
      maxY: 1,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    const towed = await dataSource.getRepository(Spacecraft).save({
      name: 'Towed',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: location.id,
      energy: 20,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { locationId: location.id, tractoredShipId: towed.id });
    await dataSource.getRepository(SpacecraftModule).save([
      { spacecraftId: ship.id, category: 'HYPERDRIVE', moduleType: 'Hyperdrive', isActive: true },
      { spacecraftId: ship.id, category: 'SENSORS', moduleType: 'Sensorphalanx', isActive: true },
    ]);

    await fixture.service.leaveSystem(ship.id, ship.userId);

    const saved = await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: towed.id });
    expect(saved.locationId).toBe(locations[0].id);
    // The fixture stubs AnomalyQueryService empty; the sensor view only needs "no anomalies".
    Object.assign((fixture.service as unknown as { anomalyQuery: object }).anomalyQuery, {
      findAtGalaxyFields: async () => new Map(),
    });
    const map = (await fixture.service.getLocalMap(ship.id, ship.userId)) as {
      overlays: { signatures: Array<{ x: number; y: number; count?: number; state: string }> };
    };
    expect(map.overlays.signatures).toContainEqual({ x: 1, y: 1, count: 2, state: 'COUNT' });
  });

  it('tows the held ship into a system and counts it in the long range sensor view (sc-WP-TRACT-1d)', async () => {
    const layer = await dataSource
      .getRepository(Layer)
      .findOneByOrFail({ name: 'Movement test layer' });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Tow entry system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      maxX: 1,
      maxY: 1,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1, isPassable: true });
    const entry = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    await dataSource
      .getRepository(GalaxyField)
      .update(locations[0].galaxyFieldId!, { starSystemId: system.id });
    const towed = await dataSource.getRepository(Spacecraft).save({
      name: 'Towed',
      userId: ship.userId,
      shipClassId: ship.shipClassId,
      locationId: locations[0].id,
      energy: 20,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(ship.id, { tractoredShipId: towed.id });
    await dataSource.getRepository(SpacecraftModule).save([
      { spacecraftId: ship.id, category: 'SUBLIGHT_DRIVE', moduleType: 'Ion-Triebwerk', isActive: true },
      { spacecraftId: ship.id, category: 'SENSORS', moduleType: 'Sensorphalanx', isActive: true },
    ]);

    await fixture.service.enterSystem(ship.id, ship.userId);

    const saved = await dataSource.getRepository(Spacecraft).findOneByOrFail({ id: towed.id });
    expect(saved.locationId).toBe(entry.id);
    Object.assign((fixture.service as unknown as { anomalyQuery: object }).anomalyQuery, {
      findAtSystemFields: async () => new Map(),
    });
    const map = (await fixture.service.getLocalMap(ship.id, ship.userId)) as {
      overlays: { signatures: Array<{ x: number; y: number; count?: number; state: string }> };
    };
    expect(map.overlays.signatures).toContainEqual({ x: 1, y: 1, count: 2, state: 'COUNT' });
  });

  describe('movement result and reaction port', () => {
    const warpModules = (spacecraftId: number) => [
      {
        spacecraftId,
        category: 'HYPERDRIVE',
        moduleType: 'Hyperdrive',
        isActive: true,
      },
      {
        spacecraftId,
        category: 'SENSORS',
        moduleType: 'Sensors',
        isActive: true,
      },
    ];
    const stopAt = (x: number, text = 'Alarm Rot'): MovementReaction => ({
      afterTransition: ({ coordinate }) =>
        coordinate.x === x
          ? { stop: true, reports: [battleReport(text)] }
          : undefined,
    });

    it('stops a galaxy flight on the intermediate field and keeps its cost, signature and exploration', async () => {
      await dataSource
        .getRepository(SpacecraftModule)
        .save(warpModules(ship.id));
      const reached: Array<{
        scope: string;
        x: number;
        participants: number[];
      }> = [];
      fixture.reactions.push(
        {
          afterTransition: ({ scope, coordinate, participants }) => {
            reached.push({
              scope,
              x: coordinate.x,
              participants: participants.map((member) => member.id),
            });
          },
        },
        stopAt(2),
      );

      const { ship: stopped, movement } = await fixture.service.flyGalaxy(
        ship.id,
        ship.userId,
        3,
        1,
      );

      expect(movement).toEqual({
        plannedSteps: 2,
        completedSteps: 1,
        stopReason: 'ALERT_COMBAT',
        movedShipIds: [ship.id],
        destroyedShipIds: [],
        combatReports: [battleReport('Alarm Rot')],
      });
      expect(reached).toEqual([
        { scope: 'GALAXY', x: 2, participants: [ship.id] },
      ]);
      expect(stopped).toMatchObject({
        locationId: locations[1].id,
        energy: 70,
      });
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id }),
      ).toMatchObject({
        locationId: locations[1].id,
        energy: 70,
        status: SpacecraftStatus.IDLE,
      });
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
      expect(await dataSource.getRepository(LayerKnowledge).count()).toBe(1);
      expect(
        await dataSource.getRepository(ExplorationState).count(),
      ).toBeGreaterThan(0);
    });

    it('leaves destroyed fleet members behind while the survivors fly on (STU)', async () => {
      const fleet = await dataSource
        .getRepository(Fleet)
        .save({
          name: 'Ambushed fleet',
          userId: ship.userId,
          leaderId: ship.id,
        });
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { fleetId: fleet.id });
      const lost = await dataSource.getRepository(Spacecraft).save({
        name: 'Lost member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        fleetId: fleet.id,
        locationId: locations[0].id,
        energy: 50,
        status: SpacecraftStatus.IDLE,
        runtimeSystems: { ...SENSORS_ON },
      });
      const survivor = await dataSource.getRepository(Spacecraft).save({
        name: 'Surviving member',
        userId: ship.userId,
        shipClassId: ship.shipClassId,
        fleetId: fleet.id,
        locationId: locations[0].id,
        energy: 50,
        status: SpacecraftStatus.IDLE,
        runtimeSystems: { ...SENSORS_ON },
      });
      await dataSource
        .getRepository(SpacecraftModule)
        .save([
          ...warpModules(ship.id),
          ...warpModules(lost.id),
          ...warpModules(survivor.id),
        ]);
      fixture.reactions.push({
        afterTransition: async ({ participants }) => {
          const target = participants.find((member) => member.id === lost.id);
          if (!target) return;
          // Like combat destruction: the ship leaves its fleet and is gone.
          await dataSource
            .getRepository(Spacecraft)
            .update(lost.id, {
              status: SpacecraftStatus.DESTROYED,
              fleetId: null,
            });
          await dataSource
            .getRepository(Spacecraft)
            .update(survivor.id, { hull: 3 });
          return {
            reports: [battleReport('Lost member zerstört')],
            changedParticipants: true,
          };
        },
      });

      const { movement } = await fixture.service.flyGalaxy(
        ship.id,
        ship.userId,
        3,
        1,
      );

      expect(movement).toMatchObject({
        completedSteps: 2,
        stopReason: 'ARRIVED',
        movedShipIds: [ship.id, survivor.id],
        destroyedShipIds: [lost.id],
        combatReports: [battleReport('Lost member zerstört')],
      });
      const rows = await dataSource
        .getRepository(Spacecraft)
        .find({ order: { id: 'ASC' } });
      expect(rows.map((row) => [row.id, row.locationId, row.status])).toEqual([
        [ship.id, locations[2].id, SpacecraftStatus.IDLE],
        [lost.id, locations[1].id, SpacecraftStatus.DESTROYED],
        [survivor.id, locations[2].id, SpacecraftStatus.IDLE],
      ]);
      // Combat damage persists and is not overwritten by the next field.
      expect(rows[2].hull).toBe(3);
    });

    it('stops a system flight on the intermediate field with the same result contract', async () => {
      const layer = await dataSource
        .getRepository(Layer)
        .findOneByOrFail({ name: 'Movement test layer' });
      const system = await dataSource.getRepository(StarSystem).save({
        name: 'Ambush system',
        layerId: layer.id,
        cx: 1,
        cy: 1,
        maxX: 3,
        maxY: 1,
        systemTypeId: 1,
      });
      const fields = await dataSource
        .getRepository(SystemField)
        .save(
          [1, 2, 3].map((sx) => ({
            starSystemId: system.id,
            sx,
            sy: 1,
            fieldTypeId: 1,
          })),
        );
      const systemLocations = await Promise.all(
        fields.map((field) =>
          dataSource
            .getRepository(SpaceLocation)
            .findOneByOrFail({ systemFieldId: field.id }),
        ),
      );
      await dataSource
        .getRepository(Spacecraft)
        .update(ship.id, { locationId: systemLocations[0].id });
      await dataSource.getRepository(SpacecraftModule).save([
        {
          spacecraftId: ship.id,
          category: 'SUBLIGHT_DRIVE',
          moduleType: 'Sublight',
          isActive: true,
        },
        {
          spacecraftId: ship.id,
          category: 'SENSORS',
          moduleType: 'Sensors',
          isActive: true,
        },
      ]);
      const scopes: string[] = [];
      fixture.reactions.push(
        {
          afterTransition: ({ scope, fieldId }) => {
            scopes.push(`${scope}:${fieldId}`);
          },
        },
        stopAt(2, 'Abgefangen'),
      );

      const { movement } = await fixture.service.navigate(
        ship.id,
        ship.userId,
        3,
        1,
      );

      expect(movement).toEqual({
        plannedSteps: 2,
        completedSteps: 1,
        stopReason: 'ALERT_COMBAT',
        movedShipIds: [ship.id],
        destroyedShipIds: [],
        combatReports: [battleReport('Abgefangen')],
      });
      expect(scopes).toEqual([`SYSTEM:${fields[1].id}`]);
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: ship.id }),
      ).toMatchObject({ locationId: systemLocations[1].id, energy: 70 });
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(2);
    });

    describe('deflector and field damage (tmw-K1b2)', () => {
      const useNebula = async (
        fieldIds: number[],
        type: Partial<GalaxyFieldType> = {},
      ) => {
        // Field types survive the reset; each test gets its own row.
        const nebula = await dataSource.getRepository(GalaxyFieldType).save({
          key: `deflector_test_nebula_${Date.now()}_${Math.random()}`,
          name: 'Testnebel',
          energyCost: 3,
          damage: 10,
          specialDamage: 0,
          ...type,
        });
        await dataSource
          .getRepository(GalaxyField)
          .update(fieldIds, { fieldTypeId: nebula.id });
        fixture.consequences.unshift(
          new DeflectorConsequence(
            dataSource,
            fixture.messaging as unknown as MessagingService,
            fixture.gateway as unknown as GameGateway,
            {
              destroyInManager: jest.fn(),
            } as unknown as SpacecraftDestructionService,
            {
              enhanceSpacecraft: jest.fn(),
            } as unknown as CrewEnhancementService,
            () => 0,
          ),
        );
      };
      const fieldIds = () =>
        locations.slice(1).map((location) => location.galaxyFieldId as number);

      it('charges the deflector exactly once per field for every fleet ship and keeps the last field', async () => {
        const fleet = await dataSource
          .getRepository(Fleet)
          .save({
            name: 'Nebula fleet',
            userId: ship.userId,
            leaderId: ship.id,
          });
        await dataSource
          .getRepository(Spacecraft)
          .update(ship.id, { fleetId: fleet.id });
        const member = await dataSource.getRepository(Spacecraft).save({
          name: 'Nebula member',
          userId: ship.userId,
          shipClassId: ship.shipClassId,
          fleetId: fleet.id,
          locationId: locations[0].id,
          energy: 50,
          status: SpacecraftStatus.IDLE,
          runtimeSystems: { ...SENSORS_ON },
        });
        await dataSource
          .getRepository(SpacecraftModule)
          .save([...warpModules(ship.id), ...warpModules(member.id)]);
        await useNebula(fieldIds());

        const { movement } = await fixture.service.flyGalaxy(
          ship.id,
          ship.userId,
          3,
          1,
        );

        expect(movement).toMatchObject({
          completedSteps: 2,
          stopReason: 'ARRIVED',
        });
        const rows = await dataSource
          .getRepository(Spacecraft)
          .find({ order: { id: 'ASC' } });
        // Two fields: 1 flight EPS plus 3 deflector EPS each.
        expect(rows.map((row) => [row.id, row.locationId, row.energy])).toEqual(
          [
            [ship.id, locations[2].id, 63],
            [member.id, locations[2].id, 42],
          ],
        );
        expect(rows[0].runtimeSystems).toHaveProperty('DEFLECTOR');
      });

      it('persists field damage of a ship without deflector energy', async () => {
        await dataSource
          .getRepository(Spacecraft)
          .update(ship.id, { energy: 5, hull: 200, hullMax: 200 });
        await dataSource
          .getRepository(SpacecraftModule)
          .save(warpModules(ship.id));
        await useNebula(fieldIds());

        const { movement } = await fixture.service.flyGalaxy(
          ship.id,
          ship.userId,
          3,
          1,
        );

        expect(movement).toMatchObject({
          completedSteps: 2,
          stopReason: 'ARRIVED',
        });
        // Field 1: 1 flight EPS, 3 deflector EPS (1 left). Field 2: flight EPS
        // empties the store, the deflector fails: 10 % of 200 hull.
        expect(
          await dataSource
            .getRepository(Spacecraft)
            .findOneByOrFail({ id: ship.id }),
        ).toMatchObject({
          locationId: locations[2].id,
          energy: 0,
          hull: 180,
        });
        expect(fixture.messaging.sendSystem).toHaveBeenCalledWith(
          ship.userId,
          expect.stringContaining('Nicht genug Energie für den Deflektor.'),
          undefined,
          expect.anything(),
        );
      });
    });
  });

  describe('region cartography in galaxy flight (tmw-K8b2)', () => {
    let regionId: number;
    let prestige: { change: jest.Mock };
    const internals = () =>
      fixture.service as unknown as {
        prestigeService: { change: jest.Mock };
        crewEnhancementService: { enhanceSpacecraft: jest.Mock };
        fieldEffectQuery: FieldEffectQuery;
        selectRegionCartographyFields(
          regionId: number,
          currentFieldId: number | null,
        ): Promise<number[]>;
        bookRegionCartography(
          manager: unknown,
          afterCommit: Array<() => void>,
          charted: { userId: number; mapRegionId: number },
        ): Promise<void>;
      };
    const plans = () =>
      new CartographyPlanService(dataSource.getRepository(CartographyPlan));
    const cartographer = async () => {
      await dataSource.getRepository(SpacecraftModule).save([
        {
          spacecraftId: ship.id,
          category: 'HYPERDRIVE',
          moduleType: 'Hyperdrive',
          isActive: true,
        },
        {
          spacecraftId: ship.id,
          category: 'SENSORS',
          moduleType: 'Sensors',
          isActive: true,
        },
        {
          spacecraftId: ship.id,
          category: 'SPECIAL',
          moduleType: 'Astrometrie-Labor',
          isActive: true,
        },
      ]);
      await dataSource.getRepository(Spacecraft).update(ship.id, {
        runtimeSystems: {
          ...SENSORS_ON,
          ASTROMETRY_LAB: { active: true, cooldown: 0, integrity: 100 },
        },
      });
    };

    beforeEach(async () => {
      const layerId = (
        await dataSource
          .getRepository(GalaxyField)
          .findOneByOrFail({ id: locations[0].galaxyFieldId as number })
      ).layerId;
      regionId = (
        await dataSource
          .getRepository(MapRegion)
          .save({ layerId, name: 'Corellia-Sektor' })
      ).id;
      await dataSource.getRepository(GalaxyField).update(
        locations.map((location) => location.galaxyFieldId as number),
        { regionId },
      );
      prestige = { change: jest.fn(async () => undefined) };
      internals().prestigeService = prestige;
      internals().crewEnhancementService = {
        enhanceSpacecraft: jest.fn(async () => undefined),
      };
      internals().fieldEffectQuery = new FieldEffectQuery();
    });

    it('picks a random 25 % of passable region fields without NO_MEASUREPOINT, excluding the current field (STU)', async () => {
      const layerId = (
        await dataSource
          .getRepository(GalaxyField)
          .findOneByOrFail({ id: locations[0].galaxyFieldId as number })
      ).layerId;
      const extra = async (cx: number, values: Partial<GalaxyField> = {}) =>
        (
          await dataSource
            .getRepository(GalaxyField)
            .save({ layerId, cx, cy: 3, fieldTypeId: 1, regionId, ...values })
        ).id;
      const eligible = [
        locations[1].galaxyFieldId as number,
        locations[2].galaxyFieldId as number,
      ];
      for (const cx of [1, 2, 3, 4, 5, 6]) eligible.push(await extra(cx));
      await extra(7, { isPassable: false });
      await extra(8, { effects: [FieldEffect.NO_MEASUREPOINT] });
      await extra(9, { regionId: null });

      const selected = await internals().selectRegionCartographyFields(
        regionId,
        locations[0].galaxyFieldId,
      );

      // 8 eligible fields → ceil(25 %) = 2.
      expect(selected).toHaveLength(2);
      expect(new Set(selected).size).toBe(2);
      for (const id of selected) expect(eligible).toContain(id);
    });

    it('claims region measure points on arrival and ends a region finalization on movement', async () => {
      await cartographer();
      await plans().createPlan(ship.userId, regionTarget(regionId), [
        locations[2].galaxyFieldId as number,
      ]);

      await fixture.service.flyGalaxy(ship.id, ship.userId, 3, 1);

      await expect(
        plans().getPlan(ship.userId, regionTarget(regionId)),
      ).resolves.toMatchObject({
        status: CartographyPlanStatus.MEASURED,
        remainingFieldIds: [],
      });
      expect(prestige.change).toHaveBeenCalledWith(
        ship.userId,
        1,
        'Kartographie-Messpunkt erreicht',
      );
      expect(fixture.messaging.sendSystem).toHaveBeenCalledWith(
        ship.userId,
        'Ein Messpunkt der Regionskartographie wurde erreicht.',
        expect.stringContaining('cartography-region-measurement'),
      );

      await plans().startFinalization(
        ship.userId,
        regionTarget(regionId),
        ship.id,
      );
      await fixture.service.flyGalaxy(ship.id, ship.userId, 2, 1);

      await expect(
        plans().getPlan(ship.userId, regionTarget(regionId)),
      ).resolves.toMatchObject({
        status: CartographyPlanStatus.MEASURED,
        finalizingSpacecraftId: null,
      });
    });

    it('rejects planning on a galaxy field without region', async () => {
      await dataSource
        .getRepository(GalaxyField)
        .update(locations[0].galaxyFieldId as number, { regionId: null });

      await expect(
        fixture.service.createCartographyPlan(ship.id, ship.userId),
      ).rejects.toThrow(
        'Kartographieplanung erfordert ein Sternensystem oder eine Region',
      );
    });

    it('books 5 prestige and the region message inside the completing transaction', async () => {
      const afterCommit: Array<() => void> = [];

      await dataSource.transaction((manager) =>
        internals().bookRegionCartography(manager, afterCommit, {
          userId: ship.userId,
          mapRegionId: regionId,
        }),
      );

      expect(prestige.change).toHaveBeenCalledWith(
        ship.userId,
        5,
        'Kartographie der Region Corellia-Sektor abgeschlossen',
        expect.anything(),
      );
      expect(fixture.messaging.sendSystem).toHaveBeenCalledWith(
        ship.userId,
        'Die Kartographie der Region Corellia-Sektor wurde erfolgreich abgeschlossen.',
        `cartography-region-completed:${ship.userId}:${regionId}`,
        undefined,
        undefined,
        false,
        expect.objectContaining({ afterCommit }),
      );
    });
  });

  describe('fleet field and ion storm consequences (tmw-K1a2)', () => {
    const modes = ['GALAXY', 'SYSTEM', 'ENTER', 'LEAVE'] as const;
    type Mode = (typeof modes)[number];
    const now = Date.UTC(2030, 0, 1);
    afterEach(() => jest.restoreAllMocks());

    async function flight(mode: Mode) {
      const layer = await dataSource
        .getRepository(Layer)
        .findOneByOrFail({ name: 'Movement test layer' });
      let systemLocations: SpaceLocation[] = [];
      if (mode !== 'GALAXY') {
        const system = await dataSource.getRepository(StarSystem).save({
          name: 'Fleet storm system',
          layerId: layer.id,
          cx: 1,
          cy: 1,
          maxX: 3,
          maxY: 1,
          systemTypeId: 1,
        });
        const fields = await dataSource.getRepository(SystemField).save(
          [1, 2, 3].map((sx) => ({
            starSystemId: system.id,
            sx,
            sy: 1,
            fieldTypeId: 1,
          })),
        );
        systemLocations = await Promise.all(
          fields.map((field) =>
            dataSource
              .getRepository(SpaceLocation)
              .findOneByOrFail({ systemFieldId: field.id }),
          ),
        );
        await dataSource
          .getRepository(GalaxyField)
          .update(locations[0].galaxyFieldId!, { starSystemId: system.id });
      }
      const origin =
        mode === 'SYSTEM' || mode === 'LEAVE'
          ? systemLocations[0]
          : locations[0];
      const destinations =
        mode === 'GALAXY'
          ? locations.slice(1)
          : mode === 'SYSTEM'
            ? systemLocations.slice(1)
            : mode === 'ENTER'
              ? [systemLocations[0]]
              : [locations[0]];
      const members: Spacecraft[] = [ship];
      for (const name of ['Second ship', 'Third ship']) {
        members.push(
          await dataSource.getRepository(Spacecraft).save({
            name,
            userId: ship.userId,
            shipClassId: ship.shipClassId,
            locationId: origin.id,
            energy: 71,
          }),
        );
      }
      const fleet = await dataSource
        .getRepository(Fleet)
        .save({ name: 'Storm fleet', userId: ship.userId, leaderId: ship.id });
      await dataSource.getRepository(Spacecraft).update(
        members.map((member) => member.id),
        {
          fleetId: fleet.id,
          locationId: origin.id,
          status: SpacecraftStatus.IDLE,
          lastGalaxyFlightDirection: 'RIGHT',
          hull: 100,
          hullMax: 100,
          shields: 0,
          reactorFuel: 40,
          reactorFuelMax: 100,
          runtimeSystems: { ...SENSORS_ON },
        },
      );
      await dataSource.getRepository(SpacecraftModule).save(
        members.flatMap((member) => [
          {
            spacecraftId: member.id,
            category: 'HYPERDRIVE',
            moduleType: 'Hyperdrive',
            isActive: true,
          },
          {
            spacecraftId: member.id,
            category: 'SUBLIGHT_DRIVE',
            moduleType: 'Impulsantrieb',
            isActive: true,
          },
          {
            spacecraftId: member.id,
            category: 'SENSORS',
            moduleType: 'Sensors',
            isActive: true,
          },
        ]),
      );
      for (const destination of destinations) {
        if (destination.galaxyFieldId != null) {
          await dataSource
            .getRepository(GalaxyField)
            .update(destination.galaxyFieldId, {
              effects: [FieldEffect.REACTOR_LEAK],
            });
        } else {
          await dataSource
            .getRepository(SystemField)
            .update(destination.systemFieldId!, {
              effects: [FieldEffect.REACTOR_LEAK],
            });
        }
      }
      const run = () =>
        mode === 'GALAXY'
          ? fixture.service.flyGalaxy(ship.id, ship.userId, 3, 1)
          : mode === 'SYSTEM'
            ? fixture.service.navigate(ship.id, ship.userId, 3, 1)
            : mode === 'ENTER'
              ? fixture.service.enterSystem(ship.id, ship.userId)
              : fixture.service.leaveSystem(ship.id, ship.userId);
      return { members, destinations, fleet, layer, run };
    }

    async function addStorms(layerId: number, destinations: SpaceLocation[]) {
      const random: AnomalyRandom = {
        integer: (min, max) => (min === 0 && max === 20 ? 1 : min),
        normal: () => 20,
        skewed: () => 600,
      };
      const messaging = new MessagingService(
        dataSource.getRepository(Message),
        dataSource.getRepository(User),
        new StatisticsService(dataSource, []),
        fixture.gateway as unknown as GameGateway,
        {} as ConstructorParameters<typeof MessagingService>[4],
      );
      // Exercise the real row deletion, wreck creation and fleet hand-over.
      // No assigned crew in this fixture, so constructor defaults need no pods.
      const destruction = new SpacecraftDestructionService(
        dataSource,
        new SpacecraftRuntimeStateService(),
        fixture.gateway as unknown as GameGateway,
        messaging,
        {} as ConstructorParameters<typeof SpacecraftDestructionService>[4],
        {} as ConstructorParameters<typeof SpacecraftDestructionService>[5],
        new GameDataService(),
      );
      const handler = new IonStormHandler(random);
      handler.registerEffects(
        new SpacecraftIonStormEffects({
          random,
          messaging,
          destruction,
          crewEnhancement: { enhanceSpacecraft: async () => undefined },
          hasIonStormReduction: () => false,
          now: () => now,
        }),
      );
      const registry = new AnomalyRegistry();
      registry.register(handler);
      const type = await dataSource
        .getRepository(AnomalyType)
        .save({ key: 'ION_STORM' });
      const root = await dataSource.getRepository(Anomaly).save({
        typeId: type.id,
        remainingTicks: 100,
        locationId: null,
        data: {
          layerId,
          directionInDegrees: 90,
          velocity: 1,
          movementType: 'STATIC',
          isPositivePolarity: true,
          intensity: 100,
        },
      });
      await dataSource.getRepository(Anomaly).save(
        destinations.map((destination) => ({
          typeId: type.id,
          parentId: root.id,
          locationId: destination.id,
          remainingTicks: 10,
        })),
      );
      const consequence = new AnomalyFlightConsequence(dataSource, registry);
      fixture.consequences.push(consequence);
      const entries: Array<[number, number | null]> = [];
      const apply = consequence.onEnterField.bind(consequence);
      const incoming = jest
        .spyOn(consequence, 'onEnterField')
        .mockImplementation((member, ...args) => {
          entries.push([member.id, member.locationId]);
          return apply(member, ...args);
        });
      return {
        incoming,
        entries,
        destruction: jest.spyOn(destruction, 'destroyInManager'),
      };
    }

    it.each(modes)(
      'applies actual field and ion storm effects once per fleet ship/field through %s',
      async (mode) => {
        const { members, destinations, layer, run } = await flight(mode);
        const fieldCalls = jest.spyOn(fixture.effect, 'onEnterField');
        const { entries } = await addStorms(layer.id, destinations);
        await run();
        const rows = await dataSource
          .getRepository(Spacecraft)
          .find({ order: { id: 'ASC' } });
        expect(rows).toHaveLength(3);
        for (const row of rows) {
          expect(row).toMatchObject({
            locationId: destinations.at(-1)!.id,
            hull: 100 - 20 * destinations.length,
            reactorFuel: 40 - 5 * destinations.length,
            runtimeSystems: {
              ...SENSORS_ON,
              WARPDRIVE: { active: false, cooldown: now + 600_000 },
            },
          });
        }
        const expected = destinations.flatMap((destination) =>
          members.map((member) => [member.id, destination.id]),
        );
        expect(entries).toEqual(expected);
        // Calls keep live ship references: use the actual field argument for field order.
        const fieldIds = destinations.map(
          (destination) =>
            destination.galaxyFieldId ?? destination.systemFieldId,
        );
        expect(
          fieldCalls.mock.calls.map(([member, field]) => [member.id, field.id]),
        ).toEqual(
          fieldIds.flatMap((fieldId) =>
            members.map((member) => [member.id, fieldId]),
          ),
        );
        expect(
          await dataSource
            .getRepository(Message)
            .count({ where: { body: Like('%Ionensturm%') } }),
        ).toBe(expected.length);
      },
    );

    it.each([false, true])(
      'removes an ion-storm-destroyed ship and continues the surviving fleet (leader lost: %s)',
      async (leaderLost) => {
        const { members, destinations, fleet, layer, run } =
          await flight('GALAXY');
        const lost = members[leaderLost ? 0 : 1];
        await dataSource.getRepository(Spacecraft).update(lost.id, { hull: 5 });
        const { incoming, destruction } = await addStorms(
          layer.id,
          destinations,
        );
        const result = await run();
        const survivors = members.filter((member) => member.id !== lost.id);
        expect(result).toMatchObject({
          movement: {
            completedSteps: 2,
            stopReason: 'ARRIVED',
            destroyedShipIds: [lost.id],
            movedShipIds: survivors.map((member) => member.id),
          },
        });
        expect(
          await dataSource.getRepository(Spacecraft).findOneBy({ id: lost.id }),
        ).toBeNull();
        expect(destruction).toHaveBeenCalledTimes(1);
        expect(
          await dataSource.getRepository(SpacecraftWreck).find(),
        ).toMatchObject([
          {
            locationId: destinations[0].id,
            formerShipClassId: ship.shipClassId,
          },
        ]);
        expect(
          (
            await dataSource
              .getRepository(Fleet)
              .findOneByOrFail({ id: fleet.id })
          ).leaderId,
        ).toBe(survivors[0].id);
        for (const survivor of survivors) {
          expect(
            await dataSource
              .getRepository(Spacecraft)
              .findOneByOrFail({ id: survivor.id }),
          ).toMatchObject({
            locationId: destinations[1].id,
            hull: 60,
            reactorFuel: 30,
          });
        }
        expect(
          incoming.mock.calls.filter(([member]) => member.id === lost.id),
        ).toHaveLength(1);
        expect(
          await dataSource
            .getRepository(FlightSignature)
            .count({ where: { spacecraftId: lost.id } }),
        ).toBe(2);
        expect(
          await dataSource
            .getRepository(Message)
            .count({ where: { body: Like('%Ionensturm%') } }),
        ).toBe(5);
      },
    );

    it('stops on the first field when the ion storm destroys the complete fleet', async () => {
      const { members, destinations, fleet, layer, run } =
        await flight('GALAXY');
      await dataSource.getRepository(Spacecraft).update(
        members.map((member) => member.id),
        { hull: 5 },
      );
      const { entries, destruction } = await addStorms(layer.id, destinations);
      expect(await run()).toMatchObject({
        movement: {
          completedSteps: 1,
          stopReason: 'DESTROYED',
          movedShipIds: [],
          destroyedShipIds: members.map((member) => member.id),
        },
      });
      expect(await dataSource.getRepository(Spacecraft).count()).toBe(0);
      expect(
        await dataSource.getRepository(Fleet).findOneBy({ id: fleet.id }),
      ).toBeNull();
      expect(await dataSource.getRepository(SpacecraftWreck).count()).toBe(3);
      expect(entries).toEqual(
        members.map((member) => [member.id, destinations[0].id]),
      );
      expect(destruction).toHaveBeenCalledTimes(3);
      expect(await dataSource.getRepository(FlightSignature).count()).toBe(6);
    });
  });
});
