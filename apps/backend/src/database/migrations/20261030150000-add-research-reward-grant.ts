import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchRewardGrant20261030150000 implements MigrationInterface {
  name = 'AddResearchRewardGrant20261030150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "research_reward_grant" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "techId" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'RESERVED',
        "grantedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_research_reward_grant_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_research_reward_grant_user_tech" ON "research_reward_grant" ("userId", "techId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_research_reward_grant_user_tech"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "research_reward_grant"`);
  }
}
