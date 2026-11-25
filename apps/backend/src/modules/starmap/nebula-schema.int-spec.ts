import { AddNebulaGeneration20261125160000 } from '../../database/migrations/20261125160000-add-nebula-generation';
import { StarmapQueryService } from './starmap-query.service';
import { StarmapAdminService } from './starmap-admin.service';
import type { ExplorationService } from './exploration.service';
import { BadRequestException } from '@nestjs/common';
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
      target: 'GALAXY',
      density: 'BALANCED',
    });
    expect(preview.summary.changedFields).toBeGreaterThan(0);
    expect(preview.maps).toHaveLength(1);
    expect(preview.maps[0].scope).toBe('GALAXY');
    expect(preview.maps[0].fields.find(field => field.x === 8 && field.y === 8)?.label).toBe('Schema system');
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

    const nebula = new NebulaService(database);
    await nebula.apply(layer.id, { seed: 'swu-nebula-v1', target: 'GALAXY', density: 'BALANCED', fingerprint: preview.fingerprint });
    const chosen = preview.maps[0].changes[0];
    const query: StarmapQueryService = Object.assign(Object.create(StarmapQueryService.prototype), { layerRepo: database.getRepository(Layer), galaxyFieldRepo: database.getRepository(GalaxyField) });
    const visible = await query.getExploredSectorFields(1, layer.id, Math.floor((chosen.x - 1) / 10), Math.floor((chosen.y - 1) / 10), {
      getExploredFieldsInSector: async () => [{ cx: chosen.x, cy: chosen.y, explorationLevel: 'TERRAIN' }],
    } as unknown as ExplorationService);
    const known = visible.fields.find(field => field.cx === chosen.x && field.cy === chosen.y);
    expect(known?.nebulaTexture).toMatch(/^data:image\/png;base64,/);
    expect(known?.nebulaVisual).toBeUndefined();
    expect(visible.fields.filter(field => field.explorationLevel === 'UNKNOWN').every(field => field.nebulaTexture === undefined && field.nebulaVisual === undefined)).toBe(true);
    expect((await database.getRepository(Layer).findOneByOrFail({ id: layer.id })).nebulaSeedSalt).toBeUndefined();
    const admin: StarmapAdminService = Object.assign(Object.create(StarmapAdminService.prototype), { systemRepo: database.getRepository(StarSystem), systemFieldRepo: database.getRepository(SystemField), fieldTypeRepo: database.getRepository(GalaxyFieldType) });
    await expect(admin.initializeSystemGrid(system.id, { defaultFieldTypeId: 100 })).rejects.toThrow(BadRequestException);
    const systemField = await database.getRepository(SystemField).findOneByOrFail({ starSystemId: system.id, sx: 3, sy: 3 });
    await expect(admin.updateSystemField(systemField.id, { fieldTypeId: 100 })).rejects.toThrow(BadRequestException);
  });
  it('rolls back unchanged owned terrain while preserving edits and malformed metadata', async () => {
    await resetDatabase(database);
    const runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const migration = new AddNebulaGeneration20261125160000();
      await migration.down(runner);
      const [layer] = await runner.query(`INSERT INTO layers (name,width,height,"sectorSize") VALUES ('Migration',40,40,10) RETURNING id`);
      const [type] = await runner.query('SELECT * FROM galaxy_field_types WHERE id=1');
      const [nebula] = await runner.query('SELECT * FROM galaxy_field_types WHERE id=100');
      await runner.query(`INSERT INTO galaxy_fields ("layerId",cx,cy,"fieldTypeId","isPassable","energyCost",damage) VALUES ($1,1,1,1,$2,$3,$4)`, [layer.id,type.passable,type.energyCost,type.damage]);
      const before = await runner.query('SELECT * FROM galaxy_fields');
      await migration.up(runner);
      const after = await runner.query('SELECT * FROM galaxy_fields');
      expect(after.map(({ nebulaGeneration, ...field }: { nebulaGeneration: unknown }) => field)).toEqual(before);
      expect(after[0].nebulaGeneration).toBeNull();
      const baseline = { fieldTypeId:1,isPassable:type.passable,energyCost:type.energyCost,damage:type.damage,effects:null,effectFlags:null };
      const metadata = { visual:{version:2,seed:'migration',width:40,height:40,density:'BALANCED'},fieldTypeId:100,baseline };
      for (let x=2;x<=5;x++) await runner.query(`INSERT INTO galaxy_fields ("layerId",cx,cy,"fieldTypeId","isPassable","energyCost",damage,effects,"effectFlags","nebulaGeneration","passableOverride") VALUES ($1,$2,1,100,$3,$4,$5,$6,$6,$7,$8)`, [layer.id,x,nebula.passable,nebula.energyCost, x===3?99:nebula.damage,nebula.effects,JSON.stringify(x===5?{...metadata,baseline:{damage:'broken'}}:metadata),x===4?false:null]);
      await migration.down(runner);
      const fields = await runner.query('SELECT * FROM galaxy_fields ORDER BY cx');
      expect(fields.map((field: {fieldTypeId:number})=>field.fieldTypeId)).toEqual([1,1,100,100,100]);
      expect(fields[2].damage).toBe(99);
      expect(fields[3].passableOverride).toBe(false);
      expect(fields.every((field: object)=>!('nebulaGeneration' in field))).toBe(true);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

});
