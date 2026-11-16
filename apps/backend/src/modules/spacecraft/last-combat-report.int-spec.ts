import 'reflect-metadata';
import { DataSource } from 'typeorm';
import type { CombatReportDto } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { LastCombatReportService } from './last-combat-report.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';

const report: CombatReportDto = {
  parties: {
    attacker: [{ id: 1, name: 'Falke', destroyed: false }],
    defender: [],
  },
  rounds: [
    {
      number: 1,
      lines: [
        { kind: 'ENERGY_HIT', text: 'Falke trifft.', emphasis: 'neutral' },
      ],
    },
  ],
  outcome: { winner: 'attacker', destroyedShipIds: [] },
};
describe('Last combat report (PostgreSQL)', () => {
  let db: DataSource;
  let ship: Spacecraft;
  let service: LastCombatReportService;
  let other: number;
  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    const owner = await createUser(db);
    other = (await createUser(db)).id;
    const hull = await db
      .getRepository(ShipClassDef)
      .save({ key: 'REPORT', name: 'Falke', category: 'SHIP', role: 'FREIGHTER' });
    const layer = await db
      .getRepository(Layer)
      .save({ name: 'Test', width: 2, height: 2 });
    const system = await db
      .getRepository(StarSystem)
      .save({ name: 'Test', layerId: layer.id, cx: 1, cy: 1, systemTypeId: 1 });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const location = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    ship = await db
      .getRepository(Spacecraft)
      .save({
        name: 'Falke',
        userId: owner.id,
        shipClassId: hull.id,
        locationId: location.id,
      });
    ship = await db.getRepository(Spacecraft).findOneByOrFail({ id: ship.id });
    service = new LastCombatReportService(db.getRepository(Spacecraft));
  });
  it('returns 404 without a report and never exposes another owners report', async () => {
    expect(await service.has(ship.id)).toBe(false);
    await expect(service.get(ship.id, ship.userId)).rejects.toThrow(
      'Kein Kampfbericht',
    );
    await db
      .getRepository(Spacecraft)
      .update(ship.id, { lastCombatReport: report });
    expect(await service.has(ship.id)).toBe(true);
    await expect(service.get(ship.id, other)).rejects.toThrow(
      'Kein Kampfbericht',
    );
    expect(await service.get(ship.id, ship.userId)).toEqual(report);
    expect(
      (await db.getRepository(Spacecraft).findOneByOrFail({ id: ship.id }))
        .lastCombatReport,
    ).toBeUndefined();
  });
  it('persists and replaces reports together with combat survivor state', async () => {
    const destruction = Object.assign(
      Object.create(SpacecraftDestructionService.prototype),
      { dataSource: db },
    ) as SpacecraftDestructionService;
    ship.lastCombatReport = report;
    await destruction.saveCombatSurvivor(ship);
    expect(await service.get(ship.id, ship.userId)).toEqual(report);
    ship.lastCombatReport = { ...report, rounds: [] };
    await destruction.saveCombatSurvivor(ship);
    expect((await service.get(ship.id, ship.userId)).rounds).toEqual([]);
    await db.getRepository(Spacecraft).delete(ship.id);
    expect(await destruction.saveCombatSurvivor(ship)).toBe(false);
    expect(await service.has(ship.id)).toBe(false);
  });
});
