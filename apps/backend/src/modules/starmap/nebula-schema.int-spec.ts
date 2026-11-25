import { DataSource } from 'typeorm';
import {
  connectIntegrationDatabase,
  resetDatabase,
} from '../../testing/integration/database';
import {
  CelestialObject,
  CelestialObjectType,
} from './entities/celestial-object.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { GalaxyFieldType } from './entities/galaxy-field-type.entity';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { SystemField } from './entities/system-field.entity';
import { NebulaService } from './nebula.service';

describe('nebula preview against migrated application schema', () => {
  let database: DataSource;

  beforeAll(async () => {
    database = await connectIntegrationDatabase();
  }, 120000);

  afterAll(async () => {
    await database?.destroy();
  });

  it('loads celestial objects through the real systemId column and preserves their fields', async () => {
    await resetDatabase(database);
    const layer = await database
      .getRepository(Layer)
      .save({ name: 'Schema preview', width: 20, height: 20, sectorSize: 10 });
    const type = await database
      .getRepository(GalaxyFieldType)
      .findOneByOrFail({ id: 1 });
    const system = await database
      .getRepository(StarSystem)
      .save({
        layerId: layer.id,
        name: 'Schema system',
        cx: 8,
        cy: 8,
        maxX: 22,
        maxY: 22,
        systemTypeId: 1001,
      });
    const object = await database
      .getRepository(CelestialObject)
      .save({
        systemId: system.id,
        objectType: CelestialObjectType.PLANET,
        posX: 3,
        posY: 3,
        classId: 201,
        name: 'Schema planet',
      });
    const defaults = {
      fieldTypeId: type.id,
      isPassable: type.passable,
      energyCost: type.energyCost,
      damage: type.damage,
      effects: type.effects,
    };
    await database.getRepository(GalaxyField).save(
      Array.from({ length: 400 }, (_, i) => {
        const cx = (i % 20) + 1,
          cy = Math.floor(i / 20) + 1;
        return {
          ...defaults,
          layerId: layer.id,
          cx,
          cy,
          starSystemId: cx === 8 && cy === 8 ? system.id : null,
          systemTypeId: cx === 8 && cy === 8 ? system.systemTypeId : null,
        };
      }),
    );
    await database.getRepository(SystemField).save(
      Array.from({ length: 484 }, (_, i) => {
        const sx = (i % 22) + 1,
          sy = Math.floor(i / 22) + 1;
        return {
          ...defaults,
          starSystemId: system.id,
          sx,
          sy,
          celestialObjectId: sx === 3 && sy === 3 ? object.id : null,
        };
      }),
    );
    const preview = await new NebulaService(database).preview(layer.id, {
      seed: 'swu-nebula-v1',
      target: 'BOTH',
      density: 'BALANCED',
    });
    expect(preview.summary.changedFields).toBeGreaterThan(0);
    const map = preview.maps.find(
      (item) => item.scope === 'SYSTEM' && item.id === system.id,
    );
    expect(map).toBeDefined();
    expect(
      map?.fields.find((field) => field.x === 3 && field.y === 3),
    ).toMatchObject({ label: 'Schema planet', objectClassId: 201 });
    expect(
      map?.changes.some(
        (change) =>
          Math.max(Math.abs(change.x - 3), Math.abs(change.y - 3)) <= 1,
      ),
    ).toBe(false);
    expect(
      await database
        .getRepository(GalaxyField)
        .count({ where: { layerId: layer.id, fieldTypeId: type.id } }),
    ).toBe(400);
    expect(
      await database
        .getRepository(SystemField)
        .count({ where: { starSystemId: system.id, fieldTypeId: type.id } }),
    ).toBe(484);
  });
});
