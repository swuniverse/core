import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayerExploredEvents20261030213000 implements MigrationInterface {
  name = 'AddLayerExploredEvents20261030213000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "layer_explored_events" (
        "userId" integer NOT NULL,
        "layerId" integer NOT NULL,
        "completedAt" timestamp NOT NULL,
        CONSTRAINT "PK_layer_explored_events" PRIMARY KEY ("userId", "layerId"),
        CONSTRAINT "FK_layer_explored_events_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_layer_explored_events_layer" FOREIGN KEY ("layerId")
          REFERENCES "layers"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "layer_explored_events"');
  }
}
