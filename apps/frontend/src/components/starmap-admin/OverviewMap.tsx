import { useMemo } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

const FACTION_COLORS: Record<string, string> = {
  REBEL: 'bg-blue-800/60',
  EMPIRE: 'bg-red-800/60',
  CONTESTED: 'bg-purple-800/60',
  NEUTRAL: 'bg-gray-700/60',
  UNKNOWN: 'bg-gray-900/40',
};

export function OverviewMap() {
  const { layerOverview, loadLayerOverview, selectSector, sectors, layers, selectedLayerId } = useStarmapAdminStore();

  const layer = useMemo(() => layers.find(l => l.id === selectedLayerId), [layers, selectedLayerId]);

  const grid = useMemo(() => {
    if (!layerOverview || !layer) return null;
    const cols = Math.ceil(layer.width / layer.sectorSize);
    const rows = Math.ceil(layer.height / layer.sectorSize);
    const map = new Map(layerOverview.sectors.map(s => [`${s.sectorX},${s.sectorY}`, s]));
    return { cols, rows, map };
  }, [layerOverview, layer]);

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Layer-Uebersicht</h2>
        <button onClick={() => void loadLayerOverview()}
          className="rounded border border-swu-accent px-2 py-1 text-xs text-swu-accent hover:bg-swu-accent/10">
          Laden
        </button>
      </div>

      {grid && (
        <div className="mt-3 overflow-auto">
          <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(32px, 1fr))` }}>
            {Array.from({ length: grid.rows }, (_, y) =>
              Array.from({ length: grid.cols }, (_, x) => {
                const entry = grid.map.get(`${x},${y}`);
                const sectorSummary = sectors.find(s => s.sectorX === x && s.sectorY === y);
                const factionColor = entry ? (FACTION_COLORS[entry.dominantFactionZone] ?? FACTION_COLORS.UNKNOWN) : 'bg-gray-950/60';
                return (
                  <button key={`${x},${y}`}
                    onClick={() => sectorSummary && void selectSector(sectorSummary)}
                    className={['h-8 rounded text-[9px] leading-tight transition hover:ring-1 hover:ring-swu-accent', factionColor].join(' ')}
                    title={entry
                      ? `[${x},${y}] ${entry.systemCount} Sys · ${entry.dominantFactionZone}${entry.dominantRegionName ? ` · ${entry.dominantRegionName}` : ''}`
                      : `[${x},${y}]`}>
                    {entry?.systemCount ? `${entry.systemCount}` : ''}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      )}

      {!grid && (
        <p className="mt-3 text-xs text-swu-muted">Klicke "Laden" fuer Sektor-Uebersicht mit Fraktionen und Regionen.</p>
      )}
    </div>
  );
}
