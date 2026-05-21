import { useMemo } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function SectorGrid() {
  const { layers, selectedLayerId, sectors, selectedSector, selectSector } =
    useStarmapAdminStore();

  const layer = useMemo(
    () => layers.find((entry) => entry.id === selectedLayerId) ?? null,
    [layers, selectedLayerId],
  );
  const columns = layer ? Math.ceil(layer.width / layer.sectorSize) : 1;
  const rows = layer ? Math.ceil(layer.height / layer.sectorSize) : 1;
  const sectorByCoord = useMemo(
    () =>
      new Map(
        sectors.map((sector) => [
          `${sector.sectorX},${sector.sectorY}`,
          sector,
        ]),
      ),
    [sectors],
  );

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Karte · Sektorenuebersicht
          </h2>
          <p className="mt-1 text-xs text-swu-muted">
            Wie in der Sternenkarte: Sektor anklicken, um in die 20x20 Ansicht
            zu wechseln.
          </p>
        </div>
      </div>
      <div className="relative">
        <div
          className="grid gap-px min-w-max"
          style={{
            gridTemplateColumns: `56px repeat(${columns}, minmax(120px, 1fr))`,
          }}
        >
          <div className="bg-swu-bg/50 p-2 text-xs font-bold text-swu-muted">
            x|y
          </div>
          {Array.from({ length: columns }, (_, x) => (
            <div
              key={`sx-${x}`}
              className="bg-swu-bg/50 p-2 text-center text-xs font-bold text-swu-muted"
            >
              {x + 1}
            </div>
          ))}
          {Array.from({ length: rows }, (_, y) => (
            <div key={`row-${y}`} className="contents">
              <div className="bg-swu-bg/50 p-2 text-center text-xs font-bold text-swu-muted">
                {y + 1}
              </div>
              {Array.from({ length: columns }, (_, x) => {
                const sector = sectorByCoord.get(`${x},${y}`);
                const isSelected =
                  selectedSector?.sectorX === x &&
                  selectedSector?.sectorY === y;
                return (
                  <button
                    key={`${x}-${y}`}
                    disabled={!sector}
                    onClick={() => sector && void selectSector(sector)}
                    className={[
                      'min-h-24 rounded-sm border p-3 text-left transition',
                      isSelected
                        ? 'border-swu-accent bg-swu-accent/10'
                        : 'border-swu-border bg-swu-bg/50 hover:border-swu-primary',
                      !sector ? 'opacity-40' : '',
                    ].join(' ')}
                    title={
                      sector
                        ? `Sektor ${x + 1}|${y + 1} · ${sector.systemCount} Systeme`
                        : `Sektor ${x + 1}|${y + 1}`
                    }
                  >
                    <div className="text-xs text-swu-muted">Sector</div>
                    <div className="text-lg font-bold text-swu-primary">
                      {x + 1} | {y + 1}
                    </div>
                    <div className="mt-2 text-xs text-swu-muted">
                      Felder: {sector?.fieldCount ?? 0}
                    </div>
                    <div className="text-xs text-swu-muted">
                      Systeme: {sector?.systemCount ?? 0}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
