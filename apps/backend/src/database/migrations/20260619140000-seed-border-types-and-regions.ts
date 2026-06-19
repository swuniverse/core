import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBorderTypesAndRegions20260619140000
  implements MigrationInterface
{
  name = 'SeedBorderTypesAndRegions20260619140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Star Wars border types (faction territories)
    await queryRunner.query(`
      INSERT INTO "border_types" (id, name, "colorKey", style) VALUES
        (1, 'Galaktisches Imperium (Kerngebiet)', '#8B0000', 'solid'),
        (2, 'Galaktisches Imperium (Außengebiet)', '#CD5C5C', 'dashed'),
        (3, 'Rebellenallianz (Kerngebiet)', '#00008B', 'solid'),
        (4, 'Rebellenallianz (Außengebiet)', '#4169E1', 'dashed'),
        (5, 'Hutt-Raum', '#8B4513', 'solid'),
        (6, 'Mandalorianischer Raum', '#556B2F', 'solid'),
        (7, 'Unbekannte Regionen', '#4B0082', 'dotted'),
        (8, 'Neutrale Zone', '#808080', 'dashed'),
        (9, 'Handelsgilde', '#DAA520', 'solid'),
        (10, 'Chiss Ascendancy', '#2F4F4F', 'solid')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        "colorKey" = EXCLUDED."colorKey",
        style = EXCLUDED.style
    `);

    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('border_types', 'id'), (SELECT COALESCE(MAX(id), 1) FROM border_types))`,
    );

    // Star Wars regions (seeded for layer 1 if it exists)
    const layer = await queryRunner.query(
      `SELECT id FROM "layers" WHERE "isDefault" = true LIMIT 1`,
    );
    if (!layer?.length) return;
    const layerId = layer[0].id;

    const regions = [
      [100, 'Kessel-Nebel', 'nebula'],
      [101, 'Maw Cluster', 'cluster'],
      [102, 'Akkad-Nebel', 'nebula'],
      [103, 'Kaliida-Nebel', 'nebula'],
      [104, 'Maelstrom-Nebel', 'nebula'],
      [105, 'Roter Nebel', 'nebula'],
      [106, "D'Astan-Nebel", 'nebula'],
      [107, 'Vergesso-Asteroidenfeld', 'asteroid'],
      [108, 'Hoth-Asteroidenfeld', 'asteroid'],
      [109, 'Rishi-Mond-Nebel', 'nebula'],
      [110, 'Utapau-Nebel', 'nebula'],
      [111, 'Balmorra-Wolke', 'cloud'],
      [112, 'Perlemian-Kaskade', 'cascade'],
      [113, 'Hydianischer Nebel', 'nebula'],
      [114, 'Corellianischer Nebel', 'nebula'],
      [115, 'Kathol-Spalt', 'anomaly'],
      [116, 'Transitory Mists', 'nebula'],
      [117, 'Cron-Drift', 'drift'],
      [118, 'Thornhedge-Nebel', 'nebula'],
      [119, 'Ivax-Nebel', 'nebula'],
      [120, 'Goluud-Korridor', 'corridor'],
      [121, 'Tascollan-Nebel', 'nebula'],
      [122, 'Anoat-Nebel', 'nebula'],
      [123, 'Vultar-Nebel', 'nebula'],
      [124, 'Korriban-Wolke', 'cloud'],
      [125, 'Stygium-Nebel', 'nebula'],
      [126, 'Quelii-Cluster', 'cluster'],
      [127, 'Minos-Cluster', 'cluster'],
      [128, 'Tion-Cluster', 'cluster'],
      [129, 'Hapes-Cluster', 'cluster'],
      [130, 'Gordian Reach', 'corridor'],
    ] as const;

    for (const [id, name, colorKey] of regions) {
      await queryRunner.query(
        `INSERT INTO "map_regions" (id, "layerId", name, "colorKey")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "colorKey" = EXCLUDED."colorKey"`,
        [id, layerId, name, colorKey],
      );
    }

    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('map_regions', 'id'), (SELECT COALESCE(MAX(id), 1) FROM map_regions))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "border_types" WHERE id <= 10`);
    await queryRunner.query(
      `DELETE FROM "map_regions" WHERE id >= 100 AND id <= 130`,
    );
  }
}
