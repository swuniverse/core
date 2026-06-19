import { create } from 'zustand';
import type {
  StarmapFieldTypeDto,
  StarmapGalaxyFieldDto,
  StarmapLayerDto,
  StarmapMapRegionDto,
  StarmapBorderTypeDto,
  StarmapSystemTypeOptionDto,
  StarmapUpdateGalaxyFieldDto,
  StarmapBulkEditFieldsDto,
  StarmapCreateLayerDto,
  StarmapOperationResultDto,
  DefaultStarWarsGalaxySeedResultDto,
} from '@swuniverse/shared';
import { api } from '../services/api';

export type ToolMode =
  | 'select'
  | 'fieldType'
  | 'systemType'
  | 'region'
  | 'adminRegion'
  | 'passable'
  | 'border'
  | 'effects';

export interface OverlayFlags {
  grid: boolean;
  regions: boolean;
  adminRegions: boolean;
  systemTypes: boolean;
  impassable: boolean;
  borders: boolean;
  effects: boolean;
}

interface FullmapEditorState {
  // Data
  layers: StarmapLayerDto[];
  fieldTypes: StarmapFieldTypeDto[];
  systemTypes: StarmapSystemTypeOptionDto[];
  regions: StarmapMapRegionDto[];
  borderTypes: StarmapBorderTypeDto[];
  fields: StarmapGalaxyFieldDto[];

  // Selection
  selectedLayerId: number | null;
  selectedField: StarmapGalaxyFieldDto | null;
  selectedFieldIds: number[];
  rectSelect: boolean;

  // Tool state
  tool: ToolMode;
  selectedFieldTypeId: number | null;
  selectedSystemTypeId: number | null;
  selectedRegionId: number | null;
  selectedAdminRegionKey: string | null;
  selectedInfluenceId: number | null;
  selectedBorderTypeId: number | null;
  selectedPassableOverride: boolean | null;
  effectMode: 'add' | 'remove';
  selectedEffects: string[];

  // Overlays
  overlays: OverlayFlags;

  // UI
  loading: boolean;
  status: string;
  error: string | null;

  // Actions
  bootstrap: () => Promise<void>;
  selectLayer: (layerId: number) => Promise<void>;
  loadFields: () => Promise<void>;
  selectField: (field: StarmapGalaxyFieldDto | null) => void;
  toggleFieldSelection: (fieldId: number) => void;
  addFieldToSelection: (fieldId: number) => void;
  clearSelection: () => void;
  setTool: (tool: ToolMode) => void;
  setOverlay: (key: keyof OverlayFlags, value: boolean) => void;
  setRectSelect: (v: boolean) => void;
  setSelectedFieldTypeId: (id: number | null) => void;
  setSelectedSystemTypeId: (id: number | null) => void;
  setSelectedRegionId: (id: number | null) => void;
  setSelectedAdminRegionKey: (key: string | null) => void;
  setSelectedInfluenceId: (id: number | null) => void;
  setSelectedBorderTypeId: (id: number | null) => void;
  setSelectedPassableOverride: (v: boolean | null) => void;
  setEffectMode: (mode: 'add' | 'remove') => void;
  setSelectedEffects: (effects: string[]) => void;
  applyToField: (fieldId: number) => Promise<void>;
  applyToSelection: () => Promise<void>;

  // Layer CRUD
  createLayer: (form: StarmapCreateLayerDto) => Promise<void>;
  deleteSelectedLayer: () => Promise<void>;

  // Galaxy actions
  initializeDefaultStarWarsGalaxy: () => Promise<void>;
  initializeLayerGrid: (fieldTypeId: number) => Promise<void>;
  generateSystemsForLayer: () => Promise<void>;

  // Export/Import
  exportLayer: () => Promise<void>;
  importLayer: (json: string) => Promise<void>;
}

export const useFullmapEditorStore = create<FullmapEditorState>((set, get) => ({
  layers: [],
  fieldTypes: [],
  systemTypes: [],
  regions: [],
  borderTypes: [],
  fields: [],
  selectedLayerId: null,
  selectedField: null,
  selectedFieldIds: [],
  rectSelect: false,
  tool: 'select',
  selectedFieldTypeId: null,
  selectedSystemTypeId: null,
  selectedRegionId: null,
  selectedAdminRegionKey: null,
  selectedInfluenceId: null,
  selectedBorderTypeId: null,
  selectedPassableOverride: null,
  effectMode: 'add',
  selectedEffects: [],
  overlays: {
    grid: true,
    regions: false,
    adminRegions: false,
    systemTypes: false,
    impassable: false,
    borders: true,
    effects: true,
  },
  loading: false,
  status: '',
  error: null,

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const [layers, fieldTypes, systemTypes, borderTypes] = await Promise.all([
        api.get<StarmapLayerDto[]>('/starmap/layers'),
        api.get<StarmapFieldTypeDto[]>('/starmap/admin/field-types'),
        api.get<StarmapSystemTypeOptionDto[]>('/starmap/admin/system-types'),
        api.get<StarmapBorderTypeDto[]>('/starmap/admin/border-types'),
      ]);
      const selectedLayerId = layers[0]?.id ?? null;
      set({ layers, fieldTypes, systemTypes, borderTypes, selectedLayerId, loading: false });
      if (selectedLayerId) {
        const regions = await api.get<StarmapMapRegionDto[]>(`/starmap/admin/layers/${selectedLayerId}/regions`);
        set({ regions });
        await get().loadFields();
      }
    } catch (err) {
      set({ error: readError(err), loading: false });
    }
  },

  selectLayer: async (layerId) => {
    set({ selectedLayerId: layerId, fields: [], selectedField: null, selectedFieldIds: [], status: '', regions: [] });
    const regions = await api.get<StarmapMapRegionDto[]>(`/starmap/admin/layers/${layerId}/regions`);
    set({ regions });
    await get().loadFields();
  },

  loadFields: async () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    set({ status: 'Lade Felder...', error: null });
    try {
      const fields = await api.get<StarmapGalaxyFieldDto[]>(
        `/starmap/layers/${selectedLayerId}/fields`,
      );
      set({ fields, status: `${fields.length} Felder geladen` });
    } catch (err) {
      set({ error: readError(err), status: '' });
    }
  },

  selectField: (field) => set({ selectedField: field }),

  toggleFieldSelection: (fieldId) => {
    const { selectedFieldIds } = get();
    if (selectedFieldIds.includes(fieldId)) {
      set({ selectedFieldIds: selectedFieldIds.filter((id) => id !== fieldId) });
    } else {
      set({ selectedFieldIds: [...selectedFieldIds, fieldId] });
    }
  },

  addFieldToSelection: (fieldId) => {
    const { selectedFieldIds } = get();
    if (!selectedFieldIds.includes(fieldId)) {
      set({ selectedFieldIds: [...selectedFieldIds, fieldId] });
    }
  },

  clearSelection: () => set({ selectedFieldIds: [] }),

  setTool: (tool) => set({ tool }),
  setOverlay: (key, value) => set({ overlays: { ...get().overlays, [key]: value } }),
  setRectSelect: (v) => set({ rectSelect: v }),
  setSelectedFieldTypeId: (id) => set({ selectedFieldTypeId: id }),
  setSelectedSystemTypeId: (id) => set({ selectedSystemTypeId: id }),
  setSelectedRegionId: (id) => set({ selectedRegionId: id }),
  setSelectedAdminRegionKey: (key) => set({ selectedAdminRegionKey: key }),
  setSelectedInfluenceId: (id) => set({ selectedInfluenceId: id }),
  setSelectedBorderTypeId: (id) => set({ selectedBorderTypeId: id }),
  setSelectedPassableOverride: (v) => set({ selectedPassableOverride: v }),
  setEffectMode: (mode) => set({ effectMode: mode }),
  setSelectedEffects: (effects) => set({ selectedEffects: effects }),

  applyToField: async (fieldId) => {
    const state = get();
    const patch = buildPatch(state);
    if (!patch) return;
    try {
      const updated = await api.patch<StarmapGalaxyFieldDto>(
        `/starmap/admin/fields/${fieldId}`,
        patch,
      );
      set({
        fields: state.fields.map((f) => (f.id === fieldId ? updated : f)),
        selectedField: state.selectedField?.id === fieldId ? updated : state.selectedField,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  applyToSelection: async () => {
    const state = get();
    const { selectedFieldIds } = state;
    if (!selectedFieldIds.length) return;
    const patch = buildPatch(state);
    if (!patch) return;
    try {
      await api.patch<{ updated: number }>(
        '/starmap/admin/galaxy-fields/bulk',
        { fieldIds: selectedFieldIds, ...patch } as StarmapBulkEditFieldsDto,
      );
      await get().loadFields();
      set({ selectedFieldIds: [] });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createLayer: async (form) => {
    set({ status: 'Layer erstellen...', error: null });
    try {
      const layer = await api.post<StarmapLayerDto>('/starmap/admin/layers', form);
      const layers = [...get().layers, layer];
      set({ layers, selectedLayerId: layer.id, fields: [], status: `Layer "${layer.name}" erstellt` });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  deleteSelectedLayer: async () => {
    const { selectedLayerId, layers } = get();
    if (!selectedLayerId) return;
    set({ status: 'Layer löschen...', error: null });
    try {
      await api.delete(`/starmap/admin/layers/${selectedLayerId}`);
      const remaining = layers.filter((l) => l.id !== selectedLayerId);
      const nextId = remaining[0]?.id ?? null;
      set({ layers: remaining, selectedLayerId: nextId, fields: [], status: 'Layer gelöscht' });
      if (nextId) await get().loadFields();
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  initializeDefaultStarWarsGalaxy: async () => {
    set({ status: 'Star Wars Galaxie wird erstellt...', error: null });
    try {
      const result = await api.post<DefaultStarWarsGalaxySeedResultDto>(
        '/starmap/admin/default-star-wars-galaxy',
        {},
      );
      set({ status: `Star Wars Galaxie erstellt (${result.createdFields} Felder, ${result.generatedPlayableSystems} Systeme)` });
      await get().bootstrap();
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  initializeLayerGrid: async (fieldTypeId) => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    set({ status: 'Grid initialisieren...', error: null });
    try {
      const result = await api.post<StarmapOperationResultDto>(
        `/starmap/admin/layers/${selectedLayerId}/initialize-grid`,
        { defaultFieldTypeId: fieldTypeId },
      );
      set({ status: `Grid initialisiert (${result.created ?? 0} Felder)` });
      await get().loadFields();
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  generateSystemsForLayer: async () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    set({ status: 'Systeme generieren...', error: null });
    try {
      const result = await api.post<StarmapOperationResultDto>(
        `/starmap/admin/layers/${selectedLayerId}/generate-systems`,
        {},
      );
      set({ status: `${result.generated ?? 0} Systeme generiert` });
      await get().loadFields();
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  exportLayer: async () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    set({ status: 'Exportiere...', error: null });
    try {
      const data = await api.get<unknown>(`/starmap/admin/layers/${selectedLayerId}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `layer-${selectedLayerId}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      set({ status: 'Export abgeschlossen' });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  importLayer: async (json) => {
    set({ status: 'Importiere...', error: null });
    try {
      const data = JSON.parse(json);
      await api.post('/starmap/admin/layers/import', data);
      set({ status: 'Import abgeschlossen' });
      await get().bootstrap();
    } catch (err) {
      set({ error: readError(err) });
    }
  },
}));

function buildPatch(state: FullmapEditorState): StarmapUpdateGalaxyFieldDto | null {
  switch (state.tool) {
    case 'fieldType':
      return state.selectedFieldTypeId != null ? { fieldTypeId: state.selectedFieldTypeId } : null;
    case 'systemType':
      return { systemTypeId: state.selectedSystemTypeId };
    case 'region':
      return { regionId: state.selectedRegionId };
    case 'adminRegion':
      return { adminRegionKey: state.selectedAdminRegionKey };
    case 'passable':
      return { passableOverride: state.selectedPassableOverride };
    case 'border':
      return { borderTypeId: state.selectedBorderTypeId };
    case 'effects':
      return { effects: state.selectedEffects };
    default:
      return null;
  }
}

function readError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unbekannter Fehler';
}
