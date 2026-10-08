import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceDiplomacyNotifications20261005160000
  implements MigrationInterface
{
  name = 'AddAllianceDiplomacyNotifications20261005160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_diplomacy_notifications" (
        "id" SERIAL NOT NULL,
        "recipientUserId" integer NOT NULL,
        "body" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deliveredAt" TIMESTAMP,
        CONSTRAINT "PK_alliance_diplomacy_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alliance_diplomacy_notifications_recipient" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_diplomacy_notifications_pending"
      ON "alliance_diplomacy_notifications" ("id")
      WHERE "deliveredAt" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_alliance_diplomacy_notifications_pending"',
    );
    await queryRunner.query('DROP TABLE "alliance_diplomacy_notifications"');
  }
}
