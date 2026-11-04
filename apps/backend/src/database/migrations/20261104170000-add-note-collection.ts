import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteCollection20261104170000 implements MigrationInterface {
  name = 'AddNoteCollection20261104170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id" serial PRIMARY KEY,
        "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" varchar(100) NOT NULL CHECK (char_length("title") BETWEEN 1 AND 100),
        "text" text NOT NULL DEFAULT '',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notes_userId" ON "notes" ("userId")`);
    await queryRunner.query(`
      INSERT INTO "notes" ("userId", "title", "text")
      SELECT "id", 'Notizzettel', "notes" FROM "users"
      WHERE "notes" IS NOT NULL AND "notes" <> ''
      ORDER BY "id"
    `);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notes"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notes" text`);
    await queryRunner.query(`
      UPDATE "users" AS owner
      SET "notes" = CASE
        WHEN owner."notes" IS NULL OR owner."notes" = '' THEN restored."text"
        WHEN owner."notes" = restored."text" THEN owner."notes"
        ELSE owner."notes" || E'\\n\\n' || restored."text"
      END
      FROM (
        SELECT "userId",
          CASE
            WHEN count(*) = 1 AND min("title") = 'Notizzettel' THEN min("text")
            ELSE jsonb_pretty(jsonb_agg(jsonb_build_object(
              'id', "id", 'title', "title", 'text', "text",
              'createdAt', "createdAt", 'updatedAt', "updatedAt"
            ) ORDER BY "createdAt", "id"))
          END AS "text"
        FROM "notes"
        GROUP BY "userId"
      ) AS restored
      WHERE owner."id" = restored."userId"
    `);
    await queryRunner.query(`DROP TABLE "notes"`);
  }
}
