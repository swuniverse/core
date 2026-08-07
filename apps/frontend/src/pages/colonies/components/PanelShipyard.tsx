import { useMemo, useState } from 'react';
import { shipyardDrydockImage } from '../../../lib/shipyard-assets';
import type {
  ColonyDetailV2,
  CommodityDef,
  ShipClassDef,
  ShipModuleSelection,
  ShipyardQueueMode,
} from '../types';

type ShipyardView =
  | 'shipyardSelect'
  | 'yardActions'
  | 'buildSelection'
  | 'demolitionSelection'
  | 'repairSelection'
  | 'retrofitSelection'
  | 'moduleDesign';

type DesignerMode = 'build' | 'retrofit';

type LayoutSlot = NonNullable<
  NonNullable<ColonyDetailV2['shipyard']['shipClassLayouts']>
>[number]['slots'][number];

type ShipLayout = NonNullable<
  NonNullable<ColonyDetailV2['shipyard']['shipClassLayouts']>
>[number];

type ShipModuleOption = NonNullable<
  ColonyDetailV2['availableShipModules']
>[number];
type ShipyardTypeKey = NonNullable<ShipModuleOption['shipyardType']>;

const shipyardTypeOrder: ShipyardTypeKey[] = [
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

const shipyardTypeLabels: Record<ShipyardTypeKey, string> = {
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

const SHIPYARD_FUNCTION_LABELS: Record<number, string> = {
  5: 'Jägerwerft',
  6: 'Korvetten-Werft',
  7: 'Fregattenwerft',
  8: 'Kreuzer-Werft',
  21: 'MC-Kreuzer-Werft',
};

const SHIPYARD_FUNCTION_ORDER = [5, 6, 7, 8, 21];
const SHIPYARD_FUNCTION_IDS = new Set(SHIPYARD_FUNCTION_ORDER);
const RESOURCE_ONLY_STU_RUMP_IDS = new Set([901, 903, 1501, 1503, 161, 163]);

function getAllowedBuildingFunctionIds(
  shipClass: ShipClassDef,
  slotRules: NonNullable<ColonyDetailV2['shipyard']['slotRules']>,
): number[] {
  if (Array.isArray(shipClass.allowedBuildingFunctionIds)) {
    return shipClass.allowedBuildingFunctionIds;
  }
  return (
    slotRules.find((rule) => rule.category === shipClass.category)
      ?.allowedBuildingFunctionIds ?? []
  );
}

function ShipyardSelectView({
  presentFunctionIds,
  activeFunctionIds,
  slotRules,
  queue,
  buildplans,
  shipClasses,
  onSelectYard,
}: {
  presentFunctionIds: number[];
  activeFunctionIds: number[];
  slotRules: NonNullable<ColonyDetailV2['shipyard']['slotRules']>;
  queue: NonNullable<ColonyDetailV2['shipBuildQueue']>;
  buildplans: NonNullable<ColonyDetailV2['buildplans']>;
  shipClasses: ShipClassDef[];
  onSelectYard: (functionId: number) => void;
}) {
  const sortedIds = useMemo(
    () =>
      [...presentFunctionIds].sort(
        (a, b) =>
          SHIPYARD_FUNCTION_ORDER.indexOf(a) -
          SHIPYARD_FUNCTION_ORDER.indexOf(b),
      ),
    [presentFunctionIds],
  );

  const getQueueCount = (functionId: number) =>
    queue.filter((job) => {
      const sc = shipClasses.find((c) => c.id === job.shipClassId);
      return sc
        ? getAllowedBuildingFunctionIds(sc, slotRules).includes(functionId)
        : false;
    }).length;

  const getPlanCount = (functionId: number) =>
    buildplans.filter((plan) => {
      const sc = shipClasses.find((c) => c.id === plan.shipClassId);
      return sc
        ? getAllowedBuildingFunctionIds(sc, slotRules).includes(functionId)
        : false;
    }).length;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-swu-primary">Werften</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedIds.map((functionId) => {
          const isActive = activeFunctionIds.includes(functionId);
          const label =
            SHIPYARD_FUNCTION_LABELS[functionId] ?? `Werft #${functionId}`;
          const queueCount = getQueueCount(functionId);
          const planCount = getPlanCount(functionId);
          return (
            <div
              key={functionId}
              className={`rounded border px-3 py-3 space-y-2 ${
                isActive
                  ? 'border-swu-border bg-swu-surface'
                  : 'border-swu-border/30 bg-swu-surface/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-swu-primary">
                  {label}
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                  }`}
                >
                  {isActive ? 'aktiv' : 'inaktiv'}
                </span>
              </div>
              {(queueCount > 0 || planCount > 0) && (
                <div className="text-[10px] text-swu-muted">
                  {queueCount > 0 && (
                    <span>
                      {queueCount} Job{queueCount > 1 ? 's' : ''} ·{' '}
                    </span>
                  )}
                  {planCount > 0 && (
                    <span>
                      {planCount} Plan{planCount > 1 ? 'e' : ''}
                    </span>
                  )}
                </div>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => onSelectYard(functionId)}
                  className="rounded border border-swu-accent/50 bg-swu-accent/10 px-2.5 py-1 text-[10px] font-semibold text-swu-accent hover:bg-swu-accent/20"
                >
                  Werft öffnen
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PanelShipyardProps = {
  shipyard?: ColonyDetailV2['shipyard'];
  shipClasses: ShipClassDef[];
  queue: NonNullable<ColonyDetailV2['shipBuildQueue']>;
  availableModules: NonNullable<ColonyDetailV2['availableShipModules']>;
  slotRules: NonNullable<ColonyDetailV2['shipyard']['slotRules']>;
  availableCrew: number;
  commodityMap: Record<number, CommodityDef>;
  orbitShips: ColonyDetailV2['orbitShips'];
  buildplans: NonNullable<ColonyDetailV2['buildplans']>;
  onBuildShip: (
    sci: number,
    name: string,
    moduleSelections?: ShipModuleSelection[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
  onQueueShipRepair: (shipId: number) => Promise<void> | void;
  onQueueShipRetrofit: (
    shipId: number,
    moduleSelections: ShipModuleSelection[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onCancelShipyardQueue: (queueId: number) => Promise<void> | void;
  onReactivateShipyardQueue: (queueId: number) => Promise<void> | void;
  onCreateBuildplan: (
    shipClassId: number,
    name: string,
    moduleSelections?: ShipModuleSelection[],
  ) => Promise<void> | void;
  onRenameBuildplan: (planId: number, name: string) => Promise<void> | void;
  onDeleteBuildplan: (planId: number) => Promise<void> | void;
  onBuildFromBuildplan: (planId: number, name: string) => Promise<void> | void;
};

const queueModeLabel: Record<ShipyardQueueMode, string> = {
  BUILD: 'Bau',
  REPAIR: 'Reparatur',
  RETROFIT: 'Umrüstung',
};

const queueStatusLabel: Record<string, string> = {
  QUEUED: 'läuft',
  PAUSED: 'pausiert',
  COMPLETED: 'fertig',
  CANCELLED: 'abgebrochen',
};

function ShipyardSubHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-swu-border bg-swu-surface px-3 py-2">
      <div>
        <div className="text-sm font-semibold text-swu-primary">
          {title}{' '}
          <span className="text-xs font-normal text-swu-muted">
            · {subtitle}
          </span>
        </div>
        <div className="text-[10px] text-swu-muted">
          Aktion der ausgewählten Werft. Nur passende Schiffe werden angezeigt.
        </div>
      </div>
      <button
        onClick={onBack}
        className="rounded border border-swu-border px-2 py-1 text-[10px] text-swu-muted"
      >
        Zurück
      </button>
    </div>
  );
}

function summarizeSelections(
  slots: LayoutSlot[],
  moduleSelections: ShipModuleSelection[],
) {
  const selectedBySlot = new Map(
    moduleSelections.map((selection) => [
      selection.slotId,
      selection.commodityId,
    ]),
  );
  const grouped = new Map<
    ShipyardTypeKey,
    { selected: number; total: number }
  >();

  for (const slot of slots) {
    const type = slot.moduleCategory as ShipyardTypeKey;
    const current = grouped.get(type) ?? { selected: 0, total: 0 };
    current.total += 1;
    if (selectedBySlot.has(slot.slotId)) current.selected += 1;
    grouped.set(type, current);
  }

  return Array.from(grouped.entries())
    .sort(
      (a, b) =>
        shipyardTypeOrder.indexOf(a[0]) - shipyardTypeOrder.indexOf(b[0]),
    )
    .map(
      ([type, value]) =>
        `${shipyardTypeLabels[type]} ${value.selected}/${value.total}`,
    )
    .join(' · ');
}

function typeEmptyLabel(type: ShipyardTypeKey) {
  return type === 'COMPUTER'
    ? 'No modules available'
    : 'Keine Module verfügbar';
}

function getSpecialTypeLabel(
  slots: LayoutSlot[],
  moduleSelections: ShipModuleSelection[],
) {
  const specialSlots = slots.filter(
    (slot) => slot.moduleCategory === 'SPECIAL',
  );
  const selectedBySlot = new Set(
    moduleSelections.map((selection) => selection.slotId),
  );
  const selected = specialSlots.filter((slot) =>
    selectedBySlot.has(slot.slotId),
  ).length;
  return `Spezial ${selected} / ${specialSlots.length}`;
}

function moduleNameByCommodity(
  availableModules: ShipModuleOption[],
  commodityId: number,
) {
  return (
    availableModules.find((module) => module.commodityId === commodityId)
      ?.displayName ?? `Modul #${commodityId}`
  );
}

function retrofitChangeLabel(
  previousCommodityId: number | undefined,
  nextCommodityId: number | undefined,
) {
  if (previousCommodityId != null && nextCommodityId != null) {
    return previousCommodityId === nextCommodityId ? 'bleibt' : 'neu';
  }
  if (previousCommodityId != null) return 'wird entfernt';
  if (nextCommodityId != null) return 'neu';
  return 'leer';
}

function groupQueueModules(moduleNames: string[] = []) {
  if (moduleNames.length === 0) return 'Keine Module';
  return moduleNames.join(', ');
}

function buildModuleInventoryMap(availableModules: ShipModuleOption[]) {
  return availableModules.reduce<Record<number, number>>((acc, module) => {
    acc[module.commodityId] = module.amount;
    return acc;
  }, {});
}

function getUsedCommodityCounts(moduleSelections: ShipModuleSelection[]) {
  return moduleSelections.reduce<Record<number, number>>((acc, selection) => {
    acc[selection.commodityId] = (acc[selection.commodityId] ?? 0) + 1;
    return acc;
  }, {});
}

function sortModuleOptions(options: ShipModuleOption[]) {
  return [...options].sort((a, b) => {
    if (a.moduleClass !== b.moduleClass) return a.moduleClass - b.moduleClass;
    if (a.moduleLevel !== b.moduleLevel) return a.moduleLevel - b.moduleLevel;
    return a.displayName.localeCompare(b.displayName);
  });
}

function getSelectedModuleCrew(
  availableModules: ShipModuleOption[],
  moduleSelections: ShipModuleSelection[],
) {
  return moduleSelections.reduce((sum, selection) => {
    const module = availableModules.find(
      (entry) => entry.commodityId === selection.commodityId,
    );
    return sum + (module?.crewRequired ?? 0);
  }, 0);
}

function getSelectedModuleEffects(
  availableModules: ShipModuleOption[],
  moduleSelections: ShipModuleSelection[],
) {
  return moduleSelections.flatMap((selection) => {
    const module = availableModules.find(
      (entry) => entry.commodityId === selection.commodityId,
    );
    return module?.effects ?? [];
  });
}


function ShipHullDesigner({
  layout,
  shipClassKey,
  availableModules,
  moduleSelections,
  maxCrew,
  onChange,
}: {
  layout: ShipLayout;
  shipClassKey: string;
  availableModules: ShipModuleOption[];
  moduleSelections: ShipModuleSelection[];
  maxCrew: number;
  onChange: (next: ShipModuleSelection[]) => void;
}) {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const classModules = useMemo(
    () =>
      availableModules.filter(
        (module) =>
          !module.compatibleShipClassIds ||
          module.compatibleShipClassIds.includes(layout.shipClassId),
      ),
    [availableModules, layout.shipClassId],
  );
  const inventoryMap = useMemo(
    () => buildModuleInventoryMap(availableModules),
    [availableModules],
  );
  const usedCounts = useMemo(
    () => getUsedCommodityCounts(moduleSelections),
    [moduleSelections],
  );
  const activeSlot = useMemo(
    () =>
      activeSlotId
        ? layout.slots.find((slot) => slot.slotId === activeSlotId)
        : undefined,
    [activeSlotId, layout.slots],
  );
  const activeType = activeSlot?.moduleCategory as ShipyardTypeKey | undefined;
  const activeModules = useMemo(
    () =>
      activeType
        ? sortModuleOptions(
            classModules.filter((module) => module.shipyardType === activeType),
          )
        : [],
    [activeType, classModules],
  );
  const activeSelection = activeSlot
    ? moduleSelections.find((selection) => selection.slotId === activeSlot.slotId)
    : undefined;
  const activeSelectedModule = classModules.find(
    (module) => module.commodityId === activeSelection?.commodityId,
  );
  const baseCrew = layout.baseStats?.baseCrew ?? 0;
  const selectedCrew = getSelectedModuleCrew(classModules, moduleSelections);
  const requiredCrew = baseCrew + selectedCrew;
  const selectedEffects = getSelectedModuleEffects(
    classModules,
    moduleSelections,
  );

  const updateSlotSelection = (commodityId: number | null) => {
    if (!activeSlot) return;
    const withoutSlot = moduleSelections.filter(
      (selection) => selection.slotId !== activeSlot.slotId,
    );
    if (commodityId == null) {
      onChange(withoutSlot);
      return;
    }
    onChange([...withoutSlot, { slotId: activeSlot.slotId, commodityId }]);
  };

  const filledCount = layout.slots.filter((slot) =>
    moduleSelections.some((s) => s.slotId === slot.slotId),
  ).length;

  const baseStats = layout.baseStats;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-3">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded border border-swu-border">
          <img
            src={shipyardDrydockImage(shipClassKey)}
            alt="Trockendock"
            className="w-full max-h-[10rem] lg:max-h-[16rem] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06111b] via-[#06111b]/20 to-transparent" />
        </div>

        {/* Crew / status summary */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-swu-muted px-1">
          <span>
            Crew:{' '}
            <span
              className={
                requiredCrew > maxCrew ? 'text-red-400' : 'text-swu-primary'
              }
            >
              {requiredCrew}
            </span>
            /{maxCrew}
          </span>
          <span>
            Module: <span className="text-swu-primary">{filledCount}</span>/
            {layout.slots.length}
          </span>
        </div>

        {/* Slot grid with inline expansion */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {layout.slots
            .sort((a, b) => a.order - b.order)
            .flatMap((slot) => {
              const selection = moduleSelections.find(
                (s) => s.slotId === slot.slotId,
              );
              const selectedModule = selection
                ? classModules.find(
                    (m) => m.commodityId === selection.commodityId,
                  )
                : undefined;
              const isActive = activeSlotId === slot.slotId;
              const elements = [
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => setActiveSlotId(isActive ? null : slot.slotId)}
                  className={`text-left rounded border px-2.5 py-2 transition-colors ${
                    isActive
                      ? 'border-swu-accent bg-swu-accent/10'
                      : selectedModule
                        ? 'border-swu-accent/30 bg-swu-surface hover:border-swu-accent/50'
                        : 'border-swu-border/40 bg-swu-surface hover:border-swu-accent/30'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-swu-muted">
                    {slot.label}
                  </div>
                  <div
                    className={`text-xs font-semibold truncate ${selectedModule ? 'text-swu-primary' : 'text-swu-muted/50'}`}
                  >
                    {selectedModule ? selectedModule.displayName : '— leer —'}
                  </div>
                </button>,
              ];
              if (isActive) {
                elements.push(
                  <div
                    key={`${slot.slotId}-picker`}
                    className="col-span-full rounded border border-swu-accent/30 bg-swu-surface overflow-hidden"
                  >
                    <div className="max-h-[14rem] overflow-y-auto divide-y divide-swu-border/20">
                      <button
                        type="button"
                        onClick={() => updateSlotSelection(null)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          !activeSelection
                            ? 'bg-swu-accent/10 text-swu-accent'
                            : 'text-swu-primary hover:bg-swu-bg/40'
                        }`}
                      >
                        <span className="font-semibold">Leer lassen</span>
                        <span className="text-[10px] text-swu-muted">
                          Kein Modul
                        </span>
                      </button>
                      {activeModules.map((module) => {
                        const used = usedCounts[module.commodityId] ?? 0;
                        const reservedByThis =
                          activeSelectedModule?.commodityId ===
                          module.commodityId
                            ? 1
                            : 0;
                        const remaining =
                          (inventoryMap[module.commodityId] ?? 0) -
                          used +
                          reservedByThis;
                        const isSelected =
                          activeSelectedModule?.commodityId ===
                          module.commodityId;
                        return (
                          <button
                            key={module.commodityId}
                            type="button"
                            onClick={() =>
                              updateSlotSelection(module.commodityId)
                            }
                            className={`w-full text-left px-3 py-2 transition-colors ${
                              isSelected
                                ? 'bg-swu-accent/10 text-swu-accent'
                                : 'text-swu-primary hover:bg-swu-bg/40'
                            }`}
                          >
                            <div className="text-xs font-semibold">
                              {module.displayName}
                            </div>
                            <div className="text-[10px] text-swu-muted mt-0.5">
                              Crew {module.crewRequired ?? 0} · Lager{' '}
                              {remaining <= 0 ? (
                                <span className="text-amber-400">0</span>
                              ) : (
                                remaining
                              )}
                              {(module.effects ?? []).length > 0 &&
                                ` · ${(module.effects ?? []).join(', ')}`}
                            </div>
                          </button>
                        );
                      })}
                      {activeModules.length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-swu-muted">
                          Keine Module verfügbar
                        </div>
                      )}
                    </div>
                  </div>,
                );
              }
              return elements;
            })}
        </div>
      </div>

      {/* Right sidebar: Modulauswirkungen */}
      <div className="space-y-3 rounded border border-swu-border bg-swu-surface px-3 py-3 text-xs xl:self-start xl:sticky xl:top-4">
        <div>
          <div className="text-[10px] font-bold uppercase text-swu-muted">
            Crew
          </div>
          <div className="mt-1 text-swu-primary">
            benötigt {requiredCrew} / maximal {maxCrew}
          </div>
          <div className="text-[10px] text-swu-muted">
            Basis {baseCrew} · Module {selectedCrew}
          </div>
        </div>

        {baseStats && (
          <div>
            <div className="text-[10px] font-bold uppercase text-swu-muted mb-1">
              Basiswerte
            </div>
            <div className="space-y-0.5 text-[10px]">
              {baseStats.baseHull > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Hüllenstärke</span>
                  <span className="text-swu-primary">{baseStats.baseHull}</span>
                </div>
              )}
              {baseStats.baseShield > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Schildkapazität</span>
                  <span className="text-swu-primary">
                    {baseStats.baseShield}
                  </span>
                </div>
              )}
              {baseStats.baseDamage > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Waffenschaden</span>
                  <span className="text-swu-primary">
                    {baseStats.baseDamage}
                  </span>
                </div>
              )}
              {baseStats.baseSensorRange > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Sensorreichweite</span>
                  <span className="text-swu-primary">
                    {baseStats.baseSensorRange}
                  </span>
                </div>
              )}
              {baseStats.baseWarpdrive > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Warpdrive</span>
                  <span className="text-swu-primary">
                    {baseStats.baseWarpdrive}
                  </span>
                </div>
              )}
              {baseStats.baseReactor > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Reaktor</span>
                  <span className="text-swu-primary">
                    {baseStats.baseReactor}
                  </span>
                </div>
              )}
              {baseStats.baseEps > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">EPS-Leistung</span>
                  <span className="text-swu-primary">{baseStats.baseEps}</span>
                </div>
              )}
              {baseStats.baseEvadeChance > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">Ausweichchance</span>
                  <span className="text-swu-primary">
                    {baseStats.baseEvadeChance}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-bold uppercase text-swu-muted mb-1">
            Modulauswirkungen
          </div>
          {selectedEffects.length > 0 ? (
            <ul className="space-y-0.5 text-[10px] text-swu-primary">
              {selectedEffects.map((effect, i) => (
                <li key={i} className="flex gap-1">
                  <span className="text-swu-accent">•</span>
                  <span>{effect}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[10px] text-swu-muted">
              Keine Module gewählt
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PanelShipyard({
  shipyard,
  shipClasses,
  queue,
  availableModules,
  slotRules,
  availableCrew,
  commodityMap,
  orbitShips,
  buildplans,
  onBuildShip,
  onDisassembleShip,
  onQueueShipRepair,
  onQueueShipRetrofit,
  onCancelShipyardQueue,
  onReactivateShipyardQueue,
  onCreateBuildplan,
  onRenameBuildplan,
  onDeleteBuildplan,
  onBuildFromBuildplan,
}: PanelShipyardProps) {
  const [view, setView] = useState<ShipyardView>('shipyardSelect');
  const [selectedShipyardFunctionId, setSelectedShipyardFunctionId] = useState<
    number | null
  >(null);
  const [designerMode, setDesignerMode] = useState<DesignerMode>('build');
  const [selectedClass, setSelectedClass] = useState<ShipClassDef | null>(null);
  const [shipName, setShipName] = useState('');
  const [buildPlanName, setBuildPlanName] = useState('');
  const [moduleSelections, setModuleSelections] = useState<
    ShipModuleSelection[]
  >([]);
  const [retrofitShipId, setRetrofitShipId] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const [busyShipyardAction, setBusyShipyardAction] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [buildplanShipNames, setBuildplanShipNames] = useState<
    Record<number, string>
  >({});
  const [renamingBuildplanId, setRenamingBuildplanId] = useState<number | null>(
    null,
  );
  const [renameBuildplanName, setRenameBuildplanName] = useState('');

  const shipLayouts = shipyard?.shipClassLayouts ?? [];
  const selectedLayout = selectedClass
    ? shipLayouts.find((layout) => layout.shipClassId === selectedClass.id)
    : undefined;
  const selectedSlotRule = selectedClass
    ? slotRules.find((rule) => rule.category === selectedClass.category)
    : undefined;
  const selectedShip =
    orbitShips.find((ship) => ship.id === retrofitShipId) ?? null;
  const fixedModuleSelections = useMemo(() => {
    if (!selectedLayout?.fixedModuleCommodityIds?.length) return [];
    const freeSlotsByType = new Map<ShipyardTypeKey, LayoutSlot[]>();
    for (const slot of selectedLayout.slots) {
      const slots = freeSlotsByType.get(slot.moduleCategory) ?? [];
      slots.push(slot);
      freeSlotsByType.set(slot.moduleCategory, slots);
    }
    const selections: ShipModuleSelection[] = [];
    for (const commodityId of selectedLayout.fixedModuleCommodityIds) {
      const module = availableModules.find(
        (entry) => entry.commodityId === commodityId,
      );
      if (!module?.shipyardType) continue;
      const slots = freeSlotsByType.get(module.shipyardType) ?? [];
      const slot = slots.shift();
      if (!slot) continue;
      selections.push({ slotId: slot.slotId, commodityId });
    }
    return selections;
  }, [availableModules, selectedLayout]);
  const isFixedLayout = fixedModuleSelections.length > 0;
  const isResourceOnlyFixedRump =
    selectedLayout?.baseStats?.moduleLevel === 1 &&
    RESOURCE_ONLY_STU_RUMP_IDS.has(selectedLayout?.stuRumpId ?? -1);
  const designerModuleSelections = isFixedLayout
    ? fixedModuleSelections
    : moduleSelections;

  const activeShipyardIds = [
    ...(shipyard?.fighterActiveFunctionIds ?? []),
    ...(shipyard?.activeFunctionIds ?? []),
  ].filter((functionId) => SHIPYARD_FUNCTION_IDS.has(functionId));
  const presentShipyardIds = [
    ...(shipyard?.fighterPresentFunctionIds ?? []),
    ...(shipyard?.presentFunctionIds ?? []),
  ].filter((functionId) => SHIPYARD_FUNCTION_IDS.has(functionId));
  const shipyardActive = activeShipyardIds.length > 0;

  const runShipyardAction = async (
    key: string,
    action: () => Promise<void> | void,
  ) => {
    setBusyShipyardAction(key);
    setError(null);
    try {
      await action();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Werftaktion fehlgeschlagen');
    } finally {
      setBusyShipyardAction(null);
    }
  };

  const resetDesigner = () => {
    setView('shipyardSelect');
    setDesignerMode('build');
    setSelectedClass(null);
    setShipName('');
    setBuildPlanName('');
    setModuleSelections([]);
    setRetrofitShipId(null);
    setSelectedShipyardFunctionId(null);
  };

  const startBuildFlow = () => {
    setDesignerMode('build');
    setSelectedClass(null);
    setShipName('');
    setBuildPlanName('');
    setModuleSelections([]);
    setRetrofitShipId(null);
    setView('buildSelection');
    setError(null);
  };

  const startBuildFromPlan = (planId: number) => {
    const plan = buildplans.find((entry) => entry.id === planId);
    if (!plan) return;
    const shipClass =
      shipClasses.find((entry) => entry.id === plan.shipClassId) ?? null;
    setDesignerMode('build');
    setSelectedClass(shipClass);
    setBuildPlanName(plan.name);
    setModuleSelections(plan.moduleSelections ?? []);
    setShipName(buildplanShipNames[planId]?.trim() || shipClass?.name || '');
    setRetrofitShipId(null);
    setView('moduleDesign');
  };

  const startRetrofitFlow = (shipId: number) => {
    const ship = orbitShips.find((entry) => entry.id === shipId);
    if (!ship) return;
    const shipClass =
      shipClasses.find((entry) => entry.id === ship.shipClassId) ?? null;
    const selections = (ship.modules ?? [])
      .filter((module) => module.slotId && module.commodityId != null)
      .map((module) => ({
        slotId: module.slotId as string,
        commodityId: module.commodityId as number,
      }));
    setDesignerMode('retrofit');
    setSelectedClass(shipClass);
    setBuildPlanName(`${ship.name} Retrofit`);
    setShipName(ship.name);
    setModuleSelections(selections);
    setRetrofitShipId(ship.id);
    setView('moduleDesign');
  };

  const handleBuild = async () => {
    if (!selectedClass || !shipName.trim()) return;
    setBuilding(true);
    setError(null);
    try {
      await onBuildShip(
        selectedClass.id,
        shipName.trim(),
        designerModuleSelections,
        buildPlanName.trim() || undefined,
      );
      resetDesigner();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBuilding(false);
    }
  };

  const handleCreateBuildplan = async () => {
    if (!selectedClass || !buildPlanName.trim()) return;
    await runShipyardAction('create-buildplan', async () => {
      await onCreateBuildplan(
        selectedClass.id,
        buildPlanName.trim(),
        designerModuleSelections,
      );
    });
  };

  const handleRetrofit = async () => {
    if (!retrofitShipId) return;
    await runShipyardAction(`retrofit-${retrofitShipId}`, async () => {
      await onQueueShipRetrofit(
        retrofitShipId,
        designerModuleSelections,
        buildPlanName.trim() || undefined,
      );
      resetDesigner();
    });
  };

  const startRenameBuildplan = (planId: number, currentName: string) => {
    setRenamingBuildplanId(planId);
    setRenameBuildplanName(currentName);
  };

  const buildplanShipName = (planId: number, fallback: string) =>
    buildplanShipNames[planId]?.trim() || fallback;

  const isShipClassCompatibleWithSelectedShipyard = (
    shipClass: ShipClassDef | null | undefined,
  ) => {
    if (!selectedShipyardFunctionId) return true;
    if (!shipClass) return false;
    return getAllowedBuildingFunctionIds(shipClass, slotRules).includes(
      selectedShipyardFunctionId,
    );
  };

  const selectedShipyardLabel = selectedShipyardFunctionId
    ? (SHIPYARD_FUNCTION_LABELS[selectedShipyardFunctionId] ??
      `Werft #${selectedShipyardFunctionId}`)
    : 'Werft';
  const isShipCompatibleWithSelectedShipyard = (
    ship: (typeof orbitShips)[number],
  ) =>
    isShipClassCompatibleWithSelectedShipyard(
      shipClasses.find((entry) => entry.id === ship.shipClassId),
    );
  const orbitShipsForSelectedShipyard = selectedShipyardFunctionId
    ? orbitShips.filter(isShipCompatibleWithSelectedShipyard)
    : orbitShips;
  const repairableShipsForSelectedShipyard =
    orbitShipsForSelectedShipyard.filter((ship) => ship.canRepair);
  const retrofitShipsForSelectedShipyard = orbitShipsForSelectedShipyard.filter(
    (ship) => ship.canRetrofit,
  );
  const disassemblableShipsForSelectedShipyard =
    orbitShipsForSelectedShipyard.filter((ship) => ship.canDisassemble);
  const buildplansForSelectedShipyard = buildplans.filter((plan) =>
    isShipClassCompatibleWithSelectedShipyard(
      shipClasses.find((entry) => entry.id === plan.shipClassId),
    ),
  );
  const queueForSelectedShipyard = queue.filter((job) =>
    isShipClassCompatibleWithSelectedShipyard(
      shipClasses.find((entry) => entry.id === job.shipClassId),
    ),
  );
  const repairStationActive =
    (shipyard?.repairActiveFunctionIds ?? []).length > 0;
  const repairStationPresent =
    (shipyard?.repairPresentFunctionIds ?? []).length > 0;

  return (
    <div className="space-y-3">
      {!shipyardActive && presentShipyardIds.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded px-3 py-2 text-[10px] text-yellow-400">
          Werftgebäude ist vorhanden, aber nicht aktiv. Aktionen sind blockiert.
        </div>
      )}

      {view === 'shipyardSelect' && (
        <ShipyardSelectView
          presentFunctionIds={presentShipyardIds}
          activeFunctionIds={activeShipyardIds}
          slotRules={slotRules}
          queue={queue}
          buildplans={buildplans}
          shipClasses={shipClasses}
          onSelectYard={(functionId) => {
            setSelectedShipyardFunctionId(functionId);
            setView('yardActions');
            setError(null);
          }}
        />
      )}

      {view === 'yardActions' && selectedShipyardFunctionId && (
        <div className="space-y-3">
          <div className="rounded border border-swu-border bg-swu-surface px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-swu-primary">
                  {selectedShipyardLabel}
                </div>
                <div className="text-xs text-swu-muted">
                  Wähle eine Werftaktion. Reparaturstationen sind keine eigenen
                  Werften, sondern verbessern nur Schiffsreparaturen.
                </div>
                {repairStationActive ? (
                  <div className="text-[10px] text-cyan-300">
                    Reparaturstation aktiv: halbe Reparaturkosten/-dauer und
                    zusätzliche Reparaturkapazität.
                  </div>
                ) : repairStationPresent ? (
                  <div className="text-[10px] text-yellow-300">
                    Reparaturstation vorhanden, aber nicht aktiv.
                  </div>
                ) : null}
                {queueForSelectedShipyard.length > 0 && (
                  <div className="text-[10px] text-swu-muted">
                    Warteschlange: {queueForSelectedShipyard.length} Job
                    {queueForSelectedShipyard.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setView('shipyardSelect');
                  setSelectedShipyardFunctionId(null);
                }}
                className="rounded border border-swu-border px-2 py-1 text-[10px] text-swu-muted"
              >
                ← Werften
              </button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDesignerMode('build');
                startBuildFlow();
              }}
              className="rounded border border-swu-accent/50 bg-swu-accent/10 px-4 py-3 text-left text-sm font-semibold text-swu-accent hover:bg-swu-accent/20"
            >
              Schiffbau
              <div className="mt-1 text-[10px] font-normal text-swu-muted">
                Rümpfe und Baupläne dieser Werftklasse bauen.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setView('demolitionSelection')}
              className="rounded border border-red-400/40 bg-red-900/10 px-4 py-3 text-left text-sm font-semibold text-red-300 hover:border-red-400/70"
            >
              Schiffdemontage
              <div className="mt-1 text-[10px] font-normal text-swu-muted">
                {disassemblableShipsForSelectedShipyard.length} passende Schiff
                {disassemblableShipsForSelectedShipyard.length === 1
                  ? ''
                  : 'e'}{' '}
                verfügbar.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setView('repairSelection')}
              className="rounded border border-cyan-400/40 bg-cyan-900/10 px-4 py-3 text-left text-sm font-semibold text-cyan-300 hover:border-cyan-400/70"
            >
              Schiffsreparatur
              <div className="mt-1 text-[10px] font-normal text-swu-muted">
                {repairableShipsForSelectedShipyard.length} beschädigte passende
                Schiff
                {repairableShipsForSelectedShipyard.length === 1 ? '' : 'e'}.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setView('retrofitSelection')}
              className="rounded border border-swu-border bg-swu-surface px-4 py-3 text-left text-sm font-semibold text-swu-primary hover:border-swu-accent/40"
            >
              Schiffsumrüstung
              <div className="mt-1 text-[10px] font-normal text-swu-muted">
                {retrofitShipsForSelectedShipyard.length} passende Schiff
                {retrofitShipsForSelectedShipyard.length === 1 ? '' : 'e'}{' '}
                umrüstbar.
              </div>
            </button>
          </div>

          {queueForSelectedShipyard.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
              <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
                Werftwarteschlange
              </div>
              <div className="space-y-1 text-xs">
                {queueForSelectedShipyard.map((job) => {
                  const mode = job.mode ?? 'BUILD';
                  const isPaused = job.status === 'PAUSED';
                  return (
                    <div
                      key={job.id}
                      className={`rounded border px-2 py-2 ${isPaused ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-swu-border/20'}`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-swu-primary font-bold">
                          <span className="text-swu-accent mr-1">
                            {queueModeLabel[mode]}
                          </span>
                          {job.name}
                        </span>
                        <span className="text-swu-muted">
                          {new Date(job.finishesAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {mode === 'REPAIR' && isPaused && (
                          <button
                            onClick={() =>
                              runShipyardAction(`reactivate-${job.id}`, () =>
                                onReactivateShipyardQueue(job.id),
                              )
                            }
                            disabled={
                              !job.canReactivate ||
                              busyShipyardAction === `reactivate-${job.id}`
                            }
                            className="px-2 py-0.5 rounded border border-swu-accent/60 bg-swu-accent/15 text-[10px] text-swu-accent disabled:opacity-40"
                          >
                            Reaktivieren
                          </button>
                        )}
                        <button
                          onClick={() =>
                            runShipyardAction(`cancel-${job.id}`, () =>
                              onCancelShipyardQueue(job.id),
                            )
                          }
                          disabled={busyShipyardAction === `cancel-${job.id}`}
                          className="px-2 py-0.5 rounded border border-red-500/50 bg-red-900/20 text-[10px] text-red-300 disabled:opacity-40"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'demolitionSelection' && selectedShipyardFunctionId && (
        <div className="space-y-3">
          <ShipyardSubHeader
            title="Schiffdemontage"
            subtitle={selectedShipyardLabel}
            onBack={() => setView('yardActions')}
          />
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
            {disassemblableShipsForSelectedShipyard.length === 0 && (
              <div className="text-swu-muted">
                Keine passenden demontierbaren Schiffe im Orbit.
              </div>
            )}
            {disassemblableShipsForSelectedShipyard.map((ship) => (
              <div
                key={ship.id}
                className="flex items-center justify-between gap-3 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-bold text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    {ship.shipClassName ?? `Klasse #${ship.shipClassId}`} · Crew{' '}
                    {ship.crew}/{ship.crewMax} · Cargo/Module werden
                    zurückgeführt, Rückbau ist endgültig.
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!window.confirm(`${ship.name} wirklich demontieren?`))
                      return;
                    void runShipyardAction(`disassemble-${ship.id}`, () =>
                      onDisassembleShip(ship.id),
                    );
                  }}
                  disabled={busyShipyardAction === `disassemble-${ship.id}`}
                  className="rounded border border-red-500/50 bg-red-900/20 px-3 py-1 text-[10px] font-semibold text-red-300 disabled:opacity-40"
                >
                  Demontieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'repairSelection' && selectedShipyardFunctionId && (
        <div className="space-y-3">
          <ShipyardSubHeader
            title="Schiffsreparatur"
            subtitle={selectedShipyardLabel}
            onBack={() => setView('yardActions')}
          />
          {(repairStationActive || repairStationPresent) && (
            <div
              className={`rounded border px-3 py-2 text-[10px] ${repairStationActive ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'}`}
            >
              {repairStationActive
                ? 'Reparaturstation aktiv: Reparaturen laufen schneller, günstiger und mit zusätzlicher Kapazität.'
                : 'Reparaturstation vorhanden, aber inaktiv: Reparaturen laufen ohne Stationsbonus.'}
            </div>
          )}
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
            {repairableShipsForSelectedShipyard.length === 0 && (
              <div className="text-swu-muted">
                Keine beschädigten passenden Schiffe im Orbit.
              </div>
            )}
            {repairableShipsForSelectedShipyard.map((ship) => (
              <div
                key={ship.id}
                className="flex items-center justify-between gap-3 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-bold text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    Hülle {ship.hull}/{ship.hullMax} · Schaden{' '}
                    {ship.damageSummary?.hullDamage ?? 0} · Module beschädigt{' '}
                    {ship.damageSummary?.damagedModules ?? 0}
                  </div>
                </div>
                <button
                  onClick={() =>
                    runShipyardAction(`repair-${ship.id}`, () =>
                      onQueueShipRepair(ship.id),
                    )
                  }
                  disabled={busyShipyardAction === `repair-${ship.id}`}
                  className="rounded border border-cyan-400/50 bg-cyan-900/20 px-3 py-1 text-[10px] font-semibold text-cyan-300 disabled:opacity-40"
                >
                  Reparieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'retrofitSelection' && selectedShipyardFunctionId && (
        <div className="space-y-3">
          <ShipyardSubHeader
            title="Schiffsumrüstung"
            subtitle={selectedShipyardLabel}
            onBack={() => setView('yardActions')}
          />
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
            {retrofitShipsForSelectedShipyard.length === 0 && (
              <div className="text-swu-muted">
                Keine passenden umrüstbaren Schiffe im Orbit.
              </div>
            )}
            {retrofitShipsForSelectedShipyard.map((ship) => (
              <div
                key={ship.id}
                className="flex items-center justify-between gap-3 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <div className="font-bold text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    {ship.shipClassName ?? `Klasse #${ship.shipClassId}`} ·
                    Hülle {ship.hull}/{ship.hullMax}
                  </div>
                </div>
                <button
                  onClick={() => startRetrofitFlow(ship.id)}
                  disabled={busyShipyardAction === `retrofit-${ship.id}`}
                  className="rounded border border-swu-primary/50 bg-swu-primary/10 px-3 py-1 text-[10px] font-semibold text-swu-primary disabled:opacity-40"
                >
                  Umrüsten
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'buildSelection' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded border border-swu-border bg-swu-surface px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-swu-primary">
                Rumpf auswählen
                {selectedShipyardFunctionId && (
                  <span className="ml-2 text-xs font-normal text-swu-muted">
                    {SHIPYARD_FUNCTION_LABELS[selectedShipyardFunctionId] ?? ''}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-swu-muted">
                Wähle einen erforschten Rumpf. Ressourcen-only Rümpfe werden
                direkt ohne Moduldesigner gebaut.
              </div>
            </div>
            <button
              onClick={() => {
                setView('shipyardSelect');
                setSelectedShipyardFunctionId(null);
              }}
              className="rounded border border-swu-border px-2 py-1 text-[10px] text-swu-muted"
            >
              Zurück
            </button>
          </div>
          {buildplansForSelectedShipyard.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
              <div className="text-[10px] font-bold text-swu-muted uppercase">
                Baupläne dieser Werft
              </div>
              {buildplansForSelectedShipyard.map((plan) => {
                const shipClass = shipClasses.find(
                  (sc) => sc.id === plan.shipClassId,
                );
                const defaultShipName =
                  shipClass?.name ?? `Schiff #${plan.shipClassId}`;
                return (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-2 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0 md:flex-row md:items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-swu-primary truncate">
                        {plan.name}
                      </div>
                      <div className="text-[10px] text-swu-muted">
                        {shipClass?.name ?? `Klasse #${plan.shipClassId}`}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={buildplanShipNames[plan.id] ?? ''}
                      onChange={(event) =>
                        setBuildplanShipNames((current) => ({
                          ...current,
                          [plan.id]: event.target.value,
                        }))
                      }
                      placeholder="Schiffsname"
                      className="md:w-40 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                    />
                    <button
                      onClick={() => startBuildFromPlan(plan.id)}
                      className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-primary"
                    >
                      Bearbeiten & Bauen
                    </button>
                    <button
                      onClick={() =>
                        runShipyardAction(`use-plan-${plan.id}`, () =>
                          onBuildFromBuildplan(
                            plan.id,
                            buildplanShipName(plan.id, defaultShipName),
                          ),
                        )
                      }
                      disabled={busyShipyardAction === `use-plan-${plan.id}`}
                      className="px-2 py-1 rounded bg-swu-accent/20 border border-swu-accent text-[10px] text-swu-accent disabled:opacity-40"
                    >
                      Sofort bauen
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {shipClasses
              .filter((sc) => sc.unlocked !== false)
              .filter((sc) => {
                if (!selectedShipyardFunctionId) return true;
                return getAllowedBuildingFunctionIds(sc, slotRules).includes(
                  selectedShipyardFunctionId,
                );
              })
              .map((shipClass) => (
                <button
                  key={shipClass.id}
                  onClick={() => {
                    const selectedLayout = shipLayouts.find(
                      (layout) => layout.shipClassId === shipClass.id,
                    );
                    const isResourceOnlyFixedRump =
                      selectedLayout?.baseStats?.moduleLevel === 1 &&
                      RESOURCE_ONLY_STU_RUMP_IDS.has(
                        selectedLayout?.stuRumpId ?? -1,
                      );
                    setSelectedClass(shipClass);
                    setShipName(shipClass.name);
                    setBuildPlanName(`${shipClass.name} Buildplan`);
                    setModuleSelections([]);
                    setView('moduleDesign');
                  }}
                  className="rounded border border-swu-border bg-swu-surface px-3 py-3 text-left hover:border-swu-accent/50"
                >
                  <div className="font-semibold text-swu-primary">
                    {shipClass.name}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    {shipClass.category} · Hull {shipClass.hullBase} · Shields{' '}
                    {shipClass.shieldBase}
                  </div>
                  <div className="mt-2 text-[10px] text-swu-muted">
                    Crew {shipClass.crewMin}/{availableCrew} · Cargo{' '}
                    {shipClass.cargoCapacity}
                  </div>
                  {isResourceOnlyFixedRump && (
                    <div className="mt-1 text-[10px] text-swu-accent">
                      Ressourcen-only: keine Module auswählbar.
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {view === 'moduleDesign' && selectedClass && selectedLayout && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded border border-swu-border bg-swu-surface px-3 py-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-swu-primary">
                {designerMode === 'retrofit'
                  ? 'Retrofit-Designer'
                  : isResourceOnlyFixedRump
                    ? 'Rumpf-Bau'
                    : 'Modul-Designer'}{' '}
                · {selectedClass.name}
              </div>
              <div className="text-[10px] text-swu-muted">
                {selectedSlotRule
                  ? summarizeSelections(selectedLayout.slots, designerModuleSelections)
                  : 'Keine Slotdaten verfügbar'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setView(
                    designerMode === 'build'
                      ? 'buildSelection'
                      : 'retrofitSelection',
                  )
                }
                className="rounded border border-swu-border px-2 py-1 text-[10px] text-swu-muted"
              >
                Zurück
              </button>
              <button
                onClick={resetDesigner}
                className="rounded border border-swu-border px-2 py-1 text-[10px] text-swu-muted"
              >
                Abbrechen
              </button>
            </div>
          </div>

          {/* Build action bar */}
          <div className="rounded border border-swu-border bg-swu-surface px-3 py-2 text-xs">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[8rem]">
                <div className="text-[10px] font-bold uppercase text-swu-muted">
                  Schiffsname
                </div>
                <input
                  type="text"
                  value={shipName}
                  onChange={(event) => setShipName(event.target.value)}
                  className="mt-0.5 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-primary"
                />
              </div>
              <div className="flex-1 min-w-[8rem]">
                <div className="text-[10px] font-bold uppercase text-swu-muted">
                  Buildplanname
                </div>
                <input
                  type="text"
                  value={buildPlanName}
                  onChange={(event) => setBuildPlanName(event.target.value)}
                  className="mt-0.5 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-primary"
                />
              </div>
              <div className="text-[10px] text-swu-muted whitespace-nowrap">
                Crew {availableCrew}/{selectedClass.crewMin ?? 0}
              </div>
              {!isResourceOnlyFixedRump && (
                <button
                  onClick={handleCreateBuildplan}
                  disabled={
                    !buildPlanName.trim() ||
                    busyShipyardAction === 'create-buildplan'
                  }
                  className="rounded border border-swu-primary/40 bg-swu-primary/10 px-3 py-1.5 text-xs font-semibold text-swu-primary disabled:opacity-40"
                >
                  Plan speichern
                </button>
              )}
              {designerMode === 'build' ? (
                <button
                  onClick={handleBuild}
                  disabled={!shipName.trim() || building}
                  className="rounded border border-swu-accent bg-swu-accent/15 px-3 py-1.5 text-xs font-semibold text-swu-accent disabled:opacity-40"
                >
                  {building ? 'Baut…' : 'Schiff bauen'}
                </button>
              ) : (
                <button
                  onClick={handleRetrofit}
                  disabled={busyShipyardAction === `retrofit-${retrofitShipId}`}
                  className="rounded border border-swu-accent bg-swu-accent/15 px-3 py-1.5 text-xs font-semibold text-swu-accent disabled:opacity-40"
                >
                  Retrofit starten
                </button>
              )}
            </div>
            {designerMode === 'retrofit' && selectedShip && (
              <div className="mt-2 text-[10px] text-swu-muted">
                Retrofit für{' '}
                <span className="text-swu-primary">{selectedShip.name}</span>
              </div>
            )}
            {isFixedLayout && !isResourceOnlyFixedRump && (
              <div className="mt-2 rounded border border-swu-accent/40 bg-swu-accent/10 px-2 py-2 text-[10px] text-swu-accent">
                Fester Rumpf: Kosten und Module sind durch die Hangar/Jägerwerft-Definition vorgegeben.
              </div>
            )}
            {isResourceOnlyFixedRump && (
              <div className="mt-2 rounded border border-swu-accent/40 bg-swu-accent/10 px-2 py-2 text-[10px] text-swu-accent">
                Ressourcen-only Rumpf: gemäß STU benötigen erste Frachtschiffe, Workbees und erste unbemannte Kolonieschiffe nur Ressourcen und keine Module.
              </div>
            )}
            {designerMode === 'retrofit' && selectedShip && selectedLayout && (
              <div className="mt-2 rounded border border-swu-border/40 bg-swu-bg/40 px-2 py-2 text-[10px] text-swu-muted space-y-1">
                <div className="font-semibold text-swu-primary">
                  Retrofit-Delta
                </div>
                {selectedLayout.slots.map((slot) => {
                  const previousCommodityId = (selectedShip.modules ?? []).find(
                    (module) => module.slotId === slot.slotId,
                  )?.commodityId;
                  const nextCommodityId = designerModuleSelections.find(
                    (selection) => selection.slotId === slot.slotId,
                  )?.commodityId;
                  return (
                    <div
                      key={slot.slotId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{slot.label}</span>
                      <span className="text-right">
                        {retrofitChangeLabel(
                          previousCommodityId ?? undefined,
                          nextCommodityId ?? undefined,
                        )}
                        {' · '}
                        {nextCommodityId != null
                          ? moduleNameByCommodity(
                              availableModules,
                              nextCommodityId,
                            )
                          : previousCommodityId != null
                            ? moduleNameByCommodity(
                                availableModules,
                                previousCommodityId,
                              )
                            : 'Leer'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
          </div>

          {isResourceOnlyFixedRump ? (
            <div className="rounded border border-swu-border bg-swu-surface px-3 py-3 text-xs space-y-2">
              <div className="text-sm font-semibold text-swu-primary">
                Ressourcen-only Rumpf
              </div>
              <div className="text-[10px] text-swu-muted">
                Dieser Rumpf entspricht der STU-Regel für erste Frachtschiffe, Workbees oder erste unbemannte Kolonieschiffe: Bau nur über Ressourcen, ohne frei wählbare Module.
              </div>
              <div className="text-[10px] text-swu-muted">
                Benötigte Ressourcen:{' '}
                {(selectedLayout.fixedBuildCosts ?? [])
                  .map(
                    (cost) =>
                      `${cost.amount} ${commodityMap[cost.commodityId]?.name ?? `#${cost.commodityId}`}`,
                  )
                  .join(', ') || 'keine'}
              </div>
            </div>
          ) : (
            <ShipHullDesigner
              layout={selectedLayout}
              shipClassKey={selectedClass.key}
              availableModules={availableModules}
              moduleSelections={designerModuleSelections}
              maxCrew={selectedClass.crewMax ?? 0}
              onChange={isFixedLayout ? () => undefined : setModuleSelections}
            />
          )}
        </div>
      )}
    </div>
  );
}
