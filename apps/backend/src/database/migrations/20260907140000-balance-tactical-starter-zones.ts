import { MigrationInterface, QueryRunner } from 'typeorm';

export class BalanceTacticalStarterZones20260907140000
  implements MigrationInterface
{
  name = 'BalanceTacticalStarterZones20260907140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "galaxy_fields" AS field
      SET "factionZone" = CASE
        WHEN field.cx < 48 * 0.35 AND field.cy < 48 * 0.55 THEN 'REBEL'
        WHEN field.cx > 48 * 0.65 AND field.cy > 48 * 0.55 THEN 'EMPIRE'
        WHEN field.cx > 48 * 0.35 AND field.cx < 48 * 0.65 THEN 'CONTESTED'
        ELSE 'NEUTRAL'
      END
      FROM "layers" AS layer
      WHERE field."layerId" = layer.id
        AND layer."name" = 'Tactical Season 1'
        AND layer."width" = 48
        AND layer."height" = 48
        AND layer."sectorSize" = 12
    `);
  }

  public async down(): Promise<void> {
    // The previous asymmetric zone assignment is intentionally not restored.
  }
}
