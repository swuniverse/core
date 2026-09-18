import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivateExistingTorpedoes20260910210000 implements MigrationInterface {
  name = 'ActivateExistingTorpedoes20260910210000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft_torpedo_storage" storage
      SET "isActive" = true
      WHERE storage."amount" > 0
        AND NOT EXISTS (
          SELECT 1 FROM "spacecraft_torpedo_storage" active
          WHERE active."spacecraftId" = storage."spacecraftId"
            AND active."isActive" = true
        )
    `);
  }

  async down(): Promise<void> {
    // Existing active selections are intentionally preserved.
  }
}
