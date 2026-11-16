import { create } from 'zustand';
import type { PublicPlayerNameDto } from '@swuniverse/shared';
import { api } from '../services/api';
interface PlayerNamesState {
  byId: Map<number, PublicPlayerNameDto>;
  byName: Map<string, PublicPlayerNameDto>;
}
export const usePlayerNamesStore = create<PlayerNamesState>(() => ({
  byId: new Map(),
  byName: new Map(),
}));
let generation = 0;
let request = 0;
export function resetPlayerNames(): void {
  generation++;
  usePlayerNamesStore.setState({ byId: new Map(), byName: new Map() });
}
export function setPlayerNames(rows: PublicPlayerNameDto[]): void {
  const byId = new Map<number, PublicPlayerNameDto>(),
    byName = new Map<string, PublicPlayerNameDto>();
  for (const row of rows) {
    byId.set(row.id, row);
    byName.set(row.username, row);
    if (row.displayName) byName.set(row.displayName, row);
  }
  usePlayerNamesStore.setState({ byId, byName });
}
/** One public directory load serves names throughout the shell, including nested lists. */
export async function refreshPlayerNames(): Promise<void> {
  const requestedGeneration = generation;
  const requested = ++request;
  const rows = await api.get<PublicPlayerNameDto[]>('/database/player-names');
  if (generation === requestedGeneration && requested === request)
    setPlayerNames(Array.isArray(rows) ? rows : []);
}
