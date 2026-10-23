import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCharacters1792756800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_characters" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "name" varchar(60) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "avatar" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_characters" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_characters_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_characters_user" ON "user_characters" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_characters"`);
  }
}
