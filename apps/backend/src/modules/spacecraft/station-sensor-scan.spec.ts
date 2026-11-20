import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftScanService } from './spacecraft-scan.service';

type Row = Record<string, any>;

function setup(stationOverrides: Row = {}) {
  const station: Row = {
    id: 10,
    userId: 1,
    kind: 'STATION',
    stationRole: 'SENSOR',
    status: 'IDLE',
    energy: 20,
    modules: [],
    location: { id: 1, kind: 'GALAXY_FIELD', galaxyField: { layerId: 2, cx: 5, cy: 5 } },
    runtimeSystems: { LONG_RANGE_SENSORS: { active: true, integrity: 100 } },
    ...stationOverrides,
  };
  const field = {
    id: 77,
    fieldType: { id: 3, name: 'Nebel' },
    effects: ['NEBULA'],
    starSystem: { id: 4, name: 'Yavin' },
  };
  const save = jest.fn(async (value: unknown) => value);
  const manager = {
    findOne: jest.fn(async (entity: unknown) =>
      entity === Spacecraft ? station : entity === GalaxyField ? field : entity === SpaceLocation ? { id: 99 } : null,
    ),
    save,
  };
  const find = jest.fn(async () => [
    { id: 10, userId: 1, name: 'Phalanx', shipClassId: 1, kind: 'STATION', runtimeSystems: {}, user: { username: 'Ich' } },
    { id: 20, userId: 2, name: 'Sichtbar', shipClassId: 7, kind: 'SHIP', runtimeSystems: {}, user: { username: 'Fremd' } },
    { id: 21, userId: 2, name: 'Getarnt', shipClassId: 7, kind: 'SHIP', runtimeSystems: { CLOAK: { active: true } }, user: { username: 'Fremd' } },
    { id: 22, userId: 2, name: 'Szene', shipClassId: 7, kind: 'SHIP', rpgHidden: true, runtimeSystems: {}, user: { username: 'Fremd' } },
  ]);
  const getVisibleAt = jest.fn(async () => ({ signatures: [], fadedSignatures: { uncloaked: 1, cloaked: 0 } }));
  const service = Object.assign(Object.create(SpacecraftScanService.prototype), {
    shipRepo: { manager: { transaction: async (work: any) => work(manager) }, find },
    spacecraftCrewService: { hasEnoughCrew: async () => true },
    runtimeState: { initialize: (ship: Row) => ship.runtimeSystems },
    gameData: { getAllModules: () => [] },
    flightSignatureService: { getVisibleAt },
  }) as SpacecraftScanService;
  return { service, station, save, find, getVisibleAt };
}

describe('SpacecraftScanService.stationSensorScan (STU ShowSensorScan)', () => {
  it('charges 15 EPS and reports the remote field with its visible ships and signatures', async () => {
    const { service, station, save, find, getVisibleAt } = setup();

    const result = await service.stationSensorScan(10, 1, 8, 2);

    expect(station.energy).toBe(5);
    expect(save).toHaveBeenCalledWith(station);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: { locationId: 99, status: 'IDLE' } }));
    expect(getVisibleAt).toHaveBeenCalledWith(99, 1);
    expect(result).toMatchObject({
      energyCost: 15,
      energy: 5,
      field: { scope: 'GALAXY', x: 8, y: 2, fieldType: { name: 'Nebel' }, starSystem: { id: 4, name: 'Yavin' } },
      ships: [{ id: 20, name: 'Sichtbar', ownerName: 'Fremd', isOwn: false }],
      fadedSignatures: { uncloaked: 1, cloaked: 0 },
    });
  });

  it.each([
    ['another station role', { stationRole: 'DEPOT_SMALL' }, 2, 'Nur eine Sensorphalanx kann Sensorscans durchführen'],
    ['too little EPS', { energy: 14 }, 2, 'Nicht genügend Energie vorhanden (15 benötigt)'],
    ['inactive long-range sensors', { runtimeSystems: { LONG_RANGE_SENSORS: { active: false, integrity: 100 } } }, 2, 'Langstreckensensoren sind nicht aktiv'],
    ['a target beyond the LSS range', {}, 1, 'Zielfeld liegt außerhalb der Sensorreichweite'],
  ])('rejects %s without charging', async (_case, overrides, y, message) => {
    const { service, station, save } = setup(overrides as Row);
    const before = station.energy;
    await expect(service.stationSensorScan(10, 1, 9, y as number)).rejects.toThrow(message as string);
    expect(station.energy).toBe(before);
    expect(save).not.toHaveBeenCalled();
  });

  it('shrinks the range with damaged sensors like the LSS map', async () => {
    const { service } = setup({ runtimeSystems: { LONG_RANGE_SENSORS: { active: true, integrity: 50 } } });
    await expect(service.stationSensorScan(10, 1, 8, 5)).rejects.toThrow('außerhalb der Sensorreichweite');
  });
});
