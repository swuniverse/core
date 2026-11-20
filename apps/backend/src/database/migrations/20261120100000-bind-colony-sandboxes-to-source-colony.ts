import { Logger } from '@nestjs/common';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** col-AUD-16b: a sandbox belongs to its own source colony and goes with it, like STU. */
export class BindColonySandboxesToSourceColony1795168800000 implements MigrationInterface {
  name = 'BindColonySandboxesToSourceColony1795168800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [, deleted] = (await queryRunner.query(`
      DELETE FROM "colony_sandboxes" sandbox
       WHERE NOT EXISTS (
         SELECT 1 FROM "colonies" colony
          WHERE colony."id" = sandbox."sourceColonyId"
            AND colony."userId" = sandbox."userId"
            AND colony."isAbandoned" = false
       )
    `)) as [unknown, number];
    new Logger(this.name).log(`${deleted ?? 0} Sandboxen ohne eigene Quellkolonie gelöscht`);
    await queryRunner.query(`ALTER TABLE "colony_sandboxes" DROP CONSTRAINT "FK_colony_sandboxes_source"`);
    await queryRunner.query(`ALTER TABLE "colony_sandboxes" ALTER COLUMN "sourceColonyId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "colony_sandboxes" ADD CONSTRAINT "FK_colony_sandboxes_source" FOREIGN KEY ("sourceColonyId") REFERENCES "colonies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_colony_sandboxes_source" ON "colony_sandboxes" ("sourceColonyId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_colony_sandboxes_source"`);
    await queryRunner.query(`ALTER TABLE "colony_sandboxes" DROP CONSTRAINT "FK_colony_sandboxes_source"`);
    await queryRunner.query(`ALTER TABLE "colony_sandboxes" ALTER COLUMN "sourceColonyId" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "colony_sandboxes" ADD CONSTRAINT "FK_colony_sandboxes_source" FOREIGN KEY ("sourceColonyId") REFERENCES "colonies"("id") ON DELETE SET NULL`,
    );
  }
}
