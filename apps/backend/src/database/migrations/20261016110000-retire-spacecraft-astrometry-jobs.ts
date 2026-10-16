import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires the old one-tick astrometry persistence after the original
 * cartography-plan migration has already been applied in production worlds.
 */
export class RetireSpacecraftAstrometryJobs20261016110000
  implements MigrationInterface
{
  name = 'RetireSpacecraftAstrometryJobs20261016110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "spacecraft_astrometry_jobs"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_astrometry_jobs" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "spacecraftId" integer NOT NULL,
        "starSystemId" integer NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "completesAt" TIMESTAMP NOT NULL,
        "completedAt" TIMESTAMP,
        "abortReason" varchar(64),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spacecraft_astrometry_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spacecraft_astrometry_jobs_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_astrometry_jobs_ship" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_astrometry_jobs_system" FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_astrometry_jobs_user" ON "spacecraft_astrometry_jobs" ("userId")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_astrometry_jobs_ship_status" ON "spacecraft_astrometry_jobs" ("spacecraftId", "status")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_spacecraft_astrometry_active_ship" ON "spacecraft_astrometry_jobs" ("spacecraftId") WHERE "status" = \'ACTIVE\'',
    );
  }
}
