import { MigrationInterface, QueryRunner } from 'typeorm';

export class StuGameDataReset20260611120000 implements MigrationInterface {
  name = 'StuGameDataReset20260611120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colony_fields" field
      SET "buildingId" = CASE
        WHEN field."buildingId" = 1 THEN CASE WHEN "user"."factionId" = 2 THEN 82010300 ELSE 82010100 END
        WHEN field."buildingId" = 2 THEN CASE WHEN "user"."factionId" = 2 THEN 61010300 ELSE 61010100 END
        WHEN field."buildingId" = 3 THEN CASE WHEN "user"."factionId" = 2 THEN 31010300 ELSE 31010100 END
        WHEN field."buildingId" = 4 THEN CASE WHEN "user"."factionId" = 2 THEN 21010300 ELSE 21010100 END
        WHEN field."buildingId" = 5 THEN CASE WHEN "user"."factionId" = 2 THEN 61030300 ELSE 61030100 END
        WHEN field."buildingId" = 6 THEN CASE WHEN "user"."factionId" = 2 THEN 62020300 ELSE 62020100 END
        WHEN field."buildingId" = 7 THEN CASE WHEN "user"."factionId" = 2 THEN 11010300 ELSE 11010100 END
        WHEN field."buildingId" = 9 THEN CASE WHEN "user"."factionId" = 2 THEN 71010300 ELSE 71010100 END
        WHEN field."buildingId" = 10 THEN CASE WHEN "user"."factionId" = 2 THEN 72010300 ELSE 72010100 END
        WHEN field."buildingId" = 11 THEN CASE WHEN "user"."factionId" = 2 THEN 85010300 ELSE 85010100 END
        WHEN field."buildingId" = 12 THEN CASE WHEN "user"."factionId" = 2 THEN 81990300 ELSE 81990100 END
        WHEN field."buildingId" = 13 THEN CASE WHEN "user"."factionId" = 2 THEN 81210300 ELSE 81210100 END
        WHEN field."buildingId" = 14 THEN CASE WHEN "user"."factionId" = 2 THEN 81120300 ELSE 81120100 END
        WHEN field."buildingId" = 15 THEN CASE WHEN "user"."factionId" = 2 THEN 31910300 ELSE 31910100 END
        WHEN field."buildingId" = 17 THEN CASE WHEN "user"."factionId" = 2 THEN 61110300 ELSE 61110100 END
        WHEN field."buildingId" = 18 THEN CASE WHEN "user"."factionId" = 2 THEN 63110300 ELSE 63110100 END
        WHEN field."buildingId" = 19 THEN CASE WHEN "user"."factionId" = 2 THEN 61020300 ELSE 61020100 END
        ELSE NULL
      END
      FROM "colonies" colony
      JOIN "users" "user" ON "user"."id" = colony."userId"
      WHERE field."colonyId" = colony."id"
        AND field."buildingId" IS NOT NULL
    `);
    await queryRunner.query(`
      DELETE FROM "research"
      WHERE "techId" IN (1002, 1004, 1005)
    `);
    await queryRunner.query(`
      INSERT INTO "research" ("userId", "techId", "status", "progress", "remainingPoints", "spentPoints", "sourceCommodityId", "blockedReason")
      SELECT "id", 1001, 'COMPLETED', 0, 0, 0, 1701, NULL
      FROM "users"
      WHERE COALESCE("factionId", 1) = 1
      ON CONFLICT ("userId", "techId") DO UPDATE SET
        "status" = 'COMPLETED',
        "remainingPoints" = 0,
        "spentPoints" = 0,
        "blockedReason" = NULL
    `);
    await queryRunner.query(`
      INSERT INTO "research" ("userId", "techId", "status", "progress", "remainingPoints", "spentPoints", "sourceCommodityId", "blockedReason")
      SELECT "id", 1003, 'COMPLETED', 0, 0, 0, 1701, NULL
      FROM "users"
      WHERE "factionId" = 2
      ON CONFLICT ("userId", "techId") DO UPDATE SET
        "status" = 'COMPLETED',
        "remainingPoints" = 0,
        "spentPoints" = 0,
        "blockedReason" = NULL
    `);
  }

  public async down(): Promise<void> {
    // Data reset migration: no automatic restore possible.
  }
}
