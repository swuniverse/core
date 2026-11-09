import { QueryRunner } from 'typeorm';

export const PREVIOUS_CALENDAR_CHARACTER_MIGRATION =
  'AddUserCharacters20261023120000';

export async function characterMigrationId(
  queryRunner: QueryRunner,
  name: string,
): Promise<number | undefined> {
  const driver = queryRunner.connection.driver;
  const options = queryRunner.connection.options;
  const table = options.migrationsTableName ?? 'migrations';
  const schema = 'schema' in options ? options.schema : undefined;
  const qualified = schema
    ? `${driver.escape(schema)}.${driver.escape(table)}`
    : driver.escape(table);
  const rows: Array<{ id: number }> = await queryRunner.query(
    `SELECT id FROM ${qualified} WHERE name = $1`,
    [name],
  );
  return rows[0]?.id === undefined ? undefined : Number(rows[0].id);
}
