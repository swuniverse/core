import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipQueueBuildingFunction20261030140000
  implements MigrationInterface
{
  name = 'AddShipQueueBuildingFunction20261030140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing jobs stay unbound (NULL): they run out normally and do not
    // occupy any shipyard function slot.
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue" ADD COLUMN IF NOT EXISTS "buildingFunctionId" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_build_queue_function" ON "colony_ship_build_queue" ("colonyId", "buildingFunctionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_build_queue_function"`,
    );
    await queryRunner.query(
      `ALTER TABLE "colony_ship_build_queue" DROP COLUMN IF EXISTS "buildingFunctionId"`,
    );
  }
}
