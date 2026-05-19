import { useEffect, useRef } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import { spaceBackgroundTile, systemTypeImage } from '../../lib/assets';
import { getGalaxyFieldClasses } from './utils';

export function GalaxyFieldGrid() {
  const {
    selectedSector,
    sectorFields,
    selectedField,
    setSelectedField,
    selectedFieldIds,
    toggleFieldSelection,
    brushMode,
    openSystem,
  } = useStarmapAdminStore();
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedField?.id]);

  const handleClick = (
    field: (typeof sectorFields)[0],
    e: React.MouseEvent,
  ) => {
    if (brushMode === 'brush' || e.shiftKey) {
      toggleFieldSelection(field.id, true);
      return;
    }
    setSelectedField(field);
  };

  if (!selectedSector) {
    return (
      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
          Sektor
        </h2>
        <p className="mt-3 text-sm text-swu-muted">
          Sektor in der Kartenuebersicht auswaehlen.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Sektoransicht
          </h2>
          <p className="mt-1 text-xs text-swu-muted">
            Sektor [{selectedSector.sectorX + 1}, {selectedSector.sectorY + 1}]
            · {sectorFields.length} Felder
          </p>
        </div>
        {selectedField && (
          <div className="rounded border border-swu-border bg-swu-bg/60 px-2 py-1 text-xs text-swu-muted">
            Feld [{selectedField.cx}, {selectedField.cy}] ·{' '}
            {selectedField.fieldType?.name}
          </div>
        )}
      </div>

      <div
        className="grid gap-px min-w-max rounded border border-swu-border/50 bg-black/30 p-2"
        style={{ gridTemplateColumns: '40px repeat(20, 28px)' }}
      >
        <div className="bg-swu-bg/50 text-xs text-swu-muted flex items-center justify-center">
          x|y
        </div>
        {Array.from({ length: 20 }, (_, index) => (
          <div
            key={`gx-${index}`}
            className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
          >
            {index + 1}
          </div>
        ))}
        {Array.from({ length: 20 }, (_, row) => {
          const localY = row + 1;
          return (
            <div key={`row-${localY}`} className="contents">
              <div className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center">
                {localY}
              </div>
              {Array.from({ length: 20 }, (_, col) => {
                const localX = col + 1;
                const field = sectorFields.find((entry) => {
                  const expectedX = selectedSector.sectorX * 20 + localX;
                  const expectedY = selectedSector.sectorY * 20 + localY;
                  return entry.cx === expectedX && entry.cy === expectedY;
                });
                if (!field)
                  return (
                    <div
                      key={`empty-${localX}-${localY}`}
                      className="h-7 w-7 bg-black"
                    />
                  );

                const isSelected = selectedField?.id === field.id;
                const isBulkSelected = selectedFieldIds.includes(field.id);
                const systemAsset = field.starSystem
                  ? systemTypeImage(field.starSystem.systemTypeId)
                  : field.systemTypeId
                    ? systemTypeImage(field.systemTypeId)
                    : null;

                return (
                  <button
                    key={field.id}
                    ref={isSelected ? selectedRef : null}
                    onClick={(event) => handleClick(field, event)}
                    onDoubleClick={() =>
                      field.starSystem && void openSystem(field.starSystem.id)
                    }
                    className={[
                      getGalaxyFieldClasses(field, isSelected),
                      isBulkSelected ? 'ring-2 ring-amber-400/80' : '',
                    ].join(' ')}
                    style={{
                      backgroundImage: `url(${spaceBackgroundTile(field.cx, field.cy)})`,
                      backgroundSize: 'cover',
                    }}
                    title={`${field.cx},${field.cy} · ${field.fieldType?.name ?? 'unknown'}${field.starSystem ? ` · ${field.starSystem.name} (Doppelklick: öffnen)` : ''}`}
                  >
                    {systemAsset ? (
                      <img
                        src={systemAsset}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : field.fieldType.key === 'ASTEROID_CLUSTER' ? (
                      <span className="text-stone-300">·</span>
                    ) : null}
                    {field.starSystem && (
                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-0.5 text-[8px] text-amber-200">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-swu-muted">
        Klick selektiert ein Feld zur Bearbeitung. Doppelklick auf ein System
        öffnet die Systemansicht.
      </p>
    </section>
  );
}
