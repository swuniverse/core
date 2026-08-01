import { useMemo, useState } from 'react';
import type {
  ColonyDetailV2,
  ColonyEffectiveFunction,
  CommodityDef,
} from '../types';
import { formatBuildTime } from '../utils';

// ─── Panel: Fabrikation ──────────────────────────────────────

type FabricationCatalogItem = NonNullable<
  ColonyDetailV2['fabricationCatalog']
>[number];

type ShipyardGroupKey = NonNullable<FabricationCatalogItem['shipyardGroup']>;
type ShipyardTypeKey = NonNullable<FabricationCatalogItem['shipyardType']>;
type FabricationGroupKey = ShipyardGroupKey | 'TORPEDO' | 'OTHER';
type FabricationTypeKey = ShipyardTypeKey | FabricationGroupKey;

const GROUP_ORDER: FabricationGroupKey[] = [
  'CORE_SYSTEMS',
  'DEFENSE_SYSTEMS',
  'OFFENSE_SYSTEMS',
  'TORPEDO',
  'OTHER',
];

const GROUP_LABELS: Record<FabricationGroupKey, string> = {
  CORE_SYSTEMS: 'Hauptsysteme',
  DEFENSE_SYSTEMS: 'Defensivsysteme',
  OFFENSE_SYSTEMS: 'Offensivsysteme',
  TORPEDO: 'Torpedos',
  OTHER: 'Sonstige Fertigung',
};

const TYPE_ORDER: ShipyardTypeKey[] = [
  'HULL',
  'SHIELDS',
  'COMPUTER',
  'SUBLIGHT_DRIVE',
  'SENSORS',
  'HYPERDRIVE',
  'REACTOR',
  'EPS',
  'ENERGY_WEAPON',
  'TORPEDO_BANK',
  'SPECIAL',
];

const TYPE_LABELS: Record<ShipyardTypeKey, string> = {
  HULL: 'Hülle',
  SHIELDS: 'Schilde',
  COMPUTER: 'Computer',
  SUBLIGHT_DRIVE: 'Antrieb',
  SENSORS: 'Sensoren',
  HYPERDRIVE: 'Hyperdrive',
  REACTOR: 'Reaktor',
  EPS: 'EPS-Leistung',
  ENERGY_WEAPON: 'Energiewaffe',
  TORPEDO_BANK: 'Torpedobank',
  SPECIAL: 'Spezial',
};

const FACTION_LABELS: Record<string, string> = {
  REBEL_ALLIANCE: 'Rebellen-exklusiv',
  GALACTIC_EMPIRE: 'Imperium-exklusiv',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Stufe I',
  2: 'Stufe II',
  3: 'Stufe III',
  4: 'Stufe IV',
};

function getGroupKey(item: FabricationCatalogItem): FabricationGroupKey {
  if (item.queueType === 'TORPEDO') return 'TORPEDO';
  return item.shipyardGroup ?? 'OTHER';
}

function getTierSort(item: FabricationCatalogItem): number {
  return item.moduleTier ?? item.moduleClass ?? item.moduleLevel ?? 0;
}

function getTierLabel(item: FabricationCatalogItem): string {
  const tier = item.moduleTier;
  const classLabel = item.moduleClass
    ? `Klasse ${item.moduleClass}`
    : item.moduleLevel
      ? `Klasse ${item.moduleLevel}`
      : null;
  if (tier && TIER_LABELS[tier]) {
    return classLabel
      ? `${TIER_LABELS[tier]} · ${classLabel}`
      : TIER_LABELS[tier];
  }
  return classLabel ?? 'Ohne Stufe';
}

function getDurationLabel(item: FabricationCatalogItem): string {
  if (
    item.durationSeconds === 0 &&
    item.durationSource === 'stu_modules_queue_tick'
  ) {
    return 'nächster Kolonie-Tick (STU)';
  }
  return formatBuildTime(item.durationSeconds);
}

export function PanelFabrication({
  catalog,
  queue,
  activeFunctionIds,
  presentFunctions = [],
  commodityMap,
  onStartFabrication,
  onCancelFabrication,
}: {
  catalog: NonNullable<ColonyDetailV2['fabricationCatalog']>;
  queue: NonNullable<ColonyDetailV2['fabricationQueue']>;
  activeFunctionIds: number[];
  presentFunctions?: ColonyEffectiveFunction[];
  commodityMap: Record<number, CommodityDef>;
  onStartFabrication: (
    itemKey: string,
    queueType: 'MODULE' | 'TORPEDO',
    buildingFunctionId: number,
  ) => Promise<void> | void;
  onCancelFabrication: (queueId: number) => Promise<void> | void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<FabricationGroupKey>>(
    new Set(),
  );
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const activeFunctionSet = useMemo(
    () => new Set(activeFunctionIds),
    [activeFunctionIds],
  );

  const startItem = async (item: FabricationCatalogItem) => {
    const buildingFunctionId = item.buildingFunctionIds.find((functionId) =>
      activeFunctionSet.has(functionId),
    );
    if (!buildingFunctionId) return;
    setBusyKey(item.itemKey);
    setError(null);
    try {
      await onStartFabrication(
        item.itemKey,
        item.queueType,
        buildingFunctionId,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fabrikation fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  const cancelJob = async (queueId: number) => {
    setBusyKey(`queue-${queueId}`);
    setError(null);
    try {
      await onCancelFabrication(queueId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Abbruch fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  const presentFunctionMap = useMemo(
    () => new Map(presentFunctions.map((fn) => [fn.id, fn])),
    [presentFunctions],
  );

  const groupedCatalog = useMemo(() => {
    const groups = new Map<
      FabricationGroupKey,
      Map<FabricationTypeKey, Map<string, FabricationCatalogItem[]>>
    >();

    for (const item of catalog) {
      const groupKey = getGroupKey(item);
      const typeKey = item.shipyardType ?? groupKey;
      const tierLabel = getTierLabel(item);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Map());
      }
      const typeGroups = groups.get(groupKey)!;
      if (!typeGroups.has(typeKey)) {
        typeGroups.set(typeKey, new Map());
      }
      const tierGroups = typeGroups.get(typeKey)!;
      tierGroups.set(tierLabel, [...(tierGroups.get(tierLabel) ?? []), item]);
    }

    return GROUP_ORDER.map((groupKey) => {
      const typeGroups = groups.get(groupKey);
      if (!typeGroups) return null;
      return {
        groupKey,
        types: Array.from(typeGroups.entries())
          .map(([typeKey, tierGroups]) => ({
            typeKey,
            tiers: Array.from(tierGroups.entries())
              .map(([tierLabel, items]) => ({
                tierLabel,
                tierSort: Math.min(...items.map(getTierSort)),
                items: items.sort(
                  (a, b) =>
                    (a.moduleClass ?? a.moduleLevel ?? 0) -
                      (b.moduleClass ?? b.moduleLevel ?? 0) ||
                    a.displayName.localeCompare(b.displayName, 'de'),
                ),
              }))
              .sort(
                (a, b) =>
                  a.tierSort - b.tierSort ||
                  a.tierLabel.localeCompare(b.tierLabel, 'de'),
              ),
          }))
          .sort(
            (a, b) =>
              TYPE_ORDER.indexOf(a.typeKey as ShipyardTypeKey) -
              TYPE_ORDER.indexOf(b.typeKey as ShipyardTypeKey),
          ),
      };
    }).filter((group): group is NonNullable<typeof group> => group !== null);
  }, [catalog]);

  const searchLower = search.toLowerCase();
  const isSearching = searchLower.length > 0;

  const filteredCatalog = useMemo(() => {
    if (!isSearching) return groupedCatalog;
    return groupedCatalog
      .map((group) => ({
        ...group,
        types: group.types
          .map((type) => ({
            ...type,
            tiers: type.tiers
              .map((tier) => ({
                ...tier,
                items: tier.items.filter((item) =>
                  item.displayName.toLowerCase().includes(searchLower),
                ),
              }))
              .filter((tier) => tier.items.length > 0),
          }))
          .filter((type) => type.tiers.length > 0),
      }))
      .filter((group) => group.types.length > 0);
  }, [groupedCatalog, searchLower, isSearching]);

  const toggleGroup = (key: FabricationGroupKey) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleType = (key: string) => {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getFunctionLabel = (item: FabricationCatalogItem) => {
    const presentFunctionId =
      item.buildingFunctionIds.find((id) => presentFunctionMap.has(id)) ??
      item.buildingFunctionIds[0];
    const name =
      presentFunctionMap.get(presentFunctionId)?.name ??
      `Funktion #${presentFunctionId}`;
    const status = item.buildingFunctionIds.some((functionId) =>
      activeFunctionSet.has(functionId),
    )
      ? 'aktiv'
      : 'inaktiv';
    return `${name} · ${status}`;
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Aktive Fertigung
        </div>
        {queue.length === 0 ? (
          <div className="text-xs text-swu-muted">Keine aktiven Jobs.</div>
        ) : (
          <div className="space-y-1 text-xs">
            {queue.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-bold text-swu-primary truncate">
                    {job.amount}× {job.displayName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    {job.functionName} · nächster Kolonie-Tick
                  </div>
                </div>
                <button
                  onClick={() => cancelJob(job.id)}
                  disabled={busyKey === `queue-${job.id}`}
                  className="px-2 py-1 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded overflow-hidden">
        <div className="px-3 py-2 border-b border-swu-border/30">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Modul suchen…"
            className="w-full bg-swu-bg/60 border border-swu-border/40 rounded px-2 py-1.5 text-xs text-swu-primary placeholder:text-swu-muted/60 focus:outline-none focus:border-swu-accent/50"
          />
        </div>
        {filteredCatalog.length === 0 ? (
          <div className="px-3 py-4 text-xs text-swu-muted">
            {isSearching
              ? 'Keine Treffer.'
              : 'Keine herstellbaren Einträge. Benötigt eine passende Fabrik und Forschung.'}
          </div>
        ) : (
          <div className="divide-y divide-swu-border/30">
            {filteredCatalog.map(({ groupKey, types }) => {
              const groupOpen = isSearching || openGroups.has(groupKey);
              return (
                <section key={groupKey}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-3 py-2 bg-swu-bg/60 text-xs font-bold text-swu-accent uppercase tracking-wide flex items-center justify-between"
                  >
                    <span>{GROUP_LABELS[groupKey]}</span>
                    <span
                      className={`text-swu-muted transition-transform ${groupOpen ? 'rotate-90' : ''}`}
                    >
                      ▸
                    </span>
                  </button>
                  {groupOpen && (
                    <div className="space-y-3 bg-swu-bg/20 p-3">
                      {types.map(({ typeKey, tiers }) => {
                        const typeCompositeKey = `${groupKey}-${typeKey}`;
                        const typeOpen =
                          isSearching || openTypes.has(typeCompositeKey);
                        return (
                          <div
                            key={typeCompositeKey}
                            className="overflow-hidden rounded border border-swu-accent/25 bg-swu-surface shadow-[0_0_0_1px_rgba(113,216,255,0.05)]"
                          >
                            <button
                              type="button"
                              onClick={() => toggleType(typeCompositeKey)}
                              className="w-full border-b border-swu-accent/25 bg-swu-accent/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-swu-accent flex items-center justify-between"
                            >
                              <span>
                                {TYPE_LABELS[typeKey as ShipyardTypeKey] ??
                                  GROUP_LABELS[typeKey as FabricationGroupKey]}
                              </span>
                              <span
                                className={`text-swu-muted transition-transform ${typeOpen ? 'rotate-90' : ''}`}
                              >
                                ▸
                              </span>
                            </button>
                            {typeOpen &&
                              tiers.map(({ tierLabel, items }) => (
                                <div key={`${typeCompositeKey}-${tierLabel}`}>
                                  <div className="px-3 py-1 text-[10px] font-bold text-swu-muted uppercase bg-swu-bg/35">
                                    {tierLabel}
                                  </div>
                                  <div className="divide-y divide-swu-border/10">
                                    {items.map((item) => {
                                      const output =
                                        commodityMap[item.outputCommodityId];
                                      const canStart =
                                        item.buildingFunctionIds.some(
                                          (functionId) =>
                                            activeFunctionSet.has(functionId),
                                        );
                                      return (
                                        <div
                                          key={item.itemKey}
                                          className="px-3 py-2 text-xs space-y-1.5"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="font-bold text-swu-primary truncate">
                                                {item.displayName}
                                              </div>
                                              <div className="text-[10px] text-swu-muted">
                                                Output: {item.outputAmount}×{' '}
                                                {output?.name ??
                                                  `Ware #${item.outputCommodityId}`}{' '}
                                                · {getDurationLabel(item)} ·{' '}
                                                {getFunctionLabel(item)}
                                              </div>
                                              {(item.stuRawName ||
                                                item.stuSourceTechId) && (
                                                <div className="text-[10px] text-swu-muted/80">
                                                  STU:{' '}
                                                  {item.stuRawName ??
                                                    'unbekannte Quelle'}
                                                  {item.stuSourceTechId
                                                    ? ` · Tech ${item.stuSourceTechId}`
                                                    : ''}
                                                  {item.researchRequired
                                                    ? ` · Bundle ${item.researchRequired}`
                                                    : ''}
                                                  {item.faction
                                                    ? ` · ${FACTION_LABELS[item.faction] ?? item.faction}`
                                                    : ''}
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => startItem(item)}
                                              disabled={
                                                !canStart ||
                                                busyKey === item.itemKey
                                              }
                                              className="px-2 py-1 rounded bg-swu-accent/15 text-swu-accent hover:bg-swu-accent/25 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              Starten
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-[10px] text-swu-muted">
                                            {item.costs.map((cost) => (
                                              <span key={cost.commodityId}>
                                                {cost.amount}{' '}
                                                {commodityMap[cost.commodityId]
                                                  ?.name ?? cost.commodityId}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
