import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

interface BuildingSeed {
  id: number;
  fieldAlternatives?: Array<{
    fieldtype: number;
    alternateBuildingId: number;
  }>;
}

interface BuildingSeedFile {
  buildings?: BuildingSeed[];
}

interface ColonyFieldMigrationRow {
  id: number;
  fieldType: number;
  terrainTileId: number | null;
  buildingId: number | null;
}

interface BonusBuildingBackupRow {
  fieldId: number;
  oldBuildingId: number;
  newBuildingId: number;
}

export class MigrateBonusFieldBuildings20260702100000 implements MigrationInterface {
  name = 'MigrateBonusFieldBuildings20260702100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mapping = this.loadBonusBuildingMapping();
    await this.ensureBackupTable(queryRunner);

    const existingBackups = await this.loadBackups(queryRunner);
    const existingBackupIds = new Set(
      existingBackups.map((entry) => entry.fieldId),
    );
    const fields = await this.loadBonusFields(queryRunner);

    for (const field of fields) {
      if (field.buildingId === null || existingBackupIds.has(field.id)) {
        continue;
      }
      const newBuildingId = this.resolveAlternativeBuildingId(field, mapping);
      if (newBuildingId === null || newBuildingId === field.buildingId) {
        continue;
      }

      await this.saveBackup(queryRunner, {
        fieldId: field.id,
        oldBuildingId: field.buildingId,
        newBuildingId,
      });
      await this.updateFieldBuilding(
        queryRunner,
        field.id,
        field.buildingId,
        newBuildingId,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasBackupTable = await queryRunner.hasTable(
      'colony_field_bonus_building_backup_20260702100000',
    );
    if (!hasBackupTable) return;

    const backups = await this.loadBackups(queryRunner);

    for (const backup of backups) {
      await this.updateFieldBuilding(
        queryRunner,
        backup.fieldId,
        backup.newBuildingId,
        backup.oldBuildingId,
      );
    }

    await queryRunner.dropTable(
      'colony_field_bonus_building_backup_20260702100000',
      true,
    );
  }

  private async loadBonusFields(
    queryRunner: QueryRunner,
  ): Promise<ColonyFieldMigrationRow[]> {
    const rows = await queryRunner.manager
      .createQueryBuilder()
      .select('field.id', 'id')
      .addSelect('field."fieldType"', 'fieldType')
      .addSelect('field."terrainTileId"', 'terrainTileId')
      .addSelect('field."buildingId"', 'buildingId')
      .from('colony_fields', 'field')
      .where('field."buildingId" IS NOT NULL')
      .andWhere('field."terrainTileId" IS NOT NULL')
      .andWhere('field."terrainTileId" >= :minimumBonusTileId', {
        minimumBonusTileId: 10000,
      })
      .getRawMany<ColonyFieldMigrationRow>();

    return rows.map((row) => ({
      id: Number(row.id),
      fieldType: Number(row.fieldType),
      terrainTileId:
        row.terrainTileId === null ? null : Number(row.terrainTileId),
      buildingId: row.buildingId === null ? null : Number(row.buildingId),
    }));
  }

  private async updateFieldBuilding(
    queryRunner: QueryRunner,
    fieldId: number,
    oldBuildingId: number,
    newBuildingId: number,
  ): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .update('colony_fields')
      .set({ buildingId: newBuildingId })
      .where('id = :fieldId', { fieldId })
      .andWhere('"buildingId" = :oldBuildingId', { oldBuildingId })
      .execute();
  }

  private async loadBackups(
    queryRunner: QueryRunner,
  ): Promise<BonusBuildingBackupRow[]> {
    const rows = await queryRunner.manager
      .createQueryBuilder()
      .select('backup."fieldId"', 'fieldId')
      .addSelect('backup."oldBuildingId"', 'oldBuildingId')
      .addSelect('backup."newBuildingId"', 'newBuildingId')
      .from('colony_field_bonus_building_backup_20260702100000', 'backup')
      .getRawMany<BonusBuildingBackupRow>();

    return rows.map((row) => ({
      fieldId: Number(row.fieldId),
      oldBuildingId: Number(row.oldBuildingId),
      newBuildingId: Number(row.newBuildingId),
    }));
  }

  private async saveBackup(
    queryRunner: QueryRunner,
    backup: BonusBuildingBackupRow,
  ): Promise<void> {
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('colony_field_bonus_building_backup_20260702100000')
      .values(backup)
      .orIgnore()
      .execute();
  }

  private async ensureBackupTable(queryRunner: QueryRunner): Promise<void> {
    const hasBackupTable = await queryRunner.hasTable(
      'colony_field_bonus_building_backup_20260702100000',
    );
    if (hasBackupTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'colony_field_bonus_building_backup_20260702100000',
        columns: [
          {
            name: 'fieldId',
            type: 'integer',
            isPrimary: true,
          },
          {
            name: 'oldBuildingId',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'newBuildingId',
            type: 'integer',
            isNullable: false,
          },
        ],
      }),
      true,
    );
  }

  private loadBonusBuildingMapping(): Map<string, number> {
    const seedPath = join(
      process.cwd(),
      'game-data/data/buildings/stu-buildings.yaml',
    );
    const seed = yaml.load(readFileSync(seedPath, 'utf-8')) as BuildingSeedFile;
    const mappings = new Map<string, number>();

    for (const building of seed.buildings ?? []) {
      const buildingId = Number(building.id);
      if (!Number.isFinite(buildingId)) continue;

      for (const alternative of building.fieldAlternatives ?? []) {
        const fieldType = Number(alternative.fieldtype);
        const alternateBuildingId = Number(alternative.alternateBuildingId);
        if (
          !Number.isFinite(fieldType) ||
          !Number.isFinite(alternateBuildingId) ||
          alternateBuildingId === buildingId
        ) {
          continue;
        }

        mappings.set(
          this.mappingKey(buildingId, fieldType),
          alternateBuildingId,
        );
      }
    }

    return mappings;
  }

  private resolveAlternativeBuildingId(
    field: ColonyFieldMigrationRow,
    mapping: Map<string, number>,
  ): number | null {
    if (field.buildingId === null) return null;

    for (const fieldType of this.getFieldTypeCandidates(field)) {
      const alternateBuildingId = mapping.get(
        this.mappingKey(field.buildingId, fieldType),
      );
      if (alternateBuildingId !== undefined) return alternateBuildingId;
    }

    return null;
  }

  private getFieldTypeCandidates(field: ColonyFieldMigrationRow): number[] {
    const normalizedFieldType =
      field.fieldType >= 10000
        ? Math.floor(field.fieldType / 100)
        : field.fieldType;
    return [field.terrainTileId, field.fieldType, normalizedFieldType].filter(
      (fieldType, index, values): fieldType is number =>
        fieldType !== null &&
        fieldType !== undefined &&
        values.indexOf(fieldType) === index,
    );
  }

  private mappingKey(buildingId: number, fieldType: number): string {
    return `${buildingId}:${fieldType}`;
  }
}
