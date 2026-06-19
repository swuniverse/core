import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface SeedEntry {
  id: number;
  name: string;
  isSystem: boolean;
  passable: boolean;
  energyCost: number;
  damage: number;
  category: string;
}

export class ImportStuFieldTypes20260619120000 implements MigrationInterface {
  name = 'ImportStuFieldTypes20260619120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "galaxy_field_types" ADD COLUMN IF NOT EXISTS "category" varchar(32)`,
    );

    // Remove unique constraint on key temporarily for bulk insert
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_galaxy_field_types_key"`,
    );

    // Bulk insert all STU field types
    const seedPath = join(__dirname, 'stu-field-types-seed.json');
    const entries: SeedEntry[] = JSON.parse(readFileSync(seedPath, 'utf-8'));
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const values = batch
        .map(
          (ft) =>
            `(${ft.id}, '${ft.name.replace(/'/g, "''")}', '${this.toKey(ft.name, ft.id)}', ${ft.passable}, ${ft.energyCost}, ${ft.damage}, ${ft.isSystem}, true, NULL, NULL, '${ft.category}')`,
        )
        .join(',\n');
      await queryRunner.query(
        `INSERT INTO "galaxy_field_types" (id, name, key, passable, "energyCost", damage, "isSystem", "isVisible", effects, "colorKey", category)
         VALUES ${values}
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           passable = EXCLUDED.passable,
           "energyCost" = EXCLUDED."energyCost",
           damage = EXCLUDED.damage,
           "isSystem" = EXCLUDED."isSystem",
           category = EXCLUDED.category`,
      );
    }

    // Recreate unique index on key
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_galaxy_field_types_key" ON "galaxy_field_types" ("key")`,
    );

    // Update sequence to max id
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('galaxy_field_types', 'id'), (SELECT MAX(id) FROM galaxy_field_types))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore original 10 field types
    await queryRunner.query(`DELETE FROM "galaxy_field_types" WHERE id > 10`);
    await queryRunner.query(
      `ALTER TABLE "galaxy_field_types" DROP COLUMN IF EXISTS "category"`,
    );
  }

  private toKey(name: string, id: number): string {
    return name
      .toLowerCase()
      .replace(/[äöüß]/g, (c) =>
        ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c] ?? c,
      )
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50) + `_${id}`;
  }
}
