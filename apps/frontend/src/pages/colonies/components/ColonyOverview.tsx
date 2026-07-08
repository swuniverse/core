import { useMemo } from 'react';
import { planetImage, commodityImage } from '../../../lib/assets';
import { formatSignedAmount } from '../utils';
import type { Colony, CommodityDef } from '../types';

export function ColonyOverview({
  colonies,
  commodities,
  onSelect,
}: {
  colonies: Colony[];
  commodities: CommodityDef[];
  onSelect: (id: number) => void;
}) {
  const commodityMap = useMemo(
    () => Object.fromEntries(commodities.map((c) => [c.id, c])),
    [commodities],
  );

  const totalProduction = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of colonies) {
      for (const d of c.productionDeltas ?? []) {
        map.set(d.commodityId, (map.get(d.commodityId) || 0) + d.amount);
      }
    }
    return Array.from(map.entries())
      .filter(([, amount]) => amount !== 0)
      .sort((a, b) => b[1] - a[1]);
  }, [colonies]);

  const allBuildJobs = useMemo(
    () =>
      colonies.flatMap((c) =>
        (c.activeBuildJobs ?? []).map((job) => ({ ...job, colonyName: c.name })),
      ),
    [colonies],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-swu-primary" style={{ fontFamily: 'var(--font-swu-display)' }}>Kolonien</span>
        <span className="text-[10px] text-swu-muted font-mono">/ Übersicht</span>
      </div>

      <div className="flex gap-3 flex-col lg:flex-row">
        {/* Left: Colony table + build jobs + production (mobile) */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-swu-surface border border-swu-border rounded overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-swu-muted border-b border-swu-border/50">
                  <th className="text-left px-3 py-2 font-normal">Name</th>
                  <th className="text-center px-3 py-2 font-normal">
                    Crewman
                  </th>
                  <th className="text-right px-3 py-2 font-normal">
                    Bev&ouml;lkerung
                  </th>
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
                          <div className="font-bold text-swu-primary">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-swu-muted">
                            {c.locationLabel || 'Unbekannt'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-swu-muted">
                      {c.crewSummary ? (
                        <>
                          {c.crewSummary.assigned}/{c.crewSummary.limit}
                          {c.crewSummary.inTraining > 0 && (
                            <span className="text-swu-warning">
                              {' '}
                              ({c.crewSummary.inTraining})
                            </span>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-swu-success">
                      {c.population}/{c.populationMax}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-swu-warning">
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

          {/* Active build jobs */}
          {allBuildJobs.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded">
              <div className="px-3 py-1.5 border-b border-swu-border/50 text-[10px] font-bold text-swu-muted uppercase">
                Aktuelle Bauvorg&auml;nge
              </div>
              <div className="divide-y divide-swu-border/20">
                {allBuildJobs.map((job, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-1.5 text-[10px]"
                  >
                    <span className="text-swu-primary font-medium">
                      {job.buildingName}
                    </span>
                    {'progress' in job && typeof job.progress === 'number' && (
                      <div
                        className="flex gap-px w-14 shrink-0"
                        role="progressbar"
                        aria-valuenow={job.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Bau ${job.buildingName}`}
                      >
                        {Array.from({ length: 10 }, (_, si) => {
                          const progress = job.progress as number;
                          return (
                            <div
                              key={si}
                              className={`h-1.5 flex-1 ${si < Math.round(progress / 10) ? 'bg-swu-warning' : 'bg-swu-bg'} ${si === 0 ? 'rounded-l-sm' : ''} ${si === 9 ? 'rounded-r-sm' : ''} border border-swu-border/30`}
                            />
                          );
                        })}
                      </div>
                    )}
                    {job.finishesAt && (
                      <span className="text-swu-muted">
                        {new Date(job.finishesAt).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    <span className="text-swu-muted ml-auto">
                      {job.colonyName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Total production (desktop sidebar, mobile below) */}
        {totalProduction.length > 0 && (
          <div className="w-full lg:w-[300px] shrink-0">
            <div className="bg-swu-surface border border-swu-border rounded">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-swu-muted border-b border-swu-border/50">
                    <th className="text-left px-3 py-1.5 font-normal">Ware</th>
                    <th className="text-right px-3 py-1.5 font-normal">
                      Gesamtproduktion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {totalProduction.map(([commodityId, amount]) => (
                    <tr
                      key={commodityId}
                      className="border-b border-swu-border/20"
                    >
                      <td className="px-3 py-1 flex items-center gap-2">
                        <img
                          src={commodityImage(
                            commodityId,
                            commodityMap[commodityId]?.name,
                          )}
                          alt=""
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                        <span className="text-swu-muted">
                          {commodityMap[commodityId]?.name ||
                            `#${commodityId}`}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-1 text-right font-mono ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {formatSignedAmount(amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
