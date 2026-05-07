import { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '@swuniverse/shared';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

type Layer = {
  id: number;
  name: string;
  width: number;
  height: number;
  sectorSize: number;
  isDefault: boolean;
};

type StarSystem = {
  id: number;
  name: string;
  cx: number;
  cy: number;
  maxX: number;
  maxY: number;
  systemTypeId?: number;
};

type SystemTypeOption = {
  id: number;
  key: string;
  name: string;
};

type FieldType = {
  id: number;
  key: string;
  name: string;
  passable: boolean;
  energyCost: number;
  damage: number;
  isSystem: boolean;
  colorKey: string | null;
};

type SectorSummary = {
  layerId: number;
  sectorX: number;
  sectorY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  fieldCount: number;
  systemCount: number;
};

type GalaxyField = {
  id: number;
  cx: number;
  cy: number;
  fieldTypeId: number;
  factionZone: 'REBEL' | 'EMPIRE' | 'CONTESTED' | 'UNKNOWN' | 'NEUTRAL';
  adminRegionKey: string | null;
  starSystemId: number | null;
  fieldType: FieldType;
  starSystem: StarSystem | null;
};

type SystemField = {
  id: number;
  sx: number;
  sy: number;
  fieldTypeId: number;
  celestialObjectId: number | null;
  fieldType: FieldType;
};

type LayerForm = {
  name: string;
  width: number;
  height: number;
  sectorSize: number;
  isDefault: boolean;
  isColonizable: boolean;
  isNoobZone: boolean;
  isFinished: boolean;
  isHidden: boolean;
};

type SectorFillForm = {
  fieldTypeId: number;
  factionZone: GalaxyField['factionZone'];
  adminRegionKey: string;
};

type CreateSystemForm = {
  name: string;
  systemTypeId: number;
  maxX: number;
  maxY: number;
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-900 border-slate-800 text-slate-300',
  STAR_SYSTEM: 'bg-amber-500/30 border-amber-400 text-amber-200',
  NEBULA: 'bg-fuchsia-800/40 border-fuchsia-500 text-fuchsia-200',
  ASTEROID_FIELD: 'bg-stone-700/60 border-stone-500 text-stone-200',
  BLOCKED: 'bg-red-950/70 border-red-700 text-red-200',
};

const defaultLayerForm: LayerForm = {
  name: 'Galaxy',
  width: 120,
  height: 120,
  sectorSize: 20,
  isDefault: true,
  isColonizable: true,
  isNoobZone: false,
  isFinished: false,
  isHidden: false,
};

const defaultCreateSystemForm: CreateSystemForm = {
  name: '',
  systemTypeId: 1,
  maxX: 22,
  maxY: 22,
};

function getFieldTypeClasses(fieldType: FieldType | null | undefined): string {
  if (!fieldType) return 'bg-swu-bg border-swu-border/30 text-swu-muted';
  return (
    FIELD_TYPE_COLORS[fieldType.key] ||
    'bg-swu-bg border-swu-border text-swu-primary'
  );
}

export function StarmapAdminPage() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([]);
  const [systemTypes, setSystemTypes] = useState<SystemTypeOption[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [selectedSector, setSelectedSector] = useState<SectorSummary | null>(
    null,
  );
  const [sectorFields, setSectorFields] = useState<GalaxyField[]>([]);
  const [selectedField, setSelectedField] = useState<GalaxyField | null>(null);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [systemFields, setSystemFields] = useState<SystemField[]>([]);
  const [selectedSystemField, setSelectedSystemField] =
    useState<SystemField | null>(null);
  const [layerForm, setLayerForm] = useState<LayerForm>(defaultLayerForm);
  const [layerGridFieldTypeId, setLayerGridFieldTypeId] = useState<number>(1);
  const [systemGridFieldTypeId, setSystemGridFieldTypeId] = useState<number>(1);
  const [sectorFillForm, setSectorFillForm] = useState<SectorFillForm>({
    fieldTypeId: 1,
    factionZone: 'UNKNOWN',
    adminRegionKey: '',
  });
  const [createSystemForm, setCreateSystemForm] = useState<CreateSystemForm>(
    defaultCreateSystemForm,
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    if (user?.isAdmin) {
      void bootstrap();
      return;
    }

    setLoading(true);
    void api
      .get<UserProfile>('/auth/me')
      .then((profile) => {
        setUser(profile);
        if (profile.isAdmin) {
          return bootstrap();
        }
        setLoading(false);
        return undefined;
      })
      .catch((err: unknown) => {
        setError(readError(err));
        setLoading(false);
      });
  }, [accessToken, setUser, user?.isAdmin]);

  useEffect(() => {
    if (fieldTypes.length > 0) {
      const defaultFieldTypeId = fieldTypes[0].id;
      setLayerGridFieldTypeId(defaultFieldTypeId);
      setSystemGridFieldTypeId(defaultFieldTypeId);
      setSectorFillForm((current) => ({
        ...current,
        fieldTypeId: current.fieldTypeId || defaultFieldTypeId,
      }));
    }
  }, [fieldTypes]);

  useEffect(() => {
    if (!selectedField?.starSystem) {
      setCreateSystemForm((current) => ({
        ...defaultCreateSystemForm,
        systemTypeId:
          systemTypes[0]?.id ?? defaultCreateSystemForm.systemTypeId,
      }));
      return;
    }

    setCreateSystemForm({
      name: selectedField.starSystem.name,
      systemTypeId:
        selectedField.starSystem.systemTypeId ?? systemTypes[0]?.id ?? 1,
      maxX: selectedField.starSystem.maxX,
      maxY: selectedField.starSystem.maxY,
    });
  }, [selectedField?.id, selectedField?.starSystem, systemTypes]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const [loadedLayers, loadedFieldTypes, loadedSystemTypes] =
        await Promise.all([
          api.get<Layer[]>('/starmap/layers'),
          api.get<FieldType[]>('/starmap/admin/field-types'),
          api.get<SystemTypeOption[]>('/starmap/admin/system-types'),
        ]);
      setLayers(loadedLayers);
      setFieldTypes(loadedFieldTypes);
      setSystemTypes(loadedSystemTypes);

      if (loadedLayers.length > 0) {
        const firstLayerId = loadedLayers[0].id;
        setSelectedLayerId(firstLayerId);
        await loadSectors(firstLayerId);
      }
    } catch (err) {
      setError(readError(err));
    } finally {
      setLoading(false);
    }
  }

  async function ensureDefaults() {
    setMessage(null);
    setError(null);
    try {
      const loadedFieldTypes = await api.post<FieldType[]>(
        '/starmap/admin/field-types/ensure-defaults',
        {},
      );
      setFieldTypes(loadedFieldTypes);
      setMessage('Default field types bereit.');
    } catch (err) {
      setError(readError(err));
    }
  }

  async function refreshSectors(layerId: number) {
    const loadedSectors = await api.get<SectorSummary[]>(
      `/starmap/layers/${layerId}/sectors`,
    );
    setSectors(loadedSectors);
    return loadedSectors;
  }

  async function loadSectors(layerId: number) {
    await refreshSectors(layerId);
    setSelectedSector(null);
    setSectorFields([]);
    setSelectedField(null);
    setSelectedSystemId(null);
    setSystemFields([]);
    setSelectedSystemField(null);
  }

  async function selectLayer(layerId: number) {
    setSelectedLayerId(layerId);
    setMessage(null);
    setError(null);
    try {
      await loadSectors(layerId);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function createLayer() {
    setMessage(null);
    setError(null);
    try {
      const createdLayer = await api.post<Layer>(
        '/starmap/admin/layers',
        layerForm,
      );
      const updatedLayers = [...layers, createdLayer].sort(
        (left, right) => left.id - right.id,
      );
      setLayers(updatedLayers);
      setSelectedLayerId(createdLayer.id);
      setLayerForm(defaultLayerForm);
      setMessage(`Layer ${createdLayer.name} angelegt.`);
      await loadSectors(createdLayer.id);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function deleteSelectedLayer() {
    if (!selectedLayerId) return;
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
    if (!selectedLayer) return;

    const shouldDelete = window.confirm(
      `Layer "${selectedLayer.name}" wirklich löschen? Alle Felder und Systeme dieses Layers werden entfernt.`,
    );
    if (!shouldDelete) return;

    setMessage(null);
    setError(null);
    try {
      await api.delete<{ deleted: boolean }>(
        `/starmap/admin/layers/${selectedLayerId}`,
      );
      const remainingLayers = layers.filter(
        (layer) => layer.id !== selectedLayerId,
      );
      setLayers(remainingLayers);
      setSelectedSector(null);
      setSectorFields([]);
      setSelectedField(null);
      setSelectedSystemId(null);
      setSystemFields([]);
      setSelectedSystemField(null);

      const nextLayerId = remainingLayers[0]?.id ?? null;
      setSelectedLayerId(nextLayerId);

      if (nextLayerId) {
        await loadSectors(nextLayerId);
      }

      setMessage(`Layer ${selectedLayer.name} gelöscht.`);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function initializeLayerGrid() {
    if (!selectedLayerId) return;

    setMessage(null);
    setError(null);
    try {
      const result = await api.post<{ created: number }>(
        `/starmap/admin/layers/${selectedLayerId}/initialize-grid`,
        { defaultFieldTypeId: layerGridFieldTypeId },
      );
      setMessage(`Layer-Grid initialisiert. ${result.created} Felder erzeugt.`);
      await loadSectors(selectedLayerId);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function fillSelectedSector() {
    if (!selectedSector || !selectedLayerId) return;

    setMessage(null);
    setError(null);
    try {
      const result = await api.post<{ updated: number }>(
        '/starmap/admin/sectors/fill',
        {
          layerId: selectedLayerId,
          sectorX: selectedSector.sectorX,
          sectorY: selectedSector.sectorY,
          fieldTypeId: sectorFillForm.fieldTypeId,
          factionZone: sectorFillForm.factionZone,
          adminRegionKey: sectorFillForm.adminRegionKey || null,
        },
      );
      setMessage(`Sektion gefüllt. ${result.updated} Felder aktualisiert.`);
      await refreshSectors(selectedLayerId);
      await selectSector(selectedSector);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function selectSector(sector: SectorSummary) {
    setSelectedSector(sector);
    setSelectedField(null);
    setSelectedSystemId(null);
    setSystemFields([]);
    setSelectedSystemField(null);
    setMessage(null);
    setError(null);

    try {
      const loadedFields = await api.get<GalaxyField[]>(
        `/starmap/layers/${sector.layerId}/sectors/${sector.sectorX}/${sector.sectorY}`,
      );
      setSectorFields(loadedFields);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function updateField(
    fieldId: number,
    patch: {
      fieldTypeId?: number;
      factionZone?: GalaxyField['factionZone'];
      adminRegionKey?: string | null;
    },
  ) {
    if (!selectedSector) return;

    setMessage(null);
    setError(null);
    try {
      const updated = await api.patch<GalaxyField>(
        `/starmap/admin/fields/${fieldId}`,
        patch,
      );
      setSectorFields((current) =>
        current.map((field) =>
          field.id === fieldId ? { ...field, ...updated } : field,
        ),
      );
      setSelectedField((current) =>
        current && current.id === fieldId
          ? { ...current, ...updated }
          : current,
      );
      setMessage(`Galaxy field ${updated.cx}/${updated.cy} aktualisiert.`);
      await refreshSectors(selectedSector.layerId);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function createSystemForSelectedField() {
    if (!selectedField || !selectedLayerId || selectedField.starSystemId)
      return;

    setMessage(null);
    setError(null);
    try {
      const createdSystem = await api.post<StarSystem>(
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

      setMessage(`System ${createdSystem.name} angelegt.`);

      if (selectedSector) {
        await refreshSectors(selectedLayerId);
        await selectSector(selectedSector);
      }
      setSelectedSystemId(createdSystem.id);
      setCreateSystemForm({
        name: createdSystem.name,
        systemTypeId:
          createdSystem.systemTypeId ?? createSystemForm.systemTypeId,
        maxX: createdSystem.maxX,
        maxY: createdSystem.maxY,
      });
    } catch (err) {
      setError(readError(err));
    }
  }

  async function initializeSelectedSystemGrid() {
    if (!selectedField?.starSystemId && !selectedSystemId) return;

    const systemId = selectedField?.starSystemId ?? selectedSystemId;
    if (!systemId) return;

    setMessage(null);
    setError(null);
    try {
      const result = await api.post<{ created: number }>(
        `/starmap/admin/systems/${systemId}/initialize-grid`,
        { defaultFieldTypeId: systemGridFieldTypeId },
      );
      setMessage(
        `System-Grid initialisiert. ${result.created} Felder erzeugt.`,
      );
      await openSystem(systemId);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function openSystem(systemId: number) {
    setSelectedSystemId(systemId);
    setSelectedSystemField(null);
    setMessage(null);
    setError(null);
    try {
      const loadedSystemFields = await api.get<SystemField[]>(
        `/starmap/systems/${systemId}/grid`,
      );
      setSystemFields(loadedSystemFields);
    } catch (err) {
      setError(readError(err));
    }
  }

  async function updateSystemFieldType(fieldId: number, fieldTypeId: number) {
    if (!selectedSystemId) return;

    setMessage(null);
    setError(null);
    try {
      const updated = await api.patch<SystemField>(
        `/starmap/admin/system-fields/${fieldId}`,
        { fieldTypeId },
      );
      setSystemFields((current) =>
        current.map((field) =>
          field.id === fieldId ? { ...field, ...updated } : field,
        ),
      );
      setSelectedSystemField((current) =>
        current && current.id === fieldId
          ? { ...current, ...updated }
          : current,
      );
      setMessage(`System field ${updated.sx}/${updated.sy} aktualisiert.`);
    } catch (err) {
      setError(readError(err));
    }
  }

  const sectorGridColumns = useMemo(() => {
    if (!selectedLayerId) return 0;
    const layer = layers.find((entry) => entry.id === selectedLayerId);
    if (!layer) return 0;
    return Math.ceil(layer.width / layer.sectorSize);
  }, [layers, selectedLayerId]);

  const selectedSystem = useMemo(() => {
    if (!selectedSystemId) return null;
    return (
      sectorFields.find((field) => field.starSystem?.id === selectedSystemId)
        ?.starSystem ?? null
    );
  }, [sectorFields, selectedSystemId]);

  if (!user?.isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          Kein Admin-Zugriff. Setze deinen Benutzer zuerst auf `isAdmin = true`
          und melde dich danach neu an.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-swu-muted">Lade Karten-Admin...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-swu-accent">Starmap Admin</h1>
          <p className="text-sm text-swu-muted mt-1">
            STU-naher 20x20-Sektionseditor für Galaxy- und Systemfelder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void ensureDefaults()}
            className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
          >
            Default FieldTypes
          </button>
          <select
            value={selectedLayerId ?? ''}
            onChange={(event) => void selectLayer(Number(event.target.value))}
            className="rounded border border-swu-border bg-swu-surface px-3 py-2 text-sm text-swu-text"
          >
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void deleteSelectedLayer()}
            disabled={!selectedLayerId}
            className="rounded border border-red-600 px-3 py-2 text-sm text-red-300 enabled:hover:bg-red-950/40 disabled:opacity-50"
          >
            Layer löschen
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded border border-swu-success/40 bg-swu-success/10 px-4 py-3 text-sm text-swu-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Layer anlegen
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-swu-muted">
              Name
              <input
                value={layerForm.name}
                onChange={(event) =>
                  setLayerForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>
            <label className="text-xs text-swu-muted">
              Sector Size
              <input
                type="number"
                value={layerForm.sectorSize}
                onChange={(event) =>
                  setLayerForm((current) => ({
                    ...current,
                    sectorSize: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>
            <label className="text-xs text-swu-muted">
              Width
              <input
                type="number"
                value={layerForm.width}
                onChange={(event) =>
                  setLayerForm((current) => ({
                    ...current,
                    width: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>
            <label className="text-xs text-swu-muted">
              Height
              <input
                type="number"
                value={layerForm.height}
                onChange={(event) =>
                  setLayerForm((current) => ({
                    ...current,
                    height: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-swu-muted">
            {(
              [
                ['isDefault', 'Default'],
                ['isColonizable', 'Colonizable'],
                ['isNoobZone', 'Noob Zone'],
                ['isFinished', 'Finished'],
                ['isHidden', 'Hidden'],
              ] as Array<[keyof LayerForm, string]>
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(layerForm[key])}
                  onChange={(event) =>
                    setLayerForm((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <button
            onClick={() => void createLayer()}
            className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
          >
            Layer anlegen
          </button>
        </div>

        <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Grid initialisieren
          </h2>
          <p className="text-xs text-swu-muted">
            Erzeugt alle Galaxy-Felder des aktuell gewählten Layers.
          </p>
          <label className="block text-xs text-swu-muted">
            Default FieldType
            <select
              value={layerGridFieldTypeId}
              onChange={(event) =>
                setLayerGridFieldTypeId(Number(event.target.value))
              }
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            >
              {fieldTypes.map((fieldType) => (
                <option key={fieldType.id} value={fieldType.id}>
                  {fieldType.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => void initializeLayerGrid()}
            disabled={!selectedLayerId}
            className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
          >
            Grid für Layer erzeugen
          </button>
        </div>

        <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            FieldType Legende
          </h2>
          <div className="space-y-2">
            {fieldTypes.map((fieldType) => (
              <div
                key={fieldType.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-block h-4 w-4 rounded border',
                      getFieldTypeClasses(fieldType),
                    ].join(' ')}
                  />
                  <span className="text-swu-text">{fieldType.name}</span>
                </div>
                <span className="text-swu-muted">
                  E:{fieldType.energyCost} D:{fieldType.damage}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Sektionen
          </h2>
          <p className="mt-1 text-xs text-swu-muted">
            Klick auf 20x20 Sektion. Danach Feldeditor rechts nutzen.
          </p>
          <div
            className="mt-4 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(sectorGridColumns, 1)}, minmax(0, 1fr))`,
            }}
          >
            {sectors.map((sector) => {
              const isSelected =
                selectedSector?.sectorX === sector.sectorX &&
                selectedSector?.sectorY === sector.sectorY;
              return (
                <button
                  key={`${sector.sectorX}-${sector.sectorY}`}
                  onClick={() => void selectSector(sector)}
                  className={[
                    'rounded border px-2 py-3 text-left transition',
                    isSelected
                      ? 'border-swu-accent bg-swu-accent/10'
                      : 'border-swu-border bg-swu-bg/40 hover:border-swu-primary',
                  ].join(' ')}
                >
                  <div className="text-sm font-semibold text-swu-text">
                    [{sector.sectorX}, {sector.sectorY}]
                  </div>
                  <div className="mt-1 text-[11px] text-swu-muted">
                    Felder: {sector.fieldCount}
                  </div>
                  <div className="text-[11px] text-swu-muted">
                    Systeme: {sector.systemCount}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
                Galaxy Sektion
              </h2>
              <p className="mt-1 text-xs text-swu-muted">
                {selectedSector
                  ? `Sektion [${selectedSector.sectorX}, ${selectedSector.sectorY}] · ${sectorFields.length} Felder`
                  : 'Sektion links auswählen'}
              </p>
            </div>
            {selectedField && (
              <div className="text-xs text-swu-muted">
                Feld [{selectedField.cx}, {selectedField.cy}]
              </div>
            )}
          </div>

          <div
            className="mt-4 grid gap-1 min-w-[640px]"
            style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}
          >
            {sectorFields.map((field) => {
              const isSelected = selectedField?.id === field.id;
              return (
                <button
                  key={field.id}
                  onClick={() => setSelectedField(field)}
                  className={[
                    'h-7 rounded border text-[10px] font-medium transition',
                    getFieldTypeClasses(field.fieldType),
                    isSelected ? 'ring-2 ring-swu-accent' : '',
                  ].join(' ')}
                  title={`${field.cx},${field.cy} · ${field.fieldType?.name ?? 'unknown'}`}
                >
                  {field.starSystem ? '★' : `${field.cx}:${field.cy}`}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
              Sektion füllen
            </h2>
            {selectedSector ? (
              <div className="mt-3 space-y-3 text-sm">
                <div className="text-xs text-swu-muted">
                  Ziel: [{selectedSector.sectorX}, {selectedSector.sectorY}]
                </div>
                <label className="block text-xs text-swu-muted">
                  FieldType
                  <select
                    value={sectorFillForm.fieldTypeId}
                    onChange={(event) =>
                      setSectorFillForm((current) => ({
                        ...current,
                        fieldTypeId: Number(event.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  >
                    {fieldTypes.map((fieldType) => (
                      <option key={fieldType.id} value={fieldType.id}>
                        {fieldType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-swu-muted">
                  Faction Zone
                  <select
                    value={sectorFillForm.factionZone}
                    onChange={(event) =>
                      setSectorFillForm((current) => ({
                        ...current,
                        factionZone: event.target
                          .value as GalaxyField['factionZone'],
                      }))
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  >
                    {['UNKNOWN', 'REBEL', 'EMPIRE', 'CONTESTED', 'NEUTRAL'].map(
                      (zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="block text-xs text-swu-muted">
                  Admin Region Key
                  <input
                    value={sectorFillForm.adminRegionKey}
                    onChange={(event) =>
                      setSectorFillForm((current) => ({
                        ...current,
                        adminRegionKey: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  />
                </label>
                <button
                  onClick={() => void fillSelectedSector()}
                  className="w-full rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
                >
                  Ganze Sektion füllen
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-swu-muted">
                Erst links Sektion auswählen.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
              Galaxy Feld Editor
            </h2>
            {selectedField ? (
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <div className="text-swu-text font-semibold">
                    [{selectedField.cx}, {selectedField.cy}]
                  </div>
                  <div className="text-xs text-swu-muted">
                    Typ: {selectedField.fieldType?.name}
                  </div>
                  <div className="text-xs text-swu-muted">
                    System: {selectedField.starSystem?.name || '—'}
                  </div>
                  <div className="text-xs text-swu-muted">
                    Passable:{' '}
                    {selectedField.fieldType?.passable ? 'ja' : 'nein'}
                  </div>
                  <div className="text-xs text-swu-muted">
                    Energy: {selectedField.fieldType?.energyCost} · Damage:{' '}
                    {selectedField.fieldType?.damage}
                  </div>
                </div>

                <label className="block text-xs text-swu-muted">
                  FieldType
                  <select
                    value={selectedField.fieldTypeId}
                    onChange={(event) =>
                      void updateField(selectedField.id, {
                        fieldTypeId: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  >
                    {fieldTypes.map((fieldType) => (
                      <option key={fieldType.id} value={fieldType.id}>
                        {fieldType.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-swu-muted">
                  Faction Zone
                  <select
                    value={selectedField.factionZone}
                    onChange={(event) =>
                      void updateField(selectedField.id, {
                        factionZone: event.target
                          .value as GalaxyField['factionZone'],
                      })
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  >
                    {['UNKNOWN', 'REBEL', 'EMPIRE', 'CONTESTED', 'NEUTRAL'].map(
                      (zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="block text-xs text-swu-muted">
                  Admin Region Key
                  <input
                    value={selectedField.adminRegionKey || ''}
                    onChange={(event) =>
                      setSelectedField((current) =>
                        current
                          ? { ...current, adminRegionKey: event.target.value }
                          : current,
                      )
                    }
                    onBlur={(event) =>
                      void updateField(selectedField.id, {
                        adminRegionKey: event.target.value || null,
                      })
                    }
                    className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                  />
                </label>

                {!selectedField.starSystem ? (
                  <div className="space-y-3 rounded border border-swu-border/60 bg-swu-bg/40 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-swu-muted">
                      System anlegen
                    </div>
                    <label className="block text-xs text-swu-muted">
                      Systemname
                      <input
                        value={createSystemForm.name}
                        onChange={(event) =>
                          setCreateSystemForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                        placeholder="z. B. Yavin"
                      />
                    </label>
                    <div className="grid gap-3 grid-cols-3">
                      <label className="block text-xs text-swu-muted">
                        Systemtyp
                        <select
                          value={createSystemForm.systemTypeId}
                          onChange={(event) =>
                            setCreateSystemForm((current) => ({
                              ...current,
                              systemTypeId: Number(event.target.value),
                            }))
                          }
                          className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                        >
                          {systemTypes.map((systemType) => (
                            <option key={systemType.id} value={systemType.id}>
                              {systemType.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-swu-muted">
                        Grid X
                        <input
                          type="number"
                          min={1}
                          value={createSystemForm.maxX}
                          onChange={(event) =>
                            setCreateSystemForm((current) => ({
                              ...current,
                              maxX: Number(event.target.value),
                            }))
                          }
                          className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                        />
                      </label>
                      <label className="block text-xs text-swu-muted">
                        Grid Y
                        <input
                          type="number"
                          min={1}
                          value={createSystemForm.maxY}
                          onChange={(event) =>
                            setCreateSystemForm((current) => ({
                              ...current,
                              maxY: Number(event.target.value),
                            }))
                          }
                          className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                        />
                      </label>
                    </div>
                    <button
                      onClick={() => void createSystemForSelectedField()}
                      disabled={!createSystemForm.name.trim()}
                      className="w-full rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
                    >
                      System auf Feld anlegen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded border border-swu-border/60 bg-swu-bg/40 p-3">
                    <div className="text-xs text-swu-muted">
                      System vorhanden: {selectedField.starSystem.name}
                    </div>
                    <div className="text-xs text-swu-muted">
                      Größe: {selectedField.starSystem.maxX}x
                      {selectedField.starSystem.maxY}
                    </div>
                    <label className="block text-xs text-swu-muted">
                      Default FieldType für Systemgrid
                      <select
                        value={systemGridFieldTypeId}
                        onChange={(event) =>
                          setSystemGridFieldTypeId(Number(event.target.value))
                        }
                        className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                      >
                        {fieldTypes.map((fieldType) => (
                          <option key={fieldType.id} value={fieldType.id}>
                            {fieldType.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        onClick={() =>
                          void openSystem(selectedField.starSystem!.id)
                        }
                        className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
                      >
                        System öffnen
                      </button>
                      <button
                        onClick={() => void initializeSelectedSystemGrid()}
                        className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10"
                      >
                        Systemgrid erzeugen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-swu-muted">
                Feld in Sektionsansicht auswählen.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
              System Editor
            </h2>
            {selectedSystem ? (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="font-semibold text-swu-text">
                    {selectedSystem.name}
                  </div>
                  <div className="text-xs text-swu-muted">
                    {selectedSystem.maxX}x{selectedSystem.maxY} Felder
                  </div>
                </div>

                <div
                  className="grid gap-1 overflow-auto"
                  style={{
                    gridTemplateColumns: `repeat(${selectedSystem.maxX}, minmax(24px, 1fr))`,
                  }}
                >
                  {systemFields.map((field) => {
                    const isSelected = selectedSystemField?.id === field.id;
                    return (
                      <button
                        key={field.id}
                        onClick={() => setSelectedSystemField(field)}
                        className={[
                          'h-7 rounded border text-[10px] transition',
                          getFieldTypeClasses(field.fieldType),
                          isSelected ? 'ring-2 ring-swu-accent' : '',
                        ].join(' ')}
                        title={`${field.sx},${field.sy} · ${field.fieldType?.name ?? 'unknown'}`}
                      >
                        {field.sx}:{field.sy}
                      </button>
                    );
                  })}
                </div>

                {selectedSystemField && (
                  <label className="block text-xs text-swu-muted">
                    System FieldType
                    <select
                      value={selectedSystemField.fieldTypeId}
                      onChange={(event) =>
                        void updateSystemFieldType(
                          selectedSystemField.id,
                          Number(event.target.value),
                        )
                      }
                      className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                    >
                      {fieldTypes.map((fieldType) => (
                        <option key={fieldType.id} value={fieldType.id}>
                          {fieldType.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-swu-muted">
                In Galaxy-Sektion Systemfeld mit Sternsystem wählen und öffnen.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function readError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unbekannter Fehler';
}
