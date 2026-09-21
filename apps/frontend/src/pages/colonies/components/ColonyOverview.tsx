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
        (c.activeBuildJobs ?? []).map((job) => ({
          ...job,
          colonyName: c.name,
        })),
      ),
    [colonies],
  );

  const statusBar = (current: number, max: number, tone: string) => (
    <span className="inline-flex h-2.5 w-14 overflow-hidden border border-swu-border bg-black/50 align-middle">
      <span
        className={tone}
        style={{
          width: `${Math.min(100, Math.round((current / Math.max(1, max)) * 100))}%`,
        }}
      />
    </span>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold text-swu-primary"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Kolonien
        </span>
        <span className="text-[10px] text-swu-muted font-mono">
          / Übersicht
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <div className="overflow-x-auto border border-swu-border bg-swu-surface">
            <table className="min-w-[1200px] w-full text-sm">
              <thead>
                <tr className="border-b border-swu-border/50 text-xs text-swu-muted">
                  <th className="w-24 px-4 py-3 font-normal" />
                  <th className="text-left px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 text-center font-normal">
                    Signaturen
                  </th>
                  <th className="px-4 py-3 text-center font-normal">
                    Crewman{' '}
                    <img
                      src="/assets/buttons/info2.png"
                      alt=""
                      className="inline size-3"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-normal">
                    Bevölkerung{' '}
                    <img
                      src="/assets/buttons/info2.png"
                      alt=""
                      className="inline size-3"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-normal">Energie</th>
                  <th className="px-4 py-3 text-right font-normal">Lager</th>
                </tr>
              </thead>
              <tbody>
                {colonies.map((c) => {
                  const overview = c.overview;
                  const population = overview?.population ?? {
                    current: c.population,
                    max: c.populationMax,
                    immigration: 0,
                  };
                  const energy = overview?.energy ?? {
                    current: c.energy,
                    max: c.energyMax,
                    production: 0,
                  };
                  const storage = overview?.storage ?? {
                    current: c.storageUsed,
                    max: c.storageMax,
                    production: 0,
                  };
                  const location = overview?.location;
                  const status = overview?.status;
                  const crewOverLimit =
                    (c.crewSummary?.assigned ?? 0) >
                    (c.crewSummary?.limit ?? 0);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      className="cursor-pointer border-b border-swu-border/20 transition-colors hover:bg-swu-accent/5"
                    >
                      <td className="px-4 py-3 text-center">
                        <img
                          src={planetImage(
                            c.celestialObject?.classId ??
                              c.colonyClassId ??
                              201,
                          )}
                          alt=""
                          className="mx-auto size-14 object-contain"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5 font-bold text-swu-primary">
                          {status?.blocked && (
                            <img
                              src="/assets/buttons/block2.png"
                              alt="Blockiert"
                              className="size-5"
                            />
                          )}
                          {status?.defended && (
                            <img
                              src="/assets/buttons/defend1.png"
                              alt="Verteidigt"
                              className="size-5"
                            />
                          )}
                          {c.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-swu-muted">
                          {location?.systemTypeId && (
                            <img
                              src={`/assets/map/systemtypes/${location.systemTypeId}.png`}
                              alt=""
                              className="size-4 object-contain"
                            />
                          )}
                          {location
                            ? `${location.x}|${location.y} (${location.systemName ?? 'Unbekannt'}-System ${location.systemX ?? '?'}|${location.systemY ?? '?'})`
                            : c.locationLabel || 'Unbekannt'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {c.signatureCount ?? 0}
                      </td>
                      <td
                        className={`px-4 py-3 text-center font-mono ${crewOverLimit ? 'text-red-400' : 'text-swu-text'}`}
                      >
                        {c.crewSummary
                          ? `${c.crewSummary.assigned}/${c.crewSummary.limit} (${c.crewSummary.inTraining})`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-swu-text">
                        <img
                          src="/assets/bev/bev_used_5_1.png"
                          alt=""
                          className="mr-1.5 inline size-6 object-contain"
                        />
                        {population.current}/{population.max} (
                        {formatSignedAmount(population.immigration)})
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-swu-text">
                        {statusBar(
                          energy.current,
                          energy.max,
                          energy.production < 0
                            ? 'bg-red-500'
                            : 'bg-swu-warning',
                        )}{' '}
                        {energy.current}/{energy.max} (
                        {formatSignedAmount(energy.production)})
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-swu-text">
                        {statusBar(
                          storage.current,
                          storage.max,
                          'bg-swu-success',
                        )}{' '}
                        {storage.current}/{storage.max} (
                        {formatSignedAmount(storage.production)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {allBuildJobs.length > 0 && (
            <div className="border border-swu-border bg-swu-surface">
              <div className="border-b border-swu-border/50 px-4 py-2 text-xs font-bold uppercase text-swu-muted">
                Aktuelle Bauvorg&auml;nge
              </div>
              <div className="divide-y divide-swu-border/20">
                {allBuildJobs.map((job, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2 text-xs"
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

        {totalProduction.length > 0 && (
          <div className="w-full lg:ml-auto lg:w-[420px]">
            <div className="border border-swu-border bg-swu-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-swu-border/50 text-xs text-swu-muted">
                    <th className="px-4 py-2 text-left font-normal">Ware</th>
                    <th className="px-4 py-2 text-right font-normal">
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
                      <td className="flex items-center gap-2 px-4 py-2">
                        <img
                          src={commodityImage(
                            commodityId,
                            commodityMap[commodityId]?.name,
                          )}
                          alt=""
                          className="size-5 object-contain"
                          loading="lazy"
                        />
                        <span className="text-swu-muted">
                          {commodityMap[commodityId]?.name || `#${commodityId}`}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}
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
