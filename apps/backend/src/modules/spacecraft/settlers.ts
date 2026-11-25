/** Colony population carried on passenger ferries; stored as regular cargo. */
export const SETTLERS_COMMODITY_ID = 9990;

export interface SettlersLimitsInput {
  cargoMax: number;
  cargoUsed: number;
  onShip: number;
  workless: number;
  population: number;
  populationMax: number;
}

/** Only the colony's unemployed can be resettled; the target must have housing left. */
export function settlersLimits(input: SettlersLimitsInput) {
  const shipRoom = Math.max(0, input.cargoMax - input.cargoUsed);
  return {
    maxLoad: Math.max(0, Math.min(shipRoom, input.workless)),
    maxUnload: Math.max(
      0,
      Math.min(input.onShip, input.populationMax - input.population),
    ),
  };
}
