import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Freighter line-up: the 350 slot becomes Hawk (Rebels) / Zeta (Empire), the 600 and
 * 1200 slots of the Empire become Eta / MOSE. Renaming the key keeps ship class ids so
 * existing ships, build plans and hangars follow; the class seeder then refreshes the rest.
 */
const RENAMES: Array<[string, string]> = [
  ['REBEL_FREIGHTER_YT', 'REBEL_FREIGHTER_HAWK'],
  ['EMPIRE_FREIGHTER_GOZANTI', 'EMPIRE_FREIGHTER_ZETA'],
  ['EMPIRE_FREIGHTER_IMPERIAL', 'EMPIRE_FREIGHTER_ETA'],
  ['EMPIRE_FREIGHTER_HEAVY', 'EMPIRE_FREIGHTER_MOSE'],
];

export class RenameFreighterClasses20261125170000 implements MigrationInterface {
  name = 'RenameFreighterClasses20261125170000';

  async up(runner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await runner.query(
        `UPDATE ship_class_defs SET "key" = $2 WHERE "key" = $1
         AND NOT EXISTS (SELECT 1 FROM ship_class_defs WHERE "key" = $2)`,
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
