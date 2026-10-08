import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiplomacyNotificationDeliveryKey20261006100000
  implements MigrationInterface
{
  name = 'AddDiplomacyNotificationDeliveryKey20261006100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_notifications"
      ADD COLUMN "deliveryKey" varchar(100)
    `);
    await queryRunner.query(`
      UPDATE "alliance_diplomacy_notifications"
      SET "deliveryKey" = 'alliance-diplomacy-notification:' || "id"::text
      WHERE "deliveryKey" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_notifications"
      ALTER COLUMN "deliveryKey" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alliance_diplomacy_notifications_delivery_key"
      ON "alliance_diplomacy_notifications" ("deliveryKey")
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN "deliveryKey" varchar(100)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_messages_delivery_key"
      ON "messages" ("deliveryKey")
      WHERE "deliveryKey" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "UQ_messages_delivery_key"');
    await queryRunner.query('ALTER TABLE "messages" DROP COLUMN "deliveryKey"');
    await queryRunner.query(
      'DROP INDEX "UQ_alliance_diplomacy_notifications_delivery_key"',
    );
    await queryRunner.query(
      'ALTER TABLE "alliance_diplomacy_notifications" DROP COLUMN "deliveryKey"',
    );
  }
}
