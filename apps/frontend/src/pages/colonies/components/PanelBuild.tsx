import { useMemo } from 'react';
import { buildingImage } from '../../../lib/assets';
import type {
  BuildingDef,
  ColonyField,
  ColonyStorageItem,
  CommodityDef,
} from '../types';
import { BMCOL_LABELS } from '../constants';
import { canAfford } from '../utils';

// STU build menu column order: Soziales, Industrie, Infrastruktur, Energie.
const BUILDING_COLUMNS = [1, 2, 3, 4] as const;

type PanelBuildProps = {
  sandboxMode?: boolean;
  buildingDefs: BuildingDef[];
  fields: ColonyField[];
  storage: ColonyStorageItem[];
  energy: number;
  commodityMap: Record<number, CommodityDef>;
  selectedBuilding: BuildingDef | null;
  fieldFilter?: { field: ColonyField; label: string } | null;
  commodityFilterId?: number | null;
  onClearFieldFilter?: () => void;
  onClearCommodityFilter?: () => void;
  onSelectBuilding: (building: BuildingDef) => void;
};

function getMissingCostLabel(
  building: BuildingDef,
  storage: ColonyStorageItem[],
  commodityMap: Record<number, CommodityDef>,
  energy: number,
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

  if (missing.length === 0 && energy < (building.epsCost || 0)) {
    return `Fehlt ${(building.epsCost || 0) - energy} Energie`;
  }
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
  sandboxMode = false,
  buildingDefs,
  fields,
  storage,
  energy,
  commodityMap,
  selectedBuilding,
  fieldFilter = null,
  commodityFilterId = null,
  onClearFieldFilter,
  onClearCommodityFilter,
  onSelectBuilding,
}: PanelBuildProps) {
  const buildingsByColumn = useMemo(() => {
    const cols: Record<number, BuildingDef[]> = {};
    for (const building of buildingDefs) {
      if (building.id === 1) continue;
      if (
        fieldFilter &&
        !building.allowedFieldTypes.includes(fieldFilter.field.fieldType) &&
        !building.allowedFieldTypes.includes(
          fieldFilter.field.terrainTileId ?? fieldFilter.field.fieldType,
        )
      ) {
        continue;
      }
      if (
        commodityFilterId != null &&
        !building.production.some(
          (production) =>
            production.commodityId === commodityFilterId && production.amount > 0,
        )
      ) {
        continue;
      }
      const col = building.bmCol ?? 0;
      if (!cols[col]) cols[col] = [];
      cols[col].push(building);
    }
    for (const col of Object.keys(cols)) {
      cols[Number(col)].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    }
    return cols;
  }, [buildingDefs, commodityFilterId, fieldFilter]);

  return (
    <section className="border border-swu-border bg-swu-surface p-2">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
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

      {(fieldFilter || commodityFilterId != null) && (
        <div className="mb-2 flex flex-wrap gap-1" aria-label="Baumenü-Filter">
          {fieldFilter && (
            <button
              type="button"
              onClick={onClearFieldFilter}
              className="rounded border border-swu-accent/50 bg-swu-accent/10 px-2 py-1 text-[10px] text-swu-accent"
              aria-label={`Feldfilter ${fieldFilter.field.fieldIndex} entfernen`}
            >
              Feld {fieldFilter.field.fieldIndex}: {fieldFilter.label} ×
            </button>
          )}
          {commodityFilterId != null && (
            <button
              type="button"
              onClick={onClearCommodityFilter}
              className="rounded border border-swu-accent/50 bg-swu-accent/10 px-2 py-1 text-[10px] text-swu-accent"
              aria-label="Warenfilter entfernen"
            >
              Ware:{' '}
              {commodityMap[commodityFilterId]?.nameShort ||
                commodityMap[commodityFilterId]?.name ||
                `#${commodityFilterId}`}{' '}
              ×
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {BUILDING_COLUMNS.map((column) => {
          const buildings = buildingsByColumn[column] ?? [];
          return (
            <div key={column} className="min-w-0">
              <h3 className="mb-1 text-center text-sm text-swu-primary">
                {BMCOL_LABELS[column]}{' '}
                <span className="text-[10px] text-swu-muted">
                  {buildings.length}
                </span>
              </h3>
              <div className="h-[32rem] overflow-y-auto border border-swu-border/50 p-1">
                {buildings.length === 0 ? (
                  <p className="p-2 text-center text-xs text-swu-muted">
                    Keine Gebäude verfügbar.
                  </p>
                ) : (
                  buildings.map((building) => {
                    const affordable =
                      sandboxMode || canAfford(building, storage, energy);
                    const isSelected = selectedBuilding?.id === building.id;
                    const alreadyBuilt =
                      building.isUnique &&
                      fields.some(
                        (field) =>
                          field.buildingId === building.id && !field.isBuilding,
                      );
                    const hint = alreadyBuilt
                      ? 'Einzigartig gebaut'
                      : affordable
                        ? null
                        : (getMissingCostLabel(
                            building,
                            storage,
                            commodityMap,
                            energy,
                          ) ?? 'Nicht baubar');

                    return (
                      <button
                        key={building.id}
                        type="button"
                        onClick={() => onSelectBuilding(building)}
                        disabled={alreadyBuilt}
                        title={hint ? `${building.name} – ${hint}` : building.name}
                        aria-label={building.name}
                        className={`flex w-full flex-col items-center border px-1 py-1.5 text-center transition-colors ${
                          isSelected
                            ? 'border-swu-accent bg-swu-accent/10'
                            : alreadyBuilt
                              ? 'cursor-not-allowed border-transparent opacity-40'
                              : 'border-transparent hover:border-swu-accent/60'
                        }`}
                      >
                        <img
                          src={buildingImage(building.id)}
                          alt=""
                          className={`h-16 w-16 object-contain ${
                            affordable || alreadyBuilt ? '' : 'opacity-50'
                          }`}
                          loading="lazy"
                        />
                        <span
                          className={`mt-0.5 line-clamp-2 text-xs ${
                            affordable || alreadyBuilt
                              ? 'text-swu-primary'
                              : 'text-red-400'
                          }`}
                        >
                          {building.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
