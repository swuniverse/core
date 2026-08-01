const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || '/assets';

export function shipyardHullLayoutImage(imageKey: string): string {
  return `${ASSET_BASE}/shipyard/${imageKey}.svg`;
}

export function shipyardDrydockImage(shipClassKey: string): string {
  return `${ASSET_BASE}/shipyard/drydock/${shipClassKey.toLowerCase().replace(/_/g, '-')}.png`;
}
