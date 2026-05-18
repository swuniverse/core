import { useMemo } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function SectorGrid() {
  const { layers, selectedLayerId, sectors, selectedSector, selectSector } = useStarmapAdminStore();

  const columns = useMemo(() => {
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return 1;
    return Math.ceil(layer.width / layer.sectorSize);
  }, [layers, selectedLayerId]);

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Sektionen</h2>
      <p className="mt-1 text-xs text-swu-muted">Klick auf 20x20 Sektion. Danach Feldeditor rechts nutzen.</p>
      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {sectors.map(sector => {
          const isSelected = selectedSector?.sectorX === sector.sectorX && selectedSector?.sectorY === sector.sectorY;
          return (
            <button key={`${sector.sectorX}-${sector.sectorY}`}
              onClick={() => void selectSector(sector)}
              className={[
                'rounded border px-2 py-3 text-left transition',
                isSelected ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border bg-swu-bg/40 hover:border-swu-primary',
              ].join(' ')}>
              <div className="text-sm font-semibold text-swu-text">[{sector.sectorX}, {sector.sectorY}]</div>
              <div className="mt-1 text-[11px] text-swu-muted">Felder: {sector.fieldCount}</div>
              <div className="text-[11px] text-swu-muted">Systeme: {sector.systemCount}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
