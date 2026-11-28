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

type WreckLootEntry = { shipClassKey: string; weight: number };

/**
 * Beute-Pool Droiden (Oldtimer-Schiffe brauchen Crew, Droidenschiffe ab
 * Fregatte aufwaerts nur 10 % davon). Je groesser das Schiff, desto kleiner
 * das Gewicht.
 */
export const WRECK_LOOT_DROIDS: ReadonlyArray<WreckLootEntry> = [
  { shipClassKey: 'SALVAGE_FIGHTER_VULTURE_DROID', weight: 60 },
  { shipClassKey: 'SALVAGE_FIGHTER_VULTURE_B_DROID', weight: 40 },
  { shipClassKey: 'SALVAGE_CORVETTE_C9979', weight: 20 },
  { shipClassKey: 'SALVAGE_FRIGATE_MUNIFICENT', weight: 5 },
  { shipClassKey: 'SALVAGE_CRUISER_PROVIDENCE', weight: 2 },
  { shipClassKey: 'SALVAGE_CRUISER_LUCREHULK', weight: 1 },
];

/**
 * Beute-Pool Oldtimer: sehr viele Jaeger (ARC-170 haeufiger), viele LAAT/I,
 * weniger ST-70 und C70. Groessere Schiffe (Kreuzer) kommen hier mit sehr
 * kleinem Gewicht dazu.
 */
export const WRECK_LOOT_OLDTIMER: ReadonlyArray<WreckLootEntry> = [
  { shipClassKey: 'SALVAGE_FIGHTER_N1', weight: 12 },
  { shipClassKey: 'SALVAGE_FIGHTER_ETA_2', weight: 12 },
  { shipClassKey: 'SALVAGE_FIGHTER_DELTA_7', weight: 12 },
  { shipClassKey: 'SALVAGE_FIGHTER_ARC_170', weight: 24 },
  { shipClassKey: 'SALVAGE_CORVETTE_LAAT_I', weight: 20 },
  { shipClassKey: 'SALVAGE_CORVETTE_ST_70', weight: 10 },
  { shipClassKey: 'SALVAGE_CORVETTE_C70_CHARGER', weight: 8 },
  { shipClassKey: 'SALVAGE_FRIGATE_PELTA', weight: 4 },
  { shipClassKey: 'SALVAGE_CRUISER_VENATOR', weight: 2 },
];

/** Chance, dass ein Wrack aus dem Droiden-Pool stammt (sonst Oldtimer). */
export const WRECK_DROID_CHANCE = 0.4;

function pickWeighted(pool: ReadonlyArray<WreckLootEntry>, roll: number) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = roll * total;
  for (const entry of pool) {
    if (threshold < entry.weight) return entry.shipClassKey;
    threshold -= entry.weight;
  }
  return pool[pool.length - 1].shipClassKey;
}

export function isWreckField(categories: readonly string[] | undefined) {
  return categories?.includes(WRECK_FIELD_CATEGORY) ?? false;
}

/**
 * Waehlt per Wurf (0 <= roll < 1): zuerst 40:60 Droiden- oder Oldtimer-Pool,
 * dann gewichtet ein Schiff aus dem Pool (aus demselben Wurf, neu skaliert).
 */
export function pickWreckShip(roll: number): string {
  if (roll < WRECK_DROID_CHANCE) {
    return pickWeighted(WRECK_LOOT_DROIDS, roll / WRECK_DROID_CHANCE);
  }
  return pickWeighted(
    WRECK_LOOT_OLDTIMER,
    (roll - WRECK_DROID_CHANCE) / (1 - WRECK_DROID_CHANCE),
  );
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
