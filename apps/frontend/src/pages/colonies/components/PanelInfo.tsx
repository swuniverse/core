import { BbCodeText } from '../../../components/BbCodeText';
import { PlanetImg } from '../../../components/PlanetImg';
import type { SwuColonyEcosystem } from '../useSwuColonyEcosystem';
import {
  isColonyShielded,
  type Colony,
  type ColonyDetailV2,
} from '../types';
import { formatSignedAmount } from '../utils';
import { SettlementBadge } from '../../../lib/settlement-rating';

type PanelInfoProps = {
  colony: Colony;
  detail?: ColonyDetailV2;
  ecosystem: SwuColonyEcosystem | null;
};

export function PanelInfo({ colony, detail, ecosystem }: PanelInfoProps) {
  return (
    <div className="space-y-2">
      {/* Oekosystem-Legende - nur SWU-Kolonien (siehe useSwuColonyEcosystem) */}
      {ecosystem && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex items-center gap-3">
          {colony.celestialObject?.classId && (
            <PlanetImg
              classId={colony.celestialObject.classId}
              name={colony.celestialObject.name}
              objectType={colony.celestialObject.objectType}
              shielded={isColonyShielded(colony)}
              className="h-16 w-16 shrink-0 object-contain"
              emojiClassName="text-5xl"
            />
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            <span className="text-swu-muted">Ökosystem</span>
            <span className="text-swu-primary">
              {ecosystem.primaryBiome ?? 'Unbekannt'}
              {ecosystem.secondaryBiome ? ` / ${ecosystem.secondaryBiome}` : ''}
            </span>
            {ecosystem.temperatureRangeK && (
              <>
                <span className="text-swu-muted">Temperatur</span>
                <span className="text-swu-primary">
                  {Math.round(ecosystem.temperatureRangeK[0])} – {Math.round(ecosystem.temperatureRangeK[1])} K
                </span>
              </>
            )}
            <span className="text-swu-muted">Tagesdauer</span>
            <span className="text-swu-primary">
              {ecosystem.tidalLocked
                ? 'Gebundene Rotation (ewiger Tag / ewige Nacht)'
                : `${ecosystem.dayNightSwitchMinutes ?? '?'} Stunden`}
            </span>
            {ecosystem.tidalLocked && ecosystem.terminatorShiftHours != null && (
              <>
                <span className="text-swu-muted">Terminator</span>
                <span className="text-swu-primary">
                  pendelt alle {ecosystem.terminatorShiftHours} Stunden
                </span>
              </>
            )}
            {ecosystem.settlement && (
              <>
                <span className="text-swu-muted">Bedingungen</span>
                <span>
                  <SettlementBadge settlement={ecosystem.settlement} />
                </span>
              </>
            )}
            {ecosystem.solarOutputTJ != null && (
              <>
                <span className="text-swu-muted">Solareintrag</span>
                <span className="text-swu-accent">
                  {ecosystem.solarOutputTJ.toLocaleString('de-DE')} TJ
                </span>
              </>
            )}
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
                <PlanetImg
                  classId={colony.celestialObject.classId}
                  name={colony.celestialObject.name}
                  objectType={colony.celestialObject.objectType}
                  shielded={isColonyShielded(colony)}
                  className="w-10 h-10 object-contain"
                  emojiClassName="text-3xl"
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
      {detail?.defense?.shields && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            Schilde
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-swu-accent">
              {detail.defense.shields.current}/{detail.defense.shields.max}
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded border border-swu-border/60 bg-swu-bg">
              <div
                className="h-full bg-swu-accent transition-[width]"
                style={{
                  width: `${detail.defense.shields.max > 0 ? Math.min(100, Math.max(0, (detail.defense.shields.current / detail.defense.shields.max) * 100)) : 0}%`,
                }}
              />
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

      {detail?.asteroidExhausted && (
        <div className="border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
          Dieser Asteroid ist für deinen Account vollständig erschöpft. Weitere
          Abbaugebäude bleiben deaktiviert; eine spätere Neubesiedlung liefert
          keine Rohstoffe.
        </div>
      )}

      {detail?.deposits && detail.deposits.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-4 py-3">
          <div className="text-[11px] font-bold text-swu-muted uppercase tracking-wide mb-1.5">
            {colony.celestialObject?.objectType === 3
              ? 'Asteroidenlagerstätten · accountgebunden'
              : 'Vorkommen'}
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
                  <span className="font-mono">
                    {deposit.delta !== 0 && (
                      <span
                        className={
                          deposit.delta < 0 ? 'text-red-400' : 'text-green-400'
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
