import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTutorialProgress20261023160000 implements MigrationInterface {
  name = 'AddUserTutorialProgress20261023160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "user_tutorial_progress" (
      "userId" integer NOT NULL,
      "view" varchar(32) NOT NULL,
      "currentStepId" varchar(64),
      "completed" boolean NOT NULL DEFAULT false,
      CONSTRAINT "PK_user_tutorial_progress" PRIMARY KEY ("userId", "view"),
      CONSTRAINT "FK_user_tutorial_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_tutorial_progress"');
  }
}
