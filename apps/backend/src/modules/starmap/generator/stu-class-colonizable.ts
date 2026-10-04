import { isHabitableByClass } from '@swuniverse/shared';

/**
 * Kolonisierbarkeit einer STU-classId (Umkehrung von convertObjectToSwu beim Zurueckstellen).
 * Bewusst getrennt von swu-stu-class-mapping.ts: Migrationen laufen unter ts-node/CommonJS
 * und duerfen das ESM-Paket @swuniverse/shared nicht transitiv importieren.
 */
export function isStuClassColonizable(classId: number | null): boolean {
  return isHabitableByClass(classId);
}
