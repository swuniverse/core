import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface WidgetSlot {
  id: string;
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Breakpoint = 'lg' | 'sm';

interface PerBreakpointLayouts {
  lg: WidgetSlot[];
  sm: WidgetSlot[];
}

interface DashboardLayoutState {
  layouts: PerBreakpointLayouts;
  editMode: boolean;
  activeBreakpoint: Breakpoint;
  setActiveBreakpoint: (bp: Breakpoint) => void;
  setLayout: (breakpoint: Breakpoint, widgets: WidgetSlot[]) => void;
  toggleWidget: (id: string) => void;
  toggleEditMode: () => void;
  resetLayout: () => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (layouts: PerBreakpointLayouts) => void;
}

export const DEFAULT_LAYOUT_LG: WidgetSlot[] = [
  { id: 'commander-greeting', enabled: true, x: 0, y: 0, w: 12, h: 2 },
  { id: 'stat-colonies', enabled: true, x: 0, y: 2, w: 3, h: 3 },
  { id: 'stat-fleet', enabled: true, x: 3, y: 2, w: 3, h: 3 },
  { id: 'stat-research', enabled: true, x: 6, y: 2, w: 3, h: 3 },
  { id: 'stat-prestige', enabled: true, x: 9, y: 2, w: 3, h: 3 },
  { id: 'baustellen', enabled: true, x: 0, y: 5, w: 12, h: 4 },
  { id: 'active-jobs', enabled: true, x: 0, y: 9, w: 8, h: 8 },
  { id: 'holonet', enabled: true, x: 8, y: 9, w: 4, h: 8 },
  { id: 'colonization-limits', enabled: true, x: 0, y: 17, w: 4, h: 4 },
  { id: 'crew-limit', enabled: true, x: 4, y: 17, w: 4, h: 4 },
  { id: 'online-players', enabled: true, x: 8, y: 17, w: 4, h: 4 },
  { id: 'tick-countdown', enabled: false, x: 0, y: 21, w: 4, h: 3 },
  { id: 'colony-events', enabled: false, x: 8, y: 21, w: 4, h: 6 },
  { id: 'messages', enabled: false, x: 6, y: 21, w: 6, h: 6 },
  { id: 'server-stats', enabled: false, x: 0, y: 27, w: 4, h: 3 },
  { id: 'admin-tick', enabled: false, x: 0, y: 30, w: 4, h: 2 },
];

export const DEFAULT_LAYOUT_SM: WidgetSlot[] = [
  { id: 'commander-greeting', enabled: true, x: 0, y: 0, w: 1, h: 2 },
  { id: 'stat-colonies', enabled: true, x: 0, y: 2, w: 1, h: 3 },
  { id: 'stat-fleet', enabled: true, x: 0, y: 5, w: 1, h: 3 },
  { id: 'stat-research', enabled: true, x: 0, y: 8, w: 1, h: 3 },
  { id: 'stat-prestige', enabled: true, x: 0, y: 11, w: 1, h: 3 },
  { id: 'baustellen', enabled: true, x: 0, y: 14, w: 1, h: 5 },
  { id: 'active-jobs', enabled: true, x: 0, y: 19, w: 1, h: 8 },
  { id: 'holonet', enabled: true, x: 0, y: 27, w: 1, h: 6 },
  { id: 'colonization-limits', enabled: true, x: 0, y: 33, w: 1, h: 4 },
  { id: 'crew-limit', enabled: true, x: 0, y: 37, w: 1, h: 3 },
  { id: 'online-players', enabled: true, x: 0, y: 40, w: 1, h: 3 },
  { id: 'tick-countdown', enabled: false, x: 0, y: 43, w: 1, h: 3 },
  { id: 'colony-events', enabled: false, x: 0, y: 46, w: 1, h: 6 },
  { id: 'messages', enabled: false, x: 0, y: 52, w: 1, h: 6 },
  { id: 'server-stats', enabled: false, x: 0, y: 58, w: 1, h: 3 },
  { id: 'admin-tick', enabled: false, x: 0, y: 61, w: 1, h: 2 },
];

// Keep backward-compat export for DashboardCustomizer
export const DEFAULT_LAYOUT = DEFAULT_LAYOUT_LG;

const DEFAULT_LAYOUTS: PerBreakpointLayouts = {
  lg: DEFAULT_LAYOUT_LG,
  sm: DEFAULT_LAYOUT_SM,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function mergeWithDefaults(saved: WidgetSlot[], defaults: WidgetSlot[]): WidgetSlot[] {
  const savedMap = new Map(saved.map((w) => [w.id, w]));
  const result: WidgetSlot[] = saved.map((w) => ({ ...w }));
  for (const def of defaults) {
    if (!savedMap.has(def.id)) {
      result.push({ ...def });
    }
  }
  return result;
}

function parseServerLayout(raw: string): PerBreakpointLayouts {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    // Old format: flat WidgetSlot[] → use as lg, generate sm from defaults syncing enabled flags
    const lg = mergeWithDefaults(parsed, DEFAULT_LAYOUT_LG);
    const enabledMap = new Map(lg.map((w) => [w.id, w.enabled]));
    const sm = DEFAULT_LAYOUT_SM.map((w) => ({
      ...w,
      enabled: enabledMap.get(w.id) ?? w.enabled,
    }));
    return { lg, sm: mergeWithDefaults(sm, DEFAULT_LAYOUT_SM) };
  }
  // New format: { lg, sm }
  return {
    lg: mergeWithDefaults(parsed.lg ?? DEFAULT_LAYOUT_LG, DEFAULT_LAYOUT_LG),
    sm: mergeWithDefaults(parsed.sm ?? DEFAULT_LAYOUT_SM, DEFAULT_LAYOUT_SM),
  };
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      layouts: DEFAULT_LAYOUTS,
      editMode: false,
      activeBreakpoint: 'lg' as Breakpoint,

      setActiveBreakpoint: (bp) => set({ activeBreakpoint: bp }),

      setLayout: (breakpoint, widgets) => {
        const layouts = { ...get().layouts, [breakpoint]: widgets };
        set({ layouts });
        get().saveToServer(layouts);
      },

      toggleWidget: (id) => {
        const { layouts } = get();
        const newLayouts: PerBreakpointLayouts = {
          lg: layouts.lg.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
          sm: layouts.sm.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
        };
        set({ layouts: newLayouts });
        get().saveToServer(newLayouts);
      },

      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

      resetLayout: () => {
        set({ layouts: DEFAULT_LAYOUTS });
        get().saveToServer(DEFAULT_LAYOUTS);
      },

      loadFromServer: async () => {
        try {
          const res = await api.get<{ layout: string | null }>(
            '/user/dashboard-layout',
          );
          if (res.layout) {
            set({ layouts: parseServerLayout(res.layout) });
          }
        } catch {
          // fallback: keep localStorage value
        }
      },

      saveToServer: (layouts) => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          void api
            .patch('/user/dashboard-layout', { layout: JSON.stringify(layouts) })
            .catch(() => undefined);
        }, 1000);
      },
    }),
    { name: 'swu-dashboard-layout' },
  ),
);
