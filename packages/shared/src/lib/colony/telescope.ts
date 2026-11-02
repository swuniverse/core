import type { StarmapExploredGalaxyFieldDto } from '../starmap/index.js';

export interface ColonyTelescopeDto {
  layer: { id: number; width: number; height: number };
  origin: { x: number; y: number };
  center: { x: number; y: number };
  viewport: { width: number; height: number };
  fields: StarmapExploredGalaxyFieldDto[];
  hiddenCount: number;
  energy: { available: number; required: number | null };
}

export interface ColonyTelescopeScanDto {
  target: { x: number; y: number };
  energy: { available: number; spent: number };
  categories: Array<{ category: string; amount: number }>;
}
