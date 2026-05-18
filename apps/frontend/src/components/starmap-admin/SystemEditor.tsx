import { useMemo } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import { getFieldTypeClasses } from './utils';

export function SystemEditor() {
  const {
    sectorFields, selectedSystemId, systemFields,
    selectedSystemField, setSelectedSystemField,
    fieldTypes, updateSystemFieldType,
  } = useStarmapAdminStore();

  const selectedSystem = useMemo(() => {
    if (!selectedSystemId) return null;
    return sectorFields.find(f => f.starSystem?.id === selectedSystemId)?.starSystem ?? null;
  }, [sectorFields, selectedSystemId]);

  if (!selectedSystem) {
    return (
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">System Editor</h2>
        <p className="mt-3 text-sm text-swu-muted">In Galaxy-Sektion Systemfeld waehlen und oeffnen.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">System Editor</h2>
      <div className="mt-3 space-y-4">
        <div>
          <div className="font-semibold text-swu-text">{selectedSystem.name}</div>
          <div className="text-xs text-swu-muted">{selectedSystem.maxX}x{selectedSystem.maxY} Felder</div>
        </div>

        <div className="grid gap-1 overflow-auto"
          style={{ gridTemplateColumns: `repeat(${selectedSystem.maxX}, minmax(24px, 1fr))` }}>
          {systemFields.map(field => {
            const isSelected = selectedSystemField?.id === field.id;
            return (
              <button key={field.id}
                onClick={() => setSelectedSystemField(field)}
                className={[
                  'h-7 rounded border text-[10px] transition',
                  getFieldTypeClasses(field.fieldType),
                  isSelected ? 'ring-2 ring-swu-accent' : '',
                ].join(' ')}
                title={`${field.sx},${field.sy} · ${field.fieldType?.name ?? 'unknown'}`}>
                {field.sx}:{field.sy}
              </button>
            );
          })}
        </div>

        {selectedSystemField && (
          <label className="block text-xs text-swu-muted">
            System FieldType
            <select value={selectedSystemField.fieldTypeId}
              onChange={e => void updateSystemFieldType(selectedSystemField.id, Number(e.target.value))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text">
              {fieldTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
