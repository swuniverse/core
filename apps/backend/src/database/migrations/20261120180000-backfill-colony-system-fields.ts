import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SWU colonies were founded without "systemFieldId", which breaks the
 * colony sector scan. Link every unlinked colony to the system field at its
 * position. Idempotent.
 */
export class BackfillColonySystemFields20261120180000 implements MigrationInterface {
  name = 'BackfillColonySystemFields20261120180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colonies" AS colony
      SET "systemFieldId" = field."id"
      FROM "system_fields" AS field
      WHERE colony."systemFieldId" IS NULL
        AND field."starSystemId" = colony."starSystemId"
        AND field."sx" = colony."posX"
        AND field."sy" = colony."posY"
    `);
  }

  async down(): Promise<void> {
    // Data repair; nothing to undo.
  }
}
