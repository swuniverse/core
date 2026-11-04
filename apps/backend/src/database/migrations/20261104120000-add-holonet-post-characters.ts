import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHolonetPostCharacters20261104120000 implements MigrationInterface {
  name = 'AddHolonetPostCharacters20261104120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "holonet_post_characters" (
      "postId" integer NOT NULL REFERENCES "holonet_posts"("id") ON DELETE CASCADE,
      "characterId" integer NOT NULL REFERENCES "user_characters"("id") ON DELETE CASCADE,
      PRIMARY KEY ("postId", "characterId")
    )`);
    await queryRunner.query('CREATE INDEX "IDX_holonet_post_characters_character" ON "holonet_post_characters" ("characterId")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "holonet_post_characters"');
  }
}
