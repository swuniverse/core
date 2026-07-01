import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddShipClassColonizerMetadata20260630110000 implements MigrationInterface {
  name = 'AddShipClassColonizerMetadata20260630110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('ship_class_defs', 'isColonizer'))) {
      await queryRunner.addColumn(
        'ship_class_defs',
        new TableColumn({
          name: 'isColonizer',
          type: 'boolean',
          isNullable: false,
          default: false,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('ship_class_defs', 'colonizerTier'))) {
      await queryRunner.addColumn(
        'ship_class_defs',
        new TableColumn({
          name: 'colonizerTier',
          type: 'integer',
          isNullable: true,
        }),
      );
    }
    if (
      !(await queryRunner.hasColumn(
        'ship_class_defs',
        'colonizationBuildingId',
      ))
    ) {
      await queryRunner.addColumn(
        'ship_class_defs',
        new TableColumn({
          name: 'colonizationBuildingId',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('ship_class_defs');
    const hasIndex = table?.indices.some(
      (index) => index.name === 'IDX_ship_class_defs_colonizer',
    );
    if (!hasIndex) {
      await queryRunner.createIndex(
        'ship_class_defs',
        new TableIndex({
          name: 'IDX_ship_class_defs_colonizer',
          columnNames: ['isColonizer'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('ship_class_defs');
    const hasIndex = table?.indices.some(
      (index) => index.name === 'IDX_ship_class_defs_colonizer',
    );
    if (hasIndex) {
      await queryRunner.dropIndex(
        'ship_class_defs',
        'IDX_ship_class_defs_colonizer',
      );
    }

    for (const columnName of [
      'colonizationBuildingId',
      'colonizerTier',
      'isColonizer',
    ]) {
      if (await queryRunner.hasColumn('ship_class_defs', columnName)) {
        await queryRunner.dropColumn('ship_class_defs', columnName);
      }
    }
  }
}
