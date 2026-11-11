import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnomalies20261111100000 implements MigrationInterface {
  name = 'AddAnomalies20261111100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "anomaly_types" (
        "id" SERIAL PRIMARY KEY,
        "key" varchar(64) NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "anomalies" (
        "id" SERIAL PRIMARY KEY,
        "typeId" integer NOT NULL,
        "locationId" integer,
        "parentId" integer,
        "remainingTicks" integer NOT NULL,
        "data" jsonb,
        CONSTRAINT "FK_anomalies_type" FOREIGN KEY ("typeId") REFERENCES "anomaly_types"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_anomalies_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_anomalies_parent" FOREIGN KEY ("parentId") REFERENCES "anomalies"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_anomalies_location" ON "anomalies" ("locationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_anomalies_parent" ON "anomalies" ("parentId")',
    );
    await queryRunner.query(
      'CREATE TABLE "anomaly_tick_runs" ("tickNumber" bigint PRIMARY KEY)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "anomaly_tick_runs"');
    await queryRunner.query('DROP TABLE "anomalies"');
    await queryRunner.query('DROP TABLE "anomaly_types"');
  }
}
