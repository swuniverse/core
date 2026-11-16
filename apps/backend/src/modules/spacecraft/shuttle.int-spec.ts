import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { ShuttleService } from './shuttle.service';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonyEconomyService } from '../colony/colony-economy.service';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { MessagingService } from '../messaging/messaging.service';
import { StationConstructionService } from './station-construction.service';

const hangar = {
  shipClassKey: 'SHUTTLE_TEST',
  hangarCommodityId: 21401,
  crewRequired: 2,
  defaultModuleCommodityIds: [1, 2, 3],
};
const workbee = {
  ...hangar,
  shipClassKey: 'REBEL_WORKBEE_DROID',
  hangarCommodityId: 20061,
  crewRequired: 1,
};
const gameData = {
  getHangarShipDef: (key: string) =>
    key === hangar.shipClassKey
      ? hangar
      : key === workbee.shipClassKey
        ? workbee
        : undefined,
  getHangarShipDefByCommodity: (id: number) =>
    id === 21401 ? hangar : id === 20061 ? workbee : undefined,
  isSmallCraftCommodity: (id: number) =>
    id === 21401 || (id >= 20061 && id <= 20065),
  getCommodity: (id: number) => ({
    id,
    name: id === 21401 ? 'Test-Shuttle' : 'Workbee',
  }),
  getAllModules: () => [
    { name: 'Shuttlerampe', secret: { shuttleLaunchCapacity: 1 } },
  ],
  getFabricationItemByOutputCommodity: (id: number) => ({
    moduleType: ['Sensoren', 'Hyperantrieb', 'Schilde'][id - 1],
    moduleCategory: ['SENSORS', 'HYPERDRIVE', 'SHIELDS'][id - 1],
    moduleLevel: 1,
  }),
} as unknown as GameDataService;

describe('Shuttles (PostgreSQL)', () => {
  let db: DataSource;
  let service: ShuttleService;
  let carrier: Spacecraft;
  let colony: Colony;
  let shuttleClass: ShipClassDef;
  let otherLocation: number;
  let storageMax = 100;
  let crewLimit = 10;
  let activeAirfield = true;
  const delivered = jest.fn();
  const send = async (...args: unknown[]) => {
    (args[7] as { afterCommit: Array<() => void> }).afterCommit.push(() =>
      delivered(args[2]),
    );
  };
  const messaging = { sendSystem: jest.fn(send) };
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    messaging.sendSystem.mockImplementation(send);
    storageMax = 100;
    crewLimit = 10;
    activeAirfield = true;
    await resetDatabase(db);
    const owner = await createUser(db);
    const hull = await db.getRepository(ShipClassDef).save({
      key: 'CARRIER',
      name: 'Träger',
      category: 'SHIP',
      role: 'FREIGHTER',
      shuttleSlots: 2,
    });
    shuttleClass = await db.getRepository(ShipClassDef).save({
      key: 'SHUTTLE_TEST',
      name: 'Test-Shuttle',
      category: 'SHIP',
      role: 'SHUTTLE',
      epsBase: 20,
      warpdriveBase: 10,
      reactorBase: 5,
      batteryBase: 5,
      crewMin: 2,
      crewMax: 3,
      cargoCapacity: 5,
      shieldBase: 0,
    });
    await db.getRepository(ShipClassDef).save({
      ...shuttleClass,
      id: undefined,
      key: 'REBEL_WORKBEE_DROID',
      name: 'Workbee',
      role: 'WORKBEE',
      crewMin: 1,
      epsBase: 10,
    });
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Shuttle layer', width: 5, height: 5, isHidden: false });
    const system = await db.getRepository(StarSystem).save({
      name: 'Shuttle system',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      systemTypeId: 1,
    });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const otherField = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 2, sy: 1, fieldTypeId: 1 });
    const location = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    otherLocation = (
      await db
        .getRepository(SpaceLocation)
        .findOneByOrFail({ systemFieldId: otherField.id })
    ).id;
    carrier = await db.getRepository(Spacecraft).save({
      name: 'Träger',
      shipClassId: hull.id,
      userId: owner.id,
      locationId: location.id,
      energy: 100,
      energyMax: 100,
      epsMax: 100,
      crewRequired: 2,
      crewMax: 10,
      cargoMax: 20,
      crew: 4,
    });
    await db.getRepository(SpacecraftModule).save({
      spacecraftId: carrier.id,
      category: 'SPECIAL',
      moduleType: 'Shuttlerampe',
      level: 1,
      integrity: 100,
      isActive: true,
    });
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: carrier.id, commodityId: 21401, amount: 1 });
    await addCrew(carrier.id, 4);
    colony = await db.getRepository(Colony).save({
      name: 'Basis',
      userId: owner.id,
      colonyClassId: 1,
      systemFieldId: field.id,
      starSystemId: system.id,
      posX: 1,
      posY: 1,
    });
    await db
      .getRepository(ColonyChangeable)
      .save({ colonyId: colony.id, trainedCrew: 0 });
    service = new ShuttleService(
      db,
      gameData,
      {
        calculateSummary: () => ({ effectiveStorageMax: storageMax }),
      } as unknown as ColonyStatsService,
      {
        hasActiveFunction: () => activeAirfield,
      } as unknown as ColonyEconomyService,
      { getLocalCrewLimit: () => crewLimit } as unknown as ColonyCrewService,
      messaging as unknown as MessagingService,
    );
  });
  async function addCrew(shipId: number, amount: number) {
    for (let index = 0; index < amount; index++) {
      const crew = await db
        .getRepository(Crew)
        .save({ userId: carrier.userId, name: `Crew ${shipId}/${index}` });
      await db.getRepository(CrewAssignment).save({
        crewId: crew.id,
        userId: carrier.userId,
        spacecraftId: shipId,
        colonyId: null,
        escapePodId: null,
        tradePostId: null,
        slot: null,
      });
    }
  }
  async function launch() {
    return (await service.launch(carrier.id, carrier.userId, 21401)).shipId;
  }
  async function snapshot() {
    return {
      ships: await db.getRepository(Spacecraft).find({ order: { id: 'ASC' } }),
      cargo: await db.getRepository(CargoItem).find({ order: { id: 'ASC' } }),
      crew: await db
        .getRepository(CrewAssignment)
        .find({ order: { crewId: 'ASC' } }),
      storage: await db
        .getRepository(ColonyStorage)
        .find({ order: { id: 'ASC' } }),
    };
  }
  it('launches a configured ship at the carrier location, charges full EPS and moves only excess crew', async () => {
    const before = await snapshot();
    const id = await launch();
    const ship = await db
      .getRepository(Spacecraft)
      .findOneOrFail({ where: { id }, relations: ['modules'] });
    expect(ship).toMatchObject({
      shipClassId: shuttleClass.id,
      userId: carrier.userId,
      locationId: carrier.locationId,
      energy: 20,
      epsMax: 20,
      warpdrive: 10,
      crew: 2,
      crewRequired: 2,
      shuttleCommodityId: 21401,
    });
    expect(ship.modules).toHaveLength(3);
    expect(ship.runtimeSystems.DEFLECTOR).toBeUndefined();
    expect(ship.runtimeSystems.LIFE_SUPPORT).toMatchObject({ active: true });
    expect(ship.runtimeSystems.SHIELDS).toMatchObject({ active: false });
    expect(ship.runtimeSystems.WARPDRIVE).toMatchObject({ active: false });
    const after = await snapshot();
    expect(after.ships.find((row) => row.id === carrier.id)).toMatchObject({
      energy: 80,
      crew: 2,
      cargoUsed: 0,
    });
    expect(after.cargo[0].amount).toBe(0);
    expect(
      after.crew
        .filter((row) => row.spacecraftId === carrier.id)
        .map((row) => row.crewId),
    ).toEqual(before.crew.slice(0, 2).map((row) => row.crewId));
    expect(after.crew.filter((row) => row.spacecraftId === id)).toHaveLength(2);
    expect(delivered).toHaveBeenCalledWith(
      expect.stringContaining('gestartet'),
    );
  });
  it('stores a nearby shuttle, preserving its cargo and crew and removing its runtime ship/modules', async () => {
    const id = await launch();
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: id, commodityId: 5, amount: 4 });
    const data = await service.get(carrier.id, carrier.userId);
    expect(data.nearby).toEqual([
      { id, name: 'Test-Shuttle', blockReason: null },
    ]);
    await service.store(carrier.id, carrier.userId, id);
    expect(await db.getRepository(Spacecraft).findOneBy({ id })).toBeNull();
    expect(
      await db.getRepository(SpacecraftModule).countBy({ spacecraftId: id }),
    ).toBe(0);
    expect(
      await db
        .getRepository(CrewAssignment)
        .countBy({ spacecraftId: carrier.id }),
    ).toBe(4);
    expect(
      (
        await db
          .getRepository(CargoItem)
          .findOneByOrFail({ spacecraftId: carrier.id, commodityId: 21401 })
      ).amount,
    ).toBe(1);
    expect(
      (
        await db
          .getRepository(CargoItem)
          .findOneByOrFail({ spacecraftId: carrier.id, commodityId: 5 })
      ).amount,
    ).toBe(4);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: carrier.id }))
        .cargoUsed,
    ).toBe(5);
  });
  it('lands in an owned colony at the actual orbit and returns hull, cargo and crew atomically', async () => {
    const id = await launch();
    await db
      .getRepository(CargoItem)
      .save({ spacecraftId: id, commodityId: 5, amount: 3 });
    expect((await service.get(id, carrier.userId)).colonies).toEqual([
      { id: colony.id, name: 'Basis', blockReason: null },
    ]);
    await service.land(id, carrier.userId, colony.id);
    expect(await db.getRepository(Spacecraft).findOneBy({ id })).toBeNull();
    expect(
      await db.getRepository(CrewAssignment).countBy({ colonyId: colony.id }),
    ).toBe(2);
    expect(
      (
        await db
          .getRepository(ColonyChangeable)
          .findOneByOrFail({ colonyId: colony.id })
      ).trainedCrew,
    ).toBe(2);
    expect(
      (
        await db
          .getRepository(ColonyStorage)
          .findOneByOrFail({ colonyId: colony.id, commodityId: 21401 })
      ).amount,
    ).toBe(1);
    expect(
      (
        await db
          .getRepository(ColonyStorage)
          .findOneByOrFail({ colonyId: colony.id, commodityId: 5 })
      ).amount,
    ).toBe(3);
  });
  it('uses the same launch and storage for stations and preserves original Workbee commodity variants', async () => {
    await db
      .getRepository(Spacecraft)
      .update(carrier.id, { kind: SpacecraftKind.STATION });
    await db
      .getRepository(CargoItem)
      .update({ spacecraftId: carrier.id }, { commodityId: 20062 });
    const id = (await service.launch(carrier.id, carrier.userId, 20062)).shipId;
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id }))
        .shuttleCommodityId,
    ).toBe(20062);
    await service.store(carrier.id, carrier.userId, id);
    expect(
      (
        await db
          .getRepository(CargoItem)
          .findOneByOrFail({ spacecraftId: carrier.id, commodityId: 20062 })
      ).amount,
    ).toBe(1);
  });
  it('can take back a Workbee docked at its own station through shared shuttle storage', async () => {
    await db
      .getRepository(Spacecraft)
      .update(carrier.id, { kind: SpacecraftKind.STATION });
    await db
      .getRepository(CargoItem)
      .update({ spacecraftId: carrier.id }, { commodityId: 20061 });
    const id = (await service.launch(carrier.id, carrier.userId, 20061)).shipId;
    await db.getRepository(Spacecraft).update(id, { dockedAtId: carrier.id });
    await service.store(carrier.id, carrier.userId, id);
    expect(await db.getRepository(Spacecraft).findOneBy({ id })).toBeNull();
  });
  it.each([
    'module',
    'destroyed',
    'cooldown',
    'crew',
    'EPS',
    'unknown',
    'stock',
    'shields',
    'warp',
    'cloak',
  ])('rejects launch with %s without mutation', async (reason) => {
    let commodity = 21401;
    if (reason === 'module')
      await db
        .getRepository(SpacecraftModule)
        .delete({ spacecraftId: carrier.id });
    if (reason === 'destroyed')
      await db
        .getRepository(SpacecraftModule)
        .update({ spacecraftId: carrier.id }, { integrity: 0 });
    if (reason === 'cooldown')
      await db
        .getRepository(SpacecraftModule)
        .update({ spacecraftId: carrier.id }, { cooldown: 1 });
    if (reason === 'crew')
      await db
        .getRepository(Spacecraft)
        .update(carrier.id, { crewRequired: 4 });
    if (reason === 'EPS')
      await db.getRepository(Spacecraft).update(carrier.id, { energy: 19 });
    if (reason === 'unknown') commodity = 21601;
    if (reason === 'stock')
      await db.getRepository(CargoItem).delete({ spacecraftId: carrier.id });
    if (['shields', 'warp', 'cloak'].includes(reason)) {
      const key =
        reason === 'shields'
          ? 'SHIELDS'
          : reason === 'warp'
            ? 'WARPDRIVE'
            : 'CLOAK';
      await db.getRepository(SpacecraftModule).save({
        spacecraftId: carrier.id,
        category:
          reason === 'cloak'
            ? 'SPECIAL'
            : reason === 'shields'
              ? 'SHIELDS'
              : 'HYPERDRIVE',
        moduleType: reason === 'cloak' ? 'Tarnvorrichtung' : 'Test',
        integrity: 100,
        isActive: true,
      });
      await db.getRepository(Spacecraft).update(carrier.id, {
        runtimeSystems: {
          [key]: { active: true, integrity: 100, cooldown: 0 },
        },
      });
    }
    const before = await snapshot();
    await expect(
      service.launch(carrier.id, carrier.userId, commodity),
    ).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
  it.each([
    'slots',
    'stored shuttle cargo',
    'cargo',
    'quarters',
    'position',
    'fleet',
    'tractor',
  ])('rejects storing with %s without partial transfer', async (reason) => {
    const id = await launch();
    if (reason === 'slots')
      await db
        .getRepository(CargoItem)
        .update({ spacecraftId: carrier.id }, { amount: 2 });
    if (reason === 'stored shuttle cargo')
      await db.getRepository(CargoItem).save({
        spacecraftId: id,
        commodityId: 21401,
        amount: 2,
      });
    if (reason === 'cargo')
      await db.getRepository(Spacecraft).update(carrier.id, { cargoMax: 0 });
    if (reason === 'quarters')
      await db.getRepository(Spacecraft).update(carrier.id, { crewMax: 2 });
    if (reason === 'position')
      await db
        .getRepository(Spacecraft)
        .update(id, { locationId: otherLocation });
    if (reason === 'fleet') {
      // A real fleet belongs to the owner; dropping a member must be explicit.
      const [fleet] = await db.query(
        `INSERT INTO fleets (name,"userId","leaderId") VALUES ('Test',$1,$2) RETURNING id`,
        [carrier.userId, id],
      );
      await db.getRepository(Spacecraft).update(id, { fleetId: fleet.id });
    }
    if (reason === 'tractor')
      await db
        .getRepository(Spacecraft)
        .update(carrier.id, { tractoredShipId: id });
    const before = await snapshot();
    await expect(
      service.store(carrier.id, carrier.userId, id),
    ).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
  it.each([
    'airfield',
    'crew capacity',
    'storage',
    'position',
    'owner',
    'abandoned',
  ])('rejects landing with %s without losing ship or crew', async (reason) => {
    const id = await launch();
    if (reason === 'airfield') activeAirfield = false;
    if (reason === 'crew capacity') crewLimit = 1;
    if (reason === 'storage') storageMax = 0;
    if (reason === 'position')
      await db
        .getRepository(Spacecraft)
        .update(id, { locationId: otherLocation });
    if (reason === 'owner')
      await db
        .getRepository(Colony)
        .update(colony.id, { userId: (await createUser(db)).id });
    if (reason === 'abandoned')
      await db.getRepository(Colony).update(colony.id, { isAbandoned: true });
    const before = await snapshot();
    await expect(service.land(id, carrier.userId, colony.id)).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });
  it('requires the owner for read, launch, store and land', async () => {
    const id = await launch();
    const other = await createUser(db);
    await expect(service.get(carrier.id, other.id)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.launch(carrier.id, other.id, 21401)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.store(carrier.id, other.id, id)).rejects.toThrow(
      'nicht gefunden',
    );
    await expect(service.land(id, other.id, colony.id)).rejects.toThrow(
      'nicht gefunden',
    );
  });
  it('rolls back a complete launch when messaging fails and delivers no notification', async () => {
    const before = await snapshot();
    messaging.sendSystem.mockRejectedValueOnce(new Error('mail failed'));
    await expect(launch()).rejects.toThrow('mail failed');
    expect(await snapshot()).toEqual(before);
    expect(delivered).not.toHaveBeenCalled();
  });
  it('fails fast on locked source cargo and prevents double launch', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const before = await snapshot();
    try {
      await runner.manager.findOne(CargoItem, {
        where: { spacecraftId: carrier.id },
        lock: { mode: 'pessimistic_write' },
      });
      await expect(launch()).rejects.toThrow('gesperrt');
      expect(await snapshot()).toEqual(before);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
    const results = await Promise.allSettled([launch(), launch()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await db
        .getRepository(Spacecraft)
        .countBy({ shipClassId: shuttleClass.id }),
    ).toBe(1);
  });
  it('uses module capacity for stations without hull shuttle slots and respects storage limits for colony transfers', async () => {
    await db
      .getRepository(ShipClassDef)
      .update(carrier.shipClassId, { shuttleSlots: 0 });
    await db
      .getRepository(Spacecraft)
      .update(carrier.id, { kind: SpacecraftKind.STATION });
    await db.getRepository(CargoItem).delete({ spacecraftId: carrier.id });
    await db
      .getRepository(ColonyStorage)
      .save({ colonyId: colony.id, commodityId: 21401, amount: 2 });
    await service.transferStored(colony.id, carrier.userId, carrier.id, [
      { commodityId: 21401, amount: 1 },
    ]);
    expect((await service.get(carrier.id, carrier.userId)).capacity).toBe(1);
    const before = await snapshot();
    await expect(
      service.transferStored(colony.id, carrier.userId, carrier.id, [
        { commodityId: 21401, amount: 1 },
      ]),
    ).rejects.toThrow('belegt');
    expect(await snapshot()).toEqual(before);
    await service.transferStored(colony.id, carrier.userId, carrier.id, [
      { commodityId: 21401, amount: -1 },
    ]);
    expect(
      (
        await db
          .getRepository(ColonyStorage)
          .findOneByOrFail({ colonyId: colony.id, commodityId: 21401 })
      ).amount,
    ).toBe(2);
  });
  it('launches configured docked Workbees for station construction with the same factory and crew transfer', async () => {
    await db.getRepository(CargoItem).delete({ spacecraftId: carrier.id });
    await db.getRepository(CargoItem).save([
      { spacecraftId: carrier.id, commodityId: 20061, amount: 5 },
      { spacecraftId: carrier.id, commodityId: 2, amount: 100 },
      { spacecraftId: carrier.id, commodityId: 21, amount: 50 },
    ]);
    await addCrew(carrier.id, 3);
    await db.getRepository(ShipClassDef).save({
      key: 'REBEL_CONSTRUCTION',
      name: 'Konstrukt',
      role: 'CONSTRUCTION',
      category: 'STATION',
      hullBase: 500,
      shieldBase: 0,
      epsBase: 0,
      cargoCapacity: 100,
    });
    const result = await new StationConstructionService(db, gameData).build(
      carrier.id,
      carrier.userId,
    );
    expect(result.workbees).toHaveLength(5);
    for (const ship of result.workbees) {
      expect(ship).toMatchObject({
        dockedAtId: result.station.id,
        crew: 1,
        crewRequired: 1,
        shuttleCommodityId: 20061,
      });
      expect(
        await db
          .getRepository(SpacecraftModule)
          .countBy({ spacecraftId: ship.id }),
      ).toBe(3);
    }
    expect(
      await db
        .getRepository(CrewAssignment)
        .countBy({ spacecraftId: carrier.id }),
    ).toBe(2);
  });
});
