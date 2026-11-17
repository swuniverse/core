import { MigrationInterface, QueryRunner } from 'typeorm';

export class StationBeamBlocker1794880800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    // All station creation and crew paths share the persisted lifecycle.
    // No fabricated module, research or transfer restriction.
    await q.query(`CREATE FUNCTION maintain_station_beam_blocker() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE systems jsonb; state jsonb; previous_integrity integer; has_eps boolean;
      BEGIN
        systems := CASE WHEN jsonb_typeof(NEW."runtimeSystems") = 'object' THEN NEW."runtimeSystems" ELSE '{}'::jsonb END;
        IF NEW.kind <> 'STATION' OR NEW.status = 'UNDER_SCRAPPING' THEN
          IF systems ? 'BEAM_BLOCKER' THEN NEW."runtimeSystems" := systems - 'BEAM_BLOCKER'; END IF;
          RETURN NEW;
        END IF;
        state := systems->'BEAM_BLOCKER';
        IF jsonb_typeof(state) IS DISTINCT FROM 'object' THEN
          -- Creation starts OFF; providing crew runs the default-system startup.
          state := jsonb_build_object('active', false, 'cooldown', 0, 'integrity', 100);
        END IF;
        IF COALESCE((state->>'integrity')::integer, 100) <= 0 THEN
          state := state || '{"active":false}'::jsonb;
        ELSIF TG_OP = 'UPDATE' THEN
          previous_integrity := COALESCE((OLD."runtimeSystems"->'BEAM_BLOCKER'->>'integrity')::integer, 100);
          IF NEW.crew > 0 AND previous_integrity < 100 AND
             COALESCE((state->>'integrity')::integer, 100) > previous_integrity AND
             (previous_integrity = 0 OR (state->>'integrity')::integer = 100) THEN
            -- STU passive station repair restores default mode with crew aboard.
            state := state || '{"active":true}'::jsonb;
          ELSIF NEW.crew IS DISTINCT FROM OLD.crew THEN
            IF NEW.crew = 0 THEN
              state := state || '{"active":false}'::jsonb;
            ELSIF NEW.crew >= NEW."crewRequired" THEN
              has_eps := systems ? 'EPS' OR EXISTS (
                SELECT 1 FROM spacecraft_modules WHERE "spacecraftId" = NEW.id
                AND (upper(category) = 'EPS' OR lower("moduleType") LIKE '%energieverteiler%')
              );
              IF has_eps AND (
                COALESCE((state->>'cooldown')::bigint, 0) = 0 OR
                ((state->>'cooldown')::bigint >= 1000000000000 AND
                 (state->>'cooldown')::bigint <= extract(epoch FROM clock_timestamp()) * 1000)
              ) THEN
                state := state || '{"active":true}'::jsonb;
              END IF;
            END IF;
          END IF;
        END IF;
        NEW."runtimeSystems" := systems || jsonb_build_object('BEAM_BLOCKER', state);
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER "TR_station_beam_blocker" BEFORE INSERT OR UPDATE ON spacecraft
      FOR EACH ROW EXECUTE FUNCTION maintain_station_beam_blocker()`);
    await q.query(`UPDATE spacecraft SET "runtimeSystems" = COALESCE("runtimeSystems", '{}'::jsonb) ||
      jsonb_build_object('BEAM_BLOCKER', jsonb_build_object(
        'active', crew > 0 AND crew >= "crewRequired" AND (
          "runtimeSystems" ? 'EPS' OR EXISTS (SELECT 1 FROM spacecraft_modules
            WHERE "spacecraftId" = spacecraft.id AND (upper(category) = 'EPS' OR lower("moduleType") LIKE '%energieverteiler%'))
        ), 'cooldown', 0, 'integrity', 100))
      WHERE kind = 'STATION' AND status <> 'UNDER_SCRAPPING' AND NOT ("runtimeSystems" ? 'BEAM_BLOCKER')`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TRIGGER "TR_station_beam_blocker" ON spacecraft');
    await q.query('DROP FUNCTION maintain_station_beam_blocker()');
    await q.query(`UPDATE spacecraft SET "runtimeSystems" = "runtimeSystems" - 'BEAM_BLOCKER'
      WHERE "runtimeSystems" ? 'BEAM_BLOCKER'`);
  }
}
