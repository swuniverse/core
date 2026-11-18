import { DataSource } from 'typeorm';
import { SpacecraftShieldRegenerationService } from '../../modules/spacecraft/spacecraft-shield-regeneration.service';
import { SHIELD_REGENERATION_INTERVAL_MS } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from './database';

const NOW = 1_800_000_000_000;

describe('persistent independent shield regeneration (PostgreSQL)', () => {
  let source: DataSource;
  let shipId: number;
  let ownerId: number;
  let locationId: number;
  let service: SpacecraftShieldRegenerationService;
  const gateway = { emitToUser: jest.fn() };
  beforeAll(async () => {
    source = await connectIntegrationDatabase();
  });
  beforeEach(async () => {
    await resetDatabase(source);
    gateway.emitToUser.mockClear();
    ownerId = (await createUser(source)).id;
    const layer = await source
      .getRepository('Layer')
      .save({ name: 'Shield test', width: 1, height: 1 });
    const type = await source
      .getRepository('GalaxyFieldType')
      .save({ key: 'SHIELD_TEST', name: 'Shield test', effects: [] });
    const field = await source
      .getRepository('GalaxyField')
      .save({ layerId: layer.id, cx: 1, cy: 1, fieldTypeId: type.id });
    locationId = (
      await source
        .getRepository('SpaceLocation')
        .findOneByOrFail({ galaxyFieldId: field.id })
    ).id;
    const hull = await source
      .getRepository('ShipClassDef')
      .save({
        key: 'SHIELD_TEST',
        name: 'Shield test',
        category: 'SHIP',
        role: 'SHIP',
      });
    const ship = await source
      .getRepository('Spacecraft')
      .save({
        name: 'Shield test',
        userId: ownerId,
        shipClassId: hull.id,
        locationId,
        status: 'IDLE',
        hull: 100,
        hullMax: 100,
        shields: 50,
        shieldsMax: 101,
        energy: 0,
        crewRequired: 1,
        runtimeSystems: {
          SHIELDS: {
            active: false,
            integrity: 100,
            cooldown: 0,
            regenerationStartedAt: NOW - SHIELD_REGENERATION_INTERVAL_MS,
          },
        },
      });
    shipId = ship.id;
    await source
      .getRepository('SpacecraftModule')
      .save({
        spacecraftId: shipId,
        category: 'SHIELDS',
        moduleType: 'Schilde',
        isActive: true,
        integrity: 100,
        cooldown: 0,
        level: 1,
      });
    const crew = await source
      .getRepository('Crew')
      .save({ userId: ownerId, name: 'Crew' });
    await source
      .getRepository('CrewAssignment')
      .save({ crewId: crew.id, userId: ownerId, spacecraftId: shipId });
    service = new SpacecraftShieldRegenerationService(source, gateway as never);
  });
  afterAll(async () => {
    await source?.destroy();
  });
  const stored = async () =>
    source.getRepository('Spacecraft').findOneByOrFail({ id: shipId });

  it('persists timers across service instances and prevents duplicate credit from simultaneous runs', async () => {
    const another = new SpacecraftShieldRegenerationService(
      source,
      gateway as never,
    );
    const counts = await Promise.all([
      service.regenerate(NOW),
      another.regenerate(NOW),
    ]);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(1);
    expect(await stored()).toMatchObject({
      shields: 61,
      energy: 0,
      runtimeSystems: {
        SHIELDS: { active: false, regenerationStartedAt: NOW },
      },
    });
    expect(
      await another.regenerate(NOW + SHIELD_REGENERATION_INTERVAL_MS - 1),
    ).toBe(0);
    expect(
      await another.regenerate(NOW + SHIELD_REGENERATION_INTERVAL_MS),
    ).toBe(1);
    expect((await stored()).shields).toBe(72);
  });

  it('checks active anomalies and crew from the database rather than the ship crew cache', async () => {
    const type = await source
      .getRepository('AnomalyType')
      .save({ key: 'ION_STORM' });
    const anomaly = await source
      .getRepository('Anomaly')
      .save({ typeId: type.id, locationId, remainingTicks: 1 });
    expect(await service.regenerate(NOW)).toBe(0);
    await source.getRepository('Anomaly').delete(anomaly.id);
    await source
      .getRepository('CrewAssignment')
      .delete({ spacecraftId: shipId });
    await source.getRepository('Spacecraft').update(shipId, { crew: 100 });
    expect(await service.regenerate(NOW)).toBe(0);
    expect((await stored()).shields).toBe(50);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('caps the final step and preserves a future shield-hit timer', async () => {
    const row = await stored();
    const systems = row.runtimeSystems;
    systems.SHIELDS.regenerationStartedAt = NOW;
    await source
      .getRepository('Spacecraft')
      .update(shipId, { shields: 100, runtimeSystems: systems });
    expect(await service.regenerate(NOW)).toBe(0);
    expect(
      await service.regenerate(NOW + SHIELD_REGENERATION_INTERVAL_MS),
    ).toBe(1);
    expect((await stored()).shields).toBe(101);
    expect(
      await service.regenerate(NOW + 2 * SHIELD_REGENERATION_INTERVAL_MS),
    ).toBe(0);
  });
});
