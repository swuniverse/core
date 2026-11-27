import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fighter line-up: the A-Wing slot becomes the Y-Wing, the LAAT slot the B-Wing. Renaming
 * the key keeps class ids, so existing ships and hangar stock follow; the seeder then
 * refreshes name, role and hull.
 */
const RENAMES: Array<[string, string]> = [
  ['REBEL_FIGHTER_A_WING', 'REBEL_FIGHTER_Y_WING'],
  ['REBEL_SHUTTLE_LAAT', 'REBEL_FIGHTER_B_WING'],
];

export class FighterLineup20261126110000 implements MigrationInterface {
  name = 'FighterLineup20261126110000';

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
