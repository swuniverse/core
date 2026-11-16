import { DataSource } from 'typeorm';
import { SpacecraftScanService } from '../../modules/spacecraft/spacecraft-scan.service';
import { SpacecraftRuntimeStateService } from '../../modules/spacecraft/spacecraft-runtime-state.service';
import { tachyonScanExpiresAt } from '../../modules/spacecraft/spacecraft-tachyon-scan';
import { connectIntegrationDatabase, createUser, resetDatabase } from './database';

describe('Gravitationswellenscanner (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => { source = await connectIntegrationDatabase(); });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  it('serializes competing scans and persists EPS and the deadline together', async () => {
    const owner = await createUser(source);
    const layer = await source.getRepository('Layer').save({ name: 'Scan', width: 1, height: 1 });
    const fieldType = await source.getRepository('GalaxyFieldType').findOneByOrFail({});
    const field = await source.getRepository('GalaxyField').save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source.getRepository('SpaceLocation').findOneByOrFail({ galaxyFieldId: field.id });
    const shipClass = await source.getRepository('ShipClassDef').save({ key: 'SCAN_TEST', name: 'Scan test', category: 'SHIP', role: 'SHIP' });
    const ship = await source.getRepository('Spacecraft').save({ name: 'Scanner', userId: owner.id, shipClassId: shipClass.id, locationId: location.id, energy: 10, runtimeSystems: {} });
    await source.getRepository('SpacecraftModule').save({ spacecraftId: ship.id, moduleType: 'Gravitationswellenscanner', category: 'SPECIAL' });
    const service = new SpacecraftScanService(
      source.getRepository('Spacecraft') as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, {} as never, {} as never,
      { hasEnoughCrew: async () => true } as never,
      new SpacecraftRuntimeStateService(),
      {} as never, {} as never, {} as never, {} as never,
    );
    const results = await Promise.allSettled([
      service.tachyonScan(ship.id, owner.id),
      service.tachyonScan(ship.id, owner.id),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((result) => result.status === 'rejected');
    expect(failed?.status === 'rejected' && failed.reason.message).toBe('Nicht genug EPS');
    const persisted = await source.getRepository('Spacecraft').findOneByOrFail({ id: ship.id });
    expect(persisted.energy).toBe(0);
    expect(persisted.runtimeSystems.TACHYON_SCANNER.lastScanLocationId).toBe(location.id);
    expect(tachyonScanExpiresAt(persisted as never, persisted.runtimeSystems.TACHYON_SCANNER.lastScanAt)).not.toBeNull();
  });
});
