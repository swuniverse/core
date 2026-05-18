import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';

export function SectorFillPanel() {
  const {
    selectedSector, sectorFillForm, setSectorFillForm,
    fieldTypes, systemTypes, fillSelectedSector, selectSector, selectedField,
  } = useStarmapAdminStore();

  if (!selectedSector) {
    return (
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Sektion fuellen</h2>
        <p className="mt-3 text-sm text-swu-muted">Erst links Sektion auswaehlen.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Sektion fuellen</h2>
          <p className="mt-1 text-xs text-swu-muted">Schnellwerkzeuge fuer aktuelle 20x20-Sektion.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-swu-muted">
            <span>◇ = Seed</span><span>★ = Generiertes System</span>
          </div>
        </div>
        <button onClick={() => void selectSector(selectedSector, selectedField?.id)}
          className="rounded border border-swu-border px-3 py-2 text-xs text-swu-muted hover:border-swu-primary hover:text-swu-text">
          Sektion neu laden
        </button>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div className="text-xs text-swu-muted">Ziel: [{selectedSector.sectorX}, {selectedSector.sectorY}]</div>
        <label className="block text-xs text-swu-muted">
          FieldType
          <select value={sectorFillForm.fieldTypeId}
            onChange={e => setSectorFillForm({ ...sectorFillForm, fieldTypeId: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            {fieldTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-swu-muted">
          Faction Zone
          <select value={sectorFillForm.factionZone}
            onChange={e => setSectorFillForm({ ...sectorFillForm, factionZone: e.target.value as StarmapGalaxyFieldDto['factionZone'] })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            {['UNKNOWN', 'REBEL', 'EMPIRE', 'CONTESTED', 'NEUTRAL'].map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <label className="block text-xs text-swu-muted">
          Systemtyp-Seed
          <select value={sectorFillForm.systemTypeId ?? ''}
            onChange={e => setSectorFillForm({ ...sectorFillForm, systemTypeId: e.target.value ? Number(e.target.value) : null })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            <option value="">Keiner</option>
            {systemTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-swu-muted">
          Admin Region Key
          <input value={sectorFillForm.adminRegionKey}
            onChange={e => setSectorFillForm({ ...sectorFillForm, adminRegionKey: e.target.value })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text" />
        </label>
        <button onClick={() => void fillSelectedSector()}
          className="w-full rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10">
          Ganze Sektion fuellen
        </button>
      </div>
    </div>
  );
}
