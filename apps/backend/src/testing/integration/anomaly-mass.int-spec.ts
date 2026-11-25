import { DataSource } from 'typeorm';
import { FactionEntity } from '../../modules/faction/entities/faction.entity';
import { GameDataService } from '../../modules/game-data/game-data.service';
import { ShipClassDef } from '../../modules/spacecraft/entities/ship-class-def.entity';
import { ShipClassService } from '../../modules/spacecraft/ship-class.service';
import { connectIntegrationDatabase, resetDatabase } from './database';

describe('ship class anomaly mass', () => {
  let source: DataSource;

  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('backfills a known retired class while leaving unknown legacy classes nullable', async () => {
    const classes = source.getRepository(ShipClassDef);
    await classes.save({ key: 'REBEL_DEPOT_LARGE', name: 'Retired depot', category: 'STATION', role: 'DEPOT_LARGE' });
    await classes.save({ key: 'LEGACY_UNKNOWN', name: 'Unknown', category: 'SHIP', role: 'SHIP' });
    const gameData = { getShipClassDefs: () => [] } as unknown as GameDataService;
    await new ShipClassService(classes, source.getRepository(FactionEntity), gameData).seedDefaults();
    expect(await classes.findOneByOrFail({ key: 'REBEL_DEPOT_LARGE' })).toMatchObject({ anomalyMass: 18500000 });
    expect(await classes.findOneByOrFail({ key: 'LEGACY_UNKNOWN' })).toMatchObject({ anomalyMass: null });
  });

  it('seeds the approved Imperial large depot mass independently of its old STU reference', async () => {
    const gameData = {
      getShipClassDefs: () => [{
        key: 'EMPIRE_DEPOT_LARGE', name: 'Logistikzentrum', category: 'STATION',
        role: 'DEPOT_LARGE', factionKey: 'GALACTIC_EMPIRE', unlockTechId: null,
        buildTimeTicks: 50, cargoCapacity: 200000, crewMin: 0, crewMax: 0,
        hullBase: 6000, shieldBase: 10000, epsBase: 400, batteryBase: 100,
        reactorBase: 100, warpdriveBase: 0, evadeBase: 0, hitChanceBase: 0,
        sensorRangeBase: 2, torpedoStorageBase: 25, flightEnergyCost: 0,
        prestige: 0, starterAllowed: false, isNpc: false, stuRumpId: 10033,
      }],
    } as unknown as GameDataService;
    const classes = source.getRepository(ShipClassDef);
    const service = new ShipClassService(classes, source.getRepository(FactionEntity), gameData);

    await service.seedDefaults();

    expect(await classes.findOneByOrFail({ key: 'EMPIRE_DEPOT_LARGE' }))
      .toMatchObject({ anomalyMass: 19100000 });
  });

  it('seeds a mapped mobile class from the authoritative STU tractor mass', async () => {
    const gameData = {
      getShipClassDefs: () => [{
        key: 'REBEL_FIGHTER_X_WING', name: 'X-Wing', category: 'FIGHTER',
        role: 'FIGHTER', factionKey: 'REBEL_ALLIANCE', unlockTechId: null,
        buildTimeTicks: 0, cargoCapacity: 0, crewMin: 0, crewMax: 0,
        hullBase: 1, shieldBase: 1, epsBase: 1, batteryBase: 0,
        reactorBase: 0, warpdriveBase: 0, evadeBase: 0, hitChanceBase: 0,
        sensorRangeBase: 0, torpedoStorageBase: 0, flightEnergyCost: 0,
        prestige: 0, starterAllowed: false, isNpc: false, stuRumpId: 1201,
      }],
    } as unknown as GameDataService;
    const classes = source.getRepository(ShipClassDef);
    const service = new ShipClassService(classes, source.getRepository(FactionEntity), gameData);
    await service.seedDefaults();
    expect(await classes.findOneByOrFail({ key: 'REBEL_FIGHTER_X_WING' }))
      .toMatchObject({ anomalyMass: 27 });
  });

  it('seeds all other pinned class masses from their mapped STU hulls', async () => {
    const expected = [
      ['REBEL_FIGHTER_X_WING', 27], ['REBEL_FIGHTER_A_WING', 57],
      ['REBEL_SHUTTLE_LAAT', 158], ['REBEL_SHUTTLE_U_WING', 197],
      ['REBEL_COLONIZER_ICARUS', 325], ['REBEL_FREIGHTER_HAWK', 2114],
      ['REBEL_FRIGATE_CONSULAR', 310000], ['REBEL_FRIGATE_PELTA', 72000],
      ['REBEL_ESCORT_HAMMERHEAD', 520000], ['REBEL_CORVETTE_CR90', 355000],
      ['REBEL_SCOUT_HWK_290', 127000], ['REBEL_SCOUT_VCX_100', 94000],
      ['REBEL_DESTROYER_DREADNOUGHT', 622000], ['REBEL_DESTROYER_MC75', 375000],
      ['REBEL_CRUISER_NEBULON_B', 3055000], ['REBEL_CRUISER_MC80', 2100000],
      ['REBEL_CRUISER_VENATOR', 2150000], ['REBEL_COLONIZER_CR90', 133000],
      ['REBEL_FREIGHTER_BFF1', 53000], ['REBEL_FREIGHTER_GR75', 74000],
      ['EMPIRE_FIGHTER_TIE_LN', 30], ['EMPIRE_FIGHTER_TIE_INTERCEPTOR', 54],
      ['EMPIRE_SHUTTLE_LAMBDA', 161], ['EMPIRE_COLONIZER_SENTINEL', 321],
      ['EMPIRE_FREIGHTER_ZETA', 2201], ['EMPIRE_FRIGATE_LANCER', 77000],
      ['EMPIRE_FRIGATE_MUNIFICENT', 311000], ['EMPIRE_ESCORT_ARQUITENS', 550000],
      ['EMPIRE_CORVETTE_RAIDER', 342000], ['EMPIRE_DESTROYER_INTERDICTOR', 639000],
      ['EMPIRE_DESTROYER_PRAETOR', 400000], ['EMPIRE_CRUISER_VINDICATOR', 3130000],
      ['EMPIRE_CRUISER_IMPERIAL', 2238000], ['EMPIRE_COLONIZER_LAMBDA_SETTLEMENT', 141000],
      ['EMPIRE_FREIGHTER_MOSE', 49000], ['EMPIRE_FREIGHTER_ETA', 77000],
      ['REBEL_OUTPOST', 34500000], ['REBEL_BASE', 71000000],
      ['EMPIRE_OUTPOST', 38000000], ['EMPIRE_BASE', 69000000],
      ['REBEL_WORKBEE_DROID', 2], ['EMPIRE_WORKBEE_DROID', 2],
      ['EMPIRE_SCOUT_RAIDER', 125000], ['REBEL_CRUISER_HAMMERHEAD_RESEARCH', 700000],
      ['REBEL_CRUISER_CORVUS_RESEARCH', 1400000], ['EMPIRE_CRUISER_GOZANTI_RESEARCH', 712000],
    ] as const;
    const template = {
      name: 'Class', category: 'SHIP', role: 'SHIP', factionKey: null,
      unlockTechId: null, buildTimeTicks: 0, cargoCapacity: 0, crewMin: 0,
      crewMax: 0, hullBase: 1, shieldBase: 1, epsBase: 1, batteryBase: 0,
      reactorBase: 0, warpdriveBase: 0, evadeBase: 0, hitChanceBase: 0,
      sensorRangeBase: 0, torpedoStorageBase: 0, flightEnergyCost: 0,
      prestige: 0, starterAllowed: false, isNpc: false,
    };
    const gameData = { getShipClassDefs: () => expected.map(([key]) => ({ ...template, key })) } as unknown as GameDataService;
    const classes = source.getRepository(ShipClassDef);
    const service = new ShipClassService(classes, source.getRepository(FactionEntity), gameData);
    await service.seedDefaults();
    for (const [key, anomalyMass] of expected) {
      expect(await classes.findOneByOrFail({ key })).toMatchObject({ anomalyMass });
    }
  });

  it('seeds all approved station masses instead of their historical STU references', async () => {
    const template = {
      name: 'Station', category: 'STATION', role: 'SENSOR',
      factionKey: null, unlockTechId: null, buildTimeTicks: 0,
      cargoCapacity: 0, crewMin: 0, crewMax: 0, hullBase: 500,
      shieldBase: 0, epsBase: 0, batteryBase: 0, reactorBase: 0,
      warpdriveBase: 0, evadeBase: 0, hitChanceBase: 0, sensorRangeBase: 0,
      torpedoStorageBase: 0, flightEnergyCost: 0, prestige: 0,
      starterAllowed: false, isNpc: false,
    };
    const expected = [
      ['REBEL_CONSTRUCTION', 50000], ['EMPIRE_CONSTRUCTION', 50000],
      ['REBEL_DEPOT_SMALL', 6500000], ['EMPIRE_DEPOT_SMALL', 6600000],
      ['REBEL_DEPOT_LARGE', 18500000], ['EMPIRE_DEPOT_LARGE', 19100000],
      ['REBEL_SHIPYARD', 4900000], ['EMPIRE_SHIPYARD', 5100000],
      ['REBEL_SENSOR', 150000], ['EMPIRE_SENSOR', 180000],
    ] as const;
    const gameData = {
      getShipClassDefs: () => expected.map(([key]) => ({ ...template, key })),
    } as unknown as GameDataService;
    const classes = source.getRepository(ShipClassDef);
    const service = new ShipClassService(classes, source.getRepository(FactionEntity), gameData);

    await service.seedDefaults();

    for (const [key, anomalyMass] of expected) {
      expect(await classes.findOneByOrFail({ key })).toMatchObject({ anomalyMass });
    }
  });
});
