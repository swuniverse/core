import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  buildingImage,
  colonyFieldTileImage,
  commodityImage,
} from '../../../lib/assets';
import type {
  BuildingDef,
  ColonyField,
  ColonyFieldUpgrade,
  CommodityDef,
  TerraformingDef,
} from '../types';
import { getTerraformingOptionsForField } from '../utils';
import { FIELD_TYPE_NAMES, TILE_TYPE_NAMES } from '../constants';
import { formatSignedAmount } from '../utils';
import {
  getBuildingContextActions,
  type ColonyContextView,
} from '../colony-navigation';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  }
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-swu-border/40 pt-3">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-swu-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

export function ColonyFieldDialog({
  field,
  building,
  buildingMap,
  commodityMap,
  terraformingDefs,
  onClose,
  onOpenContext,
  onOpenBuildMenu,
  onOpenAcademy,
  onTerraform,
  onUpgrade,
  onDemolish,
  onToggle,
  wasteAvailability,
}: {
  field: ColonyField;
  building?: BuildingDef;
  buildingMap: Record<number, BuildingDef>;
  commodityMap: Record<number, CommodityDef>;
  terraformingDefs: TerraformingDef[];
  onClose: () => void;
  onOpenContext: (view: ColonyContextView) => void;
  onOpenBuildMenu: () => void;
  onOpenAcademy: () => void;
  onTerraform: (
    fieldIndex: number,
    terraformingId: number,
  ) => Promise<void> | void;
  onUpgrade: (fieldIndex: number, upgradeId: number) => Promise<void> | void;
  onDemolish: (fieldIndex: number) => Promise<void> | void;
  onToggle: (fieldIndex: number) => Promise<void> | void;
  wasteAvailability?: { enabled: boolean; reason?: string };
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const pendingActionsRef = useRef(new Set<string>());
  const [pendingActions, setPendingActions] = useState<Set<string>>(
    () => new Set(),
  );
  onCloseRef.current = onClose;

  const runAction = (key: string, action: () => Promise<void> | void) => {
    if (pendingActionsRef.current.has(key)) return;
    pendingActionsRef.current.add(key);
    setPendingActions(new Set(pendingActionsRef.current));
    let result: Promise<void> | void;
    try {
      result = action();
    } catch {
      pendingActionsRef.current.delete(key);
      setPendingActions(new Set(pendingActionsRef.current));
      return;
    }
    void Promise.resolve(result)
      .catch(() => undefined)
      .finally(() => {
        pendingActionsRef.current.delete(key);
        setPendingActions(new Set(pendingActionsRef.current));
      });
  };

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const terrainName =
    TILE_TYPE_NAMES[field.terrainTileId ?? field.fieldType] ||
    FIELD_TYPE_NAMES[field.fieldType] ||
    '?';
  const isBonus = (field.terrainTileId ?? field.fieldType) >= 10000;
  const isHQ =
    field.buildingId != null &&
    [1, 82010100, 82010300].includes(field.buildingId);
  const integrityCurrent = field.integrity ?? building?.integrity ?? 0;
  const integrityMax = field.maxIntegrity ?? building?.integrity ?? 0;
  const integrityPercent =
    integrityMax > 0
      ? Math.round((integrityCurrent / integrityMax) * 100)
      : 100;
  const availableUpgrades = field.availableUpgrades ?? [];
  const terraformOptions = getTerraformingOptionsForField(
    field,
    terraformingDefs,
  );
  const contextActions = building
    ? getBuildingContextActions(building.functions ?? [], field.isActive, {
        waste: wasteAvailability ?? {
          enabled: false,
          reason: 'Lagerfunktion nicht verfügbar',
        },
      }).filter((action) => action.view !== 'waste' || !field.isBuilding)
    : [];
  const canOpenAcademy = building?.functions?.includes(1) && !field.isBuilding;

  const renderUpgradeCosts = (upgrade: ColonyFieldUpgrade) => {
    const rows: ReactNode[] = [];
    if (upgrade.energyCost > 0) {
      rows.push(
        <div
          key={`energy-${upgrade.id}`}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-swu-muted">⚡ Energie</span>
          <span className="text-swu-primary">{upgrade.energyCost}</span>
        </div>,
      );
    }
    upgrade.costs
      .filter((cost) => cost.amount > 0)
      .forEach((cost) => {
        const commodity = commodityMap[cost.commodityId];
        rows.push(
          <div
            key={`${upgrade.id}-${cost.commodityId}`}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
              <img
                src={commodityImage(cost.commodityId, commodity?.name)}
                alt=""
                className="h-4 w-4 object-contain"
                loading="lazy"
              />
              <span className="truncate">
                {commodity?.name ||
                  commodity?.nameShort ||
                  `Ware #${cost.commodityId}`}
              </span>
            </span>
            <span className="text-swu-primary">{cost.amount}</span>
          </div>,
        );
      });
    return rows;
  };

  const activeTerraforming = field.terraformingId
    ? terraformingDefs.find((option) => option.id === field.terraformingId)
    : undefined;
  const activeTerraformingProgress = activeTerraforming?.duration
    ? Math.max(
        0,
        Math.min(
          100,
          ((activeTerraforming.duration -
            Math.max(
              0,
              new Date(field.terraformingFinishesAt ?? 0).getTime() -
                Date.now(),
            ) /
              1000) /
            activeTerraforming.duration) *
            100,
        ),
      )
    : 0;

  return (
    <div
      data-testid="field-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="colony-field-dialog-title"
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded border border-swu-border bg-swu-surface px-4 py-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="colony-field-dialog-title"
              className="text-base font-bold text-swu-primary"
            >
              Feld {field.fieldIndex} - Informationen
            </h2>
            <div className="text-xs text-swu-muted">
              {field.layer === 'ORBIT'
                ? 'Orbit'
                : field.layer === 'UNDERGROUND'
                  ? 'Untergrund'
                  : 'Oberfläche'}{' '}
              · {terrainName}
              {isBonus && (
                <span className="ml-1 text-yellow-400">★ Bonusfeld</span>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-sm text-swu-muted hover:text-swu-primary"
            aria-label="Dialog schließen"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {building ? (
            <>
              <div className="flex items-center gap-3">
                <img
                  src={buildingImage(building.id)}
                  alt=""
                  className="h-12 w-12 object-contain"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-swu-primary">
                    {building.name}
                  </div>
                  <div
                    className={`text-[10px] font-bold ${field.isActive ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {field.isBuilding
                      ? 'IM BAU'
                      : field.isActive
                        ? 'AKTIV'
                        : 'DEAKTIVIERT'}
                  </div>
                  {integrityMax > 0 && (
                    <div
                      className={
                        integrityPercent < 50
                          ? 'text-xs text-orange-400'
                          : 'text-xs text-swu-muted'
                      }
                    >
                      <span>
                        Integrität: {integrityCurrent}/{integrityMax}
                      </span>{' '}
                      ({integrityPercent}%)
                    </div>
                  )}
                </div>
              </div>

              {((building.bevUse || 0) > 0 ||
                (building.bevPro || 0) > 0 ||
                building.bonuses.storage !== 0) && (
                <Section title="Auswirkungen">
                  <div className="space-y-1 text-sm">
                    {(building.bevUse || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-swu-muted">👤 Arbeiter</span>
                        <span className="text-red-400">-{building.bevUse}</span>
                      </div>
                    )}
                    {(building.bevPro || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-swu-muted">🏠 Wohnraum</span>
                        <span className="text-green-400">
                          +{building.bevPro}
                        </span>
                      </div>
                    )}
                    {building.bonuses.storage !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-swu-muted">📦 Lager</span>
                        <span
                          className={
                            building.bonuses.storage > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {formatSignedAmount(building.bonuses.storage)}
                        </span>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {((building.epsProc || 0) !== 0 ||
                building.production.length > 0) && (
                <Section title="Produktion">
                  <div className="space-y-1 text-sm">
                    {(building.epsProc || 0) !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-swu-muted">⚡ Energie</span>
                        <span
                          className={
                            (building.epsProc || 0) < 0
                              ? 'text-red-400'
                              : 'text-green-400'
                          }
                        >
                          {formatSignedAmount(building.epsProc || 0)}
                        </span>
                      </div>
                    )}
                    {building.production.map((p) => (
                      <div
                        key={p.commodityId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                          <img
                            src={commodityImage(
                              p.commodityId,
                              commodityMap[p.commodityId]?.name,
                            )}
                            alt=""
                            className="h-4 w-4 object-contain"
                            loading="lazy"
                          />
                          <span className="truncate">
                            {commodityMap[p.commodityId]?.name || '?'}
                          </span>
                        </span>
                        <span
                          className={
                            p.amount < 0 ? 'text-red-400' : 'text-green-400'
                          }
                        >
                          {formatSignedAmount(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {availableUpgrades.length > 0 && (
                <Section title="Upgrades">
                  <div className="space-y-2">
                    {availableUpgrades.map((upgrade) => {
                      const targetBuilding = buildingMap[upgrade.toBuildingId];
                      if (!targetBuilding) return null;
                      return (
                        <div
                          key={upgrade.id}
                          className="rounded border border-swu-border/50 bg-swu-bg/30 p-2 space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-swu-accent">
                              {targetBuilding.name}
                            </span>
                            <button
                              type="button"
                              disabled={pendingActions.has(
                                `upgrade-${upgrade.id}`,
                              )}
                              onClick={() =>
                                runAction(`upgrade-${upgrade.id}`, () =>
                                  onUpgrade(field.fieldIndex, upgrade.id),
                                )
                              }
                              aria-label={`Upgrade auf ${targetBuilding.name}`}
                              className="rounded border border-swu-accent/40 bg-swu-accent/15 px-2.5 py-1.5 text-xs font-bold text-swu-accent hover:bg-swu-accent/25"
                            >
                              Upgrade
                            </button>
                          </div>
                          {upgrade.description && (
                            <div className="text-xs text-swu-muted">
                              {upgrade.description}
                            </div>
                          )}
                          <div className="space-y-1">
                            {renderUpgradeCosts(upgrade)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {contextActions.length > 0 && (
                <Section title="Gebäudefunktionen">
                  <div className="space-y-2">
                    {contextActions.map((action) => (
                      <div key={action.view}>
                        <button
                          type="button"
                          disabled={!action.enabled}
                          onClick={() => onOpenContext(action.view)}
                          className="rounded border border-swu-accent/40 bg-swu-accent/15 px-3 py-1.5 text-xs font-bold text-swu-accent enabled:hover:bg-swu-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {action.label}
                        </button>
                        {action.reason && (
                          <span className="ml-2 text-xs text-red-400">
                            {action.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {canOpenAcademy && (
                <Section title="Gebäudefunktionen">
                  <button
                    type="button"
                    onClick={onOpenAcademy}
                    className="w-full rounded border border-swu-accent/40 bg-swu-accent/15 px-3 py-1.5 text-xs font-bold text-swu-accent hover:bg-swu-accent/25"
                  >
                    Akademie
                  </button>
                </Section>
              )}

              {!isHQ && !field.isBuilding && (
                <Section title="Aktionen">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pendingActions.has('toggle')}
                      onClick={() =>
                        runAction('toggle', () => onToggle(field.fieldIndex))
                      }
                      className={`rounded border px-3 py-1.5 text-xs font-bold ${field.isActive ? 'border-yellow-500/50 bg-yellow-900/20 text-yellow-400' : 'border-green-500/50 bg-green-900/20 text-green-400'}`}
                    >
                      {field.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !pendingActionsRef.current.has('demolish') &&
                          window.confirm('Gebäude wirklich demontieren?')
                        ) {
                          runAction('demolish', () =>
                            onDemolish(field.fieldIndex),
                          );
                        }
                      }}
                      disabled={pendingActions.has('demolish')}
                      className="rounded border border-red-500/50 bg-red-900/20 px-3 py-1.5 text-xs font-bold text-red-400"
                    >
                      Demontieren
                    </button>
                  </div>
                </Section>
              )}
            </>
          ) : (
            <Section title="Freies Feld">
              <div className="flex items-center gap-3">
                <img
                  src={colonyFieldTileImage(
                    field.terrainTileId ?? field.fieldType,
                  )}
                  alt={terrainName}
                  className="h-14 w-14 border border-swu-border/60 object-cover"
                  loading="lazy"
                />
                <div>
                  <div className="font-bold text-swu-primary">
                    {terrainName}
                  </div>
                  <div className="text-xs text-swu-muted">
                    Dieses Feld ist aktuell unbebaut.
                  </div>
                </div>
              </div>
            </Section>
          )}

          {!field.buildingId && (
            <Section title="Terraforming">
              {field.terraformingId ? (
                <div className="rounded border border-cyan-400/40 bg-cyan-950/20 p-3">
                  <div className="mb-2 text-center text-xs font-bold text-cyan-300">
                    {activeTerraforming?.description ?? 'Terraforming'} läuft
                  </div>
                  {activeTerraforming && (
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={colonyFieldTileImage(
                          activeTerraforming.fromFieldType,
                        )}
                        alt={
                          FIELD_TYPE_NAMES[activeTerraforming.fromFieldType] ??
                          String(activeTerraforming.fromFieldType)
                        }
                        className="h-12 w-12 border border-swu-border/60 object-cover"
                      />
                      <span
                        aria-hidden="true"
                        className="font-bold text-cyan-300"
                      >
                        →
                      </span>
                      <img
                        src={colonyFieldTileImage(
                          activeTerraforming.toFieldType,
                        )}
                        alt={
                          FIELD_TYPE_NAMES[activeTerraforming.toFieldType] ??
                          String(activeTerraforming.toFieldType)
                        }
                        className="h-12 w-12 border border-swu-border/60 object-cover"
                      />
                    </div>
                  )}
                  <div
                    role="progressbar"
                    aria-label="Terraforming-Fortschritt"
                    aria-valuemin={0}
                    aria-valuenow={Math.round(activeTerraformingProgress)}
                    aria-valuemax={100}
                    className="mt-3 h-2 overflow-hidden border border-cyan-300/40 bg-swu-bg"
                  >
                    <div
                      className="h-full bg-cyan-400 transition-[width]"
                      style={{ width: `${activeTerraformingProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-center text-xs text-swu-muted">
                    Fertigstellung:{' '}
                    {field.terraformingFinishesAt
                      ? new Date(field.terraformingFinishesAt).toLocaleString(
                          'de-DE',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )
                      : '?'}
                  </div>
                </div>
              ) : terraformOptions.length > 0 ? (
                <div className="space-y-3">
                  {terraformOptions.map((option) => (
                    <div
                      key={option.id}
                      className="overflow-hidden rounded border border-swu-border/70 bg-swu-bg/50"
                    >
                      <div className="border-b border-swu-border/60 bg-swu-surface px-3 py-1.5 text-center text-xs font-bold text-swu-primary">
                        {option.description}
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-3 p-3">
                        <div className="flex min-w-0 flex-col items-center justify-center">
                          <div className="flex items-center justify-center gap-3">
                            <img
                              src={colonyFieldTileImage(option.fromFieldType)}
                              alt={
                                FIELD_TYPE_NAMES[option.fromFieldType] ??
                                String(option.fromFieldType)
                              }
                              className="h-12 w-12 border border-swu-border/60 object-cover"
                              loading="lazy"
                            />
                            <span
                              aria-hidden="true"
                              className="font-bold text-swu-primary"
                            >
                              →
                            </span>
                            <img
                              src={colonyFieldTileImage(option.toFieldType)}
                              alt={
                                FIELD_TYPE_NAMES[option.toFieldType] ??
                                String(option.toFieldType)
                              }
                              className="h-12 w-12 border border-swu-border/60 object-cover"
                              loading="lazy"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={pendingActions.has(
                              `terraform-${option.id}`,
                            )}
                            onClick={() =>
                              runAction(`terraform-${option.id}`, () =>
                                onTerraform(field.fieldIndex, option.id),
                              )
                            }
                            aria-label={option.description}
                            className="mt-3 border border-swu-accent/60 bg-swu-accent/15 px-3 py-1 text-xs font-bold text-swu-accent hover:bg-swu-accent/25 disabled:opacity-50"
                          >
                            Durchführen
                          </button>
                          <div className="mt-1 text-center text-xs text-swu-muted">
                            Dauer{' '}
                            <span className="font-bold text-swu-primary">
                              {formatDuration(option.duration)}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-20 border-l border-swu-border/40 pl-3 text-xs">
                          <div className="mb-1 font-bold text-swu-primary">
                            Kosten
                          </div>
                          <div className="flex items-center gap-1 text-swu-primary">
                            <img
                              src="/assets/buttons/e_trans2.png"
                              alt="Energie"
                              className="h-5 w-5 object-contain"
                              loading="lazy"
                            />
                            {option.energyCost}
                          </div>
                          {option.costs
                            .filter((cost) => cost.amount > 0)
                            .map((cost) => {
                              const commodity = commodityMap[cost.commodityId];
                              return (
                                <div
                                  key={cost.commodityId}
                                  className="mt-1 flex items-center gap-1 text-swu-primary"
                                >
                                  <img
                                    src={commodityImage(
                                      cost.commodityId,
                                      commodity?.name,
                                    )}
                                    alt={
                                      commodity?.name ||
                                      commodity?.nameShort ||
                                      `Ware #${cost.commodityId}`
                                    }
                                    title={
                                      commodity?.name ||
                                      commodity?.nameShort ||
                                      `Ware #${cost.commodityId}`
                                    }
                                    className="h-5 w-5 object-contain"
                                    loading="lazy"
                                  />
                                  {cost.amount}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-swu-muted">
                  Keine Optionen verfügbar.
                </div>
              )}
            </Section>
          )}

          {!field.buildingId && (
            <button
              type="button"
              onClick={onOpenBuildMenu}
              className="w-full rounded border border-swu-accent/50 bg-swu-accent/15 px-3 py-2 text-xs font-bold text-swu-accent hover:bg-swu-accent/25"
            >
              Baumenü öffnen
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
