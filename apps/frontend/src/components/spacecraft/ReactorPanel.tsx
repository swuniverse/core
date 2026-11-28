import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SpacecraftEnergyFlowDto,
  SpacecraftReactorTransferTargetDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { SignatureMaskRow } from './SignatureMaskRow';
import { ShipName } from '../ShipName';
import { stripShipNameBbCode } from '@swuniverse/shared';

interface ReactorPanelProps {
  shipId: number;
  warpdrive: number;
  warpdriveMax: number;
  battery: number;
  batteryMax: number;
  reactorFuel: number;
  reactorFuelMax: number;
  reactorWarpSplit: number;
  reactorAutoCarryOver: boolean;
  hyperdriveActive: boolean;
  inSystem: boolean;
  canTransferReactorCharge?: boolean;
  /** STU control_right.twig: reactor block only with a reactor system. */
  hasReactor?: boolean;
  /** STU control_right.twig: warp block only with a warp drive (`hasWarpDrive`). */
  hasWarpdrive?: boolean;
  /** Set for a fleet leader: STU "Flotte" checkboxes send the command to every member. */
  fleetMembers?: Array<{ id: number; name: string }>;
  onUpdate: () => void;
}

type FleetCommand = 'reactor' | 'split' | 'battery';
const FLEET_COMMAND_LABELS: Record<FleetCommand, string> = {
  reactor: 'Reaktor aufladen',
  split: 'Reaktorverteilung',
  battery: 'Ersatzbatterie entladen',
};

export function ReactorPanel({
  shipId,
  warpdrive,
  warpdriveMax,
  battery,
  batteryMax,
  reactorFuel,
  reactorFuelMax,
  reactorWarpSplit,
  reactorAutoCarryOver,
  hyperdriveActive,
  inSystem,
  canTransferReactorCharge = false,
  hasReactor = true,
  hasWarpdrive = true,
  fleetMembers,
  onUpdate,
}: ReactorPanelProps) {
  const [fleetFlags, setFleetFlags] = useState<Record<FleetCommand, boolean>>({
    reactor: false,
    split: false,
    battery: false,
  });
  const [fleetResult, setFleetResult] = useState<string[] | null>(null);
  const forFleet = (command: FleetCommand) =>
    fleetMembers && fleetFlags[command] ? fleetMembers : null;

  /** STU runs fleet commands ship by ship; one failure never blocks the others. */
  async function runForFleet(
    members: Array<{ id: number; name: string }>,
    title: string,
    request: (id: number) => Promise<unknown>,
  ) {
    const failures: string[] = [];
    for (const member of members) {
      try {
        await request(member.id);
      } catch (err: unknown) {
        failures.push(
          `${stripShipNameBbCode(member.name)}: ${err instanceof Error ? err.message : 'fehlgeschlagen'}`,
        );
      }
    }
    setFleetResult([`Flottenbefehl ausgeführt: ${title}`, ...failures]);
  }

  const fleetBox = (command: FleetCommand) =>
    fleetMembers && (
      <label className="ml-auto inline-flex items-center gap-1 text-[10px] text-swu-muted">
        <input
          type="checkbox"
          aria-label={`Flottenbefehl ${FLEET_COMMAND_LABELS[command]}`}
          checked={fleetFlags[command]}
          onChange={(event) =>
            setFleetFlags((current) => ({
              ...current,
              [command]: event.target.checked,
            }))
          }
        />
        Flotte
      </label>
    );
  const [split, setSplit] = useState(reactorWarpSplit);
  const [autoCarryOver, setAutoCarryOver] = useState(reactorAutoCarryOver);
  const [confirmedDistribution, setConfirmedDistribution] = useState({
    split: reactorWarpSplit,
    autoCarryOver: reactorAutoCarryOver,
  });
  const [savingSplit, setSavingSplit] = useState(false);
  const [flow, setFlow] = useState<SpacecraftEnergyFlowDto | null>(null);
  const [engineering, setEngineering] = useState<'reactor' | 'battery' | null>(
    null,
  );
  const [amount, setAmount] = useState(1);
  const [transferTargets, setTransferTargets] = useState<
    SpacecraftReactorTransferTargetDto[] | null
  >(null);
  const [transferAmounts, setTransferAmounts] = useState<
    Record<number, number>
  >({});
  const [transferringCharge, setTransferringCharge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSplit(reactorWarpSplit);
    setAutoCarryOver(reactorAutoCarryOver);
    setConfirmedDistribution({
      split: reactorWarpSplit,
      autoCarryOver: reactorAutoCarryOver,
    });
  }, [reactorAutoCarryOver, reactorWarpSplit]);

  useEffect(() => {
    api
      .get<SpacecraftEnergyFlowDto>(`/spacecraft/${shipId}/energy-flow`)
      .then(setFlow)
      .catch(() => setFlow(null));
  }, [shipId, reactorAutoCarryOver, reactorWarpSplit, warpdrive]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const updateDistribution = useCallback(
    (nextSplit: number, nextAutoCarryOver: boolean, debounce = true) => {
      const clamped = Math.max(0, Math.min(100, nextSplit));
      setSplit(clamped);
      setAutoCarryOver(nextAutoCarryOver);
      setError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const save = async () => {
        setSavingSplit(true);
        try {
          const result = await api.patch<{
            reactorWarpSplit: number;
            reactorAutoCarryOver: boolean;
          }>(`/spacecraft/${shipId}/reactor-distribution`, {
            warpSplit: clamped,
            autoCarryOver: nextAutoCarryOver,
          });
          setConfirmedDistribution({
            split: result.reactorWarpSplit,
            autoCarryOver: result.reactorAutoCarryOver,
          });
          const members = forFleet('split');
          if (members) {
            await runForFleet(
              members.filter((member) => member.id !== shipId),
              `Reaktorleistung geht zu ${100 - clamped} Prozent in den Hyperantrieb (Übertrag ${nextAutoCarryOver ? 'aktiviert' : 'deaktiviert'})`,
              (id) =>
                api.patch(`/spacecraft/${id}/reactor-distribution`, {
                  warpSplit: clamped,
                  autoCarryOver: nextAutoCarryOver,
                }),
            );
          }
          onUpdate();
        } catch (err: unknown) {
          setSplit(confirmedDistribution.split);
          setAutoCarryOver(confirmedDistribution.autoCarryOver);
          setError(
            err instanceof Error
              ? err.message
              : 'Reaktorverteilung fehlgeschlagen',
          );
        } finally {
          setSavingSplit(false);
        }
      };
      if (debounce) debounceRef.current = setTimeout(() => void save(), 300);
      else void save();
    },
    [confirmedDistribution, shipId, onUpdate, fleetFlags, fleetMembers],
  );

  async function transferEngineering(
    action: 'reactor/load' | 'battery/discharge',
    requested: number | 'MAX',
  ) {
    const command = action.startsWith('reactor') ? 'reactor' : 'battery';
    setEngineering(command);
    setError(null);
    try {
      const members = forFleet(command);
      if (members) {
        await runForFleet(
          members,
          command === 'reactor'
            ? 'Aufladung des Reaktors'
            : 'Ersatzbatterie entladen',
          (id) =>
            api.post(`/spacecraft/${id}/${action}`, { amount: requested }),
        );
      } else {
        await api.post(`/spacecraft/${shipId}/${action}`, {
          amount: requested,
        });
      }
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setEngineering(null);
    }
  }

  async function openReactorTransfer() {
    setError(null);
    try {
      const targets = await api.get<SpacecraftReactorTransferTargetDto[]>(
        `/spacecraft/${shipId}/reactor-transfer-targets`,
      );
      setTransferTargets(targets);
      setTransferAmounts(
        Object.fromEntries(targets.map((target) => [target.shipId, 0])),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transferziele fehlen');
    }
  }

  async function transferReactorCharge() {
    const transfers = Object.entries(transferAmounts)
      .map(([targetShipId, transferAmount]) => ({
        targetShipId: Number(targetShipId),
        amount: transferAmount,
      }))
      .filter((transfer) => transfer.amount > 0);
    if (!transfers.length) return;
    setTransferringCharge(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/reactor-charge/transfer`, {
        transfers,
      });
      setTransferTargets(null);
      onUpdate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setTransferringCharge(false);
    }
  }

  async function toggleHyperdrive() {
    setError(null);
    try {
      await api.patch(`/spacecraft/${shipId}/systems/WARPDRIVE`, {
        active: !hyperdriveActive,
      });
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Hyperantrieb konnte nicht umgeschaltet werden',
      );
    }
  }

  const warpProduction = flow?.warpProduction ?? 0;
  const epsProduction = flow?.epsProduction ?? 0;

  if (!hasReactor && !hasWarpdrive && batteryMax <= 0) return null;
  return (
    <section
      aria-labelledby="reactor-panel-heading"
      className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h3
        id="reactor-panel-heading"
        className="mb-2 border-b border-swu-border/60 pb-1 text-center font-bold text-swu-primary"
      >
        <img
          src="/assets/buttons/fusrkt.png"
          alt=""
          aria-hidden="true"
          className="mr-1 inline size-5 align-middle"
        />
        Reaktor + Antrieb
      </h3>

      <div className="overflow-hidden rounded-md border border-swu-border/60 divide-y divide-swu-border/60">
        {hasReactor && (
          <div className="flex flex-wrap items-center gap-2 p-2">
            <img
              src="/assets/buttons/fusrkt.png"
              alt=""
              aria-hidden="true"
              className="size-4"
            />
            <span className="flex-1 font-mono text-swu-primary">
              Reaktortreibstoff {reactorFuel}/{reactorFuelMax}
            </span>
            <EngineeringControls
              label="aufladen"
              amountLabel="Reaktor laden Menge"
              pending={engineering === 'reactor'}
              amount={amount}
              onAmount={setAmount}
              onSubmit={(value) => transferEngineering('reactor/load', value)}
            />
            {fleetBox('reactor')}
            {canTransferReactorCharge && (
              <button
                type="button"
                onClick={() => void openReactorTransfer()}
                className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5"
              >
                Reaktorladung übertragen
              </button>
            )}
          </div>
        )}

        {transferTargets && (
          <div className="space-y-1 p-2">
            {transferTargets.map((target) => (
              <label key={target.shipId} className="flex items-center gap-2">
                <span className="flex-1">
                  <ShipName name={target.name} /> {target.reactorFuel}/{target.reactorFuelMax}
                </span>
                <input
                  aria-label={`${stripShipNameBbCode(target.name)} Transfermenge`}
                  type="number"
                  min={0}
                  max={target.reactorFuelMax - target.reactorFuel}
                  value={transferAmounts[target.shipId] ?? 0}
                  onChange={(event) =>
                    setTransferAmounts((current) => ({
                      ...current,
                      [target.shipId]: Math.max(
                        0,
                        Math.min(
                          target.reactorFuelMax - target.reactorFuel,
                          Number(event.target.value) || 0,
                        ),
                      ),
                    }))
                  }
                  className="w-14 border border-swu-border bg-swu-bg px-1"
                />
              </label>
            ))}
            <button
              type="button"
              disabled={transferringCharge}
              onClick={() => void transferReactorCharge()}
              className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40"
            >
              Transfer ausführen
            </button>
          </div>
        )}

        {hasWarpdrive && (
          <div className="space-y-2 p-2">
            <div className="flex items-center gap-1">
              <img
                src="/assets/buttons/wkp2.png"
                alt=""
                aria-hidden="true"
                className="size-5"
              />
              <span className="w-6 font-mono text-swu-primary">
                {warpProduction}
              </span>
              <button
                type="button"
                onClick={() => updateDistribution(split - 5, autoCarryOver)}
                disabled={savingSplit}
                aria-label="Hyperantriebsaufladung erhöhen"
                className="rounded border border-swu-border bg-black/40 px-1 text-[10px] text-swu-primary hover:border-swu-accent disabled:opacity-40"
              >
                −
              </button>
              <input
                aria-label="Reaktorverteilung EPS-Anteil"
                type="range"
                min={0}
                max={100}
                value={split}
                onChange={(event) =>
                  updateDistribution(Number(event.target.value), autoCarryOver)
                }
                className="h-2 min-w-20 flex-1 cursor-pointer appearance-none rounded bg-swu-border accent-swu-accent"
              />
              <button
                type="button"
                onClick={() => updateDistribution(split + 5, autoCarryOver)}
                disabled={savingSplit}
                aria-label="EPS-Anteil erhöhen"
                className="rounded border border-swu-border bg-black/40 px-1 text-[10px] text-swu-primary hover:border-swu-accent disabled:opacity-40"
              >
                +
              </button>
              <img
                src="/assets/buttons/battp2.png"
                alt=""
                aria-hidden="true"
                className="size-5"
              />
              <span className="w-6 font-mono text-swu-primary">
                +{epsProduction}
              </span>
            </div>
            <label
              title="Überschüssige Energie wird in andere Speicher übertragen"
              className="inline-flex items-center gap-1 text-[10px] text-swu-muted"
            >
              <img
                src="/assets/buttons/transfer.png"
                alt=""
                aria-hidden="true"
                className="h-5 w-auto"
              />
              <input
                type="checkbox"
                checked={autoCarryOver}
                disabled={savingSplit}
                onChange={(event) =>
                  updateDistribution(split, event.target.checked, false)
                }
                aria-label="Überschüssige Energie übertragen"
                className="accent-swu-accent"
              />
            </label>
            {fleetBox('split')}
          </div>
        )}

        {hasWarpdrive && !inSystem && (
          <div className="flex items-center justify-between gap-2 p-2">
            <span className="font-mono text-swu-primary">
              Hyperantrieb {warpdrive}/{warpdriveMax}
            </span>
            <button
              type="button"
              onClick={() => void toggleHyperdrive()}
              className="rounded border border-swu-border px-2 py-0.5 text-[10px] text-swu-primary hover:border-swu-accent"
            >
              {hyperdriveActive ? 'deaktivieren' : 'aktivieren'}
            </button>
          </div>
        )}

        {/* STU isWarpPossible: warp drive present and outside a system. */}
        {hasWarpdrive && !inSystem && (
          <SignatureMaskRow shipId={shipId} onRefresh={onUpdate} />
        )}

        {batteryMax > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2">
            <img
              src="/assets/buttons/batt.png"
              alt=""
              aria-hidden="true"
              className="size-4"
            />
            <span className="flex-1 font-mono text-swu-primary">
              Ersatzbatterie {battery}/{batteryMax}
            </span>
            <EngineeringControls
              label="entladen"
              amountLabel="Batterie entladen Menge"
              pending={engineering === 'battery'}
              amount={amount}
              onAmount={setAmount}
              onSubmit={(value) =>
                transferEngineering('battery/discharge', value)
              }
            />
            {fleetBox('battery')}
          </div>
        )}
      </div>
      {fleetResult && (
        <ul role="status" className="mt-2 text-[11px] text-swu-primary">
          {fleetResult.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

function EngineeringControls({
  label,
  amountLabel,
  pending,
  amount,
  onAmount,
  onSubmit,
}: {
  label: string;
  amountLabel: string;
  pending: boolean;
  amount: number;
  onAmount: (amount: number) => void;
  onSubmit: (amount: number | 'MAX') => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <label className="sr-only" htmlFor={`${amountLabel}-amount`}>
        Menge
      </label>
      <input
        id={`${amountLabel}-amount`}
        aria-label={amountLabel}
        type="number"
        min={1}
        value={amount}
        onChange={(event) =>
          onAmount(Math.max(1, Number(event.target.value) || 1))
        }
        className="w-12 border border-swu-border bg-swu-bg px-1 text-xs"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit(amount)}
        className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40"
      >
        {pending ? 'läuft…' : label}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit('MAX')}
        className="border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5 disabled:opacity-40"
      >
        max
      </button>
    </div>
  );
}
