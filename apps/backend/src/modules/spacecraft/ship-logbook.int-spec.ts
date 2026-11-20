import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { Spacecraft } from './entities/spacecraft.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { ShipLogScan } from './entities/ship-log-scan.entity';
import { profileLogbooks, scanLogbook } from './ship-logbook';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';

describe('Foreign logbooks (PostgreSQL, sc-AUD-13)', () => {
  let db: DataSource, owner: number, visitor: number, stranger: number;
  let shipId: number;
  const at = (minute: number) => new Date(Date.UTC(2026, 10, 20, 12, minute));
  const scanTime = at(30);

  beforeAll(async () => {
    db = await connectIntegrationDatabase();
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await resetDatabase(db);
    owner = (await createUser(db)).id;
    visitor = (await createUser(db)).id;
    stranger = (await createUser(db)).id;
    const hull = await db.getRepository(ShipClassDef).save({
      key: 'LOG_TEST',
      name: 'Falke',
      category: 'SHIP',
      role: 'FREIGHTER',
    });
    const layer = await db.getRepository(Layer).save({ name: 'Test', width: 2, height: 2 });
    const system = await db
      .getRepository(StarSystem)
      .save({ name: 'Test', layerId: layer.id, cx: 1, cy: 1, systemTypeId: 1 });
    const field = await db
      .getRepository(SystemField)
      .save({ starSystemId: system.id, sx: 1, sy: 1, fieldTypeId: 1 });
    const { id: locationId } = await db
      .getRepository(SpaceLocation)
      .findOneByOrFail({ systemFieldId: field.id });
    const ships = db.getRepository(Spacecraft);
    shipId = (
      await ships.save(
        ships.create({ userId: owner, name: 'Logger', shipClassId: hull.id, locationId }),
      )
    ).id;
    const log = (body: string, minute: number, extra: Partial<ShipLogEntry> = {}) =>
      db.getRepository(ShipLogEntry).save({
        spacecraftId: shipId,
        authorId: owner,
        body,
        createdAt: at(minute),
        ...extra,
      });
    await log('public', 10);
    await log('private', 11, { isPrivate: true });
    await log('edited before scan', 12, { editedAt: at(20) });
    await log('edited after scan', 13, { editedAt: at(40) });
    await log('written after scan', 50);
    const deleted = await log('deleted', 14);
    await db.getRepository(ShipLogEntry).delete(deleted.id);
  });

  const bodies = (entries: { body: string }[]) => entries.map((entry) => entry.body);

  it('scans only non-private entries written and edited by the scan time and remembers the scan', async () => {
    const entries = await scanLogbook(db.manager, visitor, shipId, scanTime);

    expect(bodies(entries)).toEqual(['edited before scan', 'public']);
    expect(entries[0].editedAt).toBe(at(20).toISOString());
    const scan = await db.getRepository(ShipLogScan).findOneByOrFail({ userId: visitor, spacecraftId: shipId });
    expect(scan.scannedAt.toISOString()).toBe(scanTime.toISOString());

    await scanLogbook(db.manager, visitor, shipId, at(55));
    expect(await db.getRepository(ShipLogScan).countBy({ userId: visitor })).toBe(1);
  });

  it('does not record a scan of a logbook without visible entries', async () => {
    await scanLogbook(db.manager, visitor, shipId, at(5));
    expect(await db.getRepository(ShipLogScan).count()).toBe(0);
  });

  it('shows foreign visitors only their scanned entries and the owner all own entries', async () => {
    await scanLogbook(db.manager, visitor, shipId, scanTime);

    const [visited] = await profileLogbooks(db.manager, owner, visitor);
    expect(visited).toMatchObject({
      spacecraftId: shipId,
      name: 'Logger',
      shipClassName: 'Falke',
      scannedAt: scanTime.toISOString(),
    });
    expect(bodies(visited.entries)).toEqual(['edited before scan', 'public']);

    expect(await profileLogbooks(db.manager, owner, stranger)).toEqual([]);

    const [own] = await profileLogbooks(db.manager, owner, owner);
    expect(own.scannedAt).toBeNull();
    expect(bodies(own.entries)).toEqual([
      'written after scan',
      'edited after scan',
      'edited before scan',
      'private',
      'public',
    ]);
  });
});
