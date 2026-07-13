import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchQueuePosition20260708150000
  implements MigrationInterface
{
  name = 'AddResearchQueuePosition20260708150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "queuePosition" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "targetTechId" integer',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "targetTechId"',
    );
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "queuePosition"',
    );
  }
}
