import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileVisits20261029150000 implements MigrationInterface {
  name = 'AddProfileVisits20261029150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "profile_visits" (
      "id" SERIAL NOT NULL,
      "visitorId" integer NOT NULL,
      "profileUserId" integer NOT NULL,
      "visitedAt" TIMESTAMP NOT NULL,
      CONSTRAINT "UQ_profile_visits_visitor_profile" UNIQUE ("visitorId", "profileUserId"),
      CONSTRAINT "PK_profile_visits" PRIMARY KEY ("id"),
      CONSTRAINT "FK_profile_visits_visitor" FOREIGN KEY ("visitorId") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_profile_visits_profile" FOREIGN KEY ("profileUserId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(
      'CREATE INDEX "IDX_profile_visits_profile_visited" ON "profile_visits" ("profileUserId", "visitedAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "profile_visits"');
  }
}
