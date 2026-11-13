import { MigrationInterface, QueryRunner } from 'typeorm';

/** tmw-T13: the faction trade modifier was never read and is dropped. */
export class DropFactionTradeModifier20261113110000 implements MigrationInterface {
  name = 'DropFactionTradeModifier20261113110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "faction_modifiers" DROP COLUMN "tradeModifier"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "faction_modifiers" ADD "tradeModifier" float NOT NULL DEFAULT 1');
  }
}
