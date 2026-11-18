import { commodityImage } from '../../../lib/assets';
import type { BuildingRepairPlan, CommodityDef } from '../types';

type RepairCost = BuildingRepairPlan['costs'][number];

export function hasRepairCostShortage({
  energyCost,
  costs,
  energyAvailable,
  storageAmounts,
}: {
  energyCost: number;
  costs: RepairCost[];
  energyAvailable: number;
  storageAmounts: Record<number, number>;
}): boolean {
  return (
    energyAvailable < energyCost ||
    costs.some(
      (cost) => (storageAmounts[cost.commodityId] ?? 0) < cost.amount,
    )
  );
}

export function repairErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Reparatur fehlgeschlagen';
  const exactTranslations: Record<string, string> = {
    'Field not found': 'Feld nicht gefunden',
    'Colony not found': 'Kolonie nicht gefunden',
    'No completed building on this field':
      'Auf diesem Feld steht kein fertiges Gebäude',
    'Building is not damaged': 'Gebäude ist nicht beschädigt',
    'Building is not repairable': 'Gebäude ist nicht reparierbar',
    'Not enough resources in colony storage':
      'Nicht genügend Waren im Kolonielager',
    'Cannot repair orbital buildings while colony is blockaded':
      'Orbitalgebäude können während einer Blockade nicht repariert werden',
  };
  if (exactTranslations[message]) return exactTranslations[message];

  const shortage = message.match(
    /^Not enough (.+): need ([\d.,]+), have ([\d.,]+)$/i,
  );
  if (shortage) {
    const resource = /^energy$/i.test(shortage[1])
      ? 'Energie'
      : shortage[1].replace(/^resource #/i, 'Ware #');
    return `Nicht genug ${resource}: benötigt ${shortage[2]}, vorhanden ${shortage[3]}`;
  }

  return message;
}

export function RepairCostList({
  energyCost,
  costs,
  energyAvailable,
  storageAmounts,
  commodityMap,
}: {
  energyCost: number;
  costs: RepairCost[];
  energyAvailable: number;
  storageAmounts: Record<number, number>;
  commodityMap: Record<number, CommodityDef>;
}) {
  return (
    <div className="space-y-1" aria-label="Reparaturkosten verfügbar / benötigt">
      <CostRow
        label="Energie"
        image="/assets/buttons/e_trans2.png"
        available={energyAvailable}
        needed={energyCost}
      />
      {costs.map((cost) => {
        const commodity = commodityMap[cost.commodityId];
        const name =
          commodity?.name || commodity?.nameShort || `Ware #${cost.commodityId}`;
        return (
          <CostRow
            key={cost.commodityId}
            label={name}
            image={commodityImage(cost.commodityId, commodity?.name)}
            available={storageAmounts[cost.commodityId] ?? 0}
            needed={cost.amount}
          />
        );
      })}
    </div>
  );
}

function CostRow({
  label,
  image,
  available,
  needed,
}: {
  label: string;
  image: string;
  available: number;
  needed: number;
}) {
  const shortage = available < needed;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
        <img src={image} alt={label} className="h-4 w-4 object-contain" />
        <span className="truncate">{label}</span>
      </span>
      <span className={shortage ? 'font-mono text-red-400' : 'font-mono text-swu-primary'}>
        {available} / {needed}
      </span>
    </div>
  );
}
