import type { SpacecraftModule } from './entities/spacecraft-module.entity';

// Only profiles backed by currently buildable SWU modules belong here.
export const REACTOR_FUEL_PROFILES = {
  LIGHT_HYPERMATTER: {
    key: 'LIGHT_HYPERMATTER',
    label: 'Leichter Hypermaterie-Reaktor',
    loadUnits: 2,
    capacityMultiplier: 10,
    costs: [{ commodityId: 5, amount: 1 }],
  },
  HYPERMATTER: {
    key: 'HYPERMATTER',
    label: 'Hypermaterie-Reaktor',
    // STU's mapped core mechanics, expressed entirely in Star Wars fiction.
    loadUnits: 30,
    capacityMultiplier: 15,
    costs: [
      { commodityId: 8, amount: 1 }, // Kyber-Kristalle
      { commodityId: 6, amount: 2 }, // Antimaterie
      { commodityId: 5, amount: 2 }, // Hypermaterie
    ],
  },
} as const;

export type ReactorFuelProfile =
  (typeof REACTOR_FUEL_PROFILES)[keyof typeof REACTOR_FUEL_PROFILES];

export function reactorFuelProfile(
  modules: SpacecraftModule[] = [],
): ReactorFuelProfile {
  const names = modules
    .filter((module) => module.isActive && module.integrity > 0)
    .map((module) => module.moduleType.toLowerCase());
  if (names.some((name) => name.includes('leichter hypermaterie-reaktor'))) {
    return REACTOR_FUEL_PROFILES.LIGHT_HYPERMATTER;
  }
  return REACTOR_FUEL_PROFILES.HYPERMATTER;
}
