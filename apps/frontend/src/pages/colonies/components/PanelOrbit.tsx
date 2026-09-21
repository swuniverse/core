import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { shipImage } from '../../../lib/assets';
import { TransferDialog } from '../../../components/spacecraft/TransferDialog';
import type { ColonyDetailV2, CommodityDef } from '../types';
import { OrbitalManagementPanel } from './OrbitalManagementPanel';

type OrbitShip = ColonyDetailV2['orbitShips'][number];

type PanelOrbitProps = {
  colonyId: number;
  orbitShips: ColonyDetailV2['orbitShips'];
  orbitBlockers?: ColonyDetailV2['orbitBlockers'];
  inventory?: ColonyDetailV2['inventory'];
  commodityMap: Record<number, CommodityDef>;
  isBlockaded?: boolean;
  onLandShip: (shipId: number) => Promise<void> | void;
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
};

export function PanelOrbit({
  colonyId,
  orbitShips,
  compact = false,
  onOpenManagement,
}: PanelOrbitProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    orbitShips[0]?.id ?? null,
  );
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [transfer, setTransfer] = useState<'TO_SHIP' | 'TO_COLONY' | null>(
    null,
  );
  const selected =
    orbitShips.find((ship) => ship.id === selectedId) ?? orbitShips[0] ?? null;

  useEffect(() => {
    if (!orbitShips.some((ship) => ship.id === selectedId)) {
      setSelectedId(orbitShips[0]?.id ?? null);
      setSelectorOpen(false);
    }
  }, [orbitShips, selectedId]);

  const groups = useMemo(() => {
    const result = new Map<string, OrbitShip[]>();
    for (const ship of orbitShips) {
      const label = ship.orbitGroupLabel ?? 'Einzelschiffe';
      result.set(label, [...(result.get(label) ?? []), ship]);
    }
    return [...result.entries()];
  }, [orbitShips]);

  return (
    <section className="space-y-2">
      {compact ? (
        !selected ? (
          <div className="border border-swu-border bg-swu-surface p-3 text-xs text-swu-muted">
            Keine Schiffe im Orbit.
          </div>
        ) : (
          <div className="border border-swu-border bg-swu-surface text-xs">
            <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
              Schiffe im Orbit
            </h3>
            <OrbitShipCard ship={selected} openShip={selected.canManage} />
            <div className="flex items-center gap-2 border-t border-swu-border p-2">
              <button
                type="button"
                onClick={() => setTransfer('TO_COLONY')}
                title="Von Schiff zur Kolonie entladen"
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
                title="Von Kolonie zum Schiff verladen"
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
              <button
                type="button"
                onClick={onOpenManagement}
                className="ml-auto border border-swu-accent/60 px-2 py-1 text-swu-accent hover:border-swu-accent"
              >
                Orbitalmanagement
              </button>
            </div>
          </div>
        )
      ) : (
        <OrbitalManagementPanel colonyId={colonyId} />
      )}
      {transfer && selected && (
        <TransferDialog
          shipId={selected.id}
          colonyId={colonyId}
          colonyName={`Kolonie ${colonyId}`}
          direction={transfer}
          onClose={() => setTransfer(null)}
          onTransfer={() => {}}
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
  groups: Array<[string, OrbitShip[]]>;
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
            {ships.map((ship) => (
              <button
                key={ship.id}
                type="button"
                onClick={() => onSelect(ship.id)}
                aria-pressed={ship.id === selectedId}
                className="block w-full border-b border-swu-border text-left aria-pressed:bg-swu-accent/10"
              >
                <OrbitShipCard ship={ship} />
              </button>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
