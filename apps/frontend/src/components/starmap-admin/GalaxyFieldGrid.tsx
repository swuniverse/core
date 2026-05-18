import { useRef, useEffect } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import { getGalaxyFieldClasses } from './utils';

export function GalaxyFieldGrid() {
  const {
    selectedSector, sectorFields, selectedField, setSelectedField,
    selectedFieldIds, toggleFieldSelection, brushMode,
  } = useStarmapAdminStore();
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedField?.id]);

  const handleClick = (field: typeof sectorFields[0], e: React.MouseEvent) => {
    if (brushMode === 'brush' || e.shiftKey) {
      toggleFieldSelection(field.id, true);
    } else {
      setSelectedField(field);
    }
  };

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Galaxy Sektion</h2>
          <p className="mt-1 text-xs text-swu-muted">
            {selectedSector
              ? `Sektion [${selectedSector.sectorX}, ${selectedSector.sectorY}] · ${sectorFields.length} Felder`
              : 'Sektion links auswaehlen'}
          </p>
        </div>
        {selectedField && (
          <div className="text-xs text-swu-muted">Feld [{selectedField.cx}, {selectedField.cy}]</div>
        )}
      </div>
      <div className="mt-4 grid gap-1 min-w-[640px] max-h-[560px] overflow-auto"
        style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
        {sectorFields.map(field => {
          const isSelected = selectedField?.id === field.id;
          const isBulkSelected = selectedFieldIds.includes(field.id);
          return (
            <button key={field.id}
              ref={isSelected ? selectedRef : null}
              onClick={e => handleClick(field, e)}
              className={[
                getGalaxyFieldClasses(field, isSelected),
                isBulkSelected ? 'ring-2 ring-amber-400/80' : '',
              ].join(' ')}
              title={`${field.cx},${field.cy} · ${field.fieldType?.name ?? 'unknown'}${field.passableOverride === false ? ' [BLOCKED]' : ''}`}>
              {field.starSystem ? '★' : field.systemTypeId ? '◇' : `${field.cx}:${field.cy}`}
            </button>
          );
        })}
      </div>
    </section>
  );
}
