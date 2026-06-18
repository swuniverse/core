import { useRef } from 'react';
import {
  useStarmapAdminStore,
  defaultLayerForm,
} from '../../stores/starmap-admin.store';
import type { StarmapCreateLayerDto } from '@swuniverse/shared';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

export function LayerPanel() {
  const {
    layerForm,
    setLayerForm,
    createLayer,
    selectedLayerId,
    layerGridFieldTypeId,
    setLayerGridFieldTypeId,
    fieldTypes,
    initializeLayerGrid,
    generateSystemsForLayer,
    initializeDefaultStarWarsGalaxy,
  } = useStarmapAdminStore();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
          Layer anlegen
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-swu-muted">
            Name
            <input
              value={layerForm.name}
              onChange={(e) =>
                setLayerForm({ ...layerForm, name: e.target.value })
              }
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Sector Size
            <input
              type="number"
              value={layerForm.sectorSize}
              onChange={(e) =>
                setLayerForm({
                  ...layerForm,
                  sectorSize: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Width
            <input
              type="number"
              value={layerForm.width}
              onChange={(e) =>
                setLayerForm({ ...layerForm, width: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Height
            <input
              type="number"
              value={layerForm.height}
              onChange={(e) =>
                setLayerForm({ ...layerForm, height: Number(e.target.value) })
              }
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-swu-muted">
          {(
            [
              ['isDefault', 'Default'],
              ['isFinished', 'Finished'],
              ['isHidden', 'Hidden'],
            ] as Array<[keyof StarmapCreateLayerDto, string]>
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(layerForm[key])}
                onChange={(e) =>
                  setLayerForm({ ...layerForm, [key]: e.target.checked })
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
          Erzeugt alle Galaxy-Felder des aktuell gewaehlten Layers.
        </p>
        <label className="block text-xs text-swu-muted">
          Default FieldType
          <select
            value={layerGridFieldTypeId}
            onChange={(e) => setLayerGridFieldTypeId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
          >
            {fieldTypes.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => void initializeLayerGrid()}
          disabled={!selectedLayerId}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
        >
          Grid fuer Layer erzeugen
        </button>
        <button
          onClick={() => void generateSystemsForLayer()}
          disabled={!selectedLayerId}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
        >
          Systeme batchweise generieren
        </button>
        <div className="rounded border border-amber-400/40 bg-amber-950/10 p-3 text-xs text-amber-100">
          <div className="font-bold text-amber-300">
            Star-Wars-Galaxie initialisieren
          </div>
          <p className="mt-1 text-amber-100/80">
            Manueller Seed-Flow: FieldTypes, 120x120 Layer, Grid, Faction-Zonen,
            Preset, Routen und spielbare Systeme. Keine Auto-Ausfuehrung beim
            Backend-Start.
          </p>
          <button
            onClick={() => void initializeDefaultStarWarsGalaxy()}
            className="mt-3 rounded border border-amber-300 px-3 py-2 text-sm text-amber-200 hover:bg-amber-300/10"
          >
            Star-Wars-Galaxie initialisieren
          </button>
        </div>
      </div>

      <ExportImportPanel />
    </div>
  );
}

function ExportImportPanel() {
  const { selectedLayerId } = useStarmapAdminStore();
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    if (!selectedLayerId) return;
    const data = await api.get<object>(`/starmap/admin/layers/${selectedLayerId}/export`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galaxy-export-${selectedLayerId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    await api.post('/starmap/admin/layers/import', data);
    window.location.reload();
  }

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
        Export / Import
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void handleExport()}
          disabled={!selectedLayerId}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
        >
          Galaxy exportieren (JSON)
        </button>
        {user?.isAdmin && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded border border-red-400 px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
            >
              Galaxy importieren
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
              }}
            />
          </>
        )}
      </div>
      <p className="text-[10px] text-swu-muted">
        Export speichert den aktuellen Layer als JSON. Import ersetzt alle Daten des Layers (nur Admin).
      </p>
    </div>
  );
}
