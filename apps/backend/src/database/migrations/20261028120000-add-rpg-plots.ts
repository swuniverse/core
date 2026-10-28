import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRpgPlots20261028120000 implements MigrationInterface {
  name = 'AddRpgPlots20261028120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rpg_plots" (
        "id" SERIAL NOT NULL,
        "creatorId" integer NOT NULL,
        "title" character varying(80) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "endedAt" TIMESTAMP,
        CONSTRAINT "PK_rpg_plots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_rpg_plots_creator" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_rpg_plots_title" CHECK (char_length("title") BETWEEN 6 AND 80),
        CONSTRAINT "CHK_rpg_plots_description" CHECK (char_length("description") <= 5000)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rpg_plot_members" (
        "id" SERIAL NOT NULL,
        "plotId" integer NOT NULL,
        "userId" integer NOT NULL,
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rpg_plot_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rpg_plot_members_plot_user" UNIQUE ("plotId", "userId"),
        CONSTRAINT "FK_rpg_plot_members_plot" FOREIGN KEY ("plotId") REFERENCES "rpg_plots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_rpg_plot_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_rpg_plots_ended_started" ON "rpg_plots" ("endedAt", "startedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_rpg_plot_members_user" ON "rpg_plot_members" ("userId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "rpg_plot_members"');
    await queryRunner.query('DROP TABLE IF EXISTS "rpg_plots"');
  }
}
