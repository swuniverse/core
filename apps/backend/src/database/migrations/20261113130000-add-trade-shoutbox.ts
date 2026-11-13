import { MigrationInterface, QueryRunner } from 'typeorm';

/** tmw-T6: one shoutbox per trade network (STU `stu_trade_shoutbox`). */
export class AddTradeShoutbox20261113130000 implements MigrationInterface {
  name = 'AddTradeShoutbox20261113130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trade_shoutbox_entries" (
        "id" SERIAL PRIMARY KEY,
        "networkId" integer NOT NULL,
        "userId" integer NOT NULL,
        "message" character varying(200) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_trade_shoutbox_entries_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_trade_shoutbox_entries_network" CHECK ("networkId" > 0),
        CONSTRAINT "CHK_trade_shoutbox_entries_message" CHECK (length("message") > 0)
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_trade_shoutbox_entries_network" ON "trade_shoutbox_entries" ("networkId", "id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "trade_shoutbox_entries"');
  }
}
