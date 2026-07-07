import { useState } from 'react';
import type {
  ColonyDetailV2,
  CommodityDef,
  ShipClassDef,
  ShipyardQueueMode,
} from '../types';

// ─── Panel: Werft ────────────────────────────────────────────

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
  onQueueShipRepair,
  onQueueShipRetrofit,
  onCancelShipyardQueue,
  onReactivateShipyardQueue,
  onCreateBuildplan,
  onRenameBuildplan,
  onDeleteBuildplan,
  onBuildFromBuildplan,
}: {
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
    moduleTypes?: string[],
    buildPlanName?: string,
    moduleCommodityIds?: number[],
  ) => Promise<void> | void;
  onQueueShipRepair: (shipId: number) => Promise<void> | void;
  onQueueShipRetrofit: (
    shipId: number,
    moduleCommodityIds: number[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onCancelShipyardQueue: (queueId: number) => Promise<void> | void;
  onReactivateShipyardQueue: (queueId: number) => Promise<void> | void;
  onCreateBuildplan: (
    shipClassId: number,
    name: string,
    moduleCommodityIds?: number[],
    moduleTypes?: string[],
  ) => Promise<void> | void;
  onRenameBuildplan: (planId: number, name: string) => Promise<void> | void;
  onDeleteBuildplan: (planId: number) => Promise<void> | void;
  onBuildFromBuildplan: (planId: number, name: string) => Promise<void> | void;
}) {
  const [selectedClass, setSelectedClass] = useState<ShipClassDef | null>(null);
  const [shipName, setShipName] = useState('');
  const [buildPlanName, setBuildPlanName] = useState('');
  const [moduleInput, setModuleInput] = useState('');
  const [selectedModuleCommodityIds, setSelectedModuleCommodityIds] = useState<
    number[]
  >([]);
  const [retrofitShipId, setRetrofitShipId] = useState<number | null>(null);
  const [retrofitBuildPlanName, setRetrofitBuildPlanName] = useState('');
  const [retrofitModuleCommodityIds, setRetrofitModuleCommodityIds] = useState<
    number[]
  >([]);
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

  const queueModeLabel: Record<ShipyardQueueMode, string> = {
    BUILD: 'Bau',
    REPAIR: 'Reparatur',
    RETROFIT: 'Umrüstung',
  };
  const queueStatusLabel: Record<string, string> = {
    QUEUED: 'aktiv',
    PAUSED: 'gestoppt',
    COMPLETED: 'fertig',
    CANCELLED: 'abgebrochen',
  };

  const selectedSlotRule = selectedClass
    ? slotRules.find((rule) => rule.category === selectedClass.category)
    : undefined;
  const selectedModuleCounts = selectedModuleCommodityIds.reduce(
    (counts, commodityId) => {
      const module = availableModules.find(
        (candidate) => candidate.commodityId === commodityId,
      );
      if (module) {
        counts[module.moduleCategory] =
          (counts[module.moduleCategory] ?? 0) + 1;
      }
      return counts;
    },
    {} as Record<string, number>,
  );

  const handleBuild = async () => {
    if (!selectedClass || !shipName.trim()) return;
    setBuilding(true);
    setError(null);
    try {
      const moduleTypes = moduleInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      await onBuildShip(
        selectedClass.id,
        shipName.trim(),
        moduleTypes,
        buildPlanName.trim() || undefined,
        selectedModuleCommodityIds,
      );
      setShipName('');
      setBuildPlanName('');
      setModuleInput('');
      setSelectedModuleCommodityIds([]);
      setSelectedClass(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBuilding(false);
    }
  };

  const handleCreateBuildplan = async () => {
    if (!selectedClass || !buildPlanName.trim()) return;
    const moduleTypes = moduleInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    await runShipyardAction('create-buildplan', async () => {
      await onCreateBuildplan(
        selectedClass.id,
        buildPlanName.trim(),
        selectedModuleCommodityIds,
        moduleTypes,
      );
      setBuildPlanName('');
    });
  };

  const startRenameBuildplan = (planId: number, currentName: string) => {
    setRenamingBuildplanId(planId);
    setRenameBuildplanName(currentName);
  };

  const buildplanShipName = (planId: number, fallback: string) =>
    buildplanShipNames[planId]?.trim() || fallback;

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

  const toggleRetrofitModule = (commodityId: number) => {
    setRetrofitModuleCommodityIds((current) =>
      current.includes(commodityId)
        ? current.filter((id) => id !== commodityId)
        : [...current, commodityId],
    );
  };

  const activeShipyardIds = [
    ...(shipyard?.fighterActiveFunctionIds ?? []),
    ...(shipyard?.activeFunctionIds ?? []),
    ...(shipyard?.repairActiveFunctionIds ?? []),
  ];
  const presentShipyardIds = [
    ...(shipyard?.fighterPresentFunctionIds ?? []),
    ...(shipyard?.presentFunctionIds ?? []),
    ...(shipyard?.repairPresentFunctionIds ?? []),
  ];
  const shipyardActive = activeShipyardIds.length > 0;

  return (
    <div className="space-y-2">
      {shipyard && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Werftfunktionen
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {presentShipyardIds.length === 0 ? (
              <span className="text-swu-muted">Keine Werft gebaut.</span>
            ) : (
              presentShipyardIds.map((functionId) => (
                <span
                  key={functionId}
                  className={`px-1.5 py-0.5 rounded border ${activeShipyardIds.includes(functionId) ? 'border-green-500/50 text-green-300 bg-green-500/10' : 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'}`}
                >
                  Funktion #{functionId}{' '}
                  {activeShipyardIds.includes(functionId) ? 'aktiv' : 'inaktiv'}
                </span>
              ))
            )}
          </div>
          {!shipyardActive && presentShipyardIds.length > 0 && (
            <div className="mt-1 text-[10px] text-yellow-400">
              Werftgebäude ist vorhanden, aber nicht aktiv. Aktionen sind
              blockiert.
            </div>
          )}
        </div>
      )}
      {buildplans.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase">
            Baupläne
          </div>
          {buildplans.map((plan) => {
            const shipClass = shipClasses.find(
              (sc) => sc.id === plan.shipClassId,
            );
            const defaultShipName =
              shipClass?.name ?? `Schiff #${plan.shipClassId}`;
            const isRenaming = renamingBuildplanId === plan.id;
            return (
              <div
                key={plan.id}
                className="space-y-1 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-swu-primary truncate">
                      {plan.name}
                    </div>
                    <div className="text-[10px] text-swu-muted">
                      {shipClass?.name ?? `Klasse #${plan.shipClassId}`}
                      {plan.moduleTypes.length > 0
                        ? ` · ${plan.moduleTypes.join(', ')}`
                        : ''}
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
                    Verwenden
                  </button>
                  <button
                    onClick={() => startRenameBuildplan(plan.id, plan.name)}
                    className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-primary"
                  >
                    Umbenennen
                  </button>
                  <button
                    onClick={() =>
                      runShipyardAction(`delete-plan-${plan.id}`, () =>
                        onDeleteBuildplan(plan.id),
                      )
                    }
                    disabled={busyShipyardAction === `delete-plan-${plan.id}`}
                    className="px-2 py-1 rounded border border-red-500/50 bg-red-900/20 text-[10px] text-red-300 disabled:opacity-40"
                  >
                    Löschen
                  </button>
                </div>
                {isRenaming && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={renameBuildplanName}
                      onChange={(event) =>
                        setRenameBuildplanName(event.target.value)
                      }
                      className="flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                    />
                    <button
                      onClick={() =>
                        runShipyardAction(
                          `rename-plan-${plan.id}`,
                          async () => {
                            await onRenameBuildplan(
                              plan.id,
                              renameBuildplanName,
                            );
                            setRenamingBuildplanId(null);
                            setRenameBuildplanName('');
                          },
                        )
                      }
                      disabled={
                        !renameBuildplanName.trim() ||
                        busyShipyardAction === `rename-plan-${plan.id}`
                      }
                      className="px-2 py-1 rounded bg-swu-accent/20 border border-swu-accent text-[10px] text-swu-accent disabled:opacity-40"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => {
                        setRenamingBuildplanId(null);
                        setRenameBuildplanName('');
                      }}
                      className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-muted"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {shipyard?.airfield?.present && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Landefeld / einfache Schiffe
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
            <div>
              Status:{' '}
              <span
                className={
                  shipyard.airfield.active
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }
              >
                {shipyard.airfield.active ? 'aktiv' : 'inaktiv'}
              </span>
            </div>
            <div>
              Baubar:{' '}
              <span className="font-mono text-swu-primary">
                {shipyard.airfield.buildableCount}
              </span>
            </div>
            <div>
              Startbereit:{' '}
              <span className="font-mono text-swu-primary">
                {shipyard.airfield.startableCount}
              </span>
            </div>
          </div>
          {!shipyard.airfield.active && (
            <div className="mt-1 text-[10px] text-yellow-400">
              Landefeld/Raumbahnhof ist gebaut, aber nicht aktiv. Einfache
              Schiffe können erst bei aktiver Funktion gebaut oder gestartet
              werden.
            </div>
          )}
          <div className="mt-1 text-[10px] text-swu-muted">
            Details zu Rümpfen, Start und Landung findest du weiterhin im
            Hangar; dieser Bereich wird im nächsten UX-Schritt vollständig in
            die Werft integriert.
          </div>
        </div>
      )}
      {shipyard?.orbitalMaintenance && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Orbitale Wartung
          </div>
          <div className="flex flex-wrap gap-3 text-[10px]">
            <span className="text-green-400">
              +{shipyard.orbitalMaintenance.production}
            </span>
            <span className="text-red-400">
              -{shipyard.orbitalMaintenance.consumption}
            </span>
            <span
              className={
                shipyard.orbitalMaintenance.balance >= 0
                  ? 'text-swu-primary'
                  : 'text-red-400'
              }
            >
              Bilanz {shipyard.orbitalMaintenance.balance}
            </span>
          </div>
        </div>
      )}
      {queue.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Werftwarteschlange
          </div>
          <div className="space-y-1 text-xs">
            {queue.map((job) => {
              const mode = job.mode ?? 'BUILD';
              return (
                <div
                  key={job.id}
                  className="flex flex-col border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-swu-primary font-bold">
                      <span className="text-swu-accent mr-1">
                        {queueModeLabel[mode]}
                      </span>
                      {job.name}
                    </span>
                    <span className="text-swu-muted">
                      {job.status === 'PAUSED' ? 'gestoppt' : 'bis'}{' '}
                      {new Date(job.finishesAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Status:{' '}
                    <span
                      className={
                        job.status === 'PAUSED'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }
                    >
                      {queueStatusLabel[job.status] ?? job.status}
                    </span>
                    {job.stoppedAt
                      ? ` · seit ${new Date(job.stoppedAt).toLocaleString()}`
                      : ''}
                  </div>
                  {job.buildPlanName && (
                    <div className="text-[10px] text-swu-muted">
                      Plan: {job.buildPlanName}
                    </div>
                  )}
                  {job.repairSnapshot?.costs?.length ? (
                    <div className="text-[10px] text-swu-muted">
                      Kosten:{' '}
                      {job.repairSnapshot.costs
                        .map(
                          (cost) =>
                            `${cost.amount} ${commodityMap[cost.commodityId]?.name ?? `#${cost.commodityId}`}`,
                        )
                        .join(', ')}
                    </div>
                  ) : null}
                  {job.moduleTypes.length > 0 && (
                    <div className="text-[10px] text-swu-muted">
                      Module: {job.moduleTypes.join(', ')}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {job.mode === 'REPAIR' && job.status === 'PAUSED' && (
                      <button
                        onClick={() =>
                          runShipyardAction(`reactivate-${job.id}`, () =>
                            onReactivateShipyardQueue(job.id),
                          )
                        }
                        disabled={busyShipyardAction === `reactivate-${job.id}`}
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
      <div className="bg-swu-surface border border-swu-border rounded divide-y divide-swu-border/20">
        {shipClasses.map((sc) => {
          const locked = sc.unlocked === false;
          return (
            <button
              key={sc.id}
              onClick={() => !locked && setSelectedClass(sc)}
              disabled={locked}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors ${selectedClass?.id === sc.id ? 'bg-swu-accent/10' : locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-swu-primary/5'}`}
            >
              <span className="font-bold text-swu-primary">{sc.name}</span>
              <span className="text-swu-muted">
                Hull {sc.hullBase} | Shields {sc.shieldBase} | Cargo{' '}
                {sc.cargoCapacity}
              </span>
              {locked && (
                <span className="text-[10px] text-yellow-400 ml-auto">
                  {sc.requirementLabel || 'Forschung fehlt'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {orbitShips.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase">
            Orbit-Schiffe
          </div>
          {orbitShips.map((ship) => {
            const isRetrofitting = retrofitShipId === ship.id;
            return (
              <div
                key={ship.id}
                className="border-b border-swu-border/20 pb-2 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="text-swu-primary font-bold">
                      {ship.name}
                    </div>
                    <div className="text-[10px] text-swu-muted">
                      Hülle {ship.hull}/{ship.hullMax} · Schaden{' '}
                      {ship.damageSummary?.hullDamage ?? 0} · Module beschädigt{' '}
                      {ship.damageSummary?.damagedModules ?? 0}
                    </div>
                    {ship.modules?.length ? (
                      <div className="text-[10px] text-swu-muted">
                        Installiert:{' '}
                        {ship.modules
                          .map(
                            (module) =>
                              `${module.moduleType} (${module.integrity}%)`,
                          )
                          .join(', ')}
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() =>
                      runShipyardAction(`repair-${ship.id}`, () =>
                        onQueueShipRepair(ship.id),
                      )
                    }
                    disabled={
                      !ship.canRepair ||
                      busyShipyardAction === `repair-${ship.id}`
                    }
                    className="h-7 px-2 rounded bg-swu-accent/15 border border-swu-accent/60 text-[10px] text-swu-accent disabled:opacity-40"
                  >
                    Reparieren
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRetrofitShipId(isRetrofitting ? null : ship.id);
                      setRetrofitBuildPlanName(`${ship.name} Retrofit`);
                      setRetrofitModuleCommodityIds(
                        (ship.modules ?? [])
                          .map((module) => module.commodityId)
                          .filter((id): id is number => id != null),
                      );
                    }}
                    disabled={!ship.canRetrofit}
                    className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-primary disabled:opacity-40"
                  >
                    {isRetrofitting ? 'Umrüstung schließen' : 'Umrüsten'}
                  </button>
                </div>
                {isRetrofitting && (
                  <div className="space-y-2 rounded border border-swu-border/60 bg-swu-bg/50 p-2">
                    <input
                      type="text"
                      value={retrofitBuildPlanName}
                      onChange={(e) => setRetrofitBuildPlanName(e.target.value)}
                      placeholder="Retrofit-Bauplanname"
                      className="w-full px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {availableModules.map((module) => {
                        const checked = retrofitModuleCommodityIds.includes(
                          module.commodityId,
                        );
                        return (
                          <label
                            key={module.commodityId}
                            className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] cursor-pointer ${checked ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border/60 hover:border-swu-accent/60'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleRetrofitModule(module.commodityId)
                              }
                            />
                            <span className="text-swu-primary truncate">
                              {module.displayName}
                            </span>
                            <span className="ml-auto text-swu-muted">
                              ×{module.amount}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      onClick={() =>
                        runShipyardAction(`retrofit-${ship.id}`, () =>
                          onQueueShipRetrofit(
                            ship.id,
                            retrofitModuleCommodityIds,
                            retrofitBuildPlanName.trim() || undefined,
                          ),
                        )
                      }
                      disabled={busyShipyardAction === `retrofit-${ship.id}`}
                      className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] font-bold rounded disabled:opacity-40"
                    >
                      Umrüstung starten
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedClass && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 space-y-2">
          {selectedClass.buildCosts && (
            <div className="text-[10px]">
              <span className="text-swu-muted uppercase font-bold">
                Baukosten:{' '}
              </span>
              {Object.entries(selectedClass.buildCosts).map(([k, v]) => (
                <span key={k} className="text-swu-primary mr-2">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
          <div className="text-[10px] text-swu-muted">
            <span className="uppercase font-bold">Crew:</span>{' '}
            <span
              className={
                availableCrew >= (selectedClass.crewMin ?? 0)
                  ? 'text-green-400'
                  : 'text-red-400'
              }
            >
              {availableCrew}/{selectedClass.crewMin ?? 0} benötigt
            </span>
          </div>
          {selectedSlotRule && (
            <div className="text-[10px] text-swu-muted">
              <span className="uppercase font-bold">Slots:</span>{' '}
              {Object.entries(selectedSlotRule.moduleSlots)
                .map(
                  ([category, max]) =>
                    `${category} ${selectedModuleCounts[category] ?? 0}/${max}`,
                )
                .join(' · ')}
            </div>
          )}
          {availableModules.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-swu-muted uppercase font-bold">
                Module aus Kolonielager
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {availableModules.map((module) => {
                  const checked = selectedModuleCommodityIds.includes(
                    module.commodityId,
                  );
                  return (
                    <label
                      key={module.commodityId}
                      className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] cursor-pointer ${checked ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border/60 hover:border-swu-accent/60'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedModuleCommodityIds((current) =>
                            checked
                              ? current.filter(
                                  (id) => id !== module.commodityId,
                                )
                              : [...current, module.commodityId],
                          );
                        }}
                      />
                      <span className="text-swu-primary truncate">
                        {module.displayName}
                      </span>
                      <span className="ml-auto text-swu-muted">
                        ×{module.amount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Bauplanname (optional)"
              value={buildPlanName}
              onChange={(e) => setBuildPlanName(e.target.value)}
              className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
            <input
              type="text"
              placeholder="Module, Komma-getrennt (optional)"
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
              className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Schiffsname..."
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              className="flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
            <button
              onClick={handleBuild}
              disabled={!shipName.trim() || building}
              className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 disabled:opacity-40 transition-colors"
            >
              {building ? '...' : 'Bauen'}
            </button>
            <button
              onClick={handleCreateBuildplan}
              disabled={
                !buildPlanName.trim() ||
                busyShipyardAction === 'create-buildplan'
              }
              className="px-3 py-1 bg-swu-primary/10 border border-swu-border text-swu-primary text-xs font-bold rounded hover:bg-swu-primary/20 disabled:opacity-40 transition-colors"
            >
              Plan speichern
            </button>
          </div>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
