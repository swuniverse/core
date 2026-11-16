import { MigrationInterface, QueryRunner } from 'typeorm';
export class PlayerCreationDefaults20261116210000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    // BEFORE INSERT covers shipyards, rewards, hangars, colonies and admin creation;
    // it never reapplies a preference to an existing spacecraft or fleet.
    await q.query(`CREATE FUNCTION apply_player_creation_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_TABLE_NAME = 'fleets' THEN
          NEW."isFixed" := COALESCE((SELECT value FROM user_settings WHERE "userId" = NEW."userId" AND key = 'fleet_fixed_default'), '0') = '1';
        ELSE
          NEW."reactorAutoCarryOver" := COALESCE((SELECT value FROM user_settings WHERE "userId" = NEW."userId" AND key = 'reactor_auto_carryover_default'), '0') = '1';
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(
      `CREATE TRIGGER "TR_fleet_creation_defaults" BEFORE INSERT ON fleets FOR EACH ROW EXECUTE FUNCTION apply_player_creation_defaults()`,
    );
    await q.query(
      `CREATE TRIGGER "TR_spacecraft_creation_defaults" BEFORE INSERT ON spacecraft FOR EACH ROW EXECUTE FUNCTION apply_player_creation_defaults()`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TRIGGER "TR_fleet_creation_defaults" ON fleets`);
    await q.query(
      `DROP TRIGGER "TR_spacecraft_creation_defaults" ON spacecraft`,
    );
    await q.query(`DROP FUNCTION apply_player_creation_defaults()`);
  }
}
