/**
 * Abgestuerzte Wracks: Geländetiles mit der Feldkategorie "wrack" (siehe
 * swu-field-build-categories.yaml) lassen sich reparieren wie ein Schiff in
 * der Werft. Nach der Reparatur landet zufaellig einer der Jaeger im
 * Planeteninventar (als Hangar-Rumpf, startbar).
 */
export const WRECK_FIELD_CATEGORY = 'wrack';

/** Gelaendetile, das nach der Bergung eines Wracks an dessen Stelle tritt (Krater). */
export const WRECK_SALVAGED_TILE_ID = 'G614';

/** Ersatzteile (10001) und Systemkomponenten (10002), wie bei der Schiffsreparatur. */
export const WRECK_SPARE_PART_COMMODITY_ID = 10001;
export const WRECK_SYSTEM_COMPONENT_COMMODITY_ID = 10002;

export const WRECK_MIN_DAMAGE = 10;
export const WRECK_MAX_DAMAGE = 100;

/** Gewichtete Beute-Tabelle; ARC-170 und Vulture Droid sind haeufiger. */
export const WRECK_SHIP_LOOT: ReadonlyArray<{
  shipClassKey: string;
  weight: number;
}> = [
  { shipClassKey: 'SALVAGE_FIGHTER_N1', weight: 10 },
  { shipClassKey: 'SALVAGE_FIGHTER_ETA_2', weight: 10 },
  { shipClassKey: 'SALVAGE_FIGHTER_DELTA_7', weight: 10 },
  { shipClassKey: 'SALVAGE_FIGHTER_ARC_170', weight: 20 },
  { shipClassKey: 'SALVAGE_FIGHTER_VULTURE_DROID', weight: 20 },
];

export function isWreckField(categories: readonly string[] | undefined) {
  return categories?.includes(WRECK_FIELD_CATEGORY) ?? false;
}

/** Waehlt per Wurf (0 <= roll < 1) ein Schiff entsprechend der Gewichte. */
export function pickWreckShip(roll: number): string {
  const total = WRECK_SHIP_LOOT.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = roll * total;
  for (const entry of WRECK_SHIP_LOOT) {
    if (threshold < entry.weight) return entry.shipClassKey;
    threshold -= entry.weight;
  }
  return WRECK_SHIP_LOOT[WRECK_SHIP_LOOT.length - 1].shipClassKey;
}

/**
 * Stabiler Pseudo-Zufallsschaden pro Feld (10-100), damit er ohne eigene
 * Spalte konstant bleibt.
 */
export function wreckDamageForField(
  colonyId: number,
  fieldIndex: number,
): number {
  let hash = (colonyId * 73856093) ^ (fieldIndex * 19349663);
  hash = Math.imul(hash ^ (hash >>> 13), 0x5bd1e995);
  hash ^= hash >>> 15;
  const span = WRECK_MAX_DAMAGE - WRECK_MIN_DAMAGE + 1;
  return WRECK_MIN_DAMAGE + (Math.abs(hash) % span);
}

export interface WreckRepairPlan {
  damage: number;
  costs: Array<{ commodityId: number; amount: number }>;
  durationMinutes: number;
  hasRepairStationBonus: boolean;
}

export function wreckRepairPlan(
  damage: number,
  hasRepairStationBonus: boolean,
): WreckRepairPlan {
  const applyBonus = (amount: number) =>
    hasRepairStationBonus ? Math.ceil(amount / 2) : amount;
  const costs = [
    {
      commodityId: WRECK_SPARE_PART_COMMODITY_ID,
      amount: applyBonus(Math.max(1, Math.ceil(damage / 10))),
    },
    {
      commodityId: WRECK_SYSTEM_COMPONENT_COMMODITY_ID,
      amount: applyBonus(Math.ceil(damage / 20)),
    },
  ].filter((cost) => cost.amount > 0);
  return {
    damage,
    costs,
    durationMinutes: Math.max(1, applyBonus(Math.ceil(damage / 5))),
    hasRepairStationBonus,
  };
}
