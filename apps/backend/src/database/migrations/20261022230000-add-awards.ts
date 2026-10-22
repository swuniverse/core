import { MigrationInterface, QueryRunner } from 'typeorm';
import { AWARD_CATALOG, AWARD_IMAGE } from '../../modules/awards/award.catalog';

export class AddAwards20261022230000 implements MigrationInterface {
  name = 'AddAwards20261022230000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "awards" (
        "key" varchar(64) PRIMARY KEY,
        "description" varchar(255) NOT NULL,
        "image" varchar(255) NOT NULL,
        "prestige" integer NOT NULL DEFAULT 0,
        "isNpc" boolean NOT NULL DEFAULT false,
        CONSTRAINT "CHK_awards_prestige_nonnegative" CHECK ("prestige" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_awards" (
        "id" SERIAL PRIMARY KEY,
        "userId" integer NOT NULL,
        "awardKey" varchar(64) NOT NULL,
        "count" integer NOT NULL DEFAULT 1,
        "firstGrantedAt" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "CHK_user_awards_count_positive" CHECK ("count" >= 1),
        CONSTRAINT "UQ_user_awards_user_award" UNIQUE ("userId", "awardKey"),
        CONSTRAINT "FK_user_awards_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_awards_award" FOREIGN KEY ("awardKey") REFERENCES "awards"("key") ON DELETE CASCADE
      )
    `);
    for (const award of AWARD_CATALOG) {
      await queryRunner.query(
        `INSERT INTO "awards" ("key", "description", "image", "prestige", "isNpc")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("key") DO UPDATE SET
           "description" = EXCLUDED."description",
           "image" = EXCLUDED."image",
           "prestige" = EXCLUDED."prestige",
           "isNpc" = EXCLUDED."isNpc"`,
        [award.key, award.description, AWARD_IMAGE, award.prestige, award.isNpc],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "user_awards"');
    await queryRunner.query('DROP TABLE IF EXISTS "awards"');
  }
}
