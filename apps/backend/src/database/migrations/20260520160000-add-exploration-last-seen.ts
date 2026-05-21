import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExplorationLastSeen20260520160000 implements MigrationInterface {
  name = 'AddExplorationLastSeen20260520160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exploration_states"
      ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP NOT NULL DEFAULT NOW()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exploration_states"
      DROP COLUMN IF EXISTS "lastSeenAt"
    `);
  }
}
