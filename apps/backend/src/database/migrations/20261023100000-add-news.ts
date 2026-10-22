import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNews20261023100000 implements MigrationInterface {
  name = 'AddNews20261023100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "news" (
      "id" SERIAL NOT NULL,
      "title" varchar(255) NOT NULL,
      "text" text NOT NULL,
      "links" jsonb NOT NULL DEFAULT '[]',
      "isChangelog" boolean NOT NULL DEFAULT false,
      "authorId" integer NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_news" PRIMARY KEY ("id"),
      CONSTRAINT "FK_news_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query('CREATE INDEX "IDX_news_createdAt" ON "news" ("createdAt" DESC, "id" DESC)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "news"');
  }
}
