import { useMemo, useState } from 'react';
import { buildingImage, commodityImage } from '../../../lib/assets';
import type {
  BuildingDef,
  ColonyField,
  ColonyStorageItem,
  CommodityDef,
} from '../types';
import { BMCOL_LABELS } from '../constants';
import { canAfford, formatSignedAmount } from '../utils';

const BUILDING_COLUMNS = [1, 2, 3, 4] as const;

type CategoryKey = 'all' | (typeof BUILDING_COLUMNS)[number];

type PanelBuildProps = {
  buildingDefs: BuildingDef[];
  fields: ColonyField[];
  storage: ColonyStorageItem[];
  commodityMap: Record<number, CommodityDef>;
  selectedBuilding: BuildingDef | null;
  onSelectBuilding: (building: BuildingDef) => void;
};

function getPrimaryEffect(
  building: BuildingDef,
  commodityMap: Record<number, CommodityDef>,
): { label: string; tone: string } | null {
  const energy = building.epsProc || 0;
  if (energy !== 0) {
    return {
      label: `⚡ ${formatSignedAmount(energy)}/Tick`,
      tone: energy > 0 ? 'text-green-400' : 'text-red-400',
    };
  }
  if ((building.bevPro || 0) > 0) {
    return { label: `🏠 +${building.bevPro}`, tone: 'text-green-400' };
  }
  if ((building.bevUse || 0) > 0) {
    return { label: `👤 -${building.bevUse}`, tone: 'text-red-400' };
  }
  if (building.bonuses.storage !== 0) {
    return {
      label: `📦 ${formatSignedAmount(building.bonuses.storage)}`,
      tone: building.bonuses.storage > 0 ? 'text-green-400' : 'text-red-400',
    };
  }
  const production = building.production.find((entry) => entry.amount !== 0);
  if (production) {
    const name =
      commodityMap[production.commodityId]?.nameShort ||
      commodityMap[production.commodityId]?.name ||
      `Ware #${production.commodityId}`;
    return {
      label: `${name} ${formatSignedAmount(production.amount)}/Tick`,
      tone: production.amount > 0 ? 'text-green-400' : 'text-red-400',
    };
  }
  return null;
}

function getMissingCostLabel(
  building: BuildingDef,
  storage: ColonyStorageItem[],
  commodityMap: Record<number, CommodityDef>,
): string | null {
  const missing = (building.resourceCosts || [])
    .filter((cost) => cost.amount > 0)
    .map((cost) => {
      const available =
        storage.find((item) => item.commodityId === cost.commodityId)?.amount ||
        0;
      return {
        commodityId: cost.commodityId,
        amount: Math.max(0, cost.amount - available),
      };
    })
    .filter((entry) => entry.amount > 0);

  if (missing.length === 0) return null;
  const first = missing[0];
  const name =
    commodityMap[first.commodityId]?.nameShort ||
    commodityMap[first.commodityId]?.name ||
    `Ware #${first.commodityId}`;
  return missing.length > 1
    ? `Fehlt ${first.amount} ${name} +${missing.length - 1}`
    : `Fehlt ${first.amount} ${name}`;
}

export function PanelBuild({
  buildingDefs,
  fields,
  storage,
  commodityMap,
  selectedBuilding,
  onSelectBuilding,
}: PanelBuildProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');

  const buildingsByColumn = useMemo(() => {
    const cols: Record<number, BuildingDef[]> = {};
    for (const building of buildingDefs) {
      if (building.id === 1) continue;
      const col = building.bmCol ?? 0;
      if (!cols[col]) cols[col] = [];
      cols[col].push(building);
    }
    for (const col of Object.keys(cols)) {
      cols[Number(col)].sort((a, b) => {
        const aAffordable = canAfford(a, storage) ? 0 : 1;
        const bAffordable = canAfford(b, storage) ? 0 : 1;
        if (aAffordable !== bAffordable) return aAffordable - bAffordable;
        return a.name.localeCompare(b.name, 'de');
      });
    }
    return cols;
  }, [buildingDefs, storage]);

  const visibleBuildings = useMemo(() => {
    if (activeCategory === 'all') {
      return BUILDING_COLUMNS.flatMap(
        (column) => buildingsByColumn[column] || [],
      );
    }
    return buildingsByColumn[activeCategory] || [];
  }, [activeCategory, buildingsByColumn]);

  return (
    <div className="rounded border border-swu-border bg-swu-surface p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-swu-muted">
            Baumenü
          </div>
          <div className="text-sm text-swu-primary">
            Gebäude auswählen und auf der Karte platzieren
          </div>
        </div>
        {selectedBuilding && (
          <div className="rounded border border-swu-accent/40 bg-swu-accent/10 px-2 py-1 text-[10px] font-bold text-swu-accent">
            {selectedBuilding.name}
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`rounded border px-2 py-1 text-[10px] transition-colors ${
            activeCategory === 'all'
              ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
              : 'border-swu-border/60 text-swu-muted hover:text-swu-primary'
          }`}
        >
          Alle {visibleBuildings.length}
        </button>
        {BUILDING_COLUMNS.map((column) => {
          const count = buildingsByColumn[column]?.length ?? 0;
          return (
            <button
              key={column}
              onClick={() => setActiveCategory(column)}
              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                activeCategory === column
                  ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                  : 'border-swu-border/60 text-swu-muted hover:text-swu-primary'
              }`}
            >
              {BMCOL_LABELS[column]} {count}
            </button>
          );
        })}
      </div>

      {visibleBuildings.length === 0 ? (
        <div className="rounded border border-swu-border/40 bg-swu-bg/30 px-3 py-2 text-xs text-swu-muted">
          Keine Gebäude verfügbar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {visibleBuildings.map((building) => {
            const affordable = canAfford(building, storage);
            const isSelected = selectedBuilding?.id === building.id;
            const alreadyBuilt =
              building.isUnique &&
              fields.some(
                (field) =>
                  field.buildingId === building.id && !field.isBuilding,
              );
            const effect = getPrimaryEffect(building, commodityMap);
            const missingLabel = getMissingCostLabel(
              building,
              storage,
              commodityMap,
            );

            return (
              <button
                key={building.id}
                onClick={() => onSelectBuilding(building)}
                disabled={alreadyBuilt}
                title={building.name}
                aria-label={building.name}
                className={`min-h-[104px] rounded border p-2 text-left transition-all ${
                  isSelected
                    ? 'border-swu-accent bg-swu-accent/12 shadow-[0_0_0_1px_rgba(194,185,66,0.2)]'
                    : alreadyBuilt
                      ? 'border-swu-border/40 bg-swu-bg/20 opacity-45 cursor-not-allowed'
                      : affordable
                        ? 'border-swu-border/60 bg-swu-bg/30 hover:border-swu-accent/60 hover:bg-swu-primary/5'
                        : 'border-red-500/30 bg-red-950/10 opacity-75 hover:border-red-400/50'
                }`}
              >
                <div className="flex gap-3">
                  <img
                    src={buildingImage(building.id)}
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-bold text-swu-primary">
                      {building.name}
                    </div>
                    {effect && (
                      <div
                        className={`mt-1 truncate text-xs font-mono ${effect.tone}`}
                      >
                        {effect.label}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {alreadyBuilt ? (
                        <span className="rounded border border-swu-border/50 px-1.5 py-0.5 text-[10px] text-swu-muted">
                          Einzigartig gebaut
                        </span>
                      ) : affordable ? (
                        <span className="rounded border border-green-400/30 bg-green-900/20 px-1.5 py-0.5 text-[10px] text-green-400">
                          Baubar
                        </span>
                      ) : (
                        <span className="rounded border border-red-400/30 bg-red-900/20 px-1.5 py-0.5 text-[10px] text-red-400">
                          {missingLabel ?? 'Nicht baubar'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
