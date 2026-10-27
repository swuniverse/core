import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocks20261027120000 implements MigrationInterface {
  name = 'AddUserLocks20261027120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_locks" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "remainingTicks" integer NOT NULL,
        "reason" character varying(500) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_locks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_locks_user" UNIQUE ("userId"),
        CONSTRAINT "FK_user_locks_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_locks"');
  }
}
