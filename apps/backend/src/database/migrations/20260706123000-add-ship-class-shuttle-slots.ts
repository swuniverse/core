import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShipClassShuttleSlots20260706123000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('ship_class_defs');
    if (!table?.findColumnByName('shuttleSlots')) {
      await queryRunner.addColumn(
        'ship_class_defs',
        new TableColumn({
          name: 'shuttleSlots',
          type: 'int',
          isNullable: false,
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('ship_class_defs');
    if (table?.findColumnByName('shuttleSlots')) {
      await queryRunner.dropColumn('ship_class_defs', 'shuttleSlots');
    }
  }
}
