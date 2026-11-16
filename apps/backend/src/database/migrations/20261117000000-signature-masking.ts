import { MigrationInterface, QueryRunner } from 'typeorm';

export class SignatureMasking1794873600000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE spacecraft_signature_masks (
      "spacecraftId" integer PRIMARY KEY REFERENCES spacecraft(id) ON DELETE CASCADE,
      "shipClassId" integer NOT NULL REFERENCES ship_class_defs(id) ON DELETE CASCADE,
      "activatedAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL,
      CHECK ("expiresAt" > "activatedAt"))`);
    // Separate state cannot be resurrected by a stale spacecraft save. All
    // runtime writers (combat, anomalies, manual shutdown) invalidate it here.
    await q.query(`CREATE FUNCTION clear_signature_mask_on_drive_state() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.status = 'DESTROYED'
          OR COALESCE(NEW."runtimeSystems"->'WARPDRIVE'->>'active', 'false') <> 'true'
          OR COALESCE((NEW."runtimeSystems"->'WARPDRIVE'->>'integrity')::integer, 100) <= 0 THEN
          DELETE FROM spacecraft_signature_masks WHERE "spacecraftId" = NEW.id;
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE TRIGGER clear_signature_mask_on_drive_state
      AFTER UPDATE OF "runtimeSystems", status ON spacecraft
      FOR EACH ROW EXECUTE FUNCTION clear_signature_mask_on_drive_state()`);
    await q.query(`CREATE FUNCTION clear_signature_mask_on_drive_module() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD.category = 'HYPERDRIVE' THEN
          IF TG_OP = 'DELETE' THEN
            PERFORM 1 FROM spacecraft WHERE id = OLD."spacecraftId" FOR UPDATE;
            DELETE FROM spacecraft_signature_masks WHERE "spacecraftId" = OLD."spacecraftId";
          ELSIF NEW.category <> 'HYPERDRIVE' OR NEW."spacecraftId" <> OLD."spacecraftId"
            OR NOT NEW."isActive" OR NEW.integrity <= 0 THEN
            PERFORM 1 FROM spacecraft WHERE id = OLD."spacecraftId" FOR UPDATE;
            DELETE FROM spacecraft_signature_masks WHERE "spacecraftId" = OLD."spacecraftId";
          END IF;
        END IF;
        RETURN NULL;
      END $$`);
    await q.query(`CREATE TRIGGER clear_signature_mask_on_drive_module
      AFTER UPDATE OR DELETE ON spacecraft_modules
      FOR EACH ROW EXECUTE FUNCTION clear_signature_mask_on_drive_module()`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TRIGGER clear_signature_mask_on_drive_module ON spacecraft_modules',
    );
    await q.query(
      'DROP TRIGGER clear_signature_mask_on_drive_state ON spacecraft',
    );
    await q.query(
      'DROP FUNCTION clear_signature_mask_on_drive_module(), clear_signature_mask_on_drive_state()',
    );
    await q.query('DROP TABLE spacecraft_signature_masks');
  }
}
