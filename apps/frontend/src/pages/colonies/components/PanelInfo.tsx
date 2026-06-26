import { planetImage } from '../../../lib/assets';
import { FIELD_TYPE_NAMES, TILE_TYPE_NAMES } from '../constants';
import type { ColonyDetailV2, TerraformingDef } from '../types';
import { formatSignedAmount } from '../utils';

export function PanelInfo({
  colony,
  detail,
  selectedField,
  buildingMap,
  commodityMap,
  terraformingDefs,
  onTerraform,
}: any) {
  return (
    <div className="space-y-2">
      {/* Field info if selected (empty or building-in-progress fields only — completed buildings open modal) */}
      {selectedField && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
          <div className="font-bold text-swu-primary">
            Feld #{selectedField.fieldIndex}
          </div>
          <div className="text-swu-muted">
            Terrain:{' '}
            {TILE_TYPE_NAMES[
              selectedField.terrainTileId ?? selectedField.fieldType
            ] ||
              FIELD_TYPE_NAMES[selectedField.fieldType] ||
              '?'}
          </div>
          {!selectedField.buildingId && !selectedField.terraformingId && (
            <div className="pt-2 border-t border-swu-border/40 space-y-1">
              <div className="text-[10px] text-swu-muted uppercase font-bold">
                Terraforming
              </div>
              {terraformingDefs
                .filter(
                  (option: TerraformingDef) =>
                    option.fromFieldType === selectedField.fieldType,
                )
                .map((option: TerraformingDef) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      onTerraform(selectedField.fieldIndex, option.id)
                    }
                    className="w-full text-left px-2 py-1 rounded border border-swu-border/60 hover:border-swu-accent text-[10px]"
                  >
                    <span className="text-swu-primary">
                      {option.description}
                    </span>
                    <span className="ml-2 text-swu-muted">
                      →{' '}
                      {FIELD_TYPE_NAMES[option.toFieldType] ||
                        option.toFieldType}
                    </span>
                    {option.costs.length > 0 && (
                      <span className="ml-2 text-swu-muted">
                        Kosten:{' '}
                        {option.costs
                          .map(
                            (cost: { commodityId: number; amount: number }) =>
                              `${cost.amount} ${commodityMap[cost.commodityId]?.name || cost.commodityId}`,
                          )
                          .join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              {terraformingDefs.filter(
                (option: TerraformingDef) =>
                  option.fromFieldType === selectedField.fieldType,
              ).length === 0 && (
                <div className="text-[10px] text-swu-muted">
                  Keine Optionen verfügbar
                </div>
              )}
            </div>
          )}
          {selectedField.terraformingId && (
            <div className="text-yellow-400">
              Terraforming läuft bis{' '}
              {selectedField.terraformingFinishesAt || '?'}
            </div>
          )}
          {selectedField.buildingId && selectedField.isBuilding && (
            <div>
              Gebäude:{' '}
              <span className="text-swu-accent">
                {buildingMap[selectedField.buildingId]?.name ||
                  `#${selectedField.buildingId}`}
              </span>
              <span className="text-yellow-400 ml-1">(im Bau)</span>
            </div>
          )}
        </div>
      )}

      {/* Orbit Ships */}
      {detail?.orbitShips.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Schiffe im Orbit
          </div>
          <div className="space-y-0.5 text-xs">
            {detail.orbitShips.map((s: any) => (
              <div key={s.id} className="flex justify-between gap-2">
                <span className="text-swu-primary">{s.name}</span>
                <span className="text-swu-muted">
                  {s.status} · Crew {s.crew}/{s.crewRequired}
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
            <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
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
              <div className="text-xs">
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
          </div>
        )}
        {colony.starSystem && (
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex-1">
            <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
              Sternensystem
            </div>
            <div className="text-xs text-swu-primary">
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

      {detail?.effectiveState && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Ökonomie
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-swu-muted">EPS</span>{' '}
              <span className="font-mono text-yellow-400">
                {detail.effectiveState.energy.current}/
                {detail.effectiveState.energy.max} (
                {formatSignedAmount(detail.effectiveState.energy.delta)})
              </span>
            </div>
            <div>
              <span className="text-swu-muted">Lager frei</span>{' '}
              <span className="font-mono text-swu-primary">
                {detail.effectiveState.storage.free}/
                {detail.effectiveState.storage.max}
              </span>
            </div>
            <div>
              <span className="text-swu-muted">EPS Produktion</span>{' '}
              <span className="font-mono text-green-400">
                +{detail.effectiveState.energy.production}
              </span>
            </div>
            <div>
              <span className="text-swu-muted">EPS Verbrauch</span>{' '}
              <span className="font-mono text-red-400">
                -{detail.effectiveState.energy.consumption}
              </span>
            </div>
            <div>
              <span className="text-swu-muted">Orbitalwartung</span>{' '}
              <span
                className={
                  detail.effectiveState.orbitalMaintenance.balance >= 0
                    ? 'font-mono text-swu-primary'
                    : 'font-mono text-red-400'
                }
              >
                +{detail.effectiveState.orbitalMaintenance.production}/-
                {detail.effectiveState.orbitalMaintenance.consumption} ={' '}
                {detail.effectiveState.orbitalMaintenance.balance}
              </span>
            </div>
          </div>
          {detail.activeFunctions && detail.activeFunctions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {detail.activeFunctions.map(
                (
                  fn: NonNullable<ColonyDetailV2['activeFunctions']>[number],
                ) => (
                  <span
                    key={fn.id}
                    className="px-1.5 py-0.5 rounded border border-swu-border/60 bg-swu-bg/50 text-[10px] text-swu-primary"
                    title={fn.key}
                  >
                    {fn.name}
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Population — STU-style */}
      {detail && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Bevölkerung
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
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
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Planetare Verteidigung
          </div>
          <div className="space-y-0.5 text-[10px]">
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
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Vorkommen
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
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
            (colony.storage || []).map((s: any) => s.commodityId),
          );
          const effects =
            detail.effectiveState?.production.effects ??
            detail.productionDeltas.filter(
              (d: any) => !storageIds.has(d.commodityId),
            );
          if (effects.length === 0) return null;
          return (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
              <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
                Effekte
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                {effects.map((d: any) => (
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
