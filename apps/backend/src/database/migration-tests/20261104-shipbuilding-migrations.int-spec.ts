import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { GeneralizeShipBuildQueueOrigin20261102120000 } from '../migrations/20261102120000-generalize-ship-build-queue-origin';
import { CompleteShipbuildingSnapshots20261104200000 } from '../migrations/20261104200000-complete-shipbuilding-snapshots';

// Known SHA256 of {"shipClassId":42,"moduleSelections":[{"slotId":"a","commodityId":101},{"slotId":"b","commodityId":102}]}.
// Literal expectations do not repeat the migration's sorting/hash implementation.
const selectedSignature =
  '15389678c8ff0fe6bb7da0d330451a841be3a1bcc7b05188800b84f03ccc654f';
const emptySignature =
  '8529b4c85536ae8079bcbb4b5ef2b5006bd88e47aeca8cdde063f197efe11af6';

// Deliberately no entities, synchronize, or historic migration runner: each
// migration operates on its own minimal, pre-migration PostgreSQL schema.
describe('shipbuilding persistence migrations (Postgres)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const originMigration = new GeneralizeShipBuildQueueOrigin20261102120000();

  beforeAll(async () => {
    if (!process.env.INTEGRATION_DATABASE_URL) {
      throw new Error('Run with the backend integration Jest configuration');
    }
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    schema = `shipbuilding_migration_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`SET TIME ZONE 'UTC'`);
    await runner.query(`
      CREATE TABLE "colonies" ("id" integer PRIMARY KEY);
      CREATE TABLE "ship_class_defs" ("id" integer PRIMARY KEY);
      CREATE TABLE "spacecraft" ("id" integer PRIMARY KEY);
      INSERT INTO "colonies" VALUES (11);
      INSERT INTO "ship_class_defs" VALUES (42);
      INSERT INTO "spacecraft" VALUES (21), (22);
      CREATE TABLE "colony_ship_build_queue" (
        "id" serial PRIMARY KEY,
        "colonyId" integer NOT NULL REFERENCES "colonies"("id") ON DELETE CASCADE,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL REFERENCES "ship_class_defs"("id"),
        "mode" varchar NOT NULL DEFAULT 'BUILD',
        "buildingFunctionId" integer,
        "spacecraftId" integer REFERENCES "spacecraft"("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "buildPlanName" varchar(255),
        "buildPlanId" integer,
        "buildPlanSignature" varchar(128),
        "moduleSelections" jsonb NOT NULL DEFAULT '[]',
        "moduleTypes" jsonb NOT NULL DEFAULT '[]',
        "moduleCommodityIds" jsonb NOT NULL DEFAULT '[]',
        "crewRequired" integer,
        "repairSnapshot" jsonb,
        "retrofitSnapshot" jsonb,
        "finishesAt" timestamp NOT NULL,
        "stoppedAt" timestamp,
        "status" varchar NOT NULL DEFAULT 'QUEUED'
      );
      CREATE INDEX "IDX_colony_ship_queue_colony_status"
        ON "colony_ship_build_queue" ("colonyId", "status");
      CREATE TABLE "colony_ship_buildplans" (
        "id" serial PRIMARY KEY,
        "userId" integer NOT NULL,
        "shipClassId" integer NOT NULL,
        "name" varchar(255) NOT NULL,
        "signature" varchar(128) NOT NULL,
        "moduleSelections" jsonb NOT NULL DEFAULT '[]',
        "moduleTypes" jsonb NOT NULL DEFAULT '[]',
        "moduleCommodityIds" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        UNIQUE ("userId", "name"),
        UNIQUE ("userId", "signature")
      );
    `);
  });

  afterEach(async () => {
    if (!runner) return;
    try {
      await runner.query('SET search_path TO public');
      await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await runner.release();
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it.each(['QUEUED', 'PAUSED', 'COMPLETED', 'CANCELLED'])(
    'refuses origin rollback with a %s station job before losing rows or changing the schema',
    async (status) => {
      await insertColonyJob('BUILD', 'QUEUED');
      await originMigration.up(runner);
      await runner.query(
        `
      INSERT INTO "colony_ship_build_queue"
        ("source", "stationId", "colonyId", "userId", "shipClassId", "name", "status", "finishesAt", "crewRequired")
      VALUES ('STATION', 21, NULL, 7, 42, 'Paid station build', $1, '2026-11-05 12:34:56', 8)
    `,
        [status],
      );
      const jobsBefore = await queueRows();
      const schemaBefore = await queueSchema();

      // No enclosing transaction: a destructive down cannot hide behind a
      // test rollback, and refusal must happen before any DELETE or DDL.
      const refusal = await originMigration
        .down(runner)
        .catch((error: Error) => error);

      expect(await queueRows()).toEqual(jobsBefore);
      expect(await queueSchema()).toEqual(schemaBefore);
      expect(refusal).toBeInstanceOf(Error);
      expect((refusal as Error).message).toMatch(/station/i);
    },
  );

  it('preserves every colony BUILD/REPAIR/RETROFIT state, reference, time and snapshot through origin up/down', async () => {
    await insertColonyJobMatrix();
    const before = await queueRows();

    await originMigration.up(runner);

    expect(await queueRows()).toEqual(
      before.map((job) => ({
        ...job,
        source: 'COLONY',
        stationId: null,
      })),
    );
    await originMigration.down(runner);
    expect(await queueRows()).toEqual(before);
    expect(
      await runner.query(
        `
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'colony_ship_build_queue' AND column_name = 'colonyId'
    `,
        [schema],
      ),
    ).toEqual([{ is_nullable: 'NO' }]);
    await expect(
      runner.query(`UPDATE "colony_ship_build_queue" SET "colonyId" = NULL`),
    ).rejects.toMatchObject({ driverError: { code: '23502' } });
  });

  it.each([
    ['COLONY', null, null],
    ['COLONY', 11, 21],
    ['COLONY', null, 21],
    ['STATION', null, null],
    ['STATION', 11, 21],
    ['STATION', 11, null],
    ['OTHER', 11, null],
    ['OTHER', null, 21],
  ])(
    'rejects invalid origin %s / colony %s / station %s',
    async (source, colonyId, stationId) => {
      const id = await insertColonyJob('BUILD', 'QUEUED');
      await originMigration.up(runner);
      await expect(
        runner.query(
          `
      UPDATE "colony_ship_build_queue" SET "source" = $1, "colonyId" = $2, "stationId" = $3 WHERE "id" = $4
    `,
          [source, colonyId, stationId, id],
        ),
      ).rejects.toMatchObject({
        driverError: {
          code: '23514',
          constraint: 'CHK_ship_build_queue_one_source',
        },
      });
    },
  );

  it('enforces both origin foreign keys and station deletion cascades only its jobs', async () => {
    await insertColonyJob('BUILD', 'QUEUED');
    const stationJob = await insertColonyJob('RETROFIT', 'PAUSED');
    await originMigration.up(runner);
    await expect(
      runner.query(
        `
      UPDATE "colony_ship_build_queue" SET "source" = 'STATION', "colonyId" = NULL, "stationId" = 999
      WHERE "id" = $1
    `,
        [stationJob],
      ),
    ).rejects.toMatchObject({
      driverError: { code: '23503', constraint: 'FK_ship_build_queue_station' },
    });
    await expect(
      runner.query(
        `UPDATE "colony_ship_build_queue" SET "colonyId" = 999 WHERE "id" = $1`,
        [stationJob],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await runner.query(
      `
      UPDATE "colony_ship_build_queue" SET "source" = 'STATION', "colonyId" = NULL, "stationId" = 21
      WHERE "id" = $1
    `,
      [stationJob],
    );
    await runner.query('DELETE FROM "spacecraft" WHERE "id" = 21');
    expect(await queueRows()).toEqual([
      expect.objectContaining({
        colonyId: 11,
        source: 'COLONY',
        stationId: null,
      }),
    ]);
  });

  it('backfills missing station blueprint provenance without changing jobs or inventing historical module snapshots', async () => {
    await insertColonyJobMatrix();
    // Even colony jobs without provenance must not be touched by the station backfill.
    await runner.query(`
      UPDATE "colony_ship_build_queue" SET "buildPlanId" = NULL, "buildPlanName" = NULL, "buildPlanSignature" = NULL
      WHERE "id" = 1
    `);
    await originMigration.up(runner);
    const stationJob = await insertStationJob('BUILD', 'PAUSED');
    const before = await queueRows();

    await new CompleteShipbuildingSnapshots20261104200000().up(runner);

    const plans = await runner.query('SELECT * FROM "colony_ship_buildplans"');
    expect(plans).toEqual([
      expect.objectContaining({
        userId: 7,
        shipClassId: 42,
        name: `Raumwerft Bauplan ${stationJob}`,
        signature: selectedSignature,
        moduleSelections: [
          { slotId: 'b', commodityId: 102 },
          { slotId: 'a', commodityId: 101 },
        ],
        moduleTypes: ['REACTOR', 'HULL'],
        moduleCommodityIds: [102, 101],
      }),
    ]);
    expect(await queueRows()).toEqual(
      before.map((job) => ({
        ...job,
        ...(job.id === stationJob
          ? {
              buildPlanId: plans[0].id,
              buildPlanName: plans[0].name,
              buildPlanSignature: selectedSignature,
            }
          : {}),
        buildSnapshot: null,
      })),
    );
    expect(
      await runner.query(
        `
      SELECT data_type, is_nullable, column_default FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'colony_ship_build_queue' AND column_name = 'buildSnapshot'
    `,
        [schema],
      ),
    ).toEqual([
      { data_type: 'jsonb', is_nullable: 'YES', column_default: null },
    ]);
  });

  it('reuses signatures globally per user, independent of slot order, while retaining existing plans and station provenance', async () => {
    await originMigration.up(runner);
    const [{ id: existingPlanId }] = await runner.query(
      `
      INSERT INTO "colony_ship_buildplans"
        ("userId", "shipClassId", "name", "signature", "moduleSelections", "moduleTypes", "moduleCommodityIds", "createdAt")
      VALUES (7, 42, 'Player named plan', $1,
        '[{"slotId":"a","commodityId":101},{"slotId":"b","commodityId":102}]',
        '["HULL","REACTOR"]', '[101,102]', '2026-10-01 01:02:03.456') RETURNING "id"
    `,
      [selectedSignature],
    );
    const plansBefore = await runner.query(
      'SELECT * FROM "colony_ship_buildplans"',
    );
    const reuseJobs = [];
    for (const status of ['QUEUED', 'PAUSED', 'COMPLETED', 'CANCELLED']) {
      reuseJobs.push(await insertStationJob('BUILD', status));
    }
    // A different station owned by the same user reuses the global plan too.
    await runner.query(
      'UPDATE "colony_ship_build_queue" SET "stationId" = 22 WHERE "id" = $1',
      [reuseJobs[1]],
    );
    const otherUserJob = await insertStationJob('BUILD', 'QUEUED', 8);
    const duplicateJob = await insertStationJob('RETROFIT', 'PAUSED', 8);
    await runner.query(
      `
      UPDATE "colony_ship_build_queue" SET "moduleSelections" =
        '[{"commodityId":101,"slotId":"a"},{"commodityId":102,"slotId":"b"}]' WHERE "id" = $1
    `,
      [duplicateJob],
    );
    const existingJob = await insertStationJob('BUILD', 'COMPLETED');
    await runner.query(
      `
      UPDATE "colony_ship_build_queue"
      SET "buildPlanId" = $1, "buildPlanName" = 'Historical plan name', "buildPlanSignature" = 'historical-signature'
      WHERE "id" = $2
    `,
      [existingPlanId, existingJob],
    );
    const before = await queueRows();
    const migration = new CompleteShipbuildingSnapshots20261104200000();

    await migration.up(runner);

    const plans = await buildplanRows();
    expect(plans).toHaveLength(2);
    expect(plans[0]).toEqual(plansBefore[0]);
    expect(plans[1]).toMatchObject({
      userId: 8,
      name: `Raumwerft Bauplan ${otherUserJob}`,
      signature: selectedSignature,
    });
    expect(await queueRows()).toEqual(
      before.map((job) => ({
        ...job,
        ...(job.id !== existingJob
          ? {
              buildPlanId: job.userId === 7 ? existingPlanId : plans[1].id,
              buildPlanName:
                job.userId === 7 ? 'Player named plan' : plans[1].name,
              buildPlanSignature: selectedSignature,
            }
          : {}),
        buildSnapshot: null,
      })),
    );
    const after = await queueRows();
    await migration.up(runner);
    expect(await queueRows()).toEqual(after);
    expect(await buildplanRows()).toEqual(plans);
  });

  it('generates collision-safe names in the owner scope and preserves existing plans', async () => {
    await originMigration.up(runner);
    const job = await insertStationJob('BUILD', 'QUEUED');
    await runner.query(
      `UPDATE "colony_ship_build_queue" SET "moduleSelections" = '[]', "moduleTypes" = '[]', "moduleCommodityIds" = '[]' WHERE "id" = $1`,
      [job],
    );
    await runner.query(
      `
      INSERT INTO "colony_ship_buildplans" ("userId", "shipClassId", "name", "signature")
      VALUES (7, 42, $1, 'occupied-base'), (7, 42, $2, 'occupied-suffix'), (8, 42, $3, 'another-owner')
    `,
      [
        `Raumwerft Bauplan ${job}`,
        `Raumwerft Bauplan ${job} (2)`,
        `Raumwerft Bauplan ${job} (3)`,
      ],
    );
    const before = await buildplanRows();

    await new CompleteShipbuildingSnapshots20261104200000().up(runner);

    const plans = await buildplanRows();
    expect(plans.slice(0, 3)).toEqual(before);
    expect(plans).toHaveLength(4);
    expect(plans[3]).toMatchObject({
      userId: 7,
      name: `Raumwerft Bauplan ${job} (3)`,
      signature: emptySignature,
      moduleSelections: [],
      moduleTypes: [],
      moduleCommodityIds: [],
    });
    expect(await queueRows()).toEqual([
      expect.objectContaining({
        buildPlanId: plans[3].id,
        buildPlanName: plans[3].name,
        buildPlanSignature: emptySignature,
      }),
    ]);
  });

  it('stores new JSON snapshots without replacing existing snapshots or backfilling legacy ones on rerun', async () => {
    await insertColonyJob('BUILD', 'QUEUED');
    await originMigration.up(runner);
    const stationJob = await insertStationJob('BUILD', 'PAUSED');
    const migration = new CompleteShipbuildingSnapshots20261104200000();
    await migration.up(runner);
    const snapshot = {
      shipClassId: 42,
      crewRequired: 8,
      modules: [
        {
          slotId: 'a',
          commodityId: 101,
          moduleType: 'HULL',
          category: 'HULL',
          level: 2,
        },
      ],
    };
    await runner.query(
      'UPDATE "colony_ship_build_queue" SET "buildSnapshot" = $1::jsonb WHERE "id" = $2',
      [JSON.stringify(snapshot), stationJob],
    );
    const before = await queueRows();

    await migration.up(runner);

    expect(await queueRows()).toEqual(before);
    expect(before).toEqual([
      expect.objectContaining({ source: 'COLONY', buildSnapshot: null }),
      expect.objectContaining({ source: 'STATION', buildSnapshot: snapshot }),
    ]);
  });

  it('snapshot rollback drops only the snapshot column and keeps all blueprints and job provenance', async () => {
    await insertColonyJob('RETROFIT', 'PAUSED');
    await originMigration.up(runner);
    await insertStationJob('BUILD', 'QUEUED');
    await insertStationJob('REPAIR', 'PAUSED');
    const migration = new CompleteShipbuildingSnapshots20261104200000();
    await migration.up(runner);
    const before = await queueRows();
    const plansBefore = await buildplanRows();
    const schemaBefore = await queueSchema();

    await migration.down(runner);

    expect(
      await runner.query(
        `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'colony_ship_build_queue' AND column_name = 'buildSnapshot'
    `,
        [schema],
      ),
    ).toEqual([]);
    expect(await queueRows()).toEqual(
      before.map((job) => {
        const legacyJob = { ...job };
        delete legacyJob.buildSnapshot;
        return legacyJob;
      }),
    );
    expect(await buildplanRows()).toEqual(plansBefore);
    expect(await queueSchema()).toEqual({
      ...schemaBefore,
      columns: schemaBefore.columns.filter(
        (column: { column_name: string }) =>
          column.column_name !== 'buildSnapshot',
      ),
    });
    // A later origin rollback must still refuse; snapshot down did not erase
    // the paid station rows to make the older schema fit.
    await expect(originMigration.down(runner)).rejects.toThrow(/station/i);
    await migration.up(runner);
    expect(await queueRows()).toEqual(before);
    expect(await buildplanRows()).toEqual(plansBefore);
  });

  async function insertColonyJobMatrix() {
    for (const mode of ['BUILD', 'REPAIR', 'RETROFIT']) {
      for (const status of ['QUEUED', 'PAUSED', 'COMPLETED', 'CANCELLED']) {
        await insertColonyJob(mode, status);
      }
    }
  }

  async function insertStationJob(
    mode: string,
    status: string,
    userId = 7,
  ): Promise<number> {
    const id = await insertColonyJob(mode, status);
    await runner.query(
      `
      UPDATE "colony_ship_build_queue" SET "source" = 'STATION', "colonyId" = NULL, "stationId" = 21,
        "userId" = $1, "buildPlanId" = NULL, "buildPlanName" = NULL, "buildPlanSignature" = NULL
      WHERE "id" = $2
    `,
      [userId, id],
    );
    return id;
  }

  async function buildplanRows(): Promise<Array<Record<string, unknown>>> {
    return runner.query('SELECT * FROM "colony_ship_buildplans" ORDER BY "id"');
  }

  async function queueRows(): Promise<Array<Record<string, unknown>>> {
    return runner.query(
      'SELECT * FROM "colony_ship_build_queue" ORDER BY "id"',
    );
  }

  async function queueSchema() {
    return {
      columns: await runner.query(
        `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'colony_ship_build_queue'
        ORDER BY ordinal_position
      `,
        [schema],
      ),
      constraints: await runner.query(`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'colony_ship_build_queue'::regclass
        ORDER BY conname
      `),
      indexes: await runner.query(
        `
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = $1 AND tablename = 'colony_ship_build_queue'
        ORDER BY indexname
      `,
        [schema],
      ),
    };
  }

  async function insertColonyJob(
    mode: string,
    status: string,
  ): Promise<number> {
    const [{ id }] = await runner.query(
      `
      INSERT INTO "colony_ship_build_queue" (
        "colonyId", "userId", "shipClassId", "mode", "buildingFunctionId", "spacecraftId", "name",
        "buildPlanName", "buildPlanId", "buildPlanSignature", "moduleSelections", "moduleTypes",
        "moduleCommodityIds", "crewRequired", "repairSnapshot", "retrofitSnapshot",
        "finishesAt", "stoppedAt", "status"
      ) VALUES (
        11, 7, 42, $1, $2, $3, $4, 'Original plan', 501, 'original-plan-signature',
        '[{"slotId":"b","commodityId":102},{"slotId":"a","commodityId":101}]',
        '["REACTOR","HULL"]', '[102,101]', 8,
        '{"hullBefore":10,"hullAfter":100,"moduleIntegrityBefore":[{"moduleId":3,"integrity":25}],"costs":[{"commodityId":80,"amount":9}]}',
        '{"oldModuleSelections":[{"slotId":"a","commodityId":90}],"newModuleSelections":[{"slotId":"a","commodityId":101}],"newModuleTypes":["HULL"],"returnedModuleCommodityIds":[90],"consumedModuleCommodityIds":[101]}',
        '2026-11-05 12:34:56.123', $5, $6
      ) RETURNING "id"
    `,
      [
        mode,
        mode === 'REPAIR' ? null : 8,
        mode === 'BUILD' ? null : 22,
        `${mode} ${status}`,
        status === 'PAUSED' ? '2026-11-04 10:20:30.456' : null,
        status,
      ],
    );
    return id;
  }
});
