import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColonyMessage20260627100000 implements MigrationInterface {
  name = 'AddColonyMessage20260627100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'colony_stats',
      'colonyMessage',
    );
    if (hasColumn) return;

    await queryRunner.addColumn(
      'colony_stats',
      new TableColumn({
        name: 'colonyMessage',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'colony_stats',
      'colonyMessage',
    );
    if (!hasColumn) return;

    await queryRunner.dropColumn('colony_stats', 'colonyMessage');
  }
}
