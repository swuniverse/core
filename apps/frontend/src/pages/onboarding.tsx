import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Faction } from '@swuniverse/shared';
import type { UserProfile } from '@swuniverse/shared';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

type UserWithOnboarding = UserProfile & {
  onboardingCompleted?: boolean;
};

interface FactionOption {
  id: number;
  key: Faction;
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  homeZone: string | null;
}

interface SelectionDto {
  id: number;
  factionId: number | null;
  selectedLayerId: number | null;
  selectedSectorX: number | null;
  selectedSectorY: number | null;
  selectedSystemId: number | null;
  selectedCelestialObjectId: number | null;
  status: 'STARTED' | 'COMPLETED';
  completedAt: string | null;
}

interface SectorOverview {
  layerId: number;
  layerName: string;
  sectorSize: number;
  sectorColumns: number;
  sectorRows: number;
  suggestedFactionId: number | null;
}

interface StarSystemDto {
  id: number;
  name: string;
  cx: number;
  cy: number;
}

interface CelestialObjectDto {
  id: number;
  name: string | null;
  posX: number;
  posY: number;
  classId: number | null;
  systemId: number;
}

interface StarterColonyDto {
  id: number;
  name: string;
  locationLabel?: string;
  population: number;
  populationMax: number;
  energy: number;
  energyMax: number;
  storageUsed: number;
  storageMax: number;
}

interface StarterShipDto {
  id: number;
  name: string;
  shipClassName?: string;
  locationLabel?: string;
  fleetName?: string | null;
  moduleCount?: number;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  energy: number;
  energyMax: number;
}

interface StarterClassHint {
  id: number;
  name: string;
  factionId: number | null;
  starterAllowed: boolean;
}

const STU_PLANET_CLASS_LABELS: Array<{
  match: (classId: number) => boolean;
  label: string;
}> = [
  { match: (classId) => classId >= 701 && classId <= 718, label: 'Asteroid' },
  { match: (classId) => classId >= 401 && classId <= 431, label: 'Mond' },
  { match: (classId) => classId >= 301 && classId <= 363, label: 'Ringplanet' },
  { match: (classId) => classId >= 261 && classId <= 263, label: 'I' },
  { match: (classId) => classId === 231, label: 'D' },
  { match: (classId) => classId === 223, label: 'N' },
  { match: (classId) => classId === 221, label: 'Q' },
  { match: (classId) => classId === 219, label: 'G' },
  { match: (classId) => classId === 217, label: 'X' },
  { match: (classId) => classId === 216 || classId === 215, label: 'P' },
  { match: (classId) => classId === 213, label: 'H' },
  { match: (classId) => classId === 211, label: 'K' },
  { match: (classId) => classId === 209, label: 'T' },
  { match: (classId) => classId === 207, label: 'S' },
  { match: (classId) => classId === 205, label: 'O' },
  { match: (classId) => classId === 203, label: 'L' },
  { match: (classId) => classId === 201, label: 'M' },
];

function formatPlanetClass(classId: number | null | undefined): string {
  if (classId === null || classId === undefined) return 'Unbekannt';
  const mapped = STU_PLANET_CLASS_LABELS.find((e) => e.match(classId));
  return mapped ? mapped.label : String(classId);
}

const PLANET_CLASS_DESCRIPTIONS: Record<string, string> = {
  M: 'Temperiert — ausgewogene Mischung aus Ebenen, Waeldern und Ozeanen',
  L: 'Waldplanet — dichte Vegetation, Suempfe und Ebenen',
  O: 'Ozeanplanet — wasserreich, wenig Landmasse',
  K: 'Wuestenplanet — trocken, felsig, mineralreich',
  H: 'Vulkanplanet — extremes Klima, mineralreich',
  P: 'Eisplanet — gefroren, karge Oberflaeche',
  D: 'Oedland — wenig Atmosphaere, karg',
  X: 'Daemonenklasse — extrem feindlich',
  G: 'Geodaetisch — gemischt, Eis und Gestein',
  Q: 'Dichte Atmosphaere — spezielles Terrain',
  S: 'Kleinplanet — geringe Oberflaeche',
  T: 'Gasarm — minimale Felder',
  I: 'Gasriese — nicht kolonisierbar',
  N: 'Reduktiv — keine Oberflaeche',
};

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-swu-border bg-swu-bg/40 p-3">
      <p className="text-xs text-swu-muted mb-1">{label}</p>
      <p className="font-bold text-swu-accent break-words">{value}</p>
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [_selection, setSelection] = useState<SelectionDto | null>(null);
  const [factions, setFactions] = useState<FactionOption[]>([]);
  const [sectors, setSectors] = useState<SectorOverview[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [selectedSector, setSelectedSector] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [systems, setSystems] = useState<StarSystemDto[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [planets, setPlanets] = useState<CelestialObjectDto[]>([]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<number | null>(null);
  const [starterColony, setStarterColony] = useState<StarterColonyDto | null>(
    null,
  );
  const [starterShip, setStarterShip] = useState<StarterShipDto | null>(null);
  const [starterClasses, setStarterClasses] = useState<StarterClassHint[]>([]);

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);
    setError('');
    try {
      const [profile, selectionRes, factionRes, sectorRes, shipClassRes] =
        await Promise.all([
          api.get<UserWithOnboarding>('/auth/me'),
          api.get<SelectionDto>('/onboarding/selection'),
          api.get<FactionOption[]>('/factions'),
          api.get<SectorOverview[]>('/onboarding/sectors'),
          api.get<StarterClassHint[]>('/spacecraft/classes'),
        ]);

      setUser(profile);

      if (profile.starterColonyId) {
        navigate('/');
        return;
      }

      setSelection(selectionRes);
      setFactions(factionRes);
      setSectors(sectorRes);
      setStarterClasses(
        shipClassRes.filter((shipClass) => shipClass.starterAllowed),
      );
      setSelectedLayerId(
        selectionRes.selectedLayerId ?? sectorRes[0]?.layerId ?? null,
      );
      setSelectedFaction(profile.faction ?? null);
      if (
        selectionRes.selectedSectorX !== null &&
        selectionRes.selectedSectorY !== null
      ) {
        setSelectedSector({
          x: selectionRes.selectedSectorX,
          y: selectionRes.selectedSectorY,
        });
      }
      if (selectionRes.selectedSystemId) {
        setSelectedSystemId(selectionRes.selectedSystemId);
      }
      if (selectionRes.selectedCelestialObjectId) {
        setSelectedPlanetId(selectionRes.selectedCelestialObjectId);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load onboarding',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedLayerId || !selectedSector) return;
    void loadSystems(selectedLayerId, selectedSector.x, selectedSector.y);
  }, [selectedLayerId, selectedSector?.x, selectedSector?.y]);

  useEffect(() => {
    if (!selectedSystemId) return;
    void loadPlanets(selectedSystemId);
  }, [selectedSystemId]);

  async function loadSystems(
    layerId: number,
    sectorX: number,
    sectorY: number,
  ) {
    setSaving(true);
    setError('');
    try {
      const systemRes = await api.get<StarSystemDto[]>(
        `/onboarding/systems?layerId=${layerId}&sectorX=${sectorX}&sectorY=${sectorY}`,
      );
      setSystems(systemRes);
      setSelectedSystemId(null);
      setPlanets([]);
      setSelectedPlanetId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load systems',
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadPlanets(systemId: number) {
    setSaving(true);
    setError('');
    try {
      const planetRes = await api.get<CelestialObjectDto[]>(
        `/onboarding/planets?systemId=${systemId}`,
      );
      setPlanets(planetRes);
      setSelectedPlanetId(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load planets',
      );
    } finally {
      setSaving(false);
    }
  }

  async function claimHomeworld() {
    if (!selectedPlanetId) return;
    setSaving(true);
    setError('');
    try {
      const claimRes = await api.post<{
        starterColonyId: number;
        starterShipId: number;
      }>('/onboarding/claim-homeworld', {
        celestialObjectId: selectedPlanetId,
      });
      const [profile, colony, ship] = await Promise.all([
        api.get<UserWithOnboarding>('/auth/me'),
        api.get<StarterColonyDto>(`/colonies/${claimRes.starterColonyId}`),
        api.get<StarterShipDto>(`/spacecraft/${claimRes.starterShipId}`),
      ]);
      setUser(profile);
      setStarterColony(colony);
      setStarterShip(ship);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to claim homeworld',
      );
    } finally {
      setSaving(false);
    }
  }

  const activeLayer = useMemo(
    () =>
      sectors.find((sector) => sector.layerId === selectedLayerId) ??
      sectors[0],
    [sectors, selectedLayerId],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-swu-muted">
        Loading onboarding...
      </div>
    );
  }

  if (starterColony && starterShip) {
    return (
      <div className="min-h-screen bg-swu-bg text-swu-text px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="bg-swu-surface border border-swu-border rounded-lg p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-swu-muted mb-2">
              Onboarding complete
            </p>
            <h1 className="text-3xl font-bold text-swu-accent">
              Homeworld secured
            </h1>
            <p className="text-swu-muted mt-2">
              Colony, starter ship, fleet ready. Next step: open maindesk or
              inspect assets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-swu-surface border border-swu-border rounded-lg p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
                  Starter Colony
                </p>
                <h2 className="text-2xl font-bold text-swu-primary">
                  {starterColony.name}
                </h2>
                <p className="text-sm text-swu-muted mt-1">
                  {starterColony.locationLabel || 'Unknown location'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoStat
                  label="Population"
                  value={`${starterColony.population}/${starterColony.populationMax}`}
                />
                <InfoStat
                  label="Energy"
                  value={`${starterColony.energy}/${starterColony.energyMax}`}
                />
                <InfoStat
                  label="Storage"
                  value={`${starterColony.storageUsed}/${starterColony.storageMax}`}
                />
                <InfoStat label="Colony ID" value={`#${starterColony.id}`} />
              </div>
            </div>

            <div className="bg-swu-surface border border-swu-border rounded-lg p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
                  Starter Ship
                </p>
                <h2 className="text-2xl font-bold text-swu-primary">
                  {starterShip.name}
                </h2>
                <p className="text-sm text-swu-muted mt-1">
                  {starterShip.shipClassName || 'Unknown class'} ·{' '}
                  {starterShip.locationLabel || 'Unknown location'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoStat
                  label="Fleet"
                  value={starterShip.fleetName || 'No fleet'}
                />
                <InfoStat
                  label="Modules"
                  value={String(starterShip.moduleCount || 0)}
                />
                <InfoStat
                  label="Hull"
                  value={`${starterShip.hull}/${starterShip.hullMax}`}
                />
                <InfoStat
                  label="Shields"
                  value={`${starterShip.shields}/${starterShip.shieldsMax}`}
                />
                <InfoStat
                  label="Energy"
                  value={`${starterShip.energy}/${starterShip.energyMax}`}
                />
                <InfoStat label="Ship ID" value={`#${starterShip.id}`} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-swu-primary hover:bg-swu-accent text-white font-bold py-3 px-6 rounded transition-colors"
            >
              Open Maindesk
            </button>
            <button
              type="button"
              onClick={() => navigate(`/colonies?selected=${starterColony.id}`)}
              className="border border-swu-border hover:border-swu-primary text-swu-text py-3 px-6 rounded transition-colors"
            >
              Open Colony
            </button>
            <button
              type="button"
              onClick={() => navigate(`/spacecraft?selected=${starterShip.id}`)}
              className="border border-swu-border hover:border-swu-primary text-swu-text py-3 px-6 rounded transition-colors"
            >
              Open Ship
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedFactionOption =
    factions.find((faction) => faction.key === selectedFaction) ?? null;
  const selectedSystem =
    systems.find((system) => system.id === selectedSystemId) ?? null;
  const selectedPlanet =
    planets.find((planet) => planet.id === selectedPlanetId) ?? null;
  const starterClassHint =
    starterClasses.find(
      (shipClass) => shipClass.factionId === selectedFactionOption?.id,
    ) ?? null;

  return (
    <div className="min-h-screen bg-swu-bg text-swu-text px-6 py-10">
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="space-y-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-swu-muted mb-2">
              Kolonisierung
            </p>
            <h1 className="text-3xl font-bold text-swu-accent">
              Heimatwelt waehlen
            </h1>
            <p className="text-swu-muted mt-2">
              Waehle Sektor, System und Planet. Claim erstellt Starter-Kolonie,
              Schiff und Flotte.
            </p>
          </div>

          {error && (
            <div className="bg-swu-danger/20 border border-swu-danger text-swu-text rounded p-3 text-sm">
              {error}
            </div>
          )}

          <section className="bg-swu-surface border border-swu-border rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">1. Sektor</h2>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-swu-muted">Layer</label>
              <select
                value={selectedLayerId ?? ''}
                onChange={(event) => {
                  const nextLayerId = Number(event.target.value);
                  setSelectedLayerId(nextLayerId);
                  setSelectedSector(null);
                  setSystems([]);
                  setPlanets([]);
                  setSelectedSystemId(null);
                  setSelectedPlanetId(null);
                }}
                className="bg-swu-bg border border-swu-border rounded px-3 py-2"
              >
                {sectors.map((sector) => (
                  <option key={sector.layerId} value={sector.layerId}>
                    {sector.layerName}
                  </option>
                ))}
              </select>
            </div>

            {sectors.length === 0 && (
              <p className="text-swu-muted text-sm">
                Keine Karte vorhanden. Ein Admin muss zuerst die Galaxie generieren.
              </p>
            )}

            {activeLayer && (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${activeLayer.sectorColumns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({
                  length: activeLayer.sectorColumns * activeLayer.sectorRows,
                }).map((_, index) => {
                  const x = index % activeLayer.sectorColumns;
                  const y = Math.floor(index / activeLayer.sectorColumns);
                  const active =
                    selectedSector?.x === x && selectedSector?.y === y;
                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      disabled={saving}
                      onClick={() => setSelectedSector({ x, y })}
                      className={`rounded border p-3 text-left min-h-20 transition ${
                        active
                          ? 'border-swu-accent bg-swu-accent/10'
                          : 'border-swu-border hover:border-swu-primary'
                      }`}
                    >
                      <div className="text-xs text-swu-muted mb-1">Sector</div>
                      <div className="font-bold">
                        {x + 1} | {y + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="bg-swu-surface border border-swu-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">2. System</h2>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {systems.length === 0 && (
                  <p className="text-swu-muted text-sm">Choose sector first.</p>
                )}
                {systems.map((system) => (
                  <button
                    key={system.id}
                    type="button"
                    disabled={saving}
                    onClick={() => setSelectedSystemId(system.id)}
                    className={`w-full rounded border p-4 text-left transition ${
                      selectedSystemId === system.id
                        ? 'border-swu-accent bg-swu-accent/10'
                        : 'border-swu-border hover:border-swu-primary'
                    }`}
                  >
                    <div className="font-bold text-swu-primary">
                      {system.name}
                    </div>
                    <div className="text-xs text-swu-muted mt-1">
                      Coordinates: {system.cx} | {system.cy}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-swu-surface border border-swu-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">3. Planet</h2>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {planets.length === 0 && (
                  <p className="text-swu-muted text-sm">Choose system first.</p>
                )}
                {planets.map((planet) => {
                  const classLabel = formatPlanetClass(planet.classId);
                  return (
                    <button
                      key={planet.id}
                      type="button"
                      disabled={saving}
                      onClick={() => setSelectedPlanetId(planet.id)}
                      className={`w-full rounded border p-4 text-left transition ${
                        selectedPlanetId === planet.id
                          ? 'border-swu-accent bg-swu-accent/10'
                          : 'border-swu-border hover:border-swu-primary'
                      }`}
                    >
                      <div className="font-bold text-swu-primary">
                        {planet.name ?? `Planet ${planet.id}`}
                      </div>
                      <div className="text-xs text-swu-muted mt-1">
                        Position: {planet.posX} | {planet.posY} · Klasse {classLabel}
                        {PLANET_CLASS_DESCRIPTIONS[classLabel] && (
                          <span className="ml-1 text-swu-muted/70">
                            — {PLANET_CLASS_DESCRIPTIONS[classLabel]}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded border border-swu-border bg-swu-bg/40 p-4">
                <h4 className="text-xs font-bold text-swu-muted uppercase tracking-wide mb-2">
                  Planetentypen
                </h4>
                <div className="space-y-1 text-xs text-swu-muted">
                  {Object.entries(PLANET_CLASS_DESCRIPTIONS).map(([key, desc]) => (
                    <div key={key}>
                      <span className="font-bold text-swu-primary">{key}-Klasse:</span>{' '}
                      {desc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-swu-surface border border-swu-border rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">4. Claim</h2>
              <p className="text-sm text-swu-muted mt-1">
                Final step. Creates starter colony, starter ship, starter fleet.
              </p>
            </div>
            <button
              type="button"
              disabled={
                !selectedSector ||
                !selectedSystemId ||
                !selectedPlanetId ||
                saving
              }
              onClick={() => void claimHomeworld()}
              className="bg-swu-primary hover:bg-swu-accent disabled:opacity-50 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {saving ? 'Claiming...' : 'Claim Homeworld'}
            </button>
          </section>
        </div>

        <aside className="bg-swu-surface border border-swu-border rounded-lg p-6 space-y-4 sticky top-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-swu-muted mb-2">
              Claim Summary
            </p>
            <h2 className="text-xl font-bold text-swu-accent">Chosen path</h2>
            <p className="text-sm text-swu-muted mt-1">
              Review picks before final claim.
            </p>
          </div>

          <InfoStat
            label="Faction"
            value={selectedFactionOption?.name || 'Not selected'}
          />
          <InfoStat
            label="Layer"
            value={activeLayer?.layerName || 'Not selected'}
          />
          <InfoStat
            label="Sector"
            value={
              selectedSector
                ? `${selectedSector.x + 1} | ${selectedSector.y + 1}`
                : 'Not selected'
            }
          />
          <InfoStat
            label="System"
            value={selectedSystem?.name || 'Not selected'}
          />
          <InfoStat
            label="Planet"
            value={
              selectedPlanet?.name ||
              (selectedPlanet ? `Planet ${selectedPlanet.id}` : 'Not selected')
            }
          />
          <InfoStat
            label="Starter Ship"
            value={starterClassHint?.name || 'Unknown'}
          />

          <div className="rounded border border-swu-border bg-swu-bg/40 p-4 text-sm text-swu-muted">
            <p className="font-bold text-swu-primary mb-2">
              What happens on claim
            </p>
            <ul className="space-y-1 list-disc pl-4">
              <li>starter colony created on chosen world</li>
              <li>starter ship spawned with modules</li>
              <li>starter fleet created automatically</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
