import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import type { StarmapGalaxyFieldDto } from '@swuniverse/shared';

export function FieldEditor() {
  const {
    selectedField, setSelectedField, fieldTypes, systemTypes, regions, borderTypes,
    updateField, createSystemForm, setCreateSystemForm,
    createSystemForSelectedField, regenerateSelectedSystem,
    initializeSelectedSystemGrid, openSystem, systemFields,
    systemGridFieldTypeId, setSystemGridFieldTypeId,
  } = useStarmapAdminStore();

  const systemGridExists = systemFields.length > 0;

  if (!selectedField) {
    return (
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Galaxy Feld Editor</h2>
        <p className="mt-3 text-sm text-swu-muted">Feld in Sektionsansicht auswaehlen.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Galaxy Feld Editor</h2>
      <div className="mt-3 space-y-4 text-sm">
        <div>
          <div className="text-swu-text font-semibold">[{selectedField.cx}, {selectedField.cy}]</div>
          <div className="text-xs text-swu-muted">Typ: {selectedField.fieldType?.name}</div>
          <div className="text-xs text-swu-muted">System: {selectedField.starSystem?.name || '—'}</div>
          <div className="text-xs text-swu-muted">
            Systemtyp-Seed: {systemTypes.find(st => st.id === selectedField.systemTypeId)?.name || '—'}
          </div>
        </div>

        <label className="block text-xs text-swu-muted">
          FieldType
          <select value={selectedField.fieldTypeId}
            onChange={e => void updateField(selectedField.id, { fieldTypeId: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            {fieldTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
          </select>
        </label>

        <label className="block text-xs text-swu-muted">
          Faction Zone
          <select value={selectedField.factionZone}
            onChange={e => void updateField(selectedField.id, { factionZone: e.target.value as StarmapGalaxyFieldDto['factionZone'] })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            {['UNKNOWN', 'REBEL', 'EMPIRE', 'CONTESTED', 'NEUTRAL'].map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>

        <label className="block text-xs text-swu-muted">
          Systemtyp-Seed
          <select value={selectedField.systemTypeId ?? ''}
            onChange={e => void updateField(selectedField.id, { systemTypeId: e.target.value ? Number(e.target.value) : null })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            <option value="">Keiner</option>
            {systemTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </label>

        {regions.length > 0 && (
          <label className="block text-xs text-swu-muted">
            Region
            <select value={selectedField.regionId ?? ''}
              onChange={e => void updateField(selectedField.id, { regionId: e.target.value ? Number(e.target.value) : null })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
              <option value="">Keine</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        )}

        {borderTypes.length > 0 && (
          <label className="block text-xs text-swu-muted">
            Border-Typ
            <select value={selectedField.borderTypeId ?? ''}
              onChange={e => void updateField(selectedField.id, { borderTypeId: e.target.value ? Number(e.target.value) : null })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
              <option value="">Keiner</option>
              {borderTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
            </select>
          </label>
        )}

        <label className="block text-xs text-swu-muted">
          Passierbarkeit
          <select value={selectedField.passableOverride === null ? '' : String(selectedField.passableOverride)}
            onChange={e => {
              const val = e.target.value;
              void updateField(selectedField.id, {
                passableOverride: val === '' ? null : val === 'true',
              });
            }}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
            <option value="">Automatisch (vom FieldType)</option>
            <option value="true">Erzwungen passierbar</option>
            <option value="false">Erzwungen blockiert</option>
          </select>
        </label>

        <label className="block text-xs text-swu-muted">
          Effekte (kommagetrennt)
          <input value={(selectedField.effects ?? []).join(', ')}
            onChange={e => setSelectedField({ ...selectedField, effects: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : null })}
            onBlur={e => {
              const effects = e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : null;
              void updateField(selectedField.id, { effects });
            }}
            placeholder="z. B. RADIATION, SCAN_PENALTY"
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text" />
        </label>

        <label className="block text-xs text-swu-muted">
          Admin Region Key
          <input value={selectedField.adminRegionKey || ''}
            onChange={e => setSelectedField({ ...selectedField, adminRegionKey: e.target.value })}
            onBlur={e => void updateField(selectedField.id, { adminRegionKey: e.target.value || null })}
            className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text" />
        </label>

        {!selectedField.starSystem ? (
          <div className="space-y-3 rounded border border-swu-border/60 bg-swu-bg/40 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-swu-muted">System anlegen</div>
            <label className="block text-xs text-swu-muted">
              Systemname
              <input value={createSystemForm.name}
                onChange={e => setCreateSystemForm({ ...createSystemForm, name: e.target.value })}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                placeholder="z. B. Yavin" />
            </label>
            <div className="grid gap-3 grid-cols-3">
              <label className="block text-xs text-swu-muted">
                Systemtyp
                <select value={createSystemForm.systemTypeId}
                  onChange={e => setCreateSystemForm({ ...createSystemForm, systemTypeId: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
                  {systemTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                </select>
              </label>
              <label className="block text-xs text-swu-muted">
                Grid X
                <input type="number" min={1} value={createSystemForm.maxX}
                  onChange={e => setCreateSystemForm({ ...createSystemForm, maxX: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text" />
              </label>
              <label className="block text-xs text-swu-muted">
                Grid Y
                <input type="number" min={1} value={createSystemForm.maxY}
                  onChange={e => setCreateSystemForm({ ...createSystemForm, maxY: Number(e.target.value) })}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text" />
              </label>
            </div>
            <button onClick={() => void createSystemForSelectedField()} disabled={!createSystemForm.name.trim()}
              className="w-full rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
              System auf Feld anlegen
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded border border-swu-border/60 bg-swu-bg/40 p-3">
            <div className="text-xs text-swu-muted">System vorhanden: {selectedField.starSystem.name}</div>
            <div className="text-xs text-swu-muted">Groesse: {selectedField.starSystem.maxX}x{selectedField.starSystem.maxY}</div>
            <label className="block text-xs text-swu-muted">
              Default FieldType fuer Systemgrid
              <select value={systemGridFieldTypeId}
                onChange={e => setSystemGridFieldTypeId(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
                {fieldTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
              </select>
            </label>
            <div className="grid gap-2 grid-cols-3">
              <button onClick={() => void openSystem(selectedField.starSystem!.id)}
                className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent hover:bg-swu-accent/10">
                Oeffnen
              </button>
              <button onClick={() => void regenerateSelectedSystem()}
                className="rounded border border-amber-400 px-3 py-2 text-sm text-amber-300 hover:bg-amber-400/10">
                Regenerieren
              </button>
              <button onClick={() => void initializeSelectedSystemGrid()} disabled={systemGridExists}
                className="rounded border border-swu-accent px-3 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
                {systemGridExists ? 'Grid vorhanden' : 'Grid erzeugen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
