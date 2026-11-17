import { MigrationInterface, QueryRunner } from 'typeorm';

export class RpgTransponder1794877200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE spacecraft
      ADD COLUMN "rpgPlotId" integer REFERENCES rpg_plots(id) ON DELETE SET NULL,
      ADD COLUMN "rpgHidden" boolean NOT NULL DEFAULT false,
      ADD CONSTRAINT "CHK_spacecraft_rpg_hidden" CHECK (NOT "rpgHidden" OR "rpgPlotId" IS NOT NULL)`);
    await q.query(`CREATE FUNCTION clear_removed_rpg_transponder() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."rpgPlotId" IS NULL OR NEW."userId" <> OLD."userId" THEN
          NEW."rpgHidden" := false;
          NEW."rpgPlotId" := NULL;
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER clear_removed_rpg_transponder BEFORE UPDATE ON spacecraft
      FOR EACH ROW EXECUTE FUNCTION clear_removed_rpg_transponder()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TRIGGER clear_removed_rpg_transponder ON spacecraft');
    await q.query('DROP FUNCTION clear_removed_rpg_transponder()');
    await q.query(
      'ALTER TABLE spacecraft DROP CONSTRAINT "CHK_spacecraft_rpg_hidden", DROP COLUMN "rpgHidden", DROP COLUMN "rpgPlotId"',
    );
  }
}
