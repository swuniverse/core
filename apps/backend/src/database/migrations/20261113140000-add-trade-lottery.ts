import { MigrationInterface, QueryRunner } from 'typeorm';

/** tmw-T9: Hutt Cartel lottery (STU `stu_lottery_ticket`, `stu_lottery_buildplan`). */
export class AddTradeLottery20261113140000 implements MigrationInterface {
  name = 'AddTradeLottery20261113140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lottery_tickets" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "period" character varying(7) NOT NULL,
        "isWinner" boolean,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lottery_tickets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_lottery_tickets_period" CHECK ("period" ~ '^[0-9]{4}\\.[0-9]{2}$')
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_lottery_tickets_period_user" ON "lottery_tickets" ("period", "userId")');
    await queryRunner.query(`
      CREATE TABLE "lottery_winner_buildplans" (
        "id" SERIAL PRIMARY KEY,
        "factionId" integer NOT NULL,
        "buildplanId" integer NOT NULL,
        "chance" integer NOT NULL,
        CONSTRAINT "FK_lottery_winner_buildplans_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lottery_winner_buildplans_buildplan" FOREIGN KEY ("buildplanId") REFERENCES "admin_ship_buildplans"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_lottery_winner_buildplans_chance" CHECK ("chance" > 0)
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_lottery_winner_buildplans_faction" ON "lottery_winner_buildplans" ("factionId")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "lottery_winner_buildplans"');
    await queryRunner.query('DROP TABLE "lottery_tickets"');
  }
}
