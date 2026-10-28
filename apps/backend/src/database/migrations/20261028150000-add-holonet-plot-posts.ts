import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHolonetPlotPosts20261028150000 implements MigrationInterface {
  name = 'AddHolonetPlotPosts20261028150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "holonet_posts" ADD COLUMN "plotId" integer');
    await queryRunner.query(
      'CREATE INDEX "IDX_holonet_posts_plot_created" ON "holonet_posts" ("plotId", "createdAt")',
    );
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" ADD CONSTRAINT "FK_holonet_posts_plot" FOREIGN KEY ("plotId") REFERENCES "rpg_plots"("id") ON DELETE SET NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "holonet_posts" DROP CONSTRAINT "FK_holonet_posts_plot"',
    );
    await queryRunner.query('DROP INDEX "IDX_holonet_posts_plot_created"');
    await queryRunner.query('ALTER TABLE "holonet_posts" DROP COLUMN "plotId"');
  }
}
