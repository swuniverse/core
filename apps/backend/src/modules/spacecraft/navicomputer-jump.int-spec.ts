import { DeflectorConsequence } from './deflector-consequence';
import { LayerKnowledgeStatus } from '@swuniverse/shared';
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { ExplorationService } from '../starmap/exploration.service';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { Fleet } from './entities/fleet.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { FlightSignatureService } from './flight-signature.service';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { NavicomputerJumpService } from './navicomputer-jump.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { CartographyPlanService } from './cartography-plan.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { GameDataService } from '../game-data/game-data.service';
import { ShipClassService } from './ship-class.service';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import {
  SpacecraftOperatingMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';

// Uses real migrations, row locks, position/module persistence, discovery and signature snapshots.
describe('Atomic Navicomputer jump (PostgreSQL)', () => {
  let db: DataSource;
  let service: NavicomputerJumpService;
  let signatures: FlightSignatureService;
  let leader: Spacecraft;
  let member: Spacecraft;
  let fleet: Fleet;
  let origin: SpaceLocation;
  let destination: SpaceLocation;
  let layer: Layer;
  let target: { layerId: number; x: number; y: number };
  const repairs = {
    cancelTasks: jest.fn().mockResolvedValue([]),
    notifyCancelled: jest.fn().mockResolvedValue(undefined),
  };
  const cartography = {
    resetFinishingForSpacecraft: jest.fn().mockResolvedValue(undefined),
  };
  const takeover = {
    cancelForShipsInTransaction: jest.fn().mockResolvedValue(undefined),
  };
  const effects = {
    onEnterField: jest
      .fn<
        Promise<void>,
        [
          Spacecraft,
          GalaxyField,
          string[],
          {
            manager: import('typeorm').EntityManager;
            afterCommit: Array<() => void>;
          }?,
        ]
      >()
      .mockResolvedValue(undefined),
    onTick: jest.fn(),
  };
  const orbit = {
    lifecycle: {
      flightBlockReason: jest.fn().mockResolvedValue(null),
      cancelForFleet: jest.fn(),
    },
  };

  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    effects.onEnterField.mockResolvedValue(undefined);
    orbit.lifecycle.flightBlockReason.mockResolvedValue(null);
    await resetDatabase(db);
    const owner = await createUser(db);
    const shipClass = await db.getRepository(ShipClassDef).save({
      key: 'JUMP',
      name: 'Jump ship',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const originLayer = await db
      .getRepository(Layer)
      .save({ name: 'Origin', width: 5, height: 5, isHidden: false });
    layer = await db
      .getRepository(Layer)
      .save({ name: 'Far away', width: 200, height: 200, isHidden: false });
    const start = await db
      .getRepository(GalaxyField)
      .save({ layerId: originLayer.id, cx: 1, cy: 1, fieldTypeId: 1 });
    const end = await db
      .getRepository(GalaxyField)
      .save({ layerId: layer.id, cx: 120, cy: 95, fieldTypeId: 1 });
    origin = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: start.id });
    destination = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ galaxyFieldId: end.id });
    await db.getRepository(LayerKnowledge).save({
      userId: owner.id,
      layerId: layer.id,
      knownAt: new Date(),
      status: LayerKnowledgeStatus.KNOWN,
    });
    leader = await db.getRepository(Spacecraft).save({
      name: 'Leader',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 55,
      warpdrive: 23,
    });
    fleet = await db
      .getRepository(Fleet)
      .save({ name: 'Jump fleet', leaderId: leader.id, userId: owner.id });
    await db.getRepository(Spacecraft).update(leader.id, { fleetId: fleet.id });
    member = await db.getRepository(Spacecraft).save({
      name: 'Wingman',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 71,
      warpdrive: 17,
      fleetId: fleet.id,
    });
    for (const ship of [leader, member])
      await db.getRepository(SpacecraftModule).save([
        {
          spacecraftId: ship.id,
          category: 'SPECIAL',
          moduleType: 'Hyperraum-Spule',
          integrity: 100,
          isActive: false,
        },
        {
          spacecraftId: ship.id,
          category: 'HYPERDRIVE',
          moduleType: 'Hyperantrieb',
          integrity: 100,
          isActive: true,
        },
      ]);
    signatures = new FlightSignatureService(
      db.getRepository(FlightSignature),
      {} as ShipClassService,
    );
    service = new NavicomputerJumpService(
      db,
      signatures,
      new ExplorationService(
        db.getRepository(ExplorationState),
        db.getRepository(SystemExploration),
      ),
      new FlightConsequencePipeline([
        new DeflectorConsequence(
          db,
          { sendSystem: jest.fn() } as never,
          { emitToUser: jest.fn() } as never,
          { destroyInManager: jest.fn() } as never,
          { enhanceSpacecraft: jest.fn() } as never,
          () => 0,
        ),
        effects,
      ]),
      repairs as unknown as SpacecraftRepairService,
      cartography as unknown as CartographyPlanService,
      takeover as unknown as SpacecraftTakeoverService,
      { getAllModules: () => [] } as unknown as GameDataService,
      orbit,
    );
    target = { layerId: layer.id, x: 120, y: 95 };
  });

  async function snapshot() {
    return {
      ships: await db.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
      modules: await db
        .getRepository(SpacecraftModule)
        .find({ order: { id: 'ASC' } }),
      signatures: await db.getRepository(FlightSignature).find(),
      discovery: await db.getRepository(ExplorationState).find(),
      logs: await db.getRepository(ShipLogEntry).find(),
    };
  }

  it('jumps every member across layers immediately for 55 EPS and no drive points with paired directionless snapshots', async () => {
    const before = Date.now();
    const result = await service.jump(leader.id, leader.userId, target);
    expect(result.shipIds).toEqual([leader.id, member.id]);
    expect(result.cooldownUntil).toBeGreaterThanOrEqual(before + 300000);
    expect(result.cooldownUntil).toBeLessThanOrEqual(Date.now() + 300000);
    const after = await snapshot();
    expect(
      after.ships.map((ship) => [
        ship.locationId,
        ship.energy,
        ship.warpdrive,
        ship.fleetId,
      ]),
    ).toEqual([
      [destination.id, 0, 23, fleet.id],
      [destination.id, 16, 17, fleet.id],
    ]);
    for (const ship of after.ships)
      expect(ship.runtimeSystems).toMatchObject({
        HYPERSPACE_COIL: {
          active: false,
          cooldown: result.cooldownUntil,
          integrity: 100,
        },
      });
    expect(
      after.modules
        .filter((module) => module.moduleType === 'Hyperraum-Spule')
        .every((module) => module.cooldown === 0 && !module.isActive),
    ).toBe(true);
    expect(after.signatures).toHaveLength(4);
    for (const ship of [leader, member]) {
      const rows = after.signatures.filter(
        (row) => row.spacecraftId === ship.id,
      );
      expect(rows.map((row) => row.locationId).sort()).toEqual(
        [origin.id, destination.id].sort(),
      );
      for (const row of rows)
        expect(row).toMatchObject({
          spacecraftName: ship.name,
          shipClassName: 'Jump ship',
          fromDirection: null,
          toDirection: null,
        });
    }
    expect(after.discovery).toHaveLength(1);
    expect(after.logs).toHaveLength(2);
    expect(effects.onEnterField).toHaveBeenCalledTimes(2);
    expect(cartography.resetFinishingForSpacecraft).toHaveBeenCalledTimes(2);
    expect(takeover.cancelForShipsInTransaction).toHaveBeenCalled();
    // The persisted cooldown rejects retries even after a new service request loads the rows.
    const committed = await snapshot();
    await expect(
      service.jump(leader.id, leader.userId, {
        layerId: layer.id,
        x: 119,
        y: 95,
      }),
    ).rejects.toThrow('kühlt');
    expect(await snapshot()).toEqual(committed);
  });

  it('permits a lone ship and the galaxy field before a star system', async () => {
    await db.getRepository(Spacecraft).update(leader.id, { fleetId: null });
    const system = await db.getRepository(StarSystem).save({
      name: 'Target system',
      systemTypeId: 1,
      layerId: layer.id,
      cx: target.x,
      cy: target.y,
    });
    await db
      .getRepository(GalaxyField)
      .update(destination.galaxyFieldId!, { starSystemId: system.id });
    expect(
      (await service.jump(leader.id, leader.userId, target)).shipIds,
    ).toEqual([leader.id]);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: member.id }))
        .locationId,
    ).toBe(origin.id);
  });

  it.each([
    'nonleader',
    'fixed',
    'unknown layer',
    'hidden layer',
    'missing field',
    'impassable',
    'override blocked',
    'crew',
    'different field',
    'inside system',
    'missing coil',
    'destroyed coil',
    'inactive drive',
    'destroyed drive',
    'towing',
    'held by tractor',
    'energy',
    'cooldown',
    'standby',
    'combat',
    'orbit order',
    'same target',
    'invalid coordinates',
  ])('rejects %s with no partial writes or detachment', async (reason) => {
    let initiator = leader.id;
    if (reason === 'nonleader') initiator = member.id;
    if (reason === 'fixed')
      await db.getRepository(Fleet).update(fleet.id, { isFixed: true });
    if (reason === 'unknown layer')
      await db
        .getRepository(LayerKnowledge)
        .delete({ userId: leader.userId, layerId: layer.id });
    if (reason === 'hidden layer')
      await db.getRepository(Layer).update(layer.id, { isHidden: true });
    if (reason === 'missing field') target.x--;
    if (reason === 'impassable')
      await db
        .getRepository(GalaxyField)
        .update(destination.galaxyFieldId!, { isPassable: false });
    if (reason === 'override blocked')
      await db
        .getRepository(GalaxyField)
        .update(destination.galaxyFieldId!, { passableOverride: false });
    if (reason === 'crew')
      await db.getRepository(Spacecraft).update(member.id, { crewRequired: 1 });
    if (reason === 'different field')
      await db
        .getRepository(Spacecraft)
        .update(member.id, { locationId: destination.id });
    if (reason === 'inside system') {
      const system = await db.getRepository(StarSystem).save({
        name: 'Inside',
        systemTypeId: 1,
        layerId: layer.id,
        cx: target.x,
        cy: target.y,
      });
      const field = await db
        .getRepository(SystemField)
        .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
      const location = await db
        .getRepository(SpaceLocation)
        .findOneByOrFail({ systemFieldId: field.id });
      await db
        .getRepository(Spacecraft)
        .update(member.id, { locationId: location.id });
    }
    if (reason === 'missing coil')
      await db
        .getRepository(SpacecraftModule)
        .delete({ spacecraftId: member.id, moduleType: 'Hyperraum-Spule' });
    if (reason === 'destroyed coil')
      await db
        .getRepository(SpacecraftModule)
        .update(
          { spacecraftId: member.id, moduleType: 'Hyperraum-Spule' },
          { integrity: 0 },
        );
    if (reason === 'inactive drive')
      await db
        .getRepository(SpacecraftModule)
        .update(
          { spacecraftId: member.id, category: 'HYPERDRIVE' },
          { isActive: false },
        );
    if (reason === 'destroyed drive')
      await db
        .getRepository(SpacecraftModule)
        .update(
          { spacecraftId: member.id, category: 'HYPERDRIVE' },
          { integrity: 0 },
        );
    if (reason === 'towing')
      await db
        .getRepository(Spacecraft)
        .update(member.id, { tractoredShipId: leader.id });
    if (reason === 'held by tractor') {
      await db.getRepository(Spacecraft).save({
        name: 'Foreign tractor',
        userId: (await createUser(db)).id,
        shipClassId: leader.shipClassId,
        locationId: origin.id,
        tractoredShipId: member.id,
      });
    }
    if (reason === 'energy')
      await db.getRepository(Spacecraft).update(member.id, { energy: 54 });
    if (reason === 'cooldown')
      await db.getRepository(Spacecraft).update(member.id, {
        runtimeSystems: {
          HYPERSPACE_COIL: {
            active: false,
            integrity: 100,
            cooldown: Date.now() + 300000,
          },
        },
      });
    if (reason === 'standby')
      await db
        .getRepository(Spacecraft)
        .update(member.id, { operatingMode: SpacecraftOperatingMode.STANDBY });
    if (reason === 'combat')
      await db
        .getRepository(Spacecraft)
        .update(member.id, { status: SpacecraftStatus.IN_COMBAT });
    if (reason === 'orbit order')
      orbit.lifecycle.flightBlockReason.mockResolvedValue(
        'Orbitauftrag blockiert' as never,
      );
    if (reason === 'same target') {
      const originField = await db
        .getRepository(GalaxyField)
        .findOneByOrFail({ id: origin.galaxyFieldId! });
      await db.getRepository(LayerKnowledge).save({
        userId: leader.userId,
        layerId: originField.layerId,
        knownAt: new Date(),
        status: LayerKnowledgeStatus.KNOWN,
      });
      target = { layerId: originField.layerId, x: 1, y: 1 };
    }
    if (reason === 'invalid coordinates') target.x = 1.5;
    const before = await snapshot();
    await expect(
      service.jump(initiator, leader.userId, target),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await snapshot()).toEqual(before);
    expect(effects.onEnterField).not.toHaveBeenCalled();
  });

  it('rolls back both ships and both pairs of real signature inserts when the second signature write fails', async () => {
    const real = signatures.createMovement.bind(signatures);
    jest
      .spyOn(signatures, 'createMovement')
      .mockImplementation(async (...args) => {
        await real(...args);
        if (args[0].id === member.id)
          throw new Error('signature storage failed');
      });
    const before = await snapshot();
    await expect(
      service.jump(leader.id, leader.userId, target),
    ).rejects.toThrow('signature storage failed');
    expect(await snapshot()).toEqual(before);
  });

  it('rolls back field effects and never emits transaction notifications on failure', async () => {
    const notify = jest.fn();
    effects.onEnterField.mockImplementation(
      async (_ship, _field, _messages, transaction) => {
        transaction?.afterCommit.push(notify);
        throw new Error('destination effect failed');
      },
    );
    const before = await snapshot();
    await expect(
      service.jump(leader.id, leader.userId, target),
    ).rejects.toThrow('destination effect failed');
    expect(await snapshot()).toEqual(before);
    expect(notify).not.toHaveBeenCalled();
  });

  it('refuses a concurrent member writer instead of waiting or moving a subset', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.manager.findOneOrFail(Spacecraft, {
        where: { id: member.id },
        lock: { mode: 'pessimistic_write' },
      });
      const before = await snapshot();
      await expect(
        service.jump(leader.id, leader.userId, target),
      ).rejects.toThrow('gesperrt');
      expect(await snapshot()).toEqual(before);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('lists only personally known nonhidden layers, including EXPLORED', async () => {
    await db
      .getRepository(Layer)
      .save({ name: 'Unknown', width: 10, height: 10, isHidden: false });
    const hidden = await db
      .getRepository(Layer)
      .save({ name: 'Secret', width: 10, height: 10, isHidden: true });
    await db
      .getRepository(LayerKnowledge)
      .save({ userId: leader.userId, layerId: hidden.id, knownAt: new Date() });
    await db
      .getRepository(LayerKnowledge)
      .update(
        { userId: leader.userId, layerId: layer.id },
        { status: LayerKnowledgeStatus.EXPLORED },
      );
    expect(await service.layers(leader.userId)).toEqual([
      { id: layer.id, name: layer.name, width: 200, height: 200 },
    ]);
  });
});
