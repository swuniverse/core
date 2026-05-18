import { useStarmapAdminStore, defaultLayerForm } from '../../stores/starmap-admin.store';
import type { StarmapCreateLayerDto } from '@swuniverse/shared';

export function LayerPanel() {
  const {
    layerForm, setLayerForm, createLayer,
    selectedLayerId, layerGridFieldTypeId, setLayerGridFieldTypeId,
    fieldTypes, initializeLayerGrid, generateSystemsForLayer,
  } = useStarmapAdminStore();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Layer anlegen</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-swu-muted">
            Name
            <input
              value={layerForm.name}
              onChange={e => setLayerForm({ ...layerForm, name: e.target.value })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Sector Size
            <input type="number" value={layerForm.sectorSize}
              onChange={e => setLayerForm({ ...layerForm, sectorSize: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Width
            <input type="number" value={layerForm.width}
              onChange={e => setLayerForm({ ...layerForm, width: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
          <label className="text-xs text-swu-muted">
            Height
            <input type="number" value={layerForm.height}
              onChange={e => setLayerForm({ ...layerForm, height: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-swu-muted">
          {([
            ['isDefault', 'Default'], ['isFinished', 'Finished'], ['isHidden', 'Hidden'],
          ] as Array<[keyof StarmapCreateLayerDto, string]>).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(layerForm[key])}
                onChange={e => setLayerForm({ ...layerForm, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        <button onClick={() => void createLayer()}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10">
          Layer anlegen
        </button>
      </div>

      <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Grid initialisieren</h2>
        <p className="text-xs text-swu-muted">Erzeugt alle Galaxy-Felder des aktuell gewaehlten Layers.</p>
        <label className="block text-xs text-swu-muted">
          Default FieldType
          <select value={layerGridFieldTypeId}
            onChange={e => setLayerGridFieldTypeId(Number(e.target.value))}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            {fieldTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
          </select>
        </label>
        <button onClick={() => void initializeLayerGrid()} disabled={!selectedLayerId}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
          Grid fuer Layer erzeugen
        </button>
        <button onClick={() => void generateSystemsForLayer()} disabled={!selectedLayerId}
          className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
          Systeme batchweise generieren
        </button>
      </div>
    </div>
  );
}
