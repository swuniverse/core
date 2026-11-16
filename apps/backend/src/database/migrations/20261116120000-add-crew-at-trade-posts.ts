import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrewAtTradePosts20261116120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD COLUMN "tradePostId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_crew_assignments_trade_post" ON "crew_assignments" ("tradePostId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD CONSTRAINT "FK_crew_assignments_trade_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts" ("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP CONSTRAINT "CHK_crew_assignments_single_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD CONSTRAINT "CHK_crew_assignments_single_location" CHECK (num_nonnulls("colonyId", "spacecraftId", "escapePodId", "tradePostId") = 1)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [{ occupied }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM "crew_assignments" WHERE "tradePostId" IS NOT NULL) AS occupied`,
    );
    if (occupied)
      throw new Error(
        'Crew an Handelsposten muss vor dem Rollback verlegt werden',
      );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP CONSTRAINT "CHK_crew_assignments_single_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP CONSTRAINT "FK_crew_assignments_trade_post"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_crew_assignments_trade_post"`);
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" DROP COLUMN "tradePostId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "crew_assignments" ADD CONSTRAINT "CHK_crew_assignments_single_location" CHECK (num_nonnulls("colonyId", "spacecraftId", "escapePodId") = 1)`,
    );
  }
}
