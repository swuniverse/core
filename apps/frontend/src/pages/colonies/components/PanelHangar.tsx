import { useState } from 'react';
import type { ColonyDetailV2, CommodityDef } from '../types';

// ─── Panel: Hangar ───────────────────────────────────────────

export function PanelHangar({
  hangar,
  orbitShips,
  commodityMap,
  onBuildAirfieldRump,
  onStartHangarShip,
  onLandShip,
}: {
  hangar: NonNullable<ColonyDetailV2['hangar']>;
  orbitShips: ColonyDetailV2['orbitShips'];
  commodityMap: Record<number, CommodityDef>;
  onBuildAirfieldRump: (
    shipClassId: number,
    amount: number,
  ) => Promise<void> | void;
  onStartHangarShip: (
    shipClassId: number,
    name?: string,
  ) => Promise<void> | void;
  onLandShip: (shipId: number) => Promise<void> | void;
}) {
  const [amountByClass, setAmountByClass] = useState<Record<number, number>>(
    {},
  );
  const [nameByClass, setNameByClass] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hangar-Aktion fehlgeschlagen');
    } finally {
      setBusy(null);
    }
  };

  const landableIds = new Set(hangar.landableOrbitShips.map((ship) => ship.id));
  const landableShips = orbitShips.filter((ship) => landableIds.has(ship.id));

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Hangarbestand
        </div>
        {hangar.inventory.every((item) => item.amount <= 0) ? (
          <div className="text-swu-muted">Keine Rümpfe im Hangar.</div>
        ) : (
          <div className="space-y-1">
            {hangar.inventory
              .filter((item) => item.amount > 0)
              .map((item) => (
                <div
                  key={item.hangarCommodityId}
                  className="flex justify-between"
                >
                  <span className="text-swu-primary">{item.displayName}</span>
                  <span className="font-mono text-swu-muted">
                    ×{item.amount}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Rumpf bauen
        </div>
        {!hangar.hasAirfield && (
          <div className="text-red-400">Aktiver Raumhafen erforderlich.</div>
        )}
        {hangar.buildable.map((item) => {
          const amount = amountByClass[item.shipClassId] ?? 1;
          return (
            <div
              key={item.shipClassId}
              className="border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold text-swu-primary">
                    {item.shipClassName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Energie Bau {item.buildEnergyCost} · Start{' '}
                    {item.startEnergyCost} · Crew {item.crewRequired}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Kosten:{' '}
                    {item.buildCosts
                      .map(
                        (cost) =>
                          `${cost.amount} ${commodityMap[cost.commodityId]?.name ?? `#${cost.commodityId}`}`,
                      )
                      .join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={amount}
                    onChange={(e) =>
                      setAmountByClass((current) => ({
                        ...current,
                        [item.shipClassId]: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      }))
                    }
                    className="w-16 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                  />
                  <button
                    onClick={() =>
                      run(`build-${item.shipClassId}`, () =>
                        onBuildAirfieldRump(item.shipClassId, amount),
                      )
                    }
                    disabled={
                      !hangar.hasAirfield ||
                      busy === `build-${item.shipClassId}`
                    }
                    className="px-2 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] rounded disabled:opacity-40"
                  >
                    Bauen
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Startbereit
        </div>
        {hangar.startable.filter((item) => item.amount > 0).length === 0 ? (
          <div className="text-swu-muted">Keine startbaren Rümpfe.</div>
        ) : (
          hangar.startable
            .filter((item) => item.amount > 0)
            .map((item) => (
              <div
                key={item.shipClassId}
                className="flex items-center gap-2 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="font-bold text-swu-primary">
                    {item.shipClassName} ×{item.amount}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Startenergie {item.startEnergyCost} · Crew{' '}
                    {item.crewRequired}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Name optional"
                  value={nameByClass[item.shipClassId] ?? ''}
                  onChange={(e) =>
                    setNameByClass((current) => ({
                      ...current,
                      [item.shipClassId]: e.target.value,
                    }))
                  }
                  className="w-36 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                />
                <button
                  onClick={() =>
                    run(`start-${item.shipClassId}`, () =>
                      onStartHangarShip(
                        item.shipClassId,
                        nameByClass[item.shipClassId],
                      ),
                    )
                  }
                  disabled={busy === `start-${item.shipClassId}`}
                  className="px-2 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] rounded disabled:opacity-40"
                >
                  Starten
                </button>
              </div>
            ))
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Landbare Orbit-Schiffe
        </div>
        {landableShips.length === 0 ? (
          <div className="text-swu-muted">
            Keine landbaren Schiffe im Orbit.
          </div>
        ) : (
          landableShips.map((ship) => (
            <div
              key={ship.id}
              className="flex justify-between items-center border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
            >
              <span className="text-swu-primary">{ship.name}</span>
              <button
                onClick={() =>
                  run(`land-${ship.id}`, () => onLandShip(ship.id))
                }
                disabled={busy === `land-${ship.id}`}
                className="px-2 py-1 bg-swu-primary/10 border border-swu-border text-swu-primary text-[10px] rounded disabled:opacity-40"
              >
                Landen
              </button>
            </div>
          ))
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
