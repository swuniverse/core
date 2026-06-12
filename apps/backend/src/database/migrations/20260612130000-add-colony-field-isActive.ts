import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFieldIsActive1718193600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields" DROP COLUMN "isActive"`,
    );
  }
}
