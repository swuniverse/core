import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNotes20260612120000 implements MigrationInterface {
  name = 'AddUserNotes20260612120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "notes" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "notes"`);
  }
}
