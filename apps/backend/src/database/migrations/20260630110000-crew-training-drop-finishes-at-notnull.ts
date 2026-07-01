import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrewTrainingDropFinishesAtNotnull20260630110000
  implements MigrationInterface
{
  name = 'CrewTrainingDropFinishesAtNotnull20260630110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_crew_training_queue" ALTER COLUMN "finishesAt" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_crew_training_queue" ALTER COLUMN "finishesAt" SET NOT NULL`,
    );
  }
}
