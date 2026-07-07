import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddColonyOrbitAssignments20260706110000
  implements MigrationInterface
{
  name = 'AddColonyOrbitAssignments20260706110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('colony_orbit_assignments');
    if (!exists) {
      await queryRunner.createTable(
        new Table({
          name: 'colony_orbit_assignments',
          columns: [
            { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'colonyId', type: 'integer' },
            { name: 'spacecraftId', type: 'integer' },
            { name: 'fleetId', type: 'integer' },
            { name: 'mode', type: 'varchar', length: '16' },
            { name: 'createdAt', type: 'timestamp', default: 'now()' },
          ],
        }),
      );
    }

    const table = await queryRunner.getTable('colony_orbit_assignments');
    if (!table) return;

    await this.addIndexIfMissing(queryRunner, table, 'IDX_colony_orbit_assignments_colony_mode', ['colonyId', 'mode']);
    await this.addIndexIfMissing(queryRunner, table, 'IDX_colony_orbit_assignments_fleet_unique', ['fleetId'], true);
    await this.addIndexIfMissing(queryRunner, table, 'IDX_colony_orbit_assignments_spacecraft_unique', ['spacecraftId'], true);

    await this.addForeignKeyIfMissing(
      queryRunner,
      table,
      'FK_colony_orbit_assignments_colony',
      ['colonyId'],
      'colonies',
      ['id'],
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      table,
      'FK_colony_orbit_assignments_spacecraft',
      ['spacecraftId'],
      'spacecraft',
      ['id'],
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      table,
      'FK_colony_orbit_assignments_fleet',
      ['fleetId'],
      'fleets',
      ['id'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('colony_orbit_assignments')) {
      await queryRunner.dropTable('colony_orbit_assignments');
    }
  }

  private async addIndexIfMissing(
    queryRunner: QueryRunner,
    table: Table,
    name: string,
    columnNames: string[],
    isUnique = false,
  ): Promise<void> {
    if (!table.indices.some((index) => index.name === name)) {
      await queryRunner.createIndex(
        table,
        new TableIndex({ name, columnNames, isUnique }),
      );
    }
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    table: Table,
    name: string,
    columnNames: string[],
    referencedTableName: string,
    referencedColumnNames: string[],
  ): Promise<void> {
    if (!table.foreignKeys.some((foreignKey) => foreignKey.name === name)) {
      await queryRunner.createForeignKey(
        table,
        new TableForeignKey({
          name,
          columnNames,
          referencedTableName,
          referencedColumnNames,
          onDelete: 'CASCADE',
        }),
      );
    }
  }
}
