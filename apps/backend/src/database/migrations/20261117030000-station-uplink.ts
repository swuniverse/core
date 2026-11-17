import { MigrationInterface, QueryRunner } from 'typeorm';

export class StationUplink1794884400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE FUNCTION maintain_station_uplink() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE systems jsonb; state jsonb; own_crew integer; foreign_crew integer;
      BEGIN
        systems := COALESCE(NEW."runtimeSystems", '{}'::jsonb);
        IF NEW.kind <> 'STATION' OR NEW."stationRole" IS DISTINCT FROM 'SENSOR' OR NEW.status = 'UNDER_SCRAPPING' THEN
          NEW."runtimeSystems" := systems - 'UPLINK'; RETURN NEW;
        END IF;
        SELECT count(*) FILTER (WHERE "userId" = NEW."userId"), count(*) FILTER (WHERE "userId" <> NEW."userId")
          INTO own_crew, foreign_crew FROM crew_assignments WHERE "spacecraftId" = NEW.id;
        state := COALESCE(systems->'UPLINK', '{"active":false,"cooldown":0,"integrity":100}'::jsonb);
        IF COALESCE((state->>'integrity')::integer, 100) <= 0 OR foreign_crew = 0 OR own_crew < NEW."crewRequired" THEN
          state := state || '{"active":false}'::jsonb;
        END IF;
        NEW."runtimeSystems" := systems || jsonb_build_object('UPLINK', state || jsonb_build_object('current', foreign_crew, 'max', 3));
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER "TR_station_uplink" BEFORE INSERT OR UPDATE ON spacecraft
      FOR EACH ROW EXECUTE FUNCTION maintain_station_uplink()`);
    await q.query(`CREATE FUNCTION update_station_uplink_crew() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE station_id integer; station spacecraft%ROWTYPE; total_crew integer; own_crew integer; foreign_crew integer; state jsonb; foreign_change boolean;
      BEGIN
        FOR station_id IN SELECT DISTINCT id FROM unnest(ARRAY[
          CASE WHEN TG_OP <> 'INSERT' THEN OLD."spacecraftId" END,
          CASE WHEN TG_OP <> 'DELETE' THEN NEW."spacecraftId" END
        ]) id WHERE id IS NOT NULL ORDER BY id LOOP
          SELECT * INTO station FROM spacecraft WHERE id = station_id AND kind = 'STATION' AND "stationRole" = 'SENSOR' FOR UPDATE;
          IF NOT FOUND THEN CONTINUE; END IF;
          SELECT count(*), count(*) FILTER (WHERE "userId" = station."userId"), count(*) FILTER (WHERE "userId" <> station."userId")
            INTO total_crew, own_crew, foreign_crew FROM crew_assignments WHERE "spacecraftId" = station_id;
          state := COALESCE(station."runtimeSystems"->'UPLINK', '{"active":false,"cooldown":0,"integrity":100}'::jsonb);
          foreign_change := (TG_OP <> 'INSERT' AND OLD."spacecraftId" = station_id AND OLD."userId" <> station."userId")
                         OR (TG_OP <> 'DELETE' AND NEW."spacecraftId" = station_id AND NEW."userId" <> station."userId");
          IF foreign_change AND foreign_crew > 0 AND own_crew >= station."crewRequired" AND (state->>'integrity')::integer > 0 THEN
            state := state || '{"active":true}'::jsonb;
          END IF;
          UPDATE spacecraft SET crew = total_crew, "runtimeSystems" = "runtimeSystems" || jsonb_build_object('UPLINK', state) WHERE id = station_id;
        END LOOP;
        RETURN NULL;
      END $$`);
    await q.query(`CREATE TRIGGER "TR_station_uplink_crew" AFTER INSERT OR DELETE OR UPDATE OF "spacecraftId", "userId" ON crew_assignments
      FOR EACH ROW EXECUTE FUNCTION update_station_uplink_crew()`);
    await q.query(
      `UPDATE spacecraft SET "runtimeSystems" = "runtimeSystems" WHERE kind = 'STATION' AND "stationRole" = 'SENSOR'`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TRIGGER "TR_station_uplink_crew" ON crew_assignments');
    await q.query('DROP FUNCTION update_station_uplink_crew()');
    await q.query('DROP TRIGGER "TR_station_uplink" ON spacecraft');
    await q.query('DROP FUNCTION maintain_station_uplink()');
    await q.query(
      `UPDATE spacecraft SET "runtimeSystems" = "runtimeSystems" - 'UPLINK' WHERE "runtimeSystems" ? 'UPLINK'`,
    );
  }
}
