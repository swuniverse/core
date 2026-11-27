import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corvette/frigate line-up: the 410 hulls are corvettes, the 910 hulls frigates.
 * Renaming keeps the class ids, so existing ships, build plans and hangars follow;
 * the class seeder then refreshes name, category, role and hull. Retired classes
 * without a successor row hand their ships to the closest new class.
 */
const RENAMES: Array<[string, string]> = [
  ['REBEL_ESCORT_HAMMERHEAD', 'REBEL_CORVETTE_HAMMERHEAD'],
  ['REBEL_FRIGATE_PELTA', 'REBEL_CORVETTE_DEFENDER'],
  ['REBEL_SCOUT_HWK_290', 'REBEL_CORVETTE_BRAHATOK'],
  ['REBEL_CORVETTE_CR90', 'REBEL_FRIGATE_CR90'],
  ['REBEL_CRUISER_NEBULON_B', 'REBEL_FRIGATE_NEBULON_B'],
  ['EMPIRE_FRIGATE_LANCER', 'EMPIRE_CORVETTE_RENDILI'],
  ['EMPIRE_SCOUT_RAIDER', 'EMPIRE_CORVETTE_LISTENER'],
];

const RETIRED: Array<[string, string]> = [
  ['REBEL_FRIGATE_CONSULAR', 'REBEL_CORVETTE_DEFENDER'],
  ['REBEL_SCOUT_VCX_100', 'REBEL_CORVETTE_BRAHATOK'],
  ['EMPIRE_FRIGATE_MUNIFICENT', 'EMPIRE_CORVETTE_RAIDER'],
  ['EMPIRE_ESCORT_ARQUITENS', 'EMPIRE_CORVETTE_RAIDER'],
];

export class CorvetteFrigateLineup20261126100000 implements MigrationInterface {
  name = 'CorvetteFrigateLineup20261126100000';

  async up(runner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await runner.query(
        `UPDATE ship_class_defs SET "key" = $2 WHERE "key" = $1
         AND NOT EXISTS (SELECT 1 FROM ship_class_defs WHERE "key" = $2)`,
        [from, to],
      );
    }
    for (const [from, to] of RETIRED) {
      await runner.query(
        `UPDATE spacecraft SET "shipClassId" = (SELECT id FROM ship_class_defs WHERE "key" = $2)
         WHERE "shipClassId" = (SELECT id FROM ship_class_defs WHERE "key" = $1)
         AND EXISTS (SELECT 1 FROM ship_class_defs WHERE "key" = $2)`,
        [from, to],
      );
    }
  }

  async down(runner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await runner.query(
        `UPDATE ship_class_defs SET "key" = $1 WHERE "key" = $2
         AND NOT EXISTS (SELECT 1 FROM ship_class_defs WHERE "key" = $1)`,
        [from, to],
      );
    }
  }
}
