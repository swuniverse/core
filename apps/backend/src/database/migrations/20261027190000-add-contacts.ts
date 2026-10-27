import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContacts20261027190000 implements MigrationInterface {
  name = 'AddContacts20261027190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."contacts_mode_enum" AS ENUM('FRIEND', 'ENEMY', 'NEUTRAL')`,
    );
    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "contactUserId" integer NOT NULL,
        "mode" "public"."contacts_mode_enum" NOT NULL,
        "comment" character varying(255) NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_contacts_user_contact" UNIQUE ("userId", "contactUserId"),
        CONSTRAINT "PK_contacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contacts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_contacts_contact_user" FOREIGN KEY ("contactUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP TYPE "public"."contacts_mode_enum"`);
  }
}
