import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDisplayNameAvatar1752667200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "displayName" varchar(60)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "avatar" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "displayName"`);
  }
}
