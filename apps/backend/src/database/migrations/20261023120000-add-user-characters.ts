import { MigrationInterface, QueryRunner } from 'typeorm';
import { characterMigrationId } from './support/character-migration-history';

export class AddUserCharacters1792756800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const bridge = await characterMigrationId(
      queryRunner,
      'PrepareUserCharacters20261023110000',
    );
    if (bridge !== undefined) {
      if (!(await queryRunner.hasTable('user_characters'))) {
        throw new Error(
          'Character migration bridge is recorded but user_characters is missing',
        );
      }
      return;
    }
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
    await queryRunner.query(
      `CREATE INDEX "IDX_user_characters_user" ON "user_characters" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bridge = await characterMigrationId(
      queryRunner,
      'PrepareUserCharacters20261023110000',
    );
    const legacy = await characterMigrationId(
      queryRunner,
      'AddUserCharacters1792756800000',
    );
    if (bridge !== undefined && legacy !== undefined && bridge < legacy) return;
    await queryRunner.query(`DROP TABLE IF EXISTS "user_characters"`);
  }
}
