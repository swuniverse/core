import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { NavigationPanel } from '../components/spacecraft/NavigationPanel';
import { ShipHeaderTable } from '../components/spacecraft/ShipHeaderTable';
import { ShipInformationPanel } from '../components/spacecraft/ShipInformationPanel';
import type { LocalMapResponse } from '../components/spacecraft/LssMap';

interface Spacecraft {
  id: number;
  name: string;
  shipClassId: number;
  shipClassName?: string;
  shipClassKey?: string | null;
  status: string;
  alertState: string;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  energy: number;
  energyMax: number;
  warpSpeed: number;
  warpCooldown: number;
  crew: number;
  crewMax: number;
  cargoUsed?: number;
  cargoMax?: number;
  moduleCount?: number;
  fleetName?: string | null;
  locationLabel?: string;
  posX: number;
  posY: number;
  starSystem?: { id: number; name: string };
  celestialObject?: { id: number; name: string | null };
  arrivalAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DOCKED: 'text-green-400',
  IN_FLIGHT: 'text-amber-400',
  IN_COMBAT: 'text-red-400',
  DESTROYED: 'text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  DOCKED: 'Angedockt',
  IN_FLIGHT: 'Im Flug',
  IN_COMBAT: 'Im Kampf',
  DESTROYED: 'Zerstört',
};

const ALERT_COLORS: Record<string, string> = {
  GREEN: 'bg-green-500',
  YELLOW: 'bg-yellow-500',
  RED: 'bg-red-500',
};

const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Grün',
  YELLOW: 'Gelb',
  RED: 'Rot',
};

export function SpacecraftPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ships, setShips] = useState<Spacecraft[]>([]);
  const [selected, setSelected] = useState<Spacecraft | null>(null);
  const [selectedLocalMap, setSelectedLocalMap] =
    useState<LocalMapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Spacecraft[]>('/spacecraft').then((data) => {
      setShips(data);
      const requestedId = Number(searchParams.get('selected'));
      const initialShip =
        data.find((ship) => ship.id === requestedId) ?? data[0];
      if (initialShip) setSelected(initialShip);
      setLoading(false);
    });
  }, [searchParams]);

  const refresh = useCallback(async () => {
    const data = await api.get<Spacecraft[]>('/spacecraft');
    setShips(data);
    if (selected) {
      const updated = data.find((s) => s.id === selected.id);
      if (updated) {
        setSelected(updated);
        setSearchParams({ selected: String(updated.id) }, { replace: true });
      }
    }
  }, [selected, setSearchParams]);

  useEffect(() => {
    if (selected?.status !== 'IN_FLIGHT') return;
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [selected?.status, refresh]);

  if (loading)
    return <div className="p-6 text-swu-muted">Flotte wird geladen...</div>;

  if (ships.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Raumschiffe</h1>
        <p className="text-swu-muted mt-4 max-w-2xl">
          Du startest ohne Schiff. Erforsche zuerst Grundlegende
          Ingenieurswissenschaft und danach Werftbetrieb, baue einen Werfthub
          auf deiner Kolonie und konstruiere dort dein erstes Schiff.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link
            to="/research?focus=1"
            className="px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
          >
            Forschung starten
          </Link>
          <Link
            to="/colonies"
            className="px-4 py-2 border border-swu-border text-swu-text text-sm font-semibold rounded hover:border-swu-primary transition-colors"
          >
            Kolonie oeffnen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Raumschiffe</h1>
      <div className="flex gap-4">
        {/* Ship List (STU: Schiffsliste links) */}
        <div className="w-52 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {ships.map((ship) => (
            <button
              key={ship.id}
              onClick={() => {
                setSelected(ship);
                setSelectedLocalMap(null);
                setSearchParams(
                  { selected: String(ship.id) },
                  { replace: true },
                );
              }}
              className={`w-full text-left p-2 rounded border transition-colors ${
                selected?.id === ship.id
                  ? 'border-swu-accent bg-swu-accent/10'
                  : 'border-swu-border hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-xs text-swu-primary truncate">
                {ship.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${ALERT_COLORS[ship.alertState]}`}
                />
                <span className={`text-[10px] ${STATUS_COLORS[ship.status]}`}>
                  {STATUS_LABELS[ship.status] ?? ship.status}
                </span>
                <span className="text-[10px] text-swu-muted ml-auto">
                  [{ship.posX},{ship.posY}]
                </span>
              </div>
              {/* Mini bars */}
              <div className="flex gap-1 mt-1">
                <MiniBar
                  value={ship.hull}
                  max={ship.hullMax}
                  color="bg-red-500"
                />
                <MiniBar
                  value={ship.shields}
                  max={ship.shieldsMax}
                  color="bg-blue-400"
                />
                <MiniBar
                  value={ship.energy}
                  max={ship.energyMax}
                  color="bg-yellow-400"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Ship Detail (STU: Hauptansicht) */}
        {selected && (
          <div className="flex-1 space-y-3">
            <ShipHeaderTable ship={selected} />

            <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_360px]">
              <NavigationPanel
                ship={selected}
                onShipUpdate={refresh}
                onLocalMapChange={setSelectedLocalMap}
              />
              <ShipInformationPanel localMap={selectedLocalMap} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
                <h3 className="text-[10px] font-bold text-swu-muted uppercase">
                  Schiffskontrolle
                </h3>
                <StatRow label="Alarm" value={ALERT_LABELS[selected.alertState] ?? selected.alertState} />
                <StatRow label="Status" value={STATUS_LABELS[selected.status] ?? selected.status} />
                <StatRow
                  label="Schilde"
                  value={`${selected.shields}/${selected.shieldsMax}`}
                />
              </div>
              <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
                <h3 className="text-[10px] font-bold text-swu-muted uppercase">
                  Reaktor + Antrieb
                </h3>
                <StatRow
                  label="EPS"
                  value={`${selected.energy}/${selected.energyMax}`}
                />
                <StatRow label="Warp" value={`${selected.warpSpeed}`} />
                <StatRow
                  label="Cooldown"
                  value={
                    selected.warpCooldown > 0
                      ? `${selected.warpCooldown}T`
                      : '—'
                  }
                />
              </div>
              <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
                <h3 className="text-[10px] font-bold text-swu-muted uppercase">
                  Kapazität
                </h3>
                <StatRow
                  label="Crew"
                  value={`${selected.crew}/${selected.crewMax}`}
                />
                <StatRow
                  label="Cargo"
                  value={`${selected.cargoUsed ?? 0}/${selected.cargoMax ?? 0}`}
                />
                <StatRow label="Flotte" value={selected.fleetName || '—'} />
              </div>
            </div>

            <CargoPanel
              shipId={selected.id}
              cargoMax={selected.cargoMax ?? 0}
              onTransfer={refresh}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 h-1.5 bg-swu-bg rounded-full overflow-hidden border border-swu-border/50">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-swu-muted">{label}</span>
      <span className="text-swu-primary font-mono">{value}</span>
    </div>
  );
}

interface CargoItemData {
  id: number;
  commodityId: number;
  amount: number;
}

interface ColonySummary {
  id: number;
  name: string;
}

function CargoPanel({
  shipId,
  cargoMax,
  onTransfer,
}: {
  shipId: number;
  cargoMax: number;
  onTransfer: () => void;
}) {
  const [cargo, setCargo] = useState<CargoItemData[]>([]);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [selectedColony, setSelectedColony] = useState<number | null>(null);
  const [transferCommodity, setTransferCommodity] = useState<number>(1);
  const [transferAmount, setTransferAmount] = useState<number>(10);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<CargoItemData[]>(`/spacecraft/${shipId}/cargo`).then(setCargo);
    api.get<ColonySummary[]>('/colonies').then((c) => {
      setColonies(c);
      if (c.length > 0 && !selectedColony) setSelectedColony(c[0].id);
    });
  }, [shipId]);

  const handleLoad = async () => {
    if (!selectedColony) return;
    setMessage(null);
    try {
      await api.post(`/spacecraft/${shipId}/cargo/load`, {
        colonyId: selectedColony,
        commodityId: transferCommodity,
        amount: transferAmount,
      });
      const updated = await api.get<CargoItemData[]>(
        `/spacecraft/${shipId}/cargo`,
      );
      setCargo(updated);
      onTransfer();
      setMessage('Beladen erfolgreich');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleUnload = async () => {
    if (!selectedColony) return;
    setMessage(null);
    try {
      await api.post(`/spacecraft/${shipId}/cargo/unload`, {
        colonyId: selectedColony,
        commodityId: transferCommodity,
        amount: transferAmount,
      });
      const updated = await api.get<CargoItemData[]>(
        `/spacecraft/${shipId}/cargo`,
      );
      setCargo(updated);
      onTransfer();
      setMessage('Entladen erfolgreich');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const cargoUsed = cargo.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-swu-surface border border-swu-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold text-swu-muted uppercase">
          Frachtraum
        </h3>
        <span className="text-[10px] text-swu-muted">
          {cargoUsed}/{cargoMax}
        </span>
      </div>

      {cargo.length > 0 ? (
        <div className="grid grid-cols-4 gap-1 mb-3">
          {cargo.map((item) => (
            <div
              key={item.id}
              className="bg-swu-bg/50 border border-swu-border/30 rounded px-2 py-1 text-[10px]"
            >
              <span className="text-swu-muted">#{item.commodityId}</span>
              <span className="text-swu-primary font-mono ml-1">
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-swu-muted mb-3">Frachtraum leer</p>
      )}

      {colonies.length > 0 && (
        <div className="border-t border-swu-border/50 pt-2 space-y-2">
          <div className="flex gap-2 items-center">
            <select
              value={selectedColony ?? ''}
              onChange={(e) => setSelectedColony(Number(e.target.value))}
              className="flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
            >
              {colonies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={transferCommodity}
              onChange={(e) => setTransferCommodity(Number(e.target.value))}
              className="w-14 px-1 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary text-center"
              title="Commodity ID"
            />
            <input
              type="number"
              min={1}
              value={transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              className="w-16 px-1 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary text-center"
              title="Menge"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleLoad()}
              className="flex-1 px-2 py-1 rounded border border-green-500/60 bg-green-500/10 text-[10px] font-bold text-green-300 hover:bg-green-500/20"
            >
              Beladen
            </button>
            <button
              onClick={() => void handleUnload()}
              className="flex-1 px-2 py-1 rounded border border-amber-500/60 bg-amber-500/10 text-[10px] font-bold text-amber-300 hover:bg-amber-500/20"
            >
              Entladen
            </button>
          </div>
          {message && <p className="text-[10px] text-swu-muted">{message}</p>}
        </div>
      )}
    </div>
  );
}
