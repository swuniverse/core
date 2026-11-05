import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlotPostRequests20261105120000 implements MigrationInterface {
  name = 'AddPlotPostRequests20261105120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plot_post_requests" (
        "id" SERIAL NOT NULL,
        "postId" integer NOT NULL,
        "plotId" integer NOT NULL,
        "requesterId" integer NOT NULL,
        "authorId" integer NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plot_post_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_plot_post_requests_post" FOREIGN KEY ("postId") REFERENCES "holonet_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plot_post_requests_plot" FOREIGN KEY ("plotId") REFERENCES "rpg_plots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plot_post_requests_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_plot_post_requests_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_plot_post_requests_status" CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_plot_post_requests_pending_post_plot"
      ON "plot_post_requests" ("postId", "plotId") WHERE "status" = 'PENDING'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_plot_post_requests_author_status_created"
      ON "plot_post_requests" ("authorId", "status", "createdAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "plot_post_requests"');
  }
}
