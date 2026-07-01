import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { NavigationPanel } from '../components/spacecraft/NavigationPanel';
import { ShipHeaderTable } from '../components/spacecraft/ShipHeaderTable';
import { ShipInformationPanel } from '../components/spacecraft/ShipInformationPanel';
import type { LocalMapResponse } from '../components/spacecraft/LssMap';
import { ApiError } from '../services/api';

interface Spacecraft {
  id: number;
  name: string;
  shipClassId: number;
  shipClassName?: string;
  shipClassKey?: string | null;
  isColonizer?: boolean;
  colonizerTier?: number | null;
  colonizationBuildingId?: number | null;
  inSystem?: boolean;
  currentSystemFieldX?: number | null;
  currentSystemFieldY?: number | null;
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

const STATUS_LABELS: Record<string, string> = {
  DOCKED: 'Angedockt',
  IN_FLIGHT: 'Im Flug',
  IN_COMBAT: 'Im Kampf',
  DESTROYED: 'Zerstört',
};

const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Grün',
  YELLOW: 'Gelb',
  RED: 'Rot',
};

export function SpacecraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ship, setShip] = useState<Spacecraft | null>(null);
  const [localMap, setLocalMap] = useState<LocalMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [colonizationMessage, setColonizationMessage] = useState<string | null>(
    null,
  );

  const fetchShip = useCallback(async () => {
    const data = await api.get<Spacecraft>(`/spacecraft/${id}`);
    setShip(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetchShip();
  }, [fetchShip]);

  useEffect(() => {
    if (ship?.status !== 'IN_FLIGHT') return;
    const interval = setInterval(() => void fetchShip(), 5000);
    return () => clearInterval(interval);
  }, [ship?.status, fetchShip]);

  if (loading)
    return (
      <div className="p-3 text-swu-muted md:p-6">Schiff wird geladen...</div>
    );

  if (!ship)
    return (
      <div className="p-3 md:p-6">
        <p className="text-swu-muted">Schiff nicht gefunden.</p>
        <Link to="/spacecraft" className="text-swu-accent text-sm">
          ← Zurück
        </Link>
      </div>
    );

  return (
    <div className="p-3 md:p-6">
      <Link
        to="/spacecraft"
        className="text-xs text-swu-muted hover:text-swu-accent mb-3 inline-block"
      >
        ← Schiffsliste
      </Link>

      <ShipHeaderTable ship={ship} />

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,2fr)_360px]">
        <NavigationPanel
          ship={ship}
          onShipUpdate={fetchShip}
          onLocalMapChange={setLocalMap}
        />
        <ShipInformationPanel localMap={localMap} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-swu-muted uppercase">
            Schiffskontrolle
          </h3>
          <StatRow
            label="Alarm"
            value={ALERT_LABELS[ship.alertState] ?? ship.alertState}
          />
          <StatRow
            label="Status"
            value={STATUS_LABELS[ship.status] ?? ship.status}
          />
          <StatRow
            label="Schilde"
            value={`${ship.shields}/${ship.shieldsMax}`}
          />
        </div>
        <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-swu-muted uppercase">
            Reaktor + Antrieb
          </h3>
          <StatRow label="EPS" value={`${ship.energy}/${ship.energyMax}`} />
          <StatRow label="Warp" value={`${ship.warpSpeed}`} />
          <StatRow
            label="Cooldown"
            value={ship.warpCooldown > 0 ? `${ship.warpCooldown}T` : '—'}
          />
        </div>
        <div className="bg-swu-surface border border-swu-border rounded-lg p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-swu-muted uppercase">
            Kapazität
          </h3>
          <StatRow label="Crew" value={`${ship.crew}/${ship.crewMax}`} />
          <StatRow
            label="Cargo"
            value={`${ship.cargoUsed ?? 0}/${ship.cargoMax ?? 0}`}
          />
          <StatRow label="Flotte" value={ship.fleetName || '—'} />
        </div>
      </div>

      {ship.isColonizer && (
        <ColonizationPanel
          ship={ship}
          localMap={localMap}
          message={colonizationMessage}
          onMessage={setColonizationMessage}
          onColonized={fetchShip}
        />
      )}

      <div className="mt-3">
        <CargoPanel
          shipId={ship.id}
          cargoMax={ship.cargoMax ?? 0}
          onTransfer={fetchShip}
        />
      </div>
    </div>
  );
}

interface ColonizationTargetCheck {
  canColonize: boolean;
  reasons: string[];
  target: {
    id: number;
    classId: number | null;
    classGate: string | null;
    limitType: string | null;
  } | null;
}

function ColonizationPanel({
  ship,
  localMap,
  message,
  onMessage,
  onColonized,
}: {
  ship: Spacecraft;
  localMap: LocalMapResponse | null;
  message: string | null;
  onMessage: (message: string | null) => void;
  onColonized: () => void;
}) {
  const [targetCheck, setTargetCheck] =
    useState<ColonizationTargetCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const currentObject =
    localMap?.mode === 'system'
      ? localMap.fields.find(
          (field) =>
            field.sx === localMap.shipX &&
            field.sy === localMap.shipY &&
            field.celestialObject,
        )?.celestialObject
      : null;

  useEffect(() => {
    let cancelled = false;
    if (!currentObject) {
      setTargetCheck(null);
      return;
    }
    setChecking(true);
    api
      .get<ColonizationTargetCheck>(
        `/colonization/targets/${currentObject.id}?shipId=${ship.id}`,
      )
      .then((result) => {
        if (!cancelled) setTargetCheck(result);
      })
      .catch(() => {
        if (!cancelled) setTargetCheck(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentObject?.id, ship.id]);

  const canTry =
    Boolean(currentObject?.isColonizable) && Boolean(targetCheck?.canColonize);

  const colonize = async () => {
    if (!currentObject) return;
    if (
      !window.confirm(
        `${currentObject.name ?? 'Dieses Objekt'} kolonisieren? Das Kolonieschiff wird verbraucht.`,
      )
    ) {
      return;
    }
    onMessage(null);
    try {
      const result = await api.post<
        { success: true; colonyId: number; consumedShipId: number },
        { celestialObjectId: number }
      >(`/spacecraft/${ship.id}/colonize`, {
        celestialObjectId: currentObject.id,
      });
      onMessage(
        `Kolonie #${result.colonyId} gegründet. Kolonieschiff verbraucht.`,
      );
      onColonized();
    } catch (e: unknown) {
      onMessage(
        e instanceof ApiError || e instanceof Error
          ? e.message
          : 'Kolonisierung fehlgeschlagen',
      );
    }
  };

  return (
    <div className="mt-3 bg-swu-surface border border-swu-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-bold text-swu-muted uppercase">
            Kolonieschiff
          </h3>
          <p className="text-[11px] text-swu-muted">
            Tier {ship.colonizerTier ?? 1} · Ziel muss exakt auf dem aktuellen
            Systemfeld liegen.
          </p>
        </div>
        <button
          type="button"
          disabled={!canTry || checking}
          onClick={colonize}
          className="rounded bg-swu-accent px-3 py-1.5 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checking ? 'Prüfe…' : 'Kolonie gründen'}
        </button>
      </div>
      <div className="text-[11px] text-swu-muted">
        Aktuelles Ziel:{' '}
        <span className="text-swu-primary">
          {currentObject
            ? `${currentObject.name ?? 'Unbenannt'}${currentObject.isColonizable ? ' (kolonisierbar)' : ' (nicht kolonisierbar)'}`
            : 'kein Himmelskörper auf diesem Feld'}
        </span>
      </div>
      {targetCheck?.reasons && targetCheck.reasons.length > 0 && (
        <ul className="list-disc pl-5 text-[11px] text-amber-300">
          {targetCheck.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {message && <div className="text-[11px] text-swu-accent">{message}</div>}
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
