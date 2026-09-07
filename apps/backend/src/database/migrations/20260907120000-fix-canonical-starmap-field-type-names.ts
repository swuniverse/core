import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCanonicalStarmapFieldTypeNames20260907120000
  implements MigrationInterface
{
  name = 'FixCanonicalStarmapFieldTypeNames20260907120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "galaxy_field_types"
      SET "name" = CASE "key"
        WHEN 'EMPTY_SPACE' THEN 'Weltraum'
        WHEN 'STAR_SYSTEM' THEN 'Sternensystem'
        WHEN 'STAR_CORE' THEN 'Sternkern'
        WHEN 'PLANET_ORBIT' THEN 'Planetenorbit'
        WHEN 'MOON_ORBIT' THEN 'Mondorbit'
        WHEN 'ASTEROID_CLUSTER' THEN 'Asteroidencluster'
        WHEN 'DEEP_SPACE' THEN 'Tiefer Weltraum'
        WHEN 'NEBULA' THEN 'Nebel'
        WHEN 'ASTEROID_FIELD' THEN 'Asteroidenfeld'
        WHEN 'BLOCKED' THEN 'Blockiert'
      END
      WHERE "key" IN (
        'EMPTY_SPACE', 'STAR_SYSTEM', 'STAR_CORE', 'PLANET_ORBIT',
        'MOON_ORBIT', 'ASTEROID_CLUSTER', 'DEEP_SPACE', 'NEBULA',
        'ASTEROID_FIELD', 'BLOCKED'
      )
    `);
  }

  public async down(): Promise<void> {
    // The incorrect names originated outside this migration; no rollback value exists.
  }
}
