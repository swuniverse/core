import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceForum20261009100100 implements MigrationInterface {
  name = 'AddAllianceForum20261009100100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_forum_boards" (
        "id" SERIAL NOT NULL,
        "allianceId" integer NOT NULL,
        "name" varchar(80) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastActivityAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "deletedByUserId" integer,
        "deletedByName" varchar(255),
        CONSTRAINT "PK_alliance_forum_boards" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_forum_boards_name" CHECK (char_length("name") BETWEEN 5 AND 80),
        CONSTRAINT "FK_alliance_forum_boards_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_forum_boards_deleted_by" FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_forum_boards_alliance" ON "alliance_forum_boards" ("allianceId", "id")',
    );

    await queryRunner.query(`
      CREATE TABLE "alliance_forum_topics" (
        "id" SERIAL NOT NULL,
        "boardId" integer NOT NULL,
        "allianceId" integer NOT NULL,
        "title" varchar(120) NOT NULL,
        "authorUserId" integer,
        "authorName" varchar(255) NOT NULL,
        "important" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastActivityAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "deletedByUserId" integer,
        "deletedByName" varchar(255),
        CONSTRAINT "PK_alliance_forum_topics" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_forum_topics_title" CHECK (char_length("title") BETWEEN 1 AND 120),
        CONSTRAINT "FK_alliance_forum_topics_board" FOREIGN KEY ("boardId") REFERENCES "alliance_forum_boards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_forum_topics_alliance" FOREIGN KEY ("allianceId") REFERENCES "alliances"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_forum_topics_author" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_alliance_forum_topics_deleted_by" FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_forum_topics_board_order"
      ON "alliance_forum_topics" ("boardId", "important" DESC, "lastActivityAt" DESC, "id" DESC)
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_forum_topics_alliance_recent"
      ON "alliance_forum_topics" ("allianceId", "lastActivityAt" DESC, "id" DESC)
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "alliance_forum_posts" (
        "id" SERIAL NOT NULL,
        "topicId" integer NOT NULL,
        "authorUserId" integer,
        "authorName" varchar(255) NOT NULL,
        "text" text NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "editedAt" TIMESTAMP,
        "deletedAt" TIMESTAMP,
        "deletedByUserId" integer,
        "deletedByName" varchar(255),
        CONSTRAINT "PK_alliance_forum_posts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_alliance_forum_posts_text" CHECK (
          ("deletedAt" IS NULL AND char_length("text") BETWEEN 1 AND 20000)
          OR ("deletedAt" IS NOT NULL AND "text" = '')
        ),
        CONSTRAINT "FK_alliance_forum_posts_topic" FOREIGN KEY ("topicId") REFERENCES "alliance_forum_topics"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alliance_forum_posts_author" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_alliance_forum_posts_deleted_by" FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_alliance_forum_posts_topic_order" ON "alliance_forum_posts" ("topicId", "createdAt", "id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "alliance_forum_posts"');
    await queryRunner.query('DROP TABLE "alliance_forum_topics"');
    await queryRunner.query('DROP TABLE "alliance_forum_boards"');
  }
}
