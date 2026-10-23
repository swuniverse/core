import { create } from 'zustand';
import { api } from '../services/api';

type NewCountResponse = number | { count: number };

interface HolonetUnreadState {
  count: number;
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useHolonetUnreadStore = create<HolonetUnreadState>((set) => ({
  count: 0,
  refresh: async () => {
    try {
      const response = await api.get<NewCountResponse>('/holonet/new-count');
      set({ count: typeof response === 'number' ? response : response.count });
    } catch {
      set({ count: 0 });
    }
  },
  clear: () => set({ count: 0 }),
}));
