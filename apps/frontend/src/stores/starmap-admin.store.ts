import { create } from 'zustand';
import type {
  ApplyStarWarsPresetOptionsDto,
  ApplyStarWarsPresetResultDto,
  StarmapBorderTypeDto,
  StarmapBulkEditFieldsDto,
  StarmapCreateBorderTypeDto,
  StarmapCreateLayerDto,
  StarmapCreateMapRegionDto,
  StarmapCreateSystemDto,
  StarmapFieldTypeDto,
  StarmapFillSectorDto,
  StarmapGalaxyFieldDto,
  StarmapGenerateSystemsDto,
  StarmapInitializeGridDto,
  HyperspaceRouteDto,
  StarmapLayerDto,
  StarmapLayerOverviewDto,
  StarmapMapRegionDto,
  StarmapOperationResultDto,
  StarmapRegenerateSystemDto,
  StarmapSectorDto,
  StarmapSystemFieldDto,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
  StarmapSystemTypeOptionDto,
  StarmapUpdateBorderTypeDto,
  StarmapUpdateGalaxyFieldDto,
  StarmapUpdateMapRegionDto,
  StarmapUpdateSystemFieldDto,
} from '@swuniverse/shared';
import { api } from '../services/api';

export type Layer = StarmapLayerDto;
export type StarSystem = StarmapSystemListItemDto;
export type SystemTypeOption = StarmapSystemTypeOptionDto;
export type FieldType = StarmapFieldTypeDto;
export type SectorSummary = StarmapSectorDto;
export type GalaxyField = StarmapGalaxyFieldDto;
export type SystemField = StarmapSystemFieldDto;
export type MapRegion = StarmapMapRegionDto;
export type BorderType = StarmapBorderTypeDto;
export type HyperspaceRoute = HyperspaceRouteDto;

export type SectorFillForm = Pick<
  StarmapFillSectorDto,
  'fieldTypeId' | 'systemTypeId' | 'factionZone'
> & { adminRegionKey: string };

export type CreateSystemForm = Pick<
  StarmapCreateSystemDto,
  'name' | 'systemTypeId' | 'maxX' | 'maxY'
>;

export const defaultLayerForm: StarmapCreateLayerDto = {
  name: 'Galaxy',
  width: 120,
  height: 120,
  sectorSize: 20,
  isDefault: true,
  isFinished: false,
  isHidden: false,
};

export const defaultCreateSystemForm: CreateSystemForm = {
  name: '',
  systemTypeId: 1,
  maxX: 22,
  maxY: 22,
};

export type BrushMode = 'single' | 'brush';

interface StarmapAdminState {
  // Data
  layers: Layer[];
  fieldTypes: FieldType[];
  systemTypes: SystemTypeOption[];
  sectors: SectorSummary[];
  sectorFields: GalaxyField[];
  systemFields: SystemField[];
  regions: MapRegion[];
  borderTypes: BorderType[];
  hyperspaceRoutes: HyperspaceRoute[];
  layerOverview: StarmapLayerOverviewDto | null;

  // Selection
  selectedLayerId: number | null;
  selectedSector: SectorSummary | null;
  selectedField: GalaxyField | null;
  selectedSystemId: number | null;
  selectedSystemField: SystemField | null;
  selectedFieldIds: number[];
  brushMode: BrushMode;

  // Forms
  layerForm: StarmapCreateLayerDto;
  layerGridFieldTypeId: number;
  systemGridFieldTypeId: number;
  sectorFillForm: SectorFillForm;
  createSystemForm: CreateSystemForm;

  // UI
  loading: boolean;
  message: string | null;
  error: string | null;

  // Actions
  bootstrap: () => Promise<void>;
  ensureDefaults: () => Promise<void>;
  selectLayer: (layerId: number) => Promise<void>;
  createLayer: () => Promise<void>;
  deleteSelectedLayer: () => Promise<void>;
  initializeLayerGrid: () => Promise<void>;
  selectSector: (
    sector: SectorSummary,
    preserveFieldId?: number | null,
  ) => Promise<void>;
  fillSelectedSector: () => Promise<void>;
  setSelectedField: (field: GalaxyField | null) => void;
  updateField: (
    fieldId: number,
    patch: StarmapUpdateGalaxyFieldDto,
  ) => Promise<void>;
  createSystemForSelectedField: () => Promise<void>;
  generateSystemsForLayer: () => Promise<void>;
  applyStarWarsPreset: (
    options?: ApplyStarWarsPresetOptionsDto,
  ) => Promise<void>;
  regenerateSelectedSystem: () => Promise<void>;
  initializeSelectedSystemGrid: () => Promise<void>;
  openSystem: (systemId: number) => Promise<void>;
  updateSystemFieldType: (
    fieldId: number,
    fieldTypeId: number,
  ) => Promise<void>;
  setSelectedSystemField: (field: SystemField | null) => void;
  setLayerForm: (form: StarmapCreateLayerDto) => void;
  setLayerGridFieldTypeId: (id: number) => void;
  setSystemGridFieldTypeId: (id: number) => void;
  setSectorFillForm: (form: SectorFillForm) => void;
  setCreateSystemForm: (form: CreateSystemForm) => void;
  clearMessages: () => void;

  // Multi-Select / Brush
  toggleFieldSelection: (fieldId: number, shiftKey: boolean) => void;
  clearSelection: () => void;
  setBrushMode: (mode: BrushMode) => void;
  bulkEditSelected: (
    patch: Omit<StarmapBulkEditFieldsDto, 'fieldIds'>,
  ) => Promise<void>;

  // Regions
  loadRegions: () => Promise<void>;
  createRegion: (input: StarmapCreateMapRegionDto) => Promise<void>;
  updateRegion: (id: number, patch: StarmapUpdateMapRegionDto) => Promise<void>;
  deleteRegion: (id: number) => Promise<void>;

  // Border Types
  loadBorderTypes: () => Promise<void>;
  createBorderType: (input: StarmapCreateBorderTypeDto) => Promise<void>;
  updateBorderType: (
    id: number,
    patch: StarmapUpdateBorderTypeDto,
  ) => Promise<void>;
  deleteBorderType: (id: number) => Promise<void>;

  // Overview
  loadLayerOverview: () => Promise<void>;
}

export const useStarmapAdminStore = create<StarmapAdminState>((set, get) => ({
  layers: [],
  fieldTypes: [],
  systemTypes: [],
  sectors: [],
  sectorFields: [],
  systemFields: [],
  regions: [],
  borderTypes: [],
  hyperspaceRoutes: [],
  layerOverview: null,
  selectedLayerId: null,
  selectedSector: null,
  selectedField: null,
  selectedSystemId: null,
  selectedSystemField: null,
  selectedFieldIds: [],
  brushMode: 'single' as BrushMode,
  layerForm: defaultLayerForm,
  layerGridFieldTypeId: 1,
  systemGridFieldTypeId: 1,
  sectorFillForm: {
    fieldTypeId: 1,
    systemTypeId: null,
    factionZone: 'UNKNOWN',
    adminRegionKey: '',
  },
  createSystemForm: defaultCreateSystemForm,
  loading: true,
  message: null,
  error: null,

  clearMessages: () => set({ message: null, error: null }),

  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const [layers, fieldTypes, systemTypes, borderTypes] = await Promise.all([
        api.get<Layer[]>('/starmap/layers'),
        api.get<FieldType[]>('/starmap/admin/field-types'),
        api.get<SystemTypeOption[]>('/starmap/admin/system-types'),
        api.get<BorderType[]>('/starmap/admin/border-types'),
      ]);
      const defaultFtId = fieldTypes[0]?.id ?? 1;
      set({
        layers,
        fieldTypes,
        systemTypes,
        borderTypes,
        layerGridFieldTypeId: defaultFtId,
        systemGridFieldTypeId: defaultFtId,
        sectorFillForm: { ...get().sectorFillForm, fieldTypeId: defaultFtId },
      });
      if (layers.length > 0) {
        const firstLayerId = layers[0].id;
        set({ selectedLayerId: firstLayerId });
        const [sectors, regions, hyperspaceRoutes] = await Promise.all([
          api.get<SectorSummary[]>(`/starmap/layers/${firstLayerId}/sectors`),
          api.get<MapRegion[]>(`/starmap/admin/layers/${firstLayerId}/regions`),
          api.get<HyperspaceRoute[]>(
            `/starmap/layers/${firstLayerId}/hyperspace-routes`,
          ),
        ]);
        set({ sectors, regions, hyperspaceRoutes });
      } else {
        set({ hyperspaceRoutes: [] });
      }
    } catch (err) {
      set({ error: readError(err) });
    } finally {
      set({ loading: false });
    }
  },

  ensureDefaults: async () => {
    set({ message: null, error: null });
    try {
      const fieldTypes = await api.post<FieldType[]>(
        '/starmap/admin/field-types/ensure-defaults',
        {},
      );
      set({ fieldTypes, message: 'Default FieldTypes bereit.' });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  selectLayer: async (layerId) => {
    set({
      selectedLayerId: layerId,
      selectedSector: null,
      sectorFields: [],
      selectedField: null,
      selectedSystemId: null,
      systemFields: [],
      selectedSystemField: null,
      selectedFieldIds: [],
      layerOverview: null,
      hyperspaceRoutes: [],
      message: null,
      error: null,
    });
    try {
      const [sectors, regions, hyperspaceRoutes] = await Promise.all([
        api.get<SectorSummary[]>(`/starmap/layers/${layerId}/sectors`),
        api.get<MapRegion[]>(`/starmap/admin/layers/${layerId}/regions`),
        api.get<HyperspaceRoute[]>(
          `/starmap/layers/${layerId}/hyperspace-routes`,
        ),
      ]);
      set({ sectors, regions, hyperspaceRoutes });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createLayer: async () => {
    set({ message: null, error: null });
    try {
      const created = await api.post<Layer, StarmapCreateLayerDto>(
        '/starmap/admin/layers',
        get().layerForm,
      );
      const layers = [...get().layers, created].sort((a, b) => a.id - b.id);
      set({
        layers,
        selectedLayerId: created.id,
        layerForm: defaultLayerForm,
        message: `Layer ${created.name} angelegt.`,
      });
      const [sectors, hyperspaceRoutes] = await Promise.all([
        api.get<SectorSummary[]>(`/starmap/layers/${created.id}/sectors`),
        api.get<HyperspaceRoute[]>(
          `/starmap/layers/${created.id}/hyperspace-routes`,
        ),
      ]);
      set({
        sectors,
        hyperspaceRoutes,
        selectedSector: null,
        sectorFields: [],
        selectedField: null,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  deleteSelectedLayer: async () => {
    const { selectedLayerId, layers } = get();
    if (!selectedLayerId) return;
    const layer = layers.find((l) => l.id === selectedLayerId);
    if (!layer || !window.confirm(`Layer "${layer.name}" wirklich loeschen?`))
      return;
    set({ message: null, error: null });
    try {
      await api.delete<StarmapOperationResultDto>(
        `/starmap/admin/layers/${selectedLayerId}`,
      );
      const remaining = layers.filter((l) => l.id !== selectedLayerId);
      const nextId = remaining[0]?.id ?? null;
      set({
        layers: remaining,
        selectedLayerId: nextId,
        selectedSector: null,
        sectorFields: [],
        selectedField: null,
        selectedSystemId: null,
        systemFields: [],
        selectedSystemField: null,
        hyperspaceRoutes: [],
        message: `Layer ${layer.name} geloescht.`,
      });
      if (nextId) {
        const [sectors, hyperspaceRoutes] = await Promise.all([
          api.get<SectorSummary[]>(`/starmap/layers/${nextId}/sectors`),
          api.get<HyperspaceRoute[]>(
            `/starmap/layers/${nextId}/hyperspace-routes`,
          ),
        ]);
        set({ sectors, hyperspaceRoutes });
      } else {
        set({ sectors: [], hyperspaceRoutes: [] });
      }
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  initializeLayerGrid: async () => {
    const { selectedLayerId, layerGridFieldTypeId } = get();
    if (!selectedLayerId) return;
    set({ message: null, error: null });
    try {
      const result = await api.post<
        StarmapOperationResultDto,
        StarmapInitializeGridDto
      >(`/starmap/admin/layers/${selectedLayerId}/initialize-grid`, {
        defaultFieldTypeId: layerGridFieldTypeId,
      });
      set({ message: `Grid initialisiert. ${result.created} Felder.` });
      const sectors = await api.get<SectorSummary[]>(
        `/starmap/layers/${selectedLayerId}/sectors`,
      );
      set({ sectors });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  selectSector: async (sector, preserveFieldId) => {
    set({
      selectedSector: sector,
      selectedField: null,
      selectedSystemId: null,
      systemFields: [],
      selectedSystemField: null,
      message: null,
      error: null,
    });
    try {
      const fields = await api.get<GalaxyField[]>(
        `/starmap/layers/${sector.layerId}/sectors/${sector.sectorX}/${sector.sectorY}`,
      );
      set({ sectorFields: fields });
      if (preserveFieldId) {
        const preserved = fields.find((f) => f.id === preserveFieldId) ?? null;
        set({ selectedField: preserved });
      }
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  fillSelectedSector: async () => {
    const { selectedSector, selectedLayerId, sectorFillForm, selectedField } =
      get();
    if (!selectedSector || !selectedLayerId) return;
    set({ message: null, error: null });
    try {
      const result = await api.post<
        StarmapOperationResultDto,
        StarmapFillSectorDto
      >('/starmap/admin/sectors/fill', {
        layerId: selectedLayerId,
        sectorX: selectedSector.sectorX,
        sectorY: selectedSector.sectorY,
        fieldTypeId: sectorFillForm.fieldTypeId,
        systemTypeId: sectorFillForm.systemTypeId,
        factionZone: sectorFillForm.factionZone,
        adminRegionKey: sectorFillForm.adminRegionKey || null,
      });
      set({ message: `Sektion gefuellt. ${result.updated} Felder.` });
      const sectors = await api.get<SectorSummary[]>(
        `/starmap/layers/${selectedLayerId}/sectors`,
      );
      set({ sectors });
      await get().selectSector(selectedSector, selectedField?.id);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  setSelectedField: (field) => set({ selectedField: field }),

  updateField: async (fieldId, patch) => {
    const { selectedSector, selectedLayerId, selectedField } = get();
    if (!selectedSector || !selectedLayerId) return;
    set({ message: null, error: null });
    try {
      const updated = await api.patch<GalaxyField, StarmapUpdateGalaxyFieldDto>(
        `/starmap/admin/fields/${fieldId}`,
        patch,
      );
      set({
        sectorFields: get().sectorFields.map((f) =>
          f.id === fieldId ? { ...f, ...updated } : f,
        ),
        selectedField:
          selectedField?.id === fieldId
            ? { ...selectedField, ...updated }
            : selectedField,
        message: `Feld ${updated.cx}/${updated.cy} aktualisiert.`,
      });
      const sectors = await api.get<SectorSummary[]>(
        `/starmap/layers/${selectedLayerId}/sectors`,
      );
      set({ sectors });
      await get().selectSector(selectedSector, fieldId);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createSystemForSelectedField: async () => {
    const { selectedField, selectedLayerId, createSystemForm, selectedSector } =
      get();
    if (!selectedField || !selectedLayerId || selectedField.starSystemId)
      return;
    set({ message: null, error: null });
    try {
      const created = await api.post<StarSystem, StarmapCreateSystemDto>(
        '/starmap/admin/systems',
        {
          layerId: selectedLayerId,
          name: createSystemForm.name,
          cx: selectedField.cx,
          cy: selectedField.cy,
          systemTypeId: createSystemForm.systemTypeId,
          maxX: createSystemForm.maxX,
          maxY: createSystemForm.maxY,
        },
      );
      set({
        message: `System ${created.name} angelegt.`,
        selectedSystemId: created.id,
        createSystemForm: {
          name: created.name,
          systemTypeId: created.systemTypeId ?? createSystemForm.systemTypeId,
          maxX: created.maxX,
          maxY: created.maxY,
        },
      });
      if (selectedSector) {
        const sectors = await api.get<SectorSummary[]>(
          `/starmap/layers/${selectedLayerId}/sectors`,
        );
        set({ sectors });
        await get().selectSector(selectedSector, selectedField.id);
      }
      await get().openSystem(created.id);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  generateSystemsForLayer: async () => {
    const { selectedLayerId, selectedSector, selectedField } = get();
    if (!selectedLayerId) return;
    set({ message: null, error: null });
    try {
      const result = await api.post<
        StarmapOperationResultDto,
        StarmapGenerateSystemsDto
      >(`/starmap/admin/layers/${selectedLayerId}/generate-systems`, {
        limit: 10,
      });
      set({ message: `Systeme generiert: ${result.generated ?? 0}.` });
      const sectors = await api.get<SectorSummary[]>(
        `/starmap/layers/${selectedLayerId}/sectors`,
      );
      set({ sectors });
      if (selectedSector) {
        await get().selectSector(selectedSector, selectedField?.id);
      }
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  applyStarWarsPreset: async (options = {}) => {
    const { selectedLayerId, selectedSector, selectedField } = get();
    if (!selectedLayerId) return;
    if (
      !window.confirm(
        'Star-Wars-Landmark-Preset additiv auf diese Layer anwenden? Bestehende Systeme bleiben erhalten.',
      )
    )
      return;
    set({ message: null, error: null });
    try {
      const result = await api.post<
        ApplyStarWarsPresetResultDto,
        ApplyStarWarsPresetOptionsDto
      >(
        `/starmap/admin/layers/${selectedLayerId}/apply-star-wars-preset`,
        options,
      );
      const [sectors, hyperspaceRoutes] = await Promise.all([
        api.get<SectorSummary[]>(`/starmap/layers/${selectedLayerId}/sectors`),
        api.get<HyperspaceRoute[]>(
          `/starmap/layers/${selectedLayerId}/hyperspace-routes`,
        ),
      ]);
      set({
        sectors,
        hyperspaceRoutes,
        message: `Star-Wars-Preset: ${result.createdLandmarks} Systeme neu, ${result.updatedLandmarks} Systeme aktualisiert, ${result.createdRoutes} Routen, ${result.conflicts.length} Konflikte.${result.conflicts.length ? ` Details: ${result.conflicts.join('; ')}` : ''}`,
      });
      if (selectedSector) {
        await get().selectSector(selectedSector, selectedField?.id);
      }
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  regenerateSelectedSystem: async () => {
    const { selectedField, selectedSystemId, selectedSector } = get();
    const systemId = selectedField?.starSystemId ?? selectedSystemId;
    if (!systemId) return;
    set({ message: null, error: null });
    try {
      await api.post<StarmapOperationResultDto, StarmapRegenerateSystemDto>(
        `/starmap/admin/systems/${systemId}/regenerate`,
        { systemTypeId: selectedField?.systemTypeId ?? undefined },
      );
      set({ message: 'System neu generiert.' });
      if (selectedSector) {
        await get().selectSector(selectedSector, selectedField?.id);
      }
      await get().openSystem(systemId);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  initializeSelectedSystemGrid: async () => {
    const { selectedField, selectedSystemId, systemGridFieldTypeId } = get();
    const systemId = selectedField?.starSystemId ?? selectedSystemId;
    if (!systemId) return;
    set({ message: null, error: null });
    try {
      const result = await api.post<
        StarmapOperationResultDto,
        StarmapInitializeGridDto
      >(`/starmap/admin/systems/${systemId}/initialize-grid`, {
        defaultFieldTypeId: systemGridFieldTypeId,
      });
      set({ message: `System-Grid initialisiert. ${result.created} Felder.` });
      await get().openSystem(systemId);
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  openSystem: async (systemId) => {
    set({
      selectedSystemId: systemId,
      selectedSystemField: null,
      message: null,
      error: null,
    });
    try {
      const grid = await api.get<StarmapSystemGridDto>(
        `/starmap/systems/${systemId}/grid`,
      );
      set({ systemFields: grid.fields });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  updateSystemFieldType: async (fieldId, fieldTypeId) => {
    const { selectedSystemId } = get();
    if (!selectedSystemId) return;
    set({ message: null, error: null });
    try {
      const updated = await api.patch<SystemField, StarmapUpdateSystemFieldDto>(
        `/starmap/admin/system-fields/${fieldId}`,
        { fieldTypeId },
      );
      set({
        systemFields: get().systemFields.map((f) =>
          f.id === fieldId ? { ...f, ...updated } : f,
        ),
        selectedSystemField:
          get().selectedSystemField?.id === fieldId
            ? { ...get().selectedSystemField!, ...updated }
            : get().selectedSystemField,
        message: `Systemfeld ${updated.sx}/${updated.sy} aktualisiert.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  setSelectedSystemField: (field) => set({ selectedSystemField: field }),
  setLayerForm: (form) => set({ layerForm: form }),
  setLayerGridFieldTypeId: (id) => set({ layerGridFieldTypeId: id }),
  setSystemGridFieldTypeId: (id) => set({ systemGridFieldTypeId: id }),
  setSectorFillForm: (form) => set({ sectorFillForm: form }),
  setCreateSystemForm: (form) => set({ createSystemForm: form }),

  // Multi-Select / Brush
  toggleFieldSelection: (fieldId, shiftKey) => {
    const { selectedFieldIds } = get();
    if (!shiftKey) {
      const isAlready = selectedFieldIds.includes(fieldId);
      set({ selectedFieldIds: isAlready ? [] : [fieldId] });
      return;
    }
    if (selectedFieldIds.includes(fieldId)) {
      set({
        selectedFieldIds: selectedFieldIds.filter((id) => id !== fieldId),
      });
    } else {
      set({ selectedFieldIds: [...selectedFieldIds, fieldId] });
    }
  },
  clearSelection: () => set({ selectedFieldIds: [] }),
  setBrushMode: (mode) => set({ brushMode: mode }),

  bulkEditSelected: async (patch) => {
    const { selectedFieldIds, selectedSector, selectedField } = get();
    if (!selectedFieldIds.length) return;
    set({ message: null, error: null });
    try {
      const result = await api.patch<
        StarmapOperationResultDto,
        StarmapBulkEditFieldsDto
      >('/starmap/admin/galaxy-fields/bulk', {
        fieldIds: selectedFieldIds,
        ...patch,
      });
      set({ message: `Bulk-Edit: ${result.updated} Felder aktualisiert.` });
      if (selectedSector) {
        await get().selectSector(selectedSector, selectedField?.id);
      }
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  // Regions
  loadRegions: async () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    try {
      const regions = await api.get<MapRegion[]>(
        `/starmap/admin/layers/${selectedLayerId}/regions`,
      );
      set({ regions });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createRegion: async (input) => {
    set({ message: null, error: null });
    try {
      const created = await api.post<MapRegion, StarmapCreateMapRegionDto>(
        '/starmap/admin/regions',
        input,
      );
      set({
        regions: [...get().regions, created],
        message: `Region "${created.name}" angelegt.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  updateRegion: async (id, patch) => {
    set({ message: null, error: null });
    try {
      const updated = await api.patch<MapRegion, StarmapUpdateMapRegionDto>(
        `/starmap/admin/regions/${id}`,
        patch,
      );
      set({
        regions: get().regions.map((r) => (r.id === id ? updated : r)),
        message: `Region "${updated.name}" aktualisiert.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  deleteRegion: async (id) => {
    const region = get().regions.find((r) => r.id === id);
    if (!region || !window.confirm(`Region "${region.name}" loeschen?`)) return;
    set({ message: null, error: null });
    try {
      await api.delete<StarmapOperationResultDto>(
        `/starmap/admin/regions/${id}`,
      );
      set({
        regions: get().regions.filter((r) => r.id !== id),
        message: `Region "${region.name}" geloescht.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  // Border Types
  loadBorderTypes: async () => {
    try {
      const borderTypes = await api.get<BorderType[]>(
        '/starmap/admin/border-types',
      );
      set({ borderTypes });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  createBorderType: async (input) => {
    set({ message: null, error: null });
    try {
      const created = await api.post<BorderType, StarmapCreateBorderTypeDto>(
        '/starmap/admin/border-types',
        input,
      );
      set({
        borderTypes: [...get().borderTypes, created],
        message: `Border-Typ "${created.name}" angelegt.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  updateBorderType: async (id, patch) => {
    set({ message: null, error: null });
    try {
      const updated = await api.patch<BorderType, StarmapUpdateBorderTypeDto>(
        `/starmap/admin/border-types/${id}`,
        patch,
      );
      set({
        borderTypes: get().borderTypes.map((bt) =>
          bt.id === id ? updated : bt,
        ),
        message: `Border-Typ "${updated.name}" aktualisiert.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  deleteBorderType: async (id) => {
    const bt = get().borderTypes.find((b) => b.id === id);
    if (!bt || !window.confirm(`Border-Typ "${bt.name}" loeschen?`)) return;
    set({ message: null, error: null });
    try {
      await api.delete<StarmapOperationResultDto>(
        `/starmap/admin/border-types/${id}`,
      );
      set({
        borderTypes: get().borderTypes.filter((b) => b.id !== id),
        message: `Border-Typ "${bt.name}" geloescht.`,
      });
    } catch (err) {
      set({ error: readError(err) });
    }
  },

  // Overview
  loadLayerOverview: async () => {
    const { selectedLayerId } = get();
    if (!selectedLayerId) return;
    set({ message: null, error: null });
    try {
      const overview = await api.get<StarmapLayerOverviewDto>(
        `/starmap/admin/layers/${selectedLayerId}/overview`,
      );
      set({ layerOverview: overview });
    } catch (err) {
      set({ error: readError(err) });
    }
  },
}));

function readError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unbekannter Fehler';
}
