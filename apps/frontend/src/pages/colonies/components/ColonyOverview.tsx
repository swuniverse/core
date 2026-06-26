import { planetImage } from '../../../lib/assets';
import type { Colony } from '../types';

export function ColonyOverview({
  colonies,
  onSelect,
}: {
  colonies: Colony[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-swu-muted">/ Kolonien</div>
      <div className="bg-swu-surface border border-swu-border rounded overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-swu-muted border-b border-swu-border/50">
              <th className="text-left px-3 py-2 font-normal">Kolonie</th>
              <th className="text-right px-3 py-2 font-normal">Bevölkerung</th>
              <th className="text-right px-3 py-2 font-normal">Energie</th>
              <th className="text-right px-3 py-2 font-normal">Lager</th>
            </tr>
          </thead>
          <tbody>
            {colonies.map((c) => (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="border-b border-swu-border/20 hover:bg-swu-accent/5 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {c.celestialObject?.classId && (
                      <img
                        src={planetImage(c.celestialObject.classId)}
                        alt=""
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    <div>
                      <div className="font-bold text-swu-primary">{c.name}</div>
                      <div className="text-[10px] text-swu-muted">
                        {c.locationLabel || 'Unbekannt'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-swu-success">
                  {c.population}/{c.populationMax}
                </td>
                <td className="px-3 py-2 text-right font-mono text-yellow-400">
                  {c.energy}/{c.energyMax}
                </td>
                <td className="px-3 py-2 text-right font-mono text-swu-primary">
                  {c.storageUsed}/{c.storageMax}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────

