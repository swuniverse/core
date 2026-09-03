import { buildingImage, commodityImage } from '../../../lib/assets';
import type { BuildingDef, ColonyField, ColonyStorageItem, CommodityDef } from '../types';
import {
  formatBuildTime,
  formatSignedAmount,
  getEffectiveBuildingForField,
  maxAffordable,
} from '../utils';

const getCommodityLabel = (
  commodityMap: Record<number, CommodityDef>,
  commodityId: number,
) =>
  commodityMap[commodityId]?.name ||
  commodityMap[commodityId]?.nameShort ||
  `Ware #${commodityId}`;

export function BuildInspector({
  selectedBuilding,
  hoveredBuildField,
  buildingMap,
  commodityMap,
  storage,
  deactivateAfterBuild,
  onDeactivateAfterBuildChange,
  onClearSelection,
}: {
  selectedBuilding: BuildingDef | null;
  hoveredBuildField: ColonyField | null;
  buildingMap: Record<number, BuildingDef>;
  commodityMap: Record<number, CommodityDef>;
  storage: ColonyStorageItem[];
  deactivateAfterBuild: boolean;
  onDeactivateAfterBuildChange: (value: boolean) => void;
  onClearSelection: () => void;
}) {
  if (!selectedBuilding) return null;

  const detailBuilding = hoveredBuildField
    ? getEffectiveBuildingForField(selectedBuilding, hoveredBuildField, buildingMap)
    : selectedBuilding;
  const isBonusPreview = detailBuilding.id !== selectedBuilding.id;
  const buildableCount = maxAffordable(selectedBuilding, storage);

  return (
    <aside className="rounded border border-swu-accent/50 bg-swu-surface px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-swu-muted">
            Bau-Inspektor
          </div>
          <div className="mt-0.5 text-base font-bold text-swu-accent">
            {detailBuilding.name}
          </div>
          {isBonusPreview && (
            <div className="text-xs font-bold text-yellow-400">
              Bonusfeld-Version von {selectedBuilding.name}
            </div>
          )}
        </div>
        <button
          onClick={onClearSelection}
          className="text-sm text-swu-muted hover:text-swu-primary"
          aria-label="Gebäudeauswahl schließen"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <img
          src={buildingImage(detailBuilding.id)}
          alt=""
          className="h-14 w-14 object-contain"
          loading="lazy"
        />
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-swu-muted">Baubar</span>
            <span className="font-mono font-bold text-swu-accent">
              {buildableCount === Infinity ? '∞' : buildableCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-swu-muted">
            {hoveredBuildField
              ? `Vorschau für Feld ${hoveredBuildField.fieldIndex}`
              : 'Wähle ein markiertes Feld auf der Karte.'}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <section className="border-t border-swu-border/40 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-swu-muted">
            <span>Baukosten</span>
            <span>Vorh. / Benöt.</span>
          </div>
          <div className="space-y-1 text-sm">
            {(selectedBuilding.epsCost || 0) > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-swu-muted">⚡ Energie</span>
                <span className="font-mono text-swu-primary">{selectedBuilding.epsCost}</span>
              </div>
            )}
            {(selectedBuilding.resourceCosts || [])
              .filter((cost) => cost.amount > 0)
              .map((cost) => {
                const available =
                  storage.find((item) => item.commodityId === cost.commodityId)?.amount || 0;
                const commodity = commodityMap[cost.commodityId];
                return (
                  <div key={cost.commodityId} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                      <img
                        src={commodityImage(cost.commodityId, commodity?.name)}
                        alt=""
                        className="h-4 w-4 object-contain"
                        loading="lazy"
                      />
                      <span className="truncate">{getCommodityLabel(commodityMap, cost.commodityId)}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <span className={available >= cost.amount ? 'text-swu-primary' : 'text-red-400'}>
                        {available} / {cost.amount}
                      </span>
                      {available < cost.amount && (
                        <span className="rounded bg-red-400/10 px-1 text-[10px] text-red-400">
                          -{cost.amount - available}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>

        {((detailBuilding.bevUse || 0) > 0 ||
          (detailBuilding.bevPro || 0) > 0 ||
          detailBuilding.bonuses.storage !== 0) && (
          <section className="border-t border-swu-border/40 pt-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-swu-muted">
              Auswirkungen
            </div>
            <div className="space-y-1 text-sm">
              {(detailBuilding.bevUse || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">👤 Arbeiter</span>
                  <span className="text-red-400">-{detailBuilding.bevUse}</span>
                </div>
              )}
              {(detailBuilding.bevPro || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">🏠 Wohnraum</span>
                  <span className="text-green-400">+{detailBuilding.bevPro}</span>
                </div>
              )}
              {detailBuilding.bonuses.storage !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">📦 Lager</span>
                  <span className={detailBuilding.bonuses.storage > 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatSignedAmount(detailBuilding.bonuses.storage)}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {((detailBuilding.epsProc || 0) !== 0 || detailBuilding.production.length > 0) && (
          <section className="border-t border-swu-border/40 pt-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-swu-muted">
              Produktion
            </div>
            <div className="space-y-1 text-sm">
              {(detailBuilding.epsProc || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">⚡ Energie</span>
                  <span className={(detailBuilding.epsProc || 0) < 0 ? 'text-red-400' : 'text-green-400'}>
                    {formatSignedAmount(detailBuilding.epsProc || 0)}/Tick
                  </span>
                </div>
              )}
              {detailBuilding.production.map((production) => {
                const commodity = commodityMap[production.commodityId];
                return (
                  <div key={production.commodityId} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                      <img
                        src={commodityImage(production.commodityId, commodity?.name)}
                        alt=""
                        className="h-4 w-4 object-contain"
                        loading="lazy"
                      />
                      <span className="truncate">{getCommodityLabel(commodityMap, production.commodityId)}</span>
                    </span>
                    <span className={production.amount < 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatSignedAmount(production.amount)}/Tick
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <label className="flex cursor-pointer items-start gap-2 border-t border-swu-border/40 pt-3 text-xs text-swu-primary">
          <input
            type="checkbox"
            aria-label="Nach Fertigstellung deaktivieren"
            checked={deactivateAfterBuild}
            onChange={(event) => onDeactivateAfterBuildChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-swu-accent"
          />
          <span>
            <span className="block font-bold">Nach Fertigstellung deaktivieren</span>
            <span className="text-swu-muted">Gebäude wird nach dem Bau nicht automatisch aktiviert.</span>
          </span>
        </label>

        <div className="flex items-center justify-between gap-2 border-t border-swu-border/40 pt-3 text-xs">
          <span className="text-swu-muted">Bauzeit</span>
          <span className="font-mono text-swu-primary">
            {formatBuildTime(selectedBuilding.costs.buildTime || 0)}
          </span>
        </div>
        <div className="rounded border border-swu-accent/30 bg-swu-accent/10 px-2 py-1.5 text-xs font-bold text-swu-accent">
          ← Markiertes Feld auf der Karte klicken zum Platzieren
        </div>
      </div>
    </aside>
  );
}
