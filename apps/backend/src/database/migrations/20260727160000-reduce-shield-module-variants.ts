import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReduceShieldModuleVariants20260727160000
  implements MigrationInterface
{
  name = 'ReduceShieldModuleVariants20260727160000';

  private readonly shieldCommodityMap: Record<number, number> = {
    11201: 10221,
    11202: 10222,
    11203: 10223,
    11204: 10224,
    11205: 10225,
    11206: 10226,
  };

  private readonly shieldItemKeyMap: Record<string, string> = {
    'module.shields.polarschild-k1': 'module.shields.strahlenabweiser-k1',
    'module.shields.polarschild-k2': 'module.shields.strahlenabweiser-k2',
    'module.shields.polarschild-k3': 'module.shields.strahlenabweiser-k3',
    'module.shields.polarschild-k4': 'module.shields.strahlenabweiser-k4',
    'module.shields.polarschild-k5': 'module.shields.strahlenabweiser-k5',
    'module.shields.polarschild-k6': 'module.shields.strahlenabweiser-k6',
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [fromCommodityId, toCommodityId] of Object.entries(
      this.shieldCommodityMap,
    )) {
      const fromId = Number(fromCommodityId);

      await this.mergeCommodityRows(
        queryRunner,
        'colony_storage',
        'colonyId',
        fromId,
        toCommodityId,
      );
      await this.mergeCommodityRows(
        queryRunner,
        'cargo_items',
        'spacecraftId',
        fromId,
        toCommodityId,
      );

      await this.replaceCommodityIdsInJsonArray(
        queryRunner,
        'colony_ship_buildplans',
        'moduleCommodityIds',
        fromId,
        toCommodityId,
      );
      await this.replaceSelectionCommodityIds(
        queryRunner,
        'colony_ship_buildplans',
        'moduleSelections',
        fromId,
        toCommodityId,
      );
      await this.replaceCommodityIdsInJsonArray(
        queryRunner,
        'colony_ship_build_queue',
        'moduleCommodityIds',
        fromId,
        toCommodityId,
      );
      await this.replaceSelectionCommodityIds(
        queryRunner,
        'colony_ship_build_queue',
        'moduleSelections',
        fromId,
        toCommodityId,
      );
      await this.replaceNestedSelectionCommodityIds(
        queryRunner,
        'colony_ship_build_queue',
        'retrofitSnapshot',
        ['oldModuleSelections'],
        fromId,
        toCommodityId,
      );
      await this.replaceNestedSelectionCommodityIds(
        queryRunner,
        'colony_ship_build_queue',
        'retrofitSnapshot',
        ['newModuleSelections'],
        fromId,
        toCommodityId,
      );
      await this.replaceNestedCommodityIdsInJsonArray(
        queryRunner,
        'colony_ship_build_queue',
        'retrofitSnapshot',
        ['returnedModuleCommodityIds'],
        fromId,
        toCommodityId,
      );
      await this.replaceNestedCommodityIdsInJsonArray(
        queryRunner,
        'colony_ship_build_queue',
        'retrofitSnapshot',
        ['consumedModuleCommodityIds'],
        fromId,
        toCommodityId,
      );
    }

    for (const [fromItemKey, toItemKey] of Object.entries(
      this.shieldItemKeyMap,
    )) {
      await queryRunner.query(
        `UPDATE "colony_fabrication_queue" SET "itemKey" = $2 WHERE "itemKey" = $1`,
        [fromItemKey, toItemKey],
      );
    }

    // Existing installed shields are historically ambiguous: all four old
    // shield families stored moduleType = 'Standard-Deflektorschild' without
    // commodity provenance, so they cannot be safely rewritten to the military
    // tier. Future fabrication/build/retrofit paths use the reduced catalog.
  }

  public async down(): Promise<void> {
    // Irreversible: Polarschild variants collapse into Militär-Deflektorschild commodities.
  }

  private async mergeCommodityRows(
    queryRunner: QueryRunner,
    tableName: string,
    ownerColumn: string,
    fromCommodityId: number,
    toCommodityId: number,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "${tableName}" ("${ownerColumn}", "commodityId", "amount")
       SELECT "${ownerColumn}", $2, "amount"
       FROM "${tableName}"
       WHERE "commodityId" = $1
       ON CONFLICT ("${ownerColumn}", "commodityId") DO UPDATE
       SET "amount" = "${tableName}"."amount" + EXCLUDED."amount"`,
      [fromCommodityId, toCommodityId],
    );
    await queryRunner.query(
      `DELETE FROM "${tableName}" WHERE "commodityId" = $1`,
      [fromCommodityId],
    );
  }

  private async replaceCommodityIdsInJsonArray(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    fromCommodityId: number,
    toCommodityId: number,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "${tableName}"
       SET "${columnName}" = (
         SELECT COALESCE(
           jsonb_agg(
             CASE WHEN value = to_jsonb($1::int) THEN to_jsonb($2::int) ELSE value END
             ORDER BY ordinality
           ),
           '[]'::jsonb
         )
         FROM jsonb_array_elements("${columnName}") WITH ORDINALITY AS elements(value, ordinality)
       )
       WHERE "${columnName}" @> to_jsonb(ARRAY[$1::int])`,
      [fromCommodityId, toCommodityId],
    );
  }

  private async replaceSelectionCommodityIds(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    fromCommodityId: number,
    toCommodityId: number,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "${tableName}"
       SET "${columnName}" = (
         SELECT COALESCE(
           jsonb_agg(
             CASE
               WHEN value->>'commodityId' = $1::text
               THEN jsonb_set(value, '{commodityId}', to_jsonb($2::int), false)
               ELSE value
             END
             ORDER BY ordinality
           ),
           '[]'::jsonb
         )
         FROM jsonb_array_elements("${columnName}") WITH ORDINALITY AS elements(value, ordinality)
       )
       WHERE EXISTS (
         SELECT 1
         FROM jsonb_array_elements("${columnName}") AS elements(value)
         WHERE value->>'commodityId' = $1::text
       )`,
      [fromCommodityId, toCommodityId],
    );
  }

  private async replaceNestedCommodityIdsInJsonArray(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    path: string[],
    fromCommodityId: number,
    toCommodityId: number,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "${tableName}"
       SET "${columnName}" = jsonb_set(
         "${columnName}",
         $1::text[],
         (
           SELECT COALESCE(
             jsonb_agg(
               CASE WHEN value = to_jsonb($2::int) THEN to_jsonb($3::int) ELSE value END
               ORDER BY ordinality
             ),
             '[]'::jsonb
           )
           FROM jsonb_array_elements("${columnName}" #> $1::text[]) WITH ORDINALITY AS elements(value, ordinality)
         ),
         true
       )
       WHERE "${columnName}" #> $1::text[] IS NOT NULL
         AND ("${columnName}" #> $1::text[]) @> to_jsonb(ARRAY[$2::int])`,
      [path, fromCommodityId, toCommodityId],
    );
  }

  private async replaceNestedSelectionCommodityIds(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    path: string[],
    fromCommodityId: number,
    toCommodityId: number,
  ): Promise<void> {
    await queryRunner.query(
      `UPDATE "${tableName}"
       SET "${columnName}" = jsonb_set(
         "${columnName}",
         $1::text[],
         (
           SELECT COALESCE(
             jsonb_agg(
               CASE
                 WHEN value->>'commodityId' = $2::text
                 THEN jsonb_set(value, '{commodityId}', to_jsonb($3::int), false)
                 ELSE value
               END
               ORDER BY ordinality
             ),
             '[]'::jsonb
           )
           FROM jsonb_array_elements("${columnName}" #> $1::text[]) WITH ORDINALITY AS elements(value, ordinality)
         ),
         true
       )
       WHERE "${columnName}" #> $1::text[] IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements("${columnName}" #> $1::text[]) AS elements(value)
           WHERE value->>'commodityId' = $2::text
         )`,
      [path, fromCommodityId, toCommodityId],
    );
  }
}
