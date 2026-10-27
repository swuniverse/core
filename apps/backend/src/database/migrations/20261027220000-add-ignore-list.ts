import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIgnoreList20261027220000 implements MigrationInterface {
  name = 'AddIgnoreList20261027220000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ignore_list" (
        "id" SERIAL NOT NULL,
        "ownerId" integer NOT NULL,
        "ignoredUserId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ignore_list_owner_ignored" UNIQUE ("ownerId", "ignoredUserId"),
        CONSTRAINT "PK_ignore_list" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ignore_list_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ignore_list_ignored_user" FOREIGN KEY ("ignoredUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ignore_list"`);
  }
}
