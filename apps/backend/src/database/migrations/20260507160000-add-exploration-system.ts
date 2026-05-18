import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExplorationSystem20260507160000 implements MigrationInterface {
  name = 'AddExplorationSystem20260507160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exploration_states" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "layerId" integer NOT NULL,
        "cx" integer NOT NULL,
        "cy" integer NOT NULL,
        "explorationLevel" character varying(16) NOT NULL DEFAULT 'TERRAIN',
        "discoverySource" character varying(64),
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_exploration_user_layer_pos"
        ON "exploration_states" ("userId", "layerId", "cx", "cy")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_exploration_user_layer"
        ON "exploration_states" ("userId", "layerId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_explorations" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "starSystemId" integer NOT NULL,
        "discoverySource" character varying(64),
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_system_exploration_user_system"
        ON "system_explorations" ("userId", "starSystemId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_system_exploration_user"
        ON "system_explorations" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "system_explorations"');
    await queryRunner.query('DROP TABLE IF EXISTS "exploration_states"');
  }
}
