import type { Spacecraft } from './entities/spacecraft.entity';
import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';

export const TACHYON_SCAN_ENERGY = 10;
export const TACHYON_SCAN_DURATION_MS = 300_000;

/** Detection belongs to the scan location and ends exactly at the STU deadline. */
export function tachyonScanExpiresAt(
  ship: Pick<Spacecraft, 'runtimeSystems' | 'locationId'>,
  now = Date.now(),
): number | null {
  const scanner = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto | null)
    ?.TACHYON_SCANNER;
  const scannedAt = scanner?.lastScanAt;
  if (
    !scanner?.active ||
    scanner.integrity <= 0 ||
    !Number.isFinite(scannedAt) ||
    scannedAt === undefined ||
    scanner.lastScanLocationId !== ship.locationId ||
    scannedAt > now ||
    now >= scannedAt + TACHYON_SCAN_DURATION_MS
  )
    return null;
  return scannedAt + TACHYON_SCAN_DURATION_MS;
}
