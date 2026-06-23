import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyDepositMining20260617130000 implements MigrationInterface {
  name = 'AddColonyDepositMining20260617130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "colony_deposit_mining" (
        "userId" integer NOT NULL,
        "colonyId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amountLeft" integer NOT NULL,
        CONSTRAINT "PK_colony_deposit_mining" PRIMARY KEY ("userId", "colonyId", "commodityId"),
        CONSTRAINT "FK_colony_deposit_mining_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_colony_deposit_mining_colony" FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "colony_deposit_mining"`);
  }
}
