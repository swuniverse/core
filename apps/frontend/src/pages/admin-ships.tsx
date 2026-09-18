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
  crew: number;
}

interface AdminBuildplan {
  id: number;
  shipClassId: number;
  name: string;
  moduleSelections: Array<{ slotId: string; commodityId: number }>;
}

interface SpawnOptions {
  torpedoes: {
    capacity: number;
    compatible: Array<{
      id: number;
      commodityId: number;
      name: string;
      level: number;
      damageType: string | null;
    }>;
  };
  slots: Array<{
    slotId: string;
    label: string;
    category: string;
    options: Array<{ commodityId: number; name: string; level: number }>;
  }>;
}

type SpawnPreset = 'operational' | 'damaged' | 'critical' | 'offline';

export function AdminShipsPage() {
  const [users, setUsers] = useState<AdminUserOption[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClassOption[]>([]);
  const [layers, setLayers] = useState<LayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [spawnedShip, setSpawnedShip] = useState<SpawnedShip | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<number | null>(null);
  const [shipClassId, setShipClassId] = useState<number | null>(null);
  const [layerId, setLayerId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [posX, setPosX] = useState(1);
  const [posY, setPosY] = useState(1);
  const [spawnOptions, setSpawnOptions] = useState<SpawnOptions | null>(null);
  const [moduleSelections, setModuleSelections] = useState<
    Record<string, number>
  >({});
  const [preset, setPreset] = useState<SpawnPreset>('operational');
  const [buildplans, setBuildplans] = useState<AdminBuildplan[]>([]);
  const [buildplanId, setBuildplanId] = useState<number | null>(null);
  const [buildplanName, setBuildplanName] = useState('');
  const [fillTorpedoes, setFillTorpedoes] = useState(false);
  const [torpedoTypeId, setTorpedoTypeId] = useState<number | null>(null);
  const [tab, setTab] = useState<'BUILDPLANS' | 'SPAWN'>('BUILDPLANS');
  const [editingBuildplanId, setEditingBuildplanId] = useState<number | null>(
    null,
  );

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

  useEffect(() => {
    api
      .get<AdminBuildplan[]>('/spacecraft/admin/buildplans')
      .then((plans) => {
        setBuildplans(plans);
        setBuildplanId((current) =>
          plans.some((plan) => plan.id === current)
            ? current
            : (plans[0]?.id ?? null),
        );
      })
      .catch((err) =>
        setError(readError(err, 'Baupläne konnten nicht geladen werden.')),
      );
  }, []);

  const selectedClass = useMemo(
    () => shipClasses.find((shipClass) => shipClass.id === shipClassId) ?? null,
    [shipClasses, shipClassId],
  );

  useEffect(() => {
    if (!shipClassId) return;
    api
      .get<SpawnOptions>(`/spacecraft/admin/spawn-options/${shipClassId}`)
      .then((options) => {
        setSpawnOptions(options);
        setTorpedoTypeId(options.torpedoes.compatible[0]?.id ?? null);
        setFillTorpedoes(
          (current) => current && options.torpedoes.capacity > 0,
        );
        setModuleSelections(
          Object.fromEntries(
            options.slots.map((slot) => [
              slot.slotId,
              slot.options.find((option) => option.commodityId > 0)
                ?.commodityId ?? 0,
            ]),
          ),
        );
      })
      .catch((err) =>
        setError(readError(err, 'Moduloptionen konnten nicht geladen werden.')),
      );
  }, [shipClassId]);

  useEffect(() => {
    const plan = buildplans.find((entry) => entry.id === buildplanId);
    if (plan) setShipClassId(plan.shipClassId);
  }, [buildplanId, buildplans]);

  async function refreshBuildplans() {
    const plans = await api.get<AdminBuildplan[]>(
      '/spacecraft/admin/buildplans',
    );
    setBuildplans(plans);
    setBuildplanId((current) =>
      plans.some((plan) => plan.id === current)
        ? current
        : (plans[0]?.id ?? null),
    );
  }

  async function saveBuildplan() {
    if (!shipClassId || !buildplanName.trim()) return;
    const body = {
      shipClassId,
      name: buildplanName.trim(),
      moduleSelections: Object.entries(moduleSelections)
        .filter(([, commodityId]) => commodityId > 0)
        .map(([slotId, commodityId]) => ({ slotId, commodityId })),
    };
    if (editingBuildplanId) {
      await api.patch(
        `/spacecraft/admin/buildplans/${editingBuildplanId}`,
        body,
      );
    } else {
      await api.post('/spacecraft/admin/buildplans', body);
    }
    setEditingBuildplanId(null);
    setBuildplanName('');
    await refreshBuildplans();
  }

  async function deleteBuildplan(id: number) {
    await api.delete(`/spacecraft/admin/buildplans/${id}`);
    if (editingBuildplanId === id) {
      setEditingBuildplanId(null);
      setBuildplanName('');
    }
    await refreshBuildplans();
  }

  function editBuildplan(plan: AdminBuildplan) {
    setEditingBuildplanId(plan.id);
    setBuildplanName(plan.name);
    setShipClassId(plan.shipClassId);
    setModuleSelections(
      Object.fromEntries(
        plan.moduleSelections.map((selection) => [
          selection.slotId,
          selection.commodityId,
        ]),
      ),
    );
  }

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === layerId) ?? null,
    [layers, layerId],
  );

  async function spawnShip() {
    if (!userId || !layerId || (!buildplanId && !shipClassId)) {
      setError('Bitte User, Schiffsklasse und Layer auswaehlen.');
      return;
    }

    setSaving(true);
    setMessage(null);
    setSpawnedShip(null);
    setError(null);
    try {
      const ship = await api.post<
        SpawnedShip,
        {
          userId: number;
          shipClassId: number;
          buildplanId?: number;
          name: string;
          layerId: number;
          posX: number;
          posY: number;
          modules: Array<{ slotId: string; commodityId: number }>;
          preset: SpawnPreset;
          fillTorpedoes: boolean;
          torpedoTypeId?: number;
        }
      >('/spacecraft/admin/spawn', {
        userId,
        shipClassId:
          buildplans.find((plan) => plan.id === buildplanId)?.shipClassId ??
          shipClassId!,
        buildplanId: buildplanId ?? undefined,
        name: name.trim(),
        layerId,
        posX,
        posY,
        modules: Object.entries(moduleSelections)
          .filter(([, commodityId]) => commodityId > 0)
          .map(([slotId, commodityId]) => ({ slotId, commodityId })),
        preset,
        fillTorpedoes,
        torpedoTypeId: fillTorpedoes ? (torpedoTypeId ?? undefined) : undefined,
      });
      setSpawnedShip(ship);
      const owner = users.find((user) => user.id === ship.userId);
      setMessage(
        `Schiff #${ship.id} "${ship.name}" fuer ${owner?.username ?? `User ${ship.userId}`} erzeugt: ${Object.keys(moduleSelections).length} Modulslots, ${ship.crew} Crew, Preset ${preset}.`,
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
          <h1
            className="mt-2 text-2xl font-bold text-swu-accent"
            style={{ fontFamily: 'var(--font-swu-display)' }}
          >
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

      <div className="flex gap-1 border-b border-swu-border">
        <button
          type="button"
          onClick={() => setTab('BUILDPLANS')}
          aria-pressed={tab === 'BUILDPLANS'}
          className="border border-b-0 border-swu-border px-4 py-2 text-sm aria-pressed:text-swu-accent"
        >
          Admin-Baupläne
        </button>
        <button
          type="button"
          onClick={() => setTab('SPAWN')}
          aria-pressed={tab === 'SPAWN'}
          className="border border-b-0 border-swu-border px-4 py-2 text-sm aria-pressed:text-swu-accent"
        >
          Spawn
        </button>
      </div>

      {message && (
        <div className="rounded border border-swu-success/40 bg-swu-success/10 px-4 py-3 text-sm text-swu-success">
          <p>{message}</p>
          {spawnedShip && (
            <Link
              to={`/spacecraft/${spawnedShip.id}`}
              className="mt-1 inline-block underline hover:text-swu-text"
            >
              Schiff #{spawnedShip.id} öffnen
            </Link>
          )}
        </div>
      )}
      {error && (
        <div className="rounded border border-swu-danger/40 bg-swu-danger/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section
        className={`grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] ${tab === 'BUILDPLANS' ? 'admin-buildplans' : 'admin-spawn'}`}
      >
        <div className="rounded-lg border border-swu-border bg-swu-surface p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            {tab === 'BUILDPLANS'
              ? 'Admin-Bauplan erstellen'
              : 'Schiff aus Bauplan spawnen'}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label
              className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted`}
            >
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

            <label
              className={`${tab === 'SPAWN' ? 'hidden' : ''} text-xs text-swu-muted`}
            >
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

            <label
              className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted md:col-span-2`}
            >
              Schiffsname
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedClass?.name ?? 'Schiffsname'}
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
              />
            </label>

            <label
              className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted`}
            >
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

            <label
              className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted`}
            >
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

            <label
              className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted`}
            >
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

          <div
            className={`${tab === 'SPAWN' ? 'hidden' : ''} border-t border-swu-border pt-4 md:col-span-2`}
          >
            <h3 className="text-xs font-bold uppercase text-swu-muted">
              Globale Admin-Vorlage
            </h3>
            <div className="mt-2 flex gap-2">
              <input
                value={buildplanName}
                onChange={(event) => setBuildplanName(event.target.value)}
                placeholder="Bauplanname"
                className="flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-sm"
              />
              <button
                type="button"
                disabled={!shipClassId || !buildplanName.trim()}
                onClick={() => void saveBuildplan()}
                className="rounded border border-swu-accent px-3 py-1 text-xs"
              >
                {editingBuildplanId
                  ? 'Bauplan aktualisieren'
                  : 'Bauplan speichern'}
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {buildplans.length === 0 ? (
                <p className="text-xs text-swu-muted">
                  Noch keine Admin-Baupläne vorhanden.
                </p>
              ) : (
                buildplans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center gap-2 border border-swu-border px-2 py-1 text-xs"
                  >
                    <span className="flex-1">
                      {plan.name} · {plan.moduleSelections.length} Module
                    </span>
                    <button
                      type="button"
                      onClick={() => editBuildplan(plan)}
                      className="text-swu-accent"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteBuildplan(plan.id)}
                      className="text-red-300"
                    >
                      Löschen
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${tab === 'BUILDPLANS' ? 'hidden' : ''}`}>
            <label className="text-xs text-swu-muted">
              Admin-Bauplan
              <select
                value={buildplanId ?? ''}
                onChange={(event) =>
                  setBuildplanId(Number(event.target.value) || null)
                }
                className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-sm"
              >
                {buildplans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label
            className={`${tab === 'BUILDPLANS' ? 'hidden' : ''} text-xs text-swu-muted`}
          >
            UI-Testzustand
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as SpawnPreset)}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
            >
              <option value="operational">Einsatzbereit (grün)</option>
              <option value="damaged">Beschädigt (amber)</option>
              <option value="critical">Kritisch (rot)</option>
              <option value="offline">Offline</option>
            </select>
          </label>

          {tab === 'SPAWN' && spawnOptions?.torpedoes.capacity ? (
            <>
              <label className="flex items-center gap-2 text-xs text-swu-muted">
                <input
                  type="checkbox"
                  checked={fillTorpedoes}
                  onChange={(event) => setFillTorpedoes(event.target.checked)}
                />
                Torpedolager vollständig laden (
                {spawnOptions.torpedoes.capacity} Torpedos)
              </label>
              {fillTorpedoes && (
                <label className="text-xs text-swu-muted">
                  Torpedotyp
                  <select
                    value={torpedoTypeId ?? ''}
                    onChange={(event) =>
                      setTorpedoTypeId(Number(event.target.value) || null)
                    }
                    className="ml-2 rounded border border-swu-border bg-swu-bg px-2 py-1"
                  >
                    {spawnOptions.torpedoes.compatible.map((torpedo) => (
                      <option key={torpedo.id} value={torpedo.id}>
                        {torpedo.name} · Stufe {torpedo.level}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : tab === 'SPAWN' ? (
            <p className="text-xs text-swu-muted">
              Dieses Schiff kann keine Torpedos tragen.
            </p>
          ) : null}

          {tab === 'BUILDPLANS' && spawnOptions && (
            <div className="border-t border-swu-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-swu-muted">
                Module nach Slot
              </h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {spawnOptions.slots.map((slot) => (
                  <label key={slot.slotId} className="text-xs text-swu-muted">
                    {slot.label} ({slot.category})
                    <select
                      value={moduleSelections[slot.slotId] ?? 0}
                      onChange={(e) =>
                        setModuleSelections((current) => ({
                          ...current,
                          [slot.slotId]: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                    >
                      <option value={0}>Leer</option>
                      {slot.options.map((option) => (
                        <option
                          key={option.commodityId}
                          value={option.commodityId}
                        >
                          {option.name} · Klasse {option.level}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div
            className={
              tab === 'BUILDPLANS'
                ? 'hidden'
                : 'border-t border-swu-border pt-4'
            }
          >
            <button
              className="rounded border border-swu-accent px-4 py-2 text-sm text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50"
              onClick={() => void spawnShip()}
              disabled={saving || !userId || !buildplanId || !layerId}
            >
              {saving ? 'Erzeuge Schiff...' : 'Schiff spawnen'}
            </button>
          </div>
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
