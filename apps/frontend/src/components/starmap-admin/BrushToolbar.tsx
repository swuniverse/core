import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function BrushToolbar() {
  const {
    brushMode,
    setBrushMode,
    selectedFieldIds,
    clearSelection,
    bulkEditSelected,
    fieldTypes,
    regions,
    borderTypes,
  } = useStarmapAdminStore();

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
        Multi-Select
      </h2>
      <div className="mt-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBrushMode('single')}
            className={[
              'rounded border px-3 py-1 text-xs transition',
              brushMode === 'single'
                ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                : 'border-swu-border text-swu-muted hover:text-swu-text',
            ].join(' ')}
          >
            Einzeln
          </button>
          <button
            onClick={() => setBrushMode('brush')}
            className={[
              'rounded border px-3 py-1 text-xs transition',
              brushMode === 'brush'
                ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                : 'border-swu-border text-swu-muted hover:text-swu-text',
            ].join(' ')}
          >
            Pinsel (Shift)
          </button>
          {selectedFieldIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="ml-auto rounded border border-red-600 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
            >
              Auswahl loeschen
            </button>
          )}
        </div>

        <div className="text-xs text-swu-muted">
          {selectedFieldIds.length} Felder ausgewaehlt
        </div>

        {selectedFieldIds.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs text-swu-muted">
              FieldType setzen
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value)
                    void bulkEditSelected({
                      fieldTypeId: Number(e.target.value),
                    });
                  e.target.value = '';
                }}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              >
                <option value="" disabled>
                  Waehlen...
                </option>
                {fieldTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name} ({ft.key})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-swu-muted">
              Faction Zone setzen
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value)
                    void bulkEditSelected({
                      factionZone: e.target.value as any,
                    });
                  e.target.value = '';
                }}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              >
                <option value="" disabled>
                  Waehlen...
                </option>
                {['UNKNOWN', 'REBEL', 'EMPIRE', 'CONTESTED', 'NEUTRAL'].map(
                  (z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ),
                )}
              </select>
            </label>

            {regions.length > 0 && (
              <label className="block text-xs text-swu-muted">
                Region setzen
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    void bulkEditSelected({
                      regionId: val === 'null' ? null : Number(val),
                    });
                    e.target.value = '';
                  }}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                >
                  <option value="" disabled>
                    Waehlen...
                  </option>
                  <option value="null">Keine Region</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {borderTypes.length > 0 && (
              <label className="block text-xs text-swu-muted">
                Border-Typ setzen
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    void bulkEditSelected({
                      borderTypeId: val === 'null' ? null : Number(val),
                    });
                    e.target.value = '';
                  }}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                >
                  <option value="" disabled>
                    Waehlen...
                  </option>
                  <option value="null">Kein Border</option>
                  {borderTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex gap-2">
              <button
                onClick={() =>
                  void bulkEditSelected({ passableOverride: true })
                }
                className="flex-1 rounded border border-green-600 px-2 py-1 text-xs text-green-300 hover:bg-green-950/40"
              >
                Passierbar
              </button>
              <button
                onClick={() =>
                  void bulkEditSelected({ passableOverride: false })
                }
                className="flex-1 rounded border border-red-600 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
              >
                Blockiert
              </button>
              <button
                onClick={() =>
                  void bulkEditSelected({ passableOverride: null })
                }
                className="flex-1 rounded border border-swu-border px-2 py-1 text-xs text-swu-muted hover:text-swu-text"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
