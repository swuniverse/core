export interface StarmapSystemTypeOption {
  id: number;
  key: string;
  name: string;
}

export const STARMAP_SYSTEM_TYPE_OPTIONS: StarmapSystemTypeOption[] = [
  { id: 1, key: 'STANDARD', name: 'Standard System' },
  { id: 2, key: 'HOMEWORLD', name: 'Homeworld System' },
  { id: 3, key: 'NEBULA_SYSTEM', name: 'Nebula System' },
  { id: 4, key: 'ASTEROID_SYSTEM', name: 'Asteroid System' },
  { id: 5, key: 'DEEP_SPACE_OUTPOST', name: 'Deep Space Outpost' },
];
