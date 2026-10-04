import type { EntityManager } from 'typeorm';

/** Tabellen mit "colonyId", die beim endgueltigen Entfernen einer Kolonie mit geloescht werden. */
export const COLONY_CHILD_TABLES = [
  'crew_assignments',
  'colony_orbit_assignments',
  'colony_scans',
  'colony_ship_build_queue',
  'colony_fabrication_queue',
  'colony_crew_training_queue',
  'colony_deposit_mining',
  'colony_events',
  'colony_changeable',
  'colony_stats',
  'colony_storage',
  'colony_fields',
] as const;

/**
 * Entfernt Kolonien samt Crew, Gebaeuden/Feldern, Lager, Queues, Scans und
 * Ereignissen endgueltig. Laeuft im uebergebenen Manager (i.d.R. innerhalb
 * einer Transaktion).
 */
export async function purgeColonies(
  manager: EntityManager,
  colonyIds: number[],
): Promise<void> {
  if (colonyIds.length === 0) return;
  const byColony = [colonyIds];
  await manager.query(
    `DELETE FROM "crew" WHERE "id" IN (SELECT "crewId" FROM "crew_assignments" WHERE "colonyId" = ANY($1))`,
    byColony,
  );
  for (const table of COLONY_CHILD_TABLES) {
    await manager.query(`DELETE FROM "${table}" WHERE "colonyId" = ANY($1)`, byColony);
  }
  await manager.query(`DELETE FROM "colonies" WHERE "id" = ANY($1)`, byColony);
}
