import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonySandboxes20261116100000 implements MigrationInterface {
  name = 'AddColonySandboxes20261116100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "colony_sandboxes" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "sourceColonyId" integer,
        "name" varchar(100) NOT NULL,
        "snapshot" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "FK_colony_sandboxes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_colony_sandboxes_source" FOREIGN KEY ("sourceColonyId") REFERENCES "colonies"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_colony_sandboxes_name" CHECK (length(btrim("name")) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_colony_sandboxes_user" ON "colony_sandboxes" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "colony_sandboxes"');
  }
}
