import { useMemo } from 'react';
import { buildingImage, commodityImage } from '../../../lib/assets';
import type { BuildingDef, ColonyField } from '../types';
import { BMCOL_LABELS } from '../constants';
import {
  canAfford,
  formatBuildTime,
  formatSignedAmount,
  getEffectiveBuildingForField,
} from '../utils';
import { FloatingPanel } from './FloatingPanel';

export function PanelBuild({
  buildingDefs,
  fields,
  storage,
  commodityMap,
  selectedBuilding,
  hoveredBuildField,
  buildingMap,
  onSelectBuilding,
}: any) {
  const buildingsByColumn = useMemo(() => {
    const cols: Record<number, BuildingDef[]> = {};
    for (const b of buildingDefs) {
      if (b.id === 1) continue;
      const col = b.bmCol ?? 0;
      if (!cols[col]) cols[col] = [];
      cols[col].push(b);
    }
    for (const col of Object.keys(cols)) {
      cols[Number(col)].sort((a: BuildingDef, b: BuildingDef) =>
        a.name.localeCompare(b.name),
      );
    }
    return cols;
  }, [buildingDefs]);

  const detailBuilding =
    selectedBuilding && hoveredBuildField
      ? getEffectiveBuildingForField(
          selectedBuilding,
          hoveredBuildField,
          buildingMap,
        )
      : selectedBuilding;
  const isBonusPreview =
    !!selectedBuilding &&
    !!detailBuilding &&
    detailBuilding.id !== selectedBuilding.id;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Building List */}
      <div className="flex-1 min-w-0 space-y-2">
        {[1, 2, 3, 4].map((col) => {
          const colBuildings = buildingsByColumn[col] || [];
          if (colBuildings.length === 0) return null;
          return (
            <div
              key={col}
              className="bg-swu-surface border border-swu-border rounded"
            >
              <div className="px-3 py-1 border-b border-swu-border/50">
                <span className="text-[10px] font-bold text-swu-muted uppercase">
                  {BMCOL_LABELS[col]}
                </span>
              </div>
              <div className="divide-y divide-swu-border/20">
                {colBuildings.map((b: BuildingDef) => {
                  const affordable = canAfford(b, storage);
                  const isSelected = selectedBuilding?.id === b.id;
                  const alreadyBuilt =
                    b.isUnique &&
                    fields.some(
                      (f: ColonyField) =>
                        f.buildingId === b.id && !f.isBuilding,
                    );
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelectBuilding(b)}
                      disabled={alreadyBuilt}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-all ${isSelected ? 'bg-swu-accent/15 text-swu-accent' : alreadyBuilt ? 'opacity-40 cursor-not-allowed' : affordable ? 'hover:bg-swu-primary/5' : 'opacity-60'}`}
                    >
                      <img
                        src={buildingImage(b.id)}
                        alt=""
                        className="h-7 w-7 shrink-0 object-contain"
                        loading="lazy"
                      />
                      <span className="text-swu-primary truncate flex-1">
                        {b.name}
                      </span>
                      {!affordable && !alreadyBuilt && (
                        <span className="text-[9px] text-red-400">✕</span>
                      )}
                      {alreadyBuilt && (
                        <span className="text-[9px] text-swu-muted">
                          gebaut
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Building Detail - Floating */}
      {selectedBuilding && detailBuilding && (
        <FloatingPanel
          title={detailBuilding.name}
          startX={Math.round(window.innerWidth / 2 - 170)}
          startY={Math.round(window.innerHeight / 2 - 200)}
          onClose={() => onSelectBuilding(selectedBuilding)}
        >
          <div className="text-xs space-y-2">
            <div className="font-bold text-swu-accent">
              {detailBuilding.name}
            </div>
            {isBonusPreview && (
              <div className="text-[10px] font-bold text-yellow-400">
                Bonusfeld-Version von {selectedBuilding.name}
              </div>
            )}
            {detailBuilding.description && (
              <div className="text-[10px] text-swu-muted">
                {detailBuilding.description}
              </div>
            )}
            {detailBuilding.functions &&
              detailBuilding.functions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detailBuilding.functions.map((functionId: number) => (
                    <span
                      key={functionId}
                      className="px-1.5 py-0.5 rounded border border-swu-border/60 bg-swu-bg/50 text-[10px] text-swu-primary"
                    >
                      Funktion #{functionId}
                    </span>
                  ))}
                </div>
              )}
            <div>
              <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                Baukosten
              </div>
              {(selectedBuilding.epsCost || 0) > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                    <span>⚡</span>
                    <span className="truncate">Energie</span>
                  </span>
                  <span className="text-swu-primary">
                    {selectedBuilding.epsCost}
                  </span>
                </div>
              )}
              {(selectedBuilding.resourceCosts || [])
                .filter((c: any) => c.amount > 0)
                .map((c: any) => {
                  const avail =
                    storage.find((s: any) => s.commodityId === c.commodityId)
                      ?.amount || 0;
                  const commodity = commodityMap[c.commodityId];
                  return (
                    <div
                      key={c.commodityId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                        <img
                          src={commodityImage(c.commodityId, commodity?.name)}
                          alt=""
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                        <span className="truncate">
                          {commodity?.nameShort || commodity?.name || '?'}
                        </span>
                      </span>
                      <span
                        className={
                          avail >= c.amount
                            ? 'text-swu-primary'
                            : 'text-red-400'
                        }
                      >
                        {c.amount}
                        {avail < c.amount && ` (${avail})`}
                      </span>
                    </div>
                  );
                })}
            </div>
            {((detailBuilding.bevUse || 0) > 0 ||
              (detailBuilding.bevPro || 0) > 0 ||
              detailBuilding.bonuses.storage !== 0) && (
              <div>
                <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                  Auswirkungen
                </div>
                {(detailBuilding.bevUse || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">👤 Arbeiter</span>
                    <span className="text-red-400">
                      -{detailBuilding.bevUse}
                    </span>
                  </div>
                )}
                {(detailBuilding.bevPro || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">🏠 Wohnraum</span>
                    <span className="text-green-400">
                      +{detailBuilding.bevPro}
                    </span>
                  </div>
                )}
                {detailBuilding.bonuses.storage !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">📦 Lager</span>
                    <span
                      className={
                        detailBuilding.bonuses.storage > 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {formatSignedAmount(detailBuilding.bonuses.storage)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {((detailBuilding.epsProc || 0) !== 0 ||
              detailBuilding.production.length > 0) && (
              <div>
                <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                  Produktion
                </div>
                {(detailBuilding.epsProc || 0) !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">⚡ Energie</span>
                    <span
                      className={
                        (detailBuilding.epsProc || 0) < 0
                          ? 'text-red-400'
                          : 'text-green-400'
                      }
                    >
                      {formatSignedAmount(detailBuilding.epsProc || 0)}/Tick
                    </span>
                  </div>
                )}
                {detailBuilding.production.map((p: any) => {
                  const commodity = commodityMap[p.commodityId];
                  return (
                    <div
                      key={p.commodityId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                        <img
                          src={commodityImage(p.commodityId, commodity?.name)}
                          alt=""
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                        <span className="truncate">
                          {commodity?.name || '?'}
                        </span>
                      </span>
                      <span
                        className={
                          p.amount < 0 ? 'text-red-400' : 'text-green-400'
                        }
                      >
                        {formatSignedAmount(p.amount)}/Tick
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-swu-muted">
              Bauzeit: {formatBuildTime(selectedBuilding.costs.buildTime || 0)}
            </div>
            <div className="text-[10px] text-swu-accent font-bold">
              ← Feld im Grid klicken zum Platzieren
            </div>
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
