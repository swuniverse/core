import { useEffect, useState } from 'react';
import { commodityImage } from '../../../lib/assets';
import { api } from '../../../services/api';

type ManagementSource = {
  energy: number;
  energyMax: number;
  storage: Array<{ commodityId: number; amount: number }>;
};

type ManagementData = {
  colony?: ManagementSource;
  station?: ManagementSource;
  ships: Array<{
    id: number;
    name: string;
    shipClassId: number;
    /** Foreign ships take no crew changes and hide their state (STU). */
    foreign?: boolean;
    ownerName?: string | null;
    fleetId?: number | null;
    fleetName?: string | null;
    crew: { current: number; max: number; minimum: number } | null;
    battery: { current: number | null; max: number };
    reactor: {
      fuel: { current: number | null; max: number };
      profile: {
        label: string;
        loadUnits: number;
        costs: Array<{ commodityId: number; amount: number }>;
      };
    };
    torpedoes: { torpedoTypeId: number; amount: number } | null;
    cargo: { used: number; max: number } | null;
    shieldsActive: boolean;
    hyperdriveActive: boolean;
    orbitAssignment?: 'DEFEND' | 'BLOCKADE' | null;
  }>;
};

type OrbitalManagementPanelProps = {
  /** Colony whose orbit is managed; ignored when `endpoint` is given. */
  colonyId?: number;
  /** Management endpoint of another source, e.g. a station's `/spacecraft/:id/ship-management`. */
  endpoint?: string;
  title?: string;
  sourceLabel?: string;
};

/** Crew, battery, reactor and torpedo supply table for ships in a colony orbit or docked at a station. */
export function OrbitalManagementPanel({
  colonyId,
  endpoint = `/colonies/${colonyId}/orbital-management`,
  title = 'Orbitalmanagement',
  sourceLabel = 'Kolonie-EPS',
}: OrbitalManagementPanelProps) {
  const [data, setData] = useState<ManagementData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<
    Record<
      number,
      {
        selected: boolean;
        targetCrew: number;
        batteryCharge: number;
        reactorLoad: number;
        torpedoLoad: number;
        torpedoTypeId: number;
      }
    >
  >({});
  const [results, setResults] = useState<
    Array<{ shipId: number; applied: string[]; rejected: string[] }>
  >([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api
      .get<ManagementData>(endpoint)
      .then((next) => {
        setData(next);
        setValues(
          Object.fromEntries(
            next.ships.map((ship) => [
              ship.id,
              {
                selected: false,
                targetCrew: ship.crew?.current ?? 0,
                batteryCharge: 0,
                reactorLoad: 0,
                torpedoLoad: 0,
                torpedoTypeId: ship.torpedoes?.torpedoTypeId ?? 0,
              },
            ]),
          ),
        );
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Orbitalmanagement nicht verfügbar',
        ),
      );
  }, [endpoint]);

  if (error)
    return (
      <p role="alert" className="text-xs text-red-400">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="text-xs text-swu-muted">Orbitalmanagement wird geladen…</p>
    );

  const updateValue = (
    shipId: number,
    key:
      | 'selected'
      | 'targetCrew'
      | 'batteryCharge'
      | 'reactorLoad'
      | 'torpedoLoad'
      | 'torpedoTypeId',
    value: boolean | number,
  ) =>
    setValues((current) => ({
      ...current,
      [shipId]: {
        ...(current[shipId] ?? {
          selected: false,
          targetCrew: 0,
          batteryCharge: 0,
          reactorLoad: 0,
          torpedoLoad: 0,
          torpedoTypeId: 0,
        }),
        [key]: value,
      },
    }));
  async function execute() {
    const ships = data!.ships
      .filter((ship) => values[ship.id]?.selected)
      .map((ship) => ({
        shipId: ship.id,
        targetCrew: ownCrew(ship) ? values[ship.id].targetCrew : undefined,
        batteryCharge: values[ship.id].batteryCharge,
        reactorLoad: values[ship.id].reactorLoad,
        torpedoLoad: values[ship.id].torpedoLoad,
        torpedoTypeId: values[ship.id].torpedoTypeId || undefined,
      }));
    if (!ships.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{
        results: Array<{
          shipId: number;
          applied: string[];
          rejected: string[];
        }>;
      }>(endpoint, { ships });
      setResults(result.results);
      const next = await api.get<ManagementData>(
        endpoint,
      );
      setData(next);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Versorgung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border border-swu-border bg-swu-surface text-xs">
      <header className="flex items-center justify-between border-b border-swu-border px-2 py-1">
        <h3 className="font-bold text-swu-primary">{title}</h3>
        <span className="font-mono text-swu-muted">
          {sourceLabel} {(data.colony ?? data.station)?.energy ?? 0}/
          {(data.colony ?? data.station)?.energyMax ?? 0}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] table-fixed border-collapse">
          <thead className="text-left text-swu-muted">
            <tr>
              <th className="w-9 border border-swu-border p-1">✓</th>
              <th className="w-[18%] border border-swu-border p-1">Schiff</th>
              <th className="w-[22%] border border-swu-border p-1">Crew</th>
              <th className="w-[14%] border border-swu-border p-1">Batterie</th>
              <th className="w-[19%] border border-swu-border p-1">Reaktor</th>
              <th className="w-[16%] border border-swu-border p-1">Torpedos</th>
            </tr>
          </thead>
          <tbody>
            {groupShips(data.ships).flatMap(([label, ships]) => [
              ...(label
                ? [
                    <tr key={`group-${label}`}>
                      <td
                        colSpan={6}
                        className="border border-swu-border bg-black/30 p-1 font-bold text-swu-muted"
                      >
                        {label}
                      </td>
                    </tr>,
                  ]
                : []),
              ...ships.map((ship) => (
              <tr key={ship.id}>
                <td className="border border-swu-border p-1">
                  <input
                    aria-label={`${ship.name} auswählen`}
                    type="checkbox"
                    checked={values[ship.id]?.selected ?? false}
                    onChange={(event) =>
                      updateValue(ship.id, 'selected', event.target.checked)
                    }
                  />
                </td>
                <td className="border border-swu-border p-1 font-bold text-swu-primary">
                  <a
                    href={`/spacecraft/${ship.id}`}
                    className="hover:text-swu-accent"
                  >
                    {ship.name}
                  </a>
                  {ship.cargo && (
                    <div className="text-[10px] font-normal text-swu-muted">
                      Fracht {ship.cargo.used}/{ship.cargo.max}
                    </div>
                  )}
                </td>
                <td className="border border-swu-border p-1">
                  {!ownCrew(ship) ? (
                    <span className="text-[10px] text-swu-muted">
                      Nur bei eigenen Schiffen
                    </span>
                  ) : (
                  <>
                  <div className="mb-1 flex justify-between text-[10px] text-swu-muted">
                    <span>Crew</span>
                    <span className="font-mono">
                      {values[ship.id]?.targetCrew ?? ship.crew.current} von{' '}
                      {ship.crew.max} (Min. {ship.crew.minimum})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={`${ship.name} Crew`}
                      type="range"
                      min={0}
                      max={ship.crew.max}
                      value={values[ship.id]?.targetCrew ?? ship.crew.current}
                      onChange={(event) =>
                        updateValue(
                          ship.id,
                          'targetCrew',
                          Number(event.target.value),
                        )
                      }
                      className="h-1.5 flex-1 accent-swu-accent"
                    />
                    <span className="w-7 text-right font-mono text-swu-primary">
                      {values[ship.id]?.targetCrew ?? ship.crew.current}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateValue(ship.id, 'targetCrew', ship.crew.max)
                      }
                      className="border border-swu-border px-1 text-[10px]"
                    >
                      max
                    </button>
                  </div>
                  </>
                  )}
                </td>
                <td className="border border-swu-border p-1">
                  <div className="mb-2 flex justify-between text-[10px] text-swu-muted">
                    <span>Batterie</span>
                    <span className="font-mono text-swu-primary">
                      {ship.battery.current ?? '?'}/{ship.battery.max}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={`${ship.name} Batterie`}
                      type="number"
                      min={0}
                      value={values[ship.id]?.batteryCharge ?? 0}
                      onChange={(event) =>
                        updateValue(
                          ship.id,
                          'batteryCharge',
                          Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="w-14 border border-swu-border bg-black px-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateValue(
                          ship.id,
                          'batteryCharge',
                          ship.battery.max - (ship.battery.current ?? 0),
                        )
                      }
                      className="border border-swu-border px-1 text-[10px]"
                    >
                      max
                    </button>
                  </div>
                </td>
                <td className="border border-swu-border p-1">
                  <div className="font-mono">
                    {ship.reactor.fuel.current ?? '?'}/{ship.reactor.fuel.max}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    {ship.reactor.profile.label} · +
                    {ship.reactor.profile.loadUnits}
                    <input
                      aria-label={`${ship.name} Reaktor`}
                      type="number"
                      min={0}
                      value={values[ship.id]?.reactorLoad ?? 0}
                      onChange={(event) =>
                        updateValue(
                          ship.id,
                          'reactorLoad',
                          Math.max(0, Number(event.target.value) || 0),
                        )
                      }
                      className="ml-1 w-12 border border-swu-border bg-black px-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateValue(
                          ship.id,
                          'reactorLoad',
                          ship.reactor.fuel.max - (ship.reactor.fuel.current ?? 0),
                        )
                      }
                      className="ml-1 border border-swu-border px-1 text-[10px]"
                    >
                      max
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {ship.reactor.profile.costs.map((cost) => (
                      <span
                        key={cost.commodityId}
                        title={`${cost.amount} pro Ladepaket`}
                      >
                        <img
                          src={commodityImage(cost.commodityId)}
                          alt=""
                          className="inline size-4"
                        />
                        {cost.amount}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="border border-swu-border p-1 font-mono">
                  {ship.torpedoes
                    ? `${ship.torpedoes.torpedoTypeId}: ${ship.torpedoes.amount}`
                    : '0'}
                  <input
                    aria-label={`${ship.name} Torpedomenge`}
                    type="number"
                    min={0}
                    value={values[ship.id]?.torpedoLoad ?? 0}
                    onChange={(event) =>
                      updateValue(
                        ship.id,
                        'torpedoLoad',
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                    className="ml-1 w-12 border border-swu-border bg-black px-1"
                  />
                  <input
                    aria-label={`${ship.name} Torpedotyp`}
                    type="number"
                    min={1}
                    value={values[ship.id]?.torpedoTypeId ?? 0}
                    onChange={(event) =>
                      updateValue(
                        ship.id,
                        'torpedoTypeId',
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                    className="ml-1 w-10 border border-swu-border bg-black px-1"
                  />
                  <button
                    type="button"
                    onClick={() => updateValue(ship.id, 'torpedoLoad', 99)}
                    className="ml-1 border border-swu-border px-1 text-[10px]"
                  >
                    max
                  </button>
                </td>
              </tr>
              )),
            ])}
            {data.ships.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="border border-swu-border p-2 text-swu-muted"
                >
                  Keine Schiffe verfügbar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-swu-border p-2">
        <button
          type="button"
          disabled={
            pending || !data.ships.some((ship) => values[ship.id]?.selected)
          }
          onClick={() => void execute()}
          className="border border-swu-accent px-3 py-1 text-swu-accent disabled:opacity-40"
        >
          {pending ? 'Versorge…' : 'Ausführen'}
        </button>
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
      </div>
      {results.map((result) => (
        <p
          key={result.shipId}
          className="border-t border-swu-border px-2 py-1 text-[10px]"
        >
          Schiff #{result.shipId}:{' '}
          <span className="text-green-300">{result.applied.join(', ')}</span>{' '}
          <span className="text-red-300">{result.rejected.join(', ')}</span>
        </p>
      ))}
    </section>
  );
}

type ManagedShip = ManagementData['ships'][number];

function ownCrew(ship: ManagedShip): ship is ManagedShip & { crew: NonNullable<ManagedShip['crew']> } {
  return !ship.foreign && ship.crew != null;
}

/** STU management groups: fleet (or single ships) and owner; no headings without that data. */
function groupShips(ships: ManagedShip[]): Array<[string, ManagedShip[]]> {
  const groups = new Map<string, ManagedShip[]>();
  for (const ship of ships) {
    const fleet =
      ship.fleetName ?? (ship.fleetId != null ? `Flotte #${ship.fleetId}` : 'Einzelschiffe');
    const label =
      ship.ownerName === undefined && ship.fleetName === undefined
        ? ''
        : ship.ownerName
          ? `${fleet} von ${ship.ownerName}`
          : fleet;
    groups.set(label, [...(groups.get(label) ?? []), ship]);
  }
  return [...groups.entries()];
}

