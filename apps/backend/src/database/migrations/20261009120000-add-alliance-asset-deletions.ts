import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceAssetDeletions20261009120000
  implements MigrationInterface
{
  name = 'AddAllianceAssetDeletions20261009120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alliance_asset_deletions" (
        "id" SERIAL NOT NULL,
        "assetKey" character varying(64) NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "nextAttemptAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alliance_asset_deletions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alliance_asset_deletions_asset_key" UNIQUE ("assetKey")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_alliance_asset_deletions_due"
      ON "alliance_asset_deletions" ("nextAttemptAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_alliance_asset_deletions_due"');
    await queryRunner.query('DROP TABLE "alliance_asset_deletions"');
  }
}
