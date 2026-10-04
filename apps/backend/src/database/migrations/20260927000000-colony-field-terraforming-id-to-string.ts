import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stellt "colony_fields"."terraformingId" von integer auf varchar um, damit
 * SWU-Terraforming-IDs (z.B. "J810J840", aus fromFieldType+toFieldType
 * zusammengesetzt) gespeichert werden koennen, statt nur alte STU-Zahlen-IDs.
 * Gleiches Muster wie 20260912000000-colony-field-terrain-tile-id-to-string.ts.
 */
export class ColonyFieldTerraformingIdToString20260927000000
  implements MigrationInterface
{
  name = 'ColonyFieldTerraformingIdToString20260927000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields"
       ALTER COLUMN "terraformingId" TYPE varchar(32)
       USING "terraformingId"::varchar(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nur sicher rueckgaengig zu machen, wenn zwischenzeitlich keine
    // nicht-numerischen (SWU-)Werte eingetragen wurden.
    await queryRunner.query(
      `ALTER TABLE "colony_fields"
       ALTER COLUMN "terraformingId" TYPE integer
       USING "terraformingId"::integer`,
    );
  }
}
