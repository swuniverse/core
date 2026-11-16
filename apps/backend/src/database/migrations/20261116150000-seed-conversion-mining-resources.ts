import { MigrationInterface, QueryRunner } from 'typeorm';

/** Make refinery feedstock collectible without replacing custom field settings. */
export class SeedConversionMiningResources20261116150000 implements MigrationInterface {
  private readonly seeds = [
    {
      condition: `("key" = 'NEBULA' OR "category" IN ('nebula','system_nebula'))`,
      original: [{ commodityId: 3, rate: 100 }],
      sources: [63, 64, 65, 66, 68, 70, 71, 72],
    },
    {
      condition: `("key" IN ('ASTEROID_FIELD','ASTEROID_CLUSTER') OR "category" = 'asteroid')`,
      original: [
        { commodityId: 9, rate: 100 },
        { commodityId: 10, rate: 100 },
      ],
      sources: [67, 69],
    },
  ];
  async up(runner: QueryRunner): Promise<void> {
    for (const seed of this.seeds) {
      const resources = [
        ...seed.original,
        ...seed.sources.map((commodityId) => ({ commodityId, rate: 100 })),
      ];
      await runner.query(
        `UPDATE "galaxy_field_types" SET "miningResources" = $1::jsonb WHERE ${seed.condition} AND "miningResources" = $2::jsonb`,
        [JSON.stringify(resources), JSON.stringify(seed.original)],
      );
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    for (const seed of this.seeds) {
      const resources = [
        ...seed.original,
        ...seed.sources.map((commodityId) => ({ commodityId, rate: 100 })),
      ];
      await runner.query(
        `UPDATE "galaxy_field_types" SET "miningResources" = $1::jsonb WHERE ${seed.condition} AND "miningResources" = $2::jsonb`,
        [JSON.stringify(seed.original), JSON.stringify(resources)],
      );
    }
  }
}
