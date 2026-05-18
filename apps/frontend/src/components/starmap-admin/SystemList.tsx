import { useMemo } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function SystemList() {
  const { sectorFields, selectedSystemId, openSystem } = useStarmapAdminStore();

  const systems = useMemo(() => {
    return sectorFields
      .map(f => f.starSystem)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.cy !== b.cy ? a.cy - b.cy : a.cx !== b.cx ? a.cx - b.cx : a.name.localeCompare(b.name));
  }, [sectorFields]);

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Systeme in Sektion</h2>
      {systems.length > 0 ? (
        <div className="mt-3 space-y-2">
          {systems.map(system => {
            const isActive = selectedSystemId === system.id;
            return (
              <button key={system.id} onClick={() => void openSystem(system.id)}
                className={[
                  'w-full rounded border px-3 py-2 text-left text-xs transition',
                  isActive ? 'border-swu-accent bg-swu-accent/10 text-swu-text'
                    : 'border-swu-border bg-swu-bg/40 text-swu-muted hover:border-swu-primary hover:text-swu-text',
                ].join(' ')}>
                <div className="font-semibold">{system.name}</div>
                <div className="mt-1 text-[11px] opacity-80">Feld [{system.cx}, {system.cy}] · {system.maxX}x{system.maxY}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-swu-muted">Keine Systeme in aktueller Sektion.</p>
      )}
    </div>
  );
}
