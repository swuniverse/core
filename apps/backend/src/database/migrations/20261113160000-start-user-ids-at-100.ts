import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-T12a: like STU (`UserConstants::USER_FIRST_ID`), player ids start at
 * 100. A player trade network is numbered after its owner, so it can never
 * collide with the NPC networks 1–3.
 */
export class StartUserIdsAt10020261113160000 implements MigrationInterface {
  name = 'StartUserIdsAt10020261113160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER SEQUENCE "users_id_seq" START WITH 100');
    await queryRunner.query(
      `SELECT setval('"users_id_seq"', GREATEST(100, COALESCE((SELECT MAX("id") FROM "users"), 0) + 1), false)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER SEQUENCE "users_id_seq" START WITH 1');
  }
}
