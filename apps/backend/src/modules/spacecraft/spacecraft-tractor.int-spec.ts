import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftTractorService } from './spacecraft-tractor.service';

/** sc-WP-TRACT-1d: the row lock must work with the joined relations on PostgreSQL. */
describe('tractor beam activation (PostgreSQL)', () => {
  let source: DataSource;
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => resetDatabase(source));
  afterAll(async () => source?.destroy());

  async function setup(targetShields: boolean) {
    const owner = await createUser(source);
    const shipClass = await source.getRepository('ShipClassDef').save({
      key: 'TRACTOR_ESCORT',
      name: 'Eskorte',
      category: 'SHIP',
      role: 'ESCORT',
    });
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Tractor', width: 10, height: 10 });
    const fieldType = await source
      .getRepository('GalaxyFieldType')
      .findOneByOrFail({});
    const field = await source
      .getRepository('GalaxyField')
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: fieldType.id });
    const location = await source
      .getRepository('SpaceLocation')
      .findOneByOrFail({ galaxyFieldId: field.id });
    const ship = async (name: string, shields: boolean) => {
      const saved = await source.getRepository('Spacecraft').save({
        name,
        userId: owner.id,
        shipClassId: shipClass.id,
        locationId: location.id,
        energy: 20,
        runtimeSystems: { SHIELDS: { active: shields, cooldown: 0, integrity: 100 } },
      });
      // Without a shield module the runtime state drops SHIELDS (STU: systems need modules).
      await source.getRepository('SpacecraftModule').save({
        spacecraftId: saved.id,
        moduleType: 'Standard-Deflektorschild',
        category: 'SHIELDS',
        level: 1,
        integrity: 100,
        cooldown: 0,
        isActive: true,
      });
      return saved;
    };
    const puller = await ship('Hammer 1', false);
    const target = await ship('Hammer 2', targetShields);
    const messaging = { sendSystem: jest.fn(async () => undefined) };
    const service = new SpacecraftTractorService(
      source,
      new SpacecraftRuntimeStateService(),
      messaging as never,
      [],
    );
    return { owner, puller, target, service };
  }

  it('locks both ships and captures the target', async () => {
    const { owner, puller, target, service } = await setup(false);

    await expect(service.activate(puller.id, owner.id, target.id)).resolves.toMatchObject({
      message: 'Der Traktorstrahl wurde auf die Hammer 2 gerichtet',
    });
    const saved = await source.getRepository('Spacecraft').findOneByOrFail({ id: puller.id });
    expect(saved.tractoredShipId).toBe(target.id);
    expect(saved.energy).toBe(18);
  });

  it('lets the held ship attempt an escape without a lock error', async () => {
    const { owner, puller, target, service } = await setup(false);
    await service.activate(puller.id, owner.id, target.id);

    await expect(service.escape(target.id, owner.id, () => 100)).resolves.toBeDefined();
  });

  it('reports the STU reason instead of a server error when the source is shielded', async () => {
    const { owner, puller, target, service } = await setup(true);

    await expect(service.activate(target.id, owner.id, puller.id)).rejects.toThrow(
      'Hammer 2: System Traktorstrahl konnte nicht aktiviert werden, weil die Schilde aktiviert sind',
    );
  });
});
