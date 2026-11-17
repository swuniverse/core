import { MigrationInterface, QueryRunner } from 'typeorm';

/** Bridge module damage/repair and runtime-system damage for the reserve core. */
export class ReserveReactor1794888000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE FUNCTION maintain_reserve_reactor() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE core spacecraft_modules%ROWTYPE; state jsonb; target_integrity integer;
      BEGIN
        IF NEW.status = 'UNDER_SCRAPPING' THEN RETURN NEW; END IF;
        SELECT * INTO core FROM spacecraft_modules WHERE "spacecraftId" = NEW.id AND "moduleType" = 'Hypermaterie-Reservekern' ORDER BY id LIMIT 1;
        IF NOT FOUND THEN RETURN NEW; END IF;
        state := COALESCE(NEW."runtimeSystems"->'REACTOR', jsonb_build_object('cooldown', 0, 'integrity', core.integrity));
        target_integrity := LEAST(core.integrity, COALESCE((state->>'integrity')::integer, core.integrity));
        IF target_integrity < core.integrity THEN
          UPDATE spacecraft_modules SET integrity = target_integrity, "isActive" = target_integrity > 0 WHERE id = core.id;
        END IF;
        NEW."runtimeSystems" := COALESCE(NEW."runtimeSystems", '{}'::jsonb) || jsonb_build_object('REACTOR', state || jsonb_build_object('integrity', target_integrity, 'active', target_integrity > 0));
        IF target_integrity = 0 AND NEW."runtimeSystems" ? 'WARPDRIVE' THEN
          NEW."runtimeSystems" := jsonb_set(NEW."runtimeSystems", '{WARPDRIVE,active}', 'false');
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(
      `CREATE TRIGGER "TR_reserve_reactor" BEFORE INSERT OR UPDATE ON spacecraft FOR EACH ROW EXECUTE FUNCTION maintain_reserve_reactor()`,
    );
    await q.query(`CREATE FUNCTION synchronize_reserve_reactor_module() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE ship_id integer; core spacecraft_modules%ROWTYPE; systems jsonb;
      BEGIN
        IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
        IF NOT ((TG_OP <> 'INSERT' AND OLD."moduleType" = 'Hypermaterie-Reservekern') OR (TG_OP <> 'DELETE' AND NEW."moduleType" = 'Hypermaterie-Reservekern')) THEN RETURN NULL; END IF;
        FOR ship_id IN SELECT DISTINCT id FROM unnest(ARRAY[CASE WHEN TG_OP <> 'INSERT' THEN OLD."spacecraftId" END, CASE WHEN TG_OP <> 'DELETE' THEN NEW."spacecraftId" END]) id WHERE id IS NOT NULL ORDER BY id LOOP
          SELECT COALESCE("runtimeSystems", '{}'::jsonb) INTO systems FROM spacecraft WHERE id = ship_id FOR UPDATE;
          IF NOT FOUND THEN CONTINUE; END IF;
          SELECT * INTO core FROM spacecraft_modules WHERE "spacecraftId" = ship_id AND "moduleType" = 'Hypermaterie-Reservekern' ORDER BY id LIMIT 1;
          IF FOUND THEN
            systems := systems || jsonb_build_object('REACTOR', COALESCE(systems->'REACTOR', '{}'::jsonb) || jsonb_build_object('integrity', core.integrity, 'active', core.integrity > 0, 'cooldown', 0));
            IF core.integrity = 0 AND systems ? 'WARPDRIVE' THEN systems := jsonb_set(systems, '{WARPDRIVE,active}', 'false'); END IF;
          ELSE
            systems := systems - 'REACTOR';
            IF systems ? 'WARPDRIVE' THEN systems := jsonb_set(systems, '{WARPDRIVE,active}', 'false'); END IF;
          END IF;
          UPDATE spacecraft SET "runtimeSystems" = systems WHERE id = ship_id;
        END LOOP;
        RETURN NULL;
      END $$`);
    await q.query(
      `CREATE TRIGGER "TR_reserve_reactor_module" AFTER INSERT OR DELETE OR UPDATE OF integrity, "isActive", "moduleType", "spacecraftId" ON spacecraft_modules FOR EACH ROW EXECUTE FUNCTION synchronize_reserve_reactor_module()`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TRIGGER "TR_reserve_reactor_module" ON spacecraft_modules',
    );
    await q.query('DROP FUNCTION synchronize_reserve_reactor_module()');
    await q.query('DROP TRIGGER "TR_reserve_reactor" ON spacecraft');
    await q.query('DROP FUNCTION maintain_reserve_reactor()');
  }
}
