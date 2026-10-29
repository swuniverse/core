import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMessageTarget20261029120000 implements MigrationInterface {
  name = 'AddMessageTarget20261029120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('messages', 'targetKind'))) {
      await queryRunner.addColumn(
        'messages',
        new TableColumn({
          name: 'targetKind',
          type: 'varchar',
          length: '32',
          isNullable: true,
        }),
      );
    }
    if (!(await queryRunner.hasColumn('messages', 'targetId'))) {
      await queryRunner.addColumn(
        'messages',
        new TableColumn({
          name: 'targetId',
          type: 'integer',
          isNullable: true,
        }),
      );
    }
    await queryRunner.query(`
      UPDATE "messages"
      SET "targetKind" = 'COLONY', "targetId" = "originColonyId"
      WHERE "originColonyId" IS NOT NULL
        AND "targetKind" IS NULL
        AND "targetId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('messages', 'targetId')) {
      await queryRunner.dropColumn('messages', 'targetId');
    }
    if (await queryRunner.hasColumn('messages', 'targetKind')) {
      await queryRunner.dropColumn('messages', 'targetKind');
    }
  }
}
