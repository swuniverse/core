import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { shipImage } from '../../../lib/assets';
import { TransferDialog } from '../../../components/spacecraft/TransferDialog';
import type { ColonyDetailV2, CommodityDef } from '../types';
import { OrbitalManagementPanel } from './OrbitalManagementPanel';

type OrbitShip = ColonyDetailV2['orbitShips'][number];
type ForeignOrbitShip = NonNullable<ColonyDetailV2['foreignOrbitShips']>[number];
type OrbitEntry =
  | { foreign: false; id: number; ship: OrbitShip }
  | { foreign: true; id: number; ship: ForeignOrbitShip };

const FOREIGN_BEAM_BLOCKED = 'Beamen zu fremden Schiffen ist noch nicht möglich';

type PanelOrbitProps = {
  colonyId: number;
  orbitShips: ColonyDetailV2['orbitShips'];
  foreignOrbitShips?: ColonyDetailV2['foreignOrbitShips'];
  orbitBlockers?: ColonyDetailV2['orbitBlockers'];
  inventory?: ColonyDetailV2['inventory'];
  commodityMap: Record<number, CommodityDef>;
  isBlockaded?: boolean;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
  onDefendShip: (shipId: number) => Promise<void> | void;
  onBlockadeShip: (shipId: number) => Promise<void> | void;
  onClearOrbitOrder: (shipId: number) => Promise<void> | void;
  onTransferShuttles: (
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ) => Promise<void> | void;
  compact?: boolean;
  onOpenManagement?: () => void;
  showHeading?: boolean;
  showManagementButton?: boolean;
};

export function PanelOrbit({
  colonyId,
  orbitShips,
  foreignOrbitShips = [],
  compact = false,
  onOpenManagement,
  showHeading = true,
  showManagementButton = true,
}: PanelOrbitProps) {
  const entries = useMemo<OrbitEntry[]>(
    () => [
      ...orbitShips.map((ship) => ({ foreign: false as const, id: ship.id, ship })),
      ...foreignOrbitShips.map((ship) => ({ foreign: true as const, id: ship.id, ship })),
    ],
    [orbitShips, foreignOrbitShips],
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    entries[0]?.id ?? null,
  );
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [transfer, setTransfer] = useState<'TO_SHIP' | 'TO_COLONY' | null>(
    null,
  );
  const selected =
    entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;

  useEffect(() => {
    setSelectedId(entries[0]?.id ?? null);
    setSelectorOpen(false);
    setTransfer(null);
  }, [colonyId]);

  useEffect(() => {
    if (!entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(entries[0]?.id ?? null);
      setSelectorOpen(false);
    }
  }, [entries, selectedId]);

  // STU groups by fleet and names the owner of foreign groups.
  const groups = useMemo(() => {
    const result = new Map<string, OrbitEntry[]>();
    for (const entry of entries) {
      const label = entry.foreign
        ? `${entry.ship.fleetName ?? (entry.ship.fleetId != null ? `Flotte #${entry.ship.fleetId}` : 'Einzelschiffe')} von ${entry.ship.ownerName ?? 'Unbekannt'}`
        : (entry.ship.orbitGroupLabel ?? 'Einzelschiffe');
      result.set(label, [...(result.get(label) ?? []), entry]);
    }
    return [...result.entries()];
  }, [entries]);

  return (
    <section className="space-y-2">
      {compact ? (
        !selected ? (
          <div className="border border-swu-border bg-swu-surface p-3 text-xs text-swu-muted">
            Keine Schiffe im Orbit.
          </div>
        ) : (
          <div className="border border-swu-border bg-swu-surface text-xs">
            {showHeading && (
              <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
                Schiffe im Orbit
              </h3>
            )}
            <OrbitEntryCard entry={selected} openShip />
            <div className="flex items-center gap-2 border-t border-swu-border p-2">
              <button
                type="button"
                onClick={() => setTransfer('TO_COLONY')}
                disabled={selected.foreign}
                title={selected.foreign ? FOREIGN_BEAM_BLOCKED : 'Von Schiff zur Kolonie entladen'}
                className="disabled:opacity-40"
              >
                <img
                  src="/assets/buttons/b_down1.png"
                  alt="Entladen"
                  className="size-5"
                />
              </button>
              <button
                type="button"
                onClick={() => setTransfer('TO_SHIP')}
                disabled={selected.foreign}
                title={selected.foreign ? FOREIGN_BEAM_BLOCKED : 'Von Kolonie zum Schiff verladen'}
                className="disabled:opacity-40"
              >
                <img
                  src="/assets/buttons/b_up1.png"
                  alt="Verladen"
                  className="size-5"
                />
              </button>
              <button
                type="button"
                onClick={() => setSelectorOpen(true)}
                title="Schiffe im Orbit auswählen"
                className="ml-1 border border-swu-border p-0.5"
              >
                <img
                  src="/assets/buttons/fleet.png"
                  alt="Schiffe auswählen"
                  className="size-5"
                />
              </button>
              {showManagementButton && (
                <button
                  type="button"
                  onClick={onOpenManagement}
                  className="ml-auto border border-swu-accent/60 px-2 py-1 text-swu-accent hover:border-swu-accent"
                >
                  Orbitalmanagement
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <OrbitalManagementPanel colonyId={colonyId} />
      )}
      {transfer && selected && !selected.foreign && (
        <TransferDialog
          shipId={selected.id}
          colonyId={colonyId}
          colonyName={`Kolonie ${colonyId}`}
          direction={transfer}
          initiator="COLONY"
          onClose={() => setTransfer(null)}
          onTransfer={() => setTransfer(null)}
        />
      )}
      {selectorOpen && (
        <OrbitSelectorDialog
          groups={groups}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setSelectorOpen(false);
          }}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </section>
  );
}

function OrbitEntryCard({ entry, openShip }: { entry: OrbitEntry; openShip?: boolean }) {
  if (!entry.foreign)
    return <OrbitShipCard ship={entry.ship} openShip={openShip && entry.ship.canManage} />;
  const ship = entry.ship;
  return (
    <div className="p-2">
      <div className="mb-1 font-bold text-swu-primary">
        {ship.name}{' '}
        <span className="font-normal text-swu-muted">
          | von {ship.ownerName ?? 'Unbekannt'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <img
          src={shipImage(ship.shipClassId, ship.shipClassKey)}
          alt=""
          className="h-9 w-16 object-contain"
        />
        <span className="text-swu-muted">{ship.shipClassName}</span>
      </div>
    </div>
  );
}

function OrbitShipCard({
  ship,
  selectable,
  onOpen,
  openShip,
}: {
  ship: OrbitShip;
  selectable?: boolean;
  onOpen?: () => void;
  openShip?: boolean;
}) {
  const content = (
    <>
      <div className="mb-1 font-bold text-swu-primary">
        {ship.name}{' '}
        <span className="font-normal text-swu-muted">
          | {ship.canManage ? 'Eigene Flotte' : 'Fremdes Schiff'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <img
          src={shipImage(ship.shipClassId, ship.shipClassKey)}
          alt=""
          className="h-9 w-16 object-contain"
        />
        <Status
          label="Hülle"
          value={`${ship.hull}/${ship.hullMax}`}
          tone="text-green-300"
        />
        <Status
          label="Schilde"
          value={`${ship.shields}/${ship.shieldsMax}`}
          tone="text-cyan-300"
        />
        <Status
          label="EPS"
          value={`${ship.energy}/${ship.energyMax}`}
          tone="text-yellow-200"
        />
        <Status
          label="Hyperantrieb"
          value={`${ship.warpdrive}/${ship.warpdriveMax}`}
          tone="text-blue-300"
        />
        <Status
          label="Crew"
          value={`${ship.crew} (${ship.crewRequired ?? 0},${ship.crewMax || 'kA'})`}
          tone="text-swu-primary"
        />
      </div>
    </>
  );
  if (openShip) {
    return (
      <Link
        to={`/spacecraft/${ship.id}`}
        title={`${ship.name} öffnen`}
        className="block cursor-pointer p-2 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-swu-accent"
      >
        {content}
      </Link>
    );
  }
  return (
    <div
      className={`p-2 ${selectable ? 'cursor-pointer hover:bg-white/5' : ''}`}
      onClick={onOpen}
    >
      {content}
    </div>
  );
}

function Status({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span className="border border-swu-border bg-black/30 px-1.5 py-1">
      <span className="text-swu-muted">{label} </span>
      <span className={`font-mono ${tone}`}>{value}</span>
    </span>
  );
}

function OrbitSelectorDialog({
  groups,
  selectedId,
  onSelect,
  onClose,
}: {
  groups: Array<[string, OrbitEntry[]]>;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Schiffe im Orbit auswählen"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[80vh] w-full max-w-2xl overflow-y-auto border border-swu-border bg-swu-bg text-xs">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">Schiffe im Orbit</h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        {groups.map(([label, ships]) => (
          <div key={label}>
            <h4 className="border-b border-swu-border bg-swu-surface px-3 py-1 font-bold text-swu-muted">
              {label}
            </h4>
            {ships.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-pressed={entry.id === selectedId}
                className="block w-full border-b border-swu-border text-left aria-pressed:bg-swu-accent/10"
              >
                <OrbitEntryCard entry={entry} />
              </button>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
