import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../services/api';

interface AdminUserOption {
  id: number;
  username: string;
  email: string;
}

interface ShipClassOption {
  id: number;
  key: string;
  name: string;
  category: string;
  role: string;
  factionId: number | null;
}

interface LayerOption {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface SpawnedShip {
  id: number;
  name: string;
  userId: number;
  shipClassId: number;
  posX: number;
  posY: number;
  currentLayerId: number | null;
  status: string;
}

export function AdminShipsPage() {
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClassOption[]>([]);
  const [layers, setLayers] = useState<LayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<number | null>(null);
  const [shipClassId, setShipClassId] = useState<number | null>(null);
  const [layerId, setLayerId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [posX, setPosX] = useState(1);
  const [posY, setPosY] = useState(1);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, classesRes, layersRes] = await Promise.all([
        api.get<AdminUserOption[]>('/spacecraft/admin/users'),
        api.get<ShipClassOption[]>('/spacecraft/classes'),
        api.get<LayerOption[]>('/starmap/layers'),
      ]);
      setUsers(usersRes);
      setShipClasses(classesRes);
      setLayers(layersRes);
      setUserId((current) => current ?? usersRes[0]?.id ?? null);
      setShipClassId((current) => current ?? classesRes[0]?.id ?? null);
      setLayerId((current) => current ?? layersRes[0]?.id ?? null);
      if (!name.trim() && classesRes[0]?.name) {
        setName(classesRes[0].name);
      }
    } catch (err) {
      setError(readError(err, 'Admin-Daten konnten nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  }

  const selectedClass = useMemo(
    () => shipClasses.find((shipClass) => shipClass.id === shipClassId) ?? null,
    [shipClasses, shipClassId],
  );

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === layerId) ?? null,
    [layers, layerId],
  );

  async function spawnShip() {
    if (!userId || !shipClassId || !layerId) {
      setError('Bitte User, Schiffsklasse und Layer auswaehlen.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const ship = await api.post<
        SpawnedShip,
        {
          userId: number;
          shipClassId: number;
          name: string;
          layerId: number;
          posX: number;
          posY: number;
        }
      >('/spacecraft/admin/spawn', {
        userId,
        shipClassId,
        name: name.trim(),
        layerId,
        posX,
        posY,
      });
      const owner = users.find((user) => user.id === ship.userId);
      setMessage(
        `Schiff "${ship.name}" fuer ${owner?.username ?? `User ${ship.userId}`} auf Layer ${ship.currentLayerId ?? '-'} bei [${ship.posX},${ship.posY}] erzeugt.`,
      );
    } catch (err) {
      setError(readError(err, 'Schiff konnte nicht erzeugt werden.'));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (selectedClass && !name.trim()) {
      setName(selectedClass.name);
    }
  }, [selectedClass?.id]);

  if (loading) {
    return <div className="p-6 text-swu-muted">Lade Admin-Ship-Tools...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-swu-muted">
            <Link to="/admin" className="hover:text-swu-accent">
              Admin
            </Link>
            <span>/</span>
            <span>Ship Spawn</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-swu-accent" style={{ fontFamily: 'var(--font-swu-display)' }}>
            Ship Spawn
          </h1>
          <p className="mt-1 text-sm text-swu-muted">
            Testschiffe direkt fuer Spieler erzeugen, ohne Shipyard- oder
            Onboarding-Flow.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="rounded border border-swu-border px-3 py-2 text-sm text-swu-text hover:border-swu-accent hover:text-swu-accent"
        >
          Daten neu laden
        </button>
      </div>

      {message && (
        <div className="rounded border border-swu-success/40 bg-swu-success/10 px-4 py-3 text-sm text-swu-success">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-swu-border bg-swu-surface p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Spawn-Konfiguration
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs text-swu-muted">
              Spieler
              <select
                value={userId ?? ''}
                onChange={(e) => setUserId(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-swu-muted">
              Schiffsklasse
              <select
                value={shipClassId ?? ''}
                onChange={(e) => setShipClassId(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              >
                {shipClasses.map((shipClass) => (
                  <option key={shipClass.id} value={shipClass.id}>
                    {shipClass.name} ({shipClass.category})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-swu-muted md:col-span-2">
              Schiffsname
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedClass?.name ?? 'Schiffsname'}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>

            <label className="text-xs text-swu-muted">
              Layer
              <select
                value={layerId ?? ''}
                onChange={(e) => setLayerId(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name} ({layer.width}x{layer.height})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-swu-muted">
              Position X
              <input
                type="number"
                min={1}
                max={selectedLayer?.width ?? undefined}
                value={posX}
                onChange={(e) => setPosX(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>

            <label className="text-xs text-swu-muted">
              Position Y
              <input
                type="number"
                min={1}
                max={selectedLayer?.height ?? undefined}
                value={posY}
                onChange={(e) => setPosY(Number(e.target.value))}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>
          </div>

          <button
            onClick={() => void spawnShip()}
            disabled={saving || !userId || !shipClassId || !layerId}
            className="rounded border border-swu-accent px-4 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
          >
            {saving ? 'Erzeuge Schiff...' : 'Schiff spawnen'}
          </button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
              Aktuelle Auswahl
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <InfoRow label="Klasse" value={selectedClass?.name ?? '-'} />
              <InfoRow
                label="Kategorie"
                value={selectedClass?.category ?? '-'}
              />
              <InfoRow label="Rolle" value={selectedClass?.role ?? '-'} />
              <InfoRow label="Layer" value={selectedLayer?.name ?? '-'} />
              <InfoRow label="Koordinate" value={`[${posX}, ${posY}]`} />
            </div>
          </div>

          <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
              Weiter
            </h2>
            <div className="mt-3 space-y-2 text-sm">
              <Link
                className="block text-swu-accent hover:underline"
                to="/admin/starmap"
              >
                Zur Kartenbearbeitung
              </Link>
              <Link
                className="block text-swu-accent hover:underline"
                to="/spacecraft"
              >
                Zur Spacecraft-Ansicht
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-swu-muted">{label}</span>
      <span className="font-mono text-swu-text">{value}</span>
    </div>
  );
}

function readError(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
