import { BbCodeText } from '../../../components/BbCodeText';
import { planetImage } from '../../../lib/assets';
import type { Colony, ColonyDetailV2 } from '../types';
import { formatSignedAmount } from '../utils';

type PanelInfoProps = {
  colony: Colony;
  detail?: ColonyDetailV2;
};

export function PanelInfo({ colony, detail }: PanelInfoProps) {
  return (
    <div className="space-y-2">
      {/* Orbit Ships */}
      {(detail?.orbitShips?.length ?? 0) > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            Schiffe im Orbit
          </div>
          <div className="space-y-1 text-sm">
            {detail?.orbitShips?.map((ship) => (
              <div key={ship.id} className="flex justify-between gap-2">
                <span className="text-swu-primary">{ship.name}</span>
                <span className="text-swu-muted">
                  {ship.shipClassName ?? `#${ship.shipClassId}`} · {ship.status}{' '}
                  · Crew {ship.crew}/{ship.crewRequired}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planet + System */}
      <div className="flex gap-2">
        {colony.celestialObject && (
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex-1">
            <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
              Planet
            </div>
            <div className="flex items-center gap-2">
              {colony.celestialObject.classId && (
                <img
                  src={planetImage(colony.celestialObject.classId)}
                  alt=""
                  className="w-10 h-10 object-contain"
                />
              )}
              <div className="text-sm">
                <div className="text-swu-primary">
                  {colony.celestialObject.name || colony.name}
                </div>
                {colony.posX != null && colony.posY != null && (
                  <div className="text-[10px] text-swu-muted font-mono">
                    {colony.posX}|{colony.posY}
                  </div>
                )}
              </div>
            </div>
            {colony.celestialObject.description && (
              <BbCodeText
                text={colony.celestialObject.description}
                className="mt-2 text-sm leading-relaxed text-swu-muted whitespace-pre-wrap"
              />
            )}
            {detail?.options?.colonyMessage && (
              <BbCodeText
                text={detail.options.colonyMessage}
                className="mt-2 rounded border border-swu-border/40 bg-swu-bg/50 px-2 py-1.5 text-sm leading-relaxed text-swu-muted whitespace-pre-wrap"
              />
            )}
          </div>
        )}
        {colony.starSystem && (
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex-1">
            <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
              Sternensystem
            </div>
            <div className="text-sm text-swu-primary">
              {colony.starSystem.name}
            </div>
            {colony.starSystem.cx != null && colony.starSystem.cy != null && (
              <div className="text-[10px] text-swu-muted font-mono">
                Sektor {colony.starSystem.cx}|{colony.starSystem.cy}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Population — STU-style */}
      {detail && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            Bevölkerung
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-5">
            <div>
              <div className="text-swu-muted text-[10px]">Gesamt</div>
              <div className="font-mono text-swu-primary">
                {detail.population.current}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Arbeiter</div>
              <div className="font-mono text-yellow-400">
                {detail.population.workers}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Verfügbar</div>
              <div className="font-mono text-green-400">
                {detail.population.available}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Wohnraum</div>
              <div className="font-mono text-swu-primary">
                {detail.population.housingFree ?? detail.population.housing} (
                {detail.population.housingMax ?? detail.population.max})
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Entwicklung</div>
              <div className="font-mono text-green-400">
                {formatSignedAmount(detail.population.growth)}
              </div>
            </div>
          </div>
        </div>
      )}

      {detail?.planetaryDefense && detail.planetaryDefense.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            Planetare Verteidigung
          </div>
          <div className="space-y-1 text-xs">
            {detail.planetaryDefense.map(
              (
                defense: NonNullable<
                  ColonyDetailV2['planetaryDefense']
                >[number],
              ) => (
                <div
                  key={`${defense.fieldIndex}-${defense.functionId}`}
                  className="flex justify-between"
                >
                  <span className="text-swu-muted">
                    Feld {defense.fieldIndex}: {defense.buildingName}
                  </span>
                  <span className="text-swu-primary">
                    {defense.functionName}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {detail?.deposits && detail.deposits.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            Vorkommen
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {detail.deposits.map(
              (deposit: NonNullable<ColonyDetailV2['deposits']>[number]) => (
                <div
                  key={deposit.commodityId}
                  className="flex justify-between gap-2"
                >
                  <span
                    className={
                      deposit.depleted ? 'text-red-400' : 'text-swu-muted'
                    }
                  >
                    {deposit.name}
                  </span>
                  <span className="font-mono text-swu-primary">
                    {deposit.amountLeft}
                    {deposit.delta !== 0 && (
                      <span
                        className={
                          deposit.delta < 0
                            ? 'text-red-400 ml-1'
                            : 'text-green-400 ml-1'
                        }
                      >
                        {formatSignedAmount(deposit.delta)}
                      </span>
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Effects (non-resource commodities only — resources shown in Lager) */}
      {detail &&
        (() => {
          const storageIds = new Set(
            (colony.storage || []).map((item) => item.commodityId),
          );
          const effects = detail.productionDeltas.filter(
            (delta) => !storageIds.has(delta.commodityId),
          );
          if (effects.length === 0) return null;
          return (
            <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
              <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
                Effekte
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {effects.map((d) => (
                  <div key={d.commodityId} className="flex justify-between">
                    <span className="text-swu-muted">{d.name}</span>
                    <span
                      className={
                        d.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {formatSignedAmount(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

// ─── Panel: Baumenü ──────────────────────────────────────────
