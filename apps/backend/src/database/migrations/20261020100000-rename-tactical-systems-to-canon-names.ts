import { MigrationInterface, QueryRunner } from 'typeorm';
import { TACTICAL_CANON_NAMES } from '../../modules/starmap/tactical-system-names';

export class RenameTacticalSystemsToCanonNames20261020100000 implements MigrationInterface {
  name = 'RenameTacticalSystemsToCanonNames20261020100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.rename(
      queryRunner,
      (index) => `Tactical-${index + 1}`,
      (index) => TACTICAL_CANON_NAMES[index],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.rename(
      queryRunner,
      (index) => TACTICAL_CANON_NAMES[index],
      (index) => `Tactical-${index + 1}`,
    );
  }

  private async rename(
    queryRunner: QueryRunner,
    from: (index: number) => string,
    to: (index: number) => string,
  ): Promise<void> {
    for (let index = 0; index < TACTICAL_CANON_NAMES.length; index++) {
      const oldName = from(index);
      const newName = to(index);
      await queryRunner.query(
        `UPDATE "celestial_objects" AS object
         SET "name" = $2 || substr(object."name", char_length($1) + 1)
         FROM "star_systems" AS system
         WHERE object."systemId" = system.id
           AND system."name" = $1
           AND system."layerId" IN (
             SELECT id FROM "layers" WHERE "name" = 'Tactical Season 1'
           )
           AND (object."name" = $1 OR object."name" LIKE $1 || ' %')`,
        [oldName, newName],
      );
      await queryRunner.query(
        `UPDATE "star_systems" SET "name" = $2
         WHERE "name" = $1
           AND "layerId" IN (
             SELECT id FROM "layers" WHERE "name" = 'Tactical Season 1'
           )`,
        [oldName, newName],
      );
    }
  }
}
