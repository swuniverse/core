import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactPermissions20261104160000 implements MigrationInterface {
  name = 'AddContactPermissions20261104160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contacts"
        ADD COLUMN "treatAsFriend" boolean NOT NULL DEFAULT false,
        ADD COLUMN "shareLivePositions" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contacts_live_position_recipient"
      ON "contacts" ("contactUserId", "userId") WHERE "shareLivePositions" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_contacts_live_position_recipient"');
    await queryRunner.query(`
      ALTER TABLE "contacts"
        DROP COLUMN "shareLivePositions",
        DROP COLUMN "treatAsFriend"
    `);
  }
}
