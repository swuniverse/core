import 'reflect-metadata';
import { setTimeout as pause } from 'node:timers/promises';
import { Test } from '@nestjs/testing';
import type { Type } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { INTEGRATION_ENTITIES } from '../../testing/integration/data-source';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import { Layer } from '../starmap/entities/layer.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassService } from './ship-class.service';
import { SpacecraftService } from './spacecraft.service';
import { lockFleetParticipants } from './fleet-lock';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { CartographyPlanService } from './cartography-plan.service';
import { FlightSignatureService } from './flight-signature.service';
import { FieldTransitionExecutor } from './field-transition-executor';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { StatisticsService } from '../statistics/statistics.service';
import { GameGateway } from '../websocket/game.gateway';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { SpacecraftStatus } from './entities/spacecraft.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';

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
    'Public fleet operation did not wait on the controlled transaction',
  );
}

/** Real repositories and class service for every dependency executed by fleet mutations. */
async function fleetService(dataSource: DataSource) {
  const dependencies: Type<unknown>[] = Reflect.getMetadata(
    'design:paramtypes',
    SpacecraftService,
  );
  const gameData = new GameDataService();
  const classes = new ShipClassService(
    dataSource.getRepository(ShipClassDef),
    dataSource.getRepository(FactionEntity),
    gameData,
  );
  const realServices = [
    SpacecraftCrewService,
    SpacecraftTakeoverService,
    SpacecraftDestructionService,
    SpacecraftRepairService,
  ];
  const collaborators: Type<unknown>[] = realServices.flatMap((service) =>
    Reflect.getMetadata('design:paramtypes', service),
  );
  const gateway = { emitToUser: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      SpacecraftService,
      ...[...dependencies, ...collaborators].map((provide) => ({
        provide,
        useValue: {},
      })),
      ...realServices,
      ...INTEGRATION_ENTITIES.map((entity) => ({
        provide: getRepositoryToken(entity),
        useValue: dataSource.getRepository(entity),
      })),
      { provide: 'BuoyRepository', useValue: {} },
      { provide: 'CrewSkillRepository', useValue: {} },
      CartographyPlanService,
      SpacecraftRuntimeStateService,
      FieldTransitionExecutor,
      FlightConsequencePipeline,
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
      { provide: GameGateway, useValue: gateway },
      { provide: DataSource, useValue: dataSource },
      { provide: GameDataService, useValue: gameData },
      { provide: ShipClassService, useValue: classes },
    ],
  }).compile();
  return {
    service: module.get(SpacecraftService),
    gateway,
    close: () => module.close(),
  };
}

describe('Public fleet mutations across committed relocation (PostgreSQL)', () => {
  let dataSource: DataSource;
  let fixture: Awaited<ReturnType<typeof fleetService>>;
  let owner: User;
  let leader: Spacecraft;
  let joiner: Spacecraft;
  let fleet: Fleet;
  let origin: SpaceLocation;
  let destination: SpaceLocation;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    fixture = await fleetService(dataSource);
  });
  afterAll(async () => {
    await fixture?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(dataSource);
    owner = await createUser(dataSource);
    const shipClass = await dataSource.getRepository(ShipClassDef).save({
      key: 'FLEET_CONCURRENCY',
      name: 'Fleet test ship',
      category: 'SHIP',
      role: 'SCOUT',
    });
    const layer = await dataSource
      .getRepository(Layer)
      .save({ name: 'Fleet test layer', width: 5, height: 5 });
    const locations: SpaceLocation[] = [];
    for (const cx of [1, 2]) {
      const field = await dataSource
        .getRepository(GalaxyField)
        .save({ layerId: layer.id, cx, cy: 1, fieldTypeId: 1 });
      locations.push(
        await dataSource
          .getRepository(SpaceLocation)
          .findOneByOrFail({ galaxyFieldId: field.id }),
      );
    }
    [origin, destination] = locations;
    leader = await dataSource.getRepository(Spacecraft).save({
      name: 'Leader',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 71,
    });
    joiner = await dataSource.getRepository(Spacecraft).save({
      name: 'Joiner',
      userId: owner.id,
      shipClassId: shipClass.id,
      locationId: origin.id,
      energy: 53,
    });
    fleet = await dataSource
      .getRepository(Fleet)
      .save({ name: 'Aurek', userId: owner.id, leaderId: leader.id });
    await dataSource
      .getRepository(Spacecraft)
      .update(leader.id, { fleetId: fleet.id });
  });

  async function acrossRelocation<T>(
    operation: () => Promise<T>,
    changeLeader = false,
    detachJoiner = false,
  ): Promise<T> {
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const relocation = dataSource.transaction(async (manager) => {
      const rows: Array<{ pid: number }> = await manager.query(
        'SELECT pg_backend_pid() AS pid',
      );
      blockerPid = rows[0].pid;
      await manager.findOneOrFail(Fleet, {
        where: { id: fleet.id },
        lock: { mode: 'pessimistic_write' },
      });
      const members = await manager.find(Spacecraft, {
        where: { fleetId: fleet.id },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      for (const member of members)
        await manager.update(Spacecraft, member.id, {
          locationId: destination.id,
          energy: 44,
        });
      if (changeLeader)
        await manager.update(Fleet, fleet.id, { leaderId: joiner.id });
      if (detachJoiner)
        await manager.update(Spacecraft, joiner.id, { fleetId: null });
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    const pending = operation().then(
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
    if ('error' in result) throw result.error;
    return result.value;
  }

  it('leaves using the committed position and resources after waiting for relocation', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await acrossRelocation(() =>
      fixture.service.leaveFleet(owner.id, joiner.id),
    );
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: null, locationId: destination.id, energy: 44 });
    expect(
      await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id }),
    ).toMatchObject({ leaderId: leader.id });
  });

  it('dissolves after relocation without restoring old member position or resources', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await acrossRelocation(() =>
      fixture.service.dissolveFleet(owner.id, fleet.id),
    );
    expect(
      await dataSource.getRepository(Fleet).findOneBy({ id: fleet.id }),
    ).toBeNull();
    const members = await dataSource
      .getRepository(Spacecraft)
      .find({ order: { id: 'ASC' } });
    expect(
      members.map(({ fleetId, locationId, energy }) => ({
        fleetId,
        locationId,
        energy,
      })),
    ).toEqual([
      { fleetId: null, locationId: destination.id, energy: 44 },
      { fleetId: null, locationId: destination.id, energy: 44 },
    ]);
  });

  it('refuses a new leader that left while leadership change waited', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await expect(
      acrossRelocation(
        () => fixture.service.changeFleetLeader(owner.id, fleet.id, joiner.id),
        false,
        true,
      ),
    ).rejects.toThrow('Der neue Flottenführer ist kein Mitglied');
    expect(
      await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id }),
    ).toMatchObject({ leaderId: leader.id });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: null, locationId: destination.id, energy: 44 });
  });

  it('does not dissolve when the departing old leader ceased to lead while waiting', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await acrossRelocation(
      () => fixture.service.leaveFleet(owner.id, leader.id),
      true,
    );
    expect(
      await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id }),
    ).toMatchObject({ leaderId: joiner.id });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: leader.id }),
    ).toMatchObject({ fleetId: null, locationId: destination.id, energy: 44 });
  });

  it.each(['rename', 'fixation'] as const)(
    'preserves committed leadership during adjacent %s writes',
    async (operation) => {
      await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
      await acrossRelocation(
        () =>
          operation === 'rename'
            ? fixture.service.renameFleet(owner.id, fleet.id, '  Renamed  ')
            : fixture.service.toggleFleetFixation(owner.id, fleet.id),
        true,
      );
      expect(
        await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id }),
      ).toMatchObject({
        leaderId: joiner.id,
        ...(operation === 'rename' ? { name: 'Renamed' } : { isFixed: true }),
      });
    },
  );

  it('includes a precommitted join in the complete caller-manager participant set and rolls back relocation', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await fixture.service.changeFleetLeader(owner.id, fleet.id, joiner.id);
    await expect(
      dataSource.transaction(async (manager) => {
        const participants = await lockFleetParticipants(
          manager,
          owner.id,
          joiner.id,
        );
        expect(participants.fleet).toMatchObject({ leaderId: joiner.id });
        expect(participants.members.map((ship) => ship.id)).toEqual([
          leader.id,
          joiner.id,
        ]);
        for (const member of participants.members)
          await manager.update(Spacecraft, member.id, {
            locationId: destination.id,
          });
        throw new Error('controlled relocation rollback');
      }),
    ).rejects.toThrow('controlled relocation rollback');
    expect(
      (
        await dataSource
          .getRepository(Spacecraft)
          .find({ where: { fleetId: fleet.id } })
      ).every((member) => member.locationId === origin.id),
    ).toBe(true);
  });

  it('relocates every precommitted member using the supported caller-manager helper', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await dataSource.transaction(async (manager) => {
      const { members } = await lockFleetParticipants(
        manager,
        owner.id,
        leader.id,
      );
      expect(members.map((member) => member.id)).toEqual([
        leader.id,
        joiner.id,
      ]);
      for (const member of members)
        await manager.update(Spacecraft, member.id, {
          locationId: destination.id,
        });
    });
    const persisted = await dataSource
      .getRepository(Spacecraft)
      .find({ where: { fleetId: fleet.id }, order: { id: 'ASC' } });
    expect(
      persisted.map(({ id, locationId, energy }) => ({
        id,
        locationId,
        energy,
      })),
    ).toEqual([
      { id: leader.id, locationId: destination.id, energy: 71 },
      { id: joiner.id, locationId: destination.id, energy: 53 },
    ]);
  });

  it('locks a no-fleet ship without inventing fleet participants', async () => {
    await dataSource.transaction(async (manager) => {
      const participants = await lockFleetParticipants(
        manager,
        owner.id,
        joiner.id,
      );
      expect(participants.fleet).toBeNull();
      expect(participants.members).toEqual([]);
      expect(participants.ship.id).toBe(joiner.id);
    });
    await expect(
      lockFleetParticipants(dataSource.manager, owner.id, joiner.id),
    ).rejects.toThrow('caller transaction');
  });

  it('refuses ship-first contention instead of waiting in an inverse lock cycle', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    const acquired = barrier();
    const release = barrier();
    const writer = dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(Spacecraft, {
        where: { id: joiner.id },
        lock: { mode: 'pessimistic_write' },
      });
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    try {
      await expect(
        dataSource.transaction((manager) =>
          lockFleetParticipants(manager, owner.id, leader.id),
        ),
      ).rejects.toThrow('Flottenzustand ist gesperrt; bitte erneut versuchen');
    } finally {
      release.release();
      await writer;
    }
    await dataSource.transaction(async (manager) => {
      expect(
        (await lockFleetParticipants(manager, owner.id, leader.id)).members.map(
          (member) => member.id,
        ),
      ).toEqual([leader.id, joiner.id]);
    });
  });

  async function ordinaryFlight() {
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Flight system',
      layerId: (
        await dataSource
          .getRepository(Layer)
          .findOneByOrFail({ name: 'Fleet test layer' })
      ).id,
      cx: 3,
      cy: 3,
      maxX: 5,
      maxY: 5,
      systemTypeId: 1,
    });
    const field = await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, fieldTypeId: 1, sx: 1, sy: 1 });
    const location = await dataSource
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    await dataSource
      .getRepository(SystemField)
      .save({ starSystemId: system.id, fieldTypeId: 1, sx: 2, sy: 1 });
    await dataSource.getRepository(Spacecraft).update([leader.id, joiner.id], {
      locationId: location.id,
      crewRequired: 0,
    });
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await dataSource.getRepository(SpacecraftModule).save({
      spacecraftId: leader.id,
      category: 'SUBLIGHT_DRIVE',
      moduleType: 'Sublight',
      isActive: true,
    });
    await dataSource
      .getRepository(Spacecraft)
      .update(joiner.id, { status: SpacecraftStatus.DESTROYED });
    fixture.gateway.emitToUser.mockClear();
    return location;
  }

  it('ordinary nonfixed flight leaves an incapable local member behind after departure commits', async () => {
    const location = await ordinaryFlight();
    await fixture.service.navigate(leader.id, owner.id, 2, 1);
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: null, locationId: location.id, energy: 53 });
    expect(fixture.gateway.emitToUser).toHaveBeenCalledWith(
      owner.id,
      expect.any(String),
      expect.objectContaining({
        shipId: joiner.id,
        type: 'FLEET_MEMBER_LEFT_BEHIND',
      }),
    );
  });

  it('ordinary nonfixed flight preserves remote members rather than detaching them', async () => {
    await ordinaryFlight();
    await dataSource
      .getRepository(Spacecraft)
      .update(joiner.id, { locationId: origin.id });
    await fixture.service.navigate(leader.id, owner.id, 2, 1);
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: fleet.id, locationId: origin.id, energy: 53 });
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('ordinary departure failure rolls back membership and emits no departure success', async () => {
    await ordinaryFlight();
    const another = await dataSource.getRepository(Spacecraft).save({
      name: 'Another blocked member',
      userId: owner.id,
      shipClassId: joiner.shipClassId,
      locationId: (
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: joiner.id })
      ).locationId,
      fleetId: fleet.id,
      status: SpacecraftStatus.DESTROYED,
    });
    await dataSource.query(`CREATE FUNCTION reject_departure() RETURNS trigger AS $$
      BEGIN IF NEW."fleetId" IS NULL AND NEW.id = ${another.id} THEN RAISE EXCEPTION 'controlled departure failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await dataSource.query(
      `CREATE TRIGGER reject_departure BEFORE UPDATE OF "fleetId" ON spacecraft FOR EACH ROW EXECUTE FUNCTION reject_departure()`,
    );
    try {
      await expect(
        fixture.service.navigate(leader.id, owner.id, 2, 1),
      ).rejects.toThrow('controlled departure failure');
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: joiner.id }),
      ).toMatchObject({ fleetId: fleet.id, energy: 53 });
      expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
    } finally {
      await dataSource.query('DROP TRIGGER reject_departure ON spacecraft');
      await dataSource.query('DROP FUNCTION reject_departure()');
    }
  });

  it('ordinary fixed flight refuses the whole departure subset and emits no success', async () => {
    const location = await ordinaryFlight();
    await fixture.service.toggleFleetFixation(owner.id, fleet.id);
    await expect(
      fixture.service.navigate(leader.id, owner.id, 2, 1),
    ).rejects.toThrow('Fixierte Flotte kann nicht fliegen');
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: leader.id }),
    ).toMatchObject({ fleetId: fleet.id, locationId: location.id, energy: 71 });
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: fleet.id, locationId: location.id, energy: 53 });
    expect(fixture.gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('serializes complete participant selections initiated in opposite spacecraft order', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const first = dataSource.transaction(async (manager) => {
      const rows: Array<{ pid: number }> = await manager.query(
        'SELECT pg_backend_pid() AS pid',
      );
      blockerPid = rows[0].pid;
      expect(
        (await lockFleetParticipants(manager, owner.id, joiner.id)).members.map(
          (member) => member.id,
        ),
      ).toEqual([leader.id, joiner.id]);
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    const second = dataSource.transaction(async (manager) => {
      const participants = await lockFleetParticipants(
        manager,
        owner.id,
        leader.id,
      );
      expect(participants.members.map((member) => member.id)).toEqual([
        leader.id,
        joiner.id,
      ]);
    });
    try {
      await waitForBlockedTransaction(dataSource, blockerPid);
    } finally {
      release.release();
      await first;
    }
    await second;
  });

  it('supports valid create, join, leadership transfer, member leave and leader dissolution', async () => {
    await fixture.service.dissolveFleet(owner.id, fleet.id);
    const created = await fixture.service.createFleet(
      owner.id,
      '  New fleet  ',
      leader.id,
    );
    expect(created.name).toBe('New fleet');
    await fixture.service.joinFleet(owner.id, created.id, joiner.id);
    await fixture.service.changeFleetLeader(owner.id, created.id, joiner.id);
    await fixture.service.leaveFleet(owner.id, leader.id);
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: leader.id }),
    ).toMatchObject({ fleetId: null, locationId: origin.id, energy: 71 });
    await fixture.service.leaveFleet(owner.id, joiner.id);
    expect(
      await dataSource.getRepository(Fleet).findOneBy({ id: created.id }),
    ).toBeNull();
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({ fleetId: null, locationId: origin.id, energy: 53 });
  });

  it.each(['owner', 'status'] as const)(
    'revalidates joiner %s after waiting on relocation',
    async (changed) => {
      const acquired = barrier();
      const release = barrier();
      let blockerPid = 0;
      const foreign = await createUser(dataSource);
      const transaction = dataSource.transaction(async (manager) => {
        const rows: Array<{ pid: number }> = await manager.query(
          'SELECT pg_backend_pid() AS pid',
        );
        blockerPid = rows[0].pid;
        await lockFleetParticipants(manager, owner.id, leader.id);
        await manager.update(
          Spacecraft,
          joiner.id,
          changed === 'owner'
            ? { userId: foreign.id }
            : { status: SpacecraftStatus.IN_COMBAT },
        );
        acquired.release();
        await release.promise;
      });
      await acquired.promise;
      const joining = fixture.service
        .joinFleet(owner.id, fleet.id, joiner.id)
        .then(
          () => null,
          (error: unknown) => error,
        );
      try {
        await waitForBlockedTransaction(dataSource, blockerPid);
      } finally {
        release.release();
        await transaction;
      }
      expect(await joining).toEqual(
        expect.objectContaining({
          message:
            changed === 'owner'
              ? 'Spacecraft not found'
              : 'Schiff darf sich nicht im Flug befinden',
        }),
      );
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: joiner.id }),
      ).toMatchObject({ fleetId: null, locationId: origin.id, energy: 53 });
    },
  );

  it('refuses changed membership without taking a second fleet lock', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    const other = await dataSource.getRepository(Spacecraft).save({
      name: 'Other leader',
      userId: owner.id,
      shipClassId: leader.shipClassId,
      locationId: origin.id,
    });
    const otherFleet = await fixture.service.createFleet(
      owner.id,
      'Other fleet',
      other.id,
    );
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const changing = dataSource.transaction(async (manager) => {
      const rows: Array<{ pid: number }> = await manager.query(
        'SELECT pg_backend_pid() AS pid',
      );
      blockerPid = rows[0].pid;
      await lockFleetParticipants(manager, owner.id, leader.id);
      await manager.update(Spacecraft, joiner.id, { fleetId: otherFleet.id });
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    const leaving = fixture.service.leaveFleet(owner.id, joiner.id).then(
      () => null,
      (error: unknown) => error,
    );
    try {
      await waitForBlockedTransaction(dataSource, blockerPid);
    } finally {
      release.release();
      await changing;
    }
    expect(await leaving).toEqual(
      expect.objectContaining({
        message:
          'Flottenmitgliedschaft hat sich geändert; bitte erneut versuchen',
      }),
    );
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: joiner.id }),
    ).toMatchObject({
      fleetId: otherFleet.id,
      locationId: origin.id,
      energy: 53,
    });
  });

  it('rolls back all departures if fleet deletion fails', async () => {
    await fixture.service.joinFleet(owner.id, fleet.id, joiner.id);
    await dataSource.query(`CREATE FUNCTION reject_fleet_deletion() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'controlled deletion failure'; END; $$ LANGUAGE plpgsql`);
    await dataSource.query(`CREATE TRIGGER reject_fleet_deletion BEFORE DELETE ON fleets
      FOR EACH ROW EXECUTE FUNCTION reject_fleet_deletion()`);
    try {
      await expect(
        fixture.service.dissolveFleet(owner.id, fleet.id),
      ).rejects.toThrow('controlled deletion failure');
      expect(
        (
          await dataSource
            .getRepository(Spacecraft)
            .find({ where: { fleetId: fleet.id } })
        )
          .map((ship) => ship.id)
          .sort((a, b) => a - b),
      ).toEqual([leader.id, joiner.id]);
      expect(
        await dataSource.getRepository(Fleet).findOneByOrFail({ id: fleet.id }),
      ).toMatchObject({ leaderId: leader.id });
    } finally {
      await dataSource.query('DROP TRIGGER reject_fleet_deletion ON fleets');
      await dataSource.query('DROP FUNCTION reject_fleet_deletion()');
    }
  });

  it('rolls back fleet creation when assigning the leader fails', async () => {
    await dataSource
      .getRepository(Spacecraft)
      .update(leader.id, { fleetId: null });
    await dataSource.getRepository(Fleet).delete(fleet.id);
    await dataSource.query(`CREATE FUNCTION reject_fleet_assignment() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'controlled assignment failure'; END; $$ LANGUAGE plpgsql`);
    await dataSource.query(`CREATE TRIGGER reject_fleet_assignment BEFORE UPDATE OF "fleetId" ON spacecraft
      FOR EACH ROW EXECUTE FUNCTION reject_fleet_assignment()`);
    try {
      await expect(
        fixture.service.createFleet(owner.id, '  New fleet  ', leader.id),
      ).rejects.toThrow('controlled assignment failure');
      expect(await dataSource.getRepository(Fleet).count()).toBe(0);
      expect(
        await dataSource
          .getRepository(Spacecraft)
          .findOneByOrFail({ id: leader.id }),
      ).toMatchObject({ fleetId: null, locationId: origin.id, energy: 71 });
    } finally {
      await dataSource.query(
        'DROP TRIGGER reject_fleet_assignment ON spacecraft',
      );
      await dataSource.query('DROP FUNCTION reject_fleet_assignment()');
    }
  });

  it('refuses a waiting join validated against the old location after relocation commits', async () => {
    const acquired = barrier();
    const release = barrier();
    let blockerPid = 0;
    const relocation = dataSource.transaction(async (manager) => {
      const rows: Array<{ pid: number }> = await manager.query(
        'SELECT pg_backend_pid() AS pid',
      );
      blockerPid = rows[0].pid;
      await manager.findOneOrFail(Fleet, {
        where: { id: fleet.id },
        lock: { mode: 'pessimistic_write' },
      });
      const members = await manager.find(Spacecraft, {
        where: { fleetId: fleet.id },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(members.map((ship) => ship.id)).toEqual([leader.id]);
      await manager.update(Spacecraft, leader.id, {
        locationId: destination.id,
      });
      acquired.release();
      await release.promise;
    });
    await acquired.promise;
    const joining = fixture.service
      .joinFleet(owner.id, fleet.id, joiner.id)
      .then(
        (ship) => ({ ship, error: undefined }),
        (error: unknown) => ({ ship: undefined, error }),
      );
    try {
      await waitForBlockedTransaction(dataSource, blockerPid);
    } finally {
      release.release();
      await relocation;
    }
    const result = await joining;
    const persisted = await dataSource
      .getRepository(Spacecraft)
      .findOneByOrFail({ id: joiner.id });
    expect(persisted).toMatchObject({
      fleetId: null,
      locationId: origin.id,
      energy: 53,
    });
    expect(result.error).toEqual(
      expect.objectContaining({
        message:
          'Schiff und Flottenführer müssen sich auf demselben Feld befinden',
      }),
    );
    expect(
      await dataSource
        .getRepository(Spacecraft)
        .findOneByOrFail({ id: leader.id }),
    ).toMatchObject({
      fleetId: fleet.id,
      locationId: destination.id,
      energy: 71,
    });
  });
});
