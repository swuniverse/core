import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShipyardQueuePausedState20260706100000 implements MigrationInterface {
  name = 'AddShipyardQueuePausedState20260706100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('colony_ship_build_queue');
    if (!table?.findColumnByName('stoppedAt')) {
      await queryRunner.addColumn(
        'colony_ship_build_queue',
        new TableColumn({
          name: 'stoppedAt',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('colony_ship_build_queue');
    if (table?.findColumnByName('stoppedAt')) {
      await queryRunner.dropColumn('colony_ship_build_queue', 'stoppedAt');
    }
  }
}
