import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Faction,
  getStuClassDescription,
  getStuClassLabel,
  isStarterPlanetClass,
  STU_CELESTIAL_CLASSES,
} from '@swuniverse/shared';
import type {
  OnboardingLayerSectorsDto,
  StarmapSectorDto,
  UserProfile,
} from '@swuniverse/shared';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { planetImage } from '../lib/assets';

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

type SectorOverview = OnboardingLayerSectorsDto;
type SectorOption = StarmapSectorDto;

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
  objectType?: number;
  isColonizable?: boolean;
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

interface NextObjectiveDto {
  key: string;
  label: string;
  href: string;
}

function formatPlanetClass(classId: number | null | undefined): string {
  return getStuClassLabel(classId);
}

const STARTER_PLANET_CLASS_DESCRIPTIONS = STU_CELESTIAL_CLASSES.filter(
  (definition) => definition.allowStart,
).map((definition) => [definition.code, definition.description] as const);

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
  const [selectedSector, setSelectedSector] = useState<SectorOption | null>(
    null,
  );
  const [systems, setSystems] = useState<StarSystemDto[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [planets, setPlanets] = useState<CelestialObjectDto[]>([]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<number | null>(null);
  const [starterColony, setStarterColony] = useState<StarterColonyDto | null>(
    null,
  );
  const [nextObjective, setNextObjective] = useState<NextObjectiveDto | null>(
    null,
  );

  useEffect(() => {
    void loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);
    setError('');
    try {
      const [profile, selectionRes, factionRes, sectorRes] = await Promise.all([
        api.get<UserWithOnboarding>('/auth/me'),
        api.get<SelectionDto>('/onboarding/selection'),
        api.get<FactionOption[]>('/factions'),
        api.get<SectorOverview[]>('/onboarding/sectors'),
      ]);

      setUser(profile);

      if (profile.starterColonyId) {
        navigate('/');
        return;
      }

      setSelection(selectionRes);
      setFactions(factionRes);
      setSectors(sectorRes);
      setSelectedLayerId(
        selectionRes.selectedLayerId ?? sectorRes[0]?.layerId ?? null,
      );
      setSelectedFaction(profile.faction ?? null);
      if (
        selectionRes.selectedSectorX !== null &&
        selectionRes.selectedSectorY !== null
      ) {
        setSelectedSector({
          layerId: selectionRes.selectedLayerId ?? sectorRes[0]?.layerId ?? 0,
          sectorX: selectionRes.selectedSectorX,
          sectorY: selectionRes.selectedSectorY,
          minX:
            selectionRes.selectedSectorX * (sectorRes[0]?.sectorSize ?? 20) + 1,
          minY:
            selectionRes.selectedSectorY * (sectorRes[0]?.sectorSize ?? 20) + 1,
          maxX:
            (selectionRes.selectedSectorX + 1) *
            (sectorRes[0]?.sectorSize ?? 20),
          maxY:
            (selectionRes.selectedSectorY + 1) *
            (sectorRes[0]?.sectorSize ?? 20),
          fieldCount: 0,
          systemCount: 0,
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
    void loadSystems(
      selectedLayerId,
      selectedSector.sectorX,
      selectedSector.sectorY,
    );
  }, [selectedLayerId, selectedSector?.sectorX, selectedSector?.sectorY]);

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
      setPlanets(
        planetRes.filter((planet) => isStarterPlanetClass(planet.classId)),
      );
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
        nextObjective?: NextObjectiveDto;
      }>('/onboarding/claim-homeworld', {
        celestialObjectId: selectedPlanetId,
      });
      const [profile, colony] = await Promise.all([
        api.get<UserWithOnboarding>('/auth/me'),
        api.get<StarterColonyDto>(`/colonies/${claimRes.starterColonyId}`),
      ]);
      setUser(profile);
      setStarterColony(colony);
      setNextObjective(claimRes.nextObjective ?? null);
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
  const sectorByCoord = useMemo(
    () =>
      new Map(
        (activeLayer?.sectors ?? []).map((sector) => [
          `${sector.sectorX}:${sector.sectorY}`,
          sector,
        ]),
      ),
    [activeLayer],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-swu-muted">
        Loading onboarding...
      </div>
    );
  }

  if (starterColony) {
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
              Deine Heimatwelt ist bereit. Der nächste Schritt ist Forschung und
              Aufbau deiner Werft — dein erstes Schiff entsteht später im
              Spielverlauf.
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
                  Naechster Schritt
                </p>
                <h2 className="text-2xl font-bold text-swu-primary">
                  {nextObjective?.label ?? 'Kolonie pruefen'}
                </h2>
                <p className="text-sm text-swu-muted mt-1">
                  Baue zuerst deine Heimatwelt auf, starte Forschung und schalte
                  den Werftbetrieb frei. So entsteht Schritt fuer Schritt deine
                  erste eigene Flotte.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <InfoStat
                  label="Aufbaupfad"
                  value="Forschung → Werfthub → Schiffbau"
                />
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
              onClick={() => navigate(nextObjective?.href ?? '/research')}
              className="border border-swu-border hover:border-swu-primary text-swu-text py-3 px-6 rounded transition-colors"
            >
              Forschung oeffnen
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
              Waehle Sektor, System und Planet. Als Startplaneten werden nur
              kolonialisierbare M-, L- oder O-Klasse-Planeten angezeigt; andere
              Klassen benoetigen spaeter passende Technologie. Claim erstellt
              Starter-Kolonie mit Startressourcen. Dein erstes Schiff baust du
              spaeter ueber Forschung und Werft.
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
                Keine Karte vorhanden. Ein Admin muss zuerst die Galaxie
                generieren.
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
                  const sector = sectorByCoord.get(`${x}:${y}`);
                  const active =
                    selectedSector?.sectorX === x &&
                    selectedSector?.sectorY === y;
                  const available = sector?.availableStarterPlanets ?? 0;
                  const disabled = saving || !sector || available <= 0;
                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => sector && setSelectedSector(sector)}
                      className={`rounded border p-3 text-left min-h-28 transition ${
                        active
                          ? 'border-swu-accent bg-swu-accent/10'
                          : disabled
                            ? 'border-swu-border opacity-50'
                            : 'border-swu-border hover:border-swu-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-swu-muted mb-1">
                        <span>Sector</span>
                        <span>{sector?.dominantFactionZone ?? 'UNKNOWN'}</span>
                      </div>
                      <div className="font-bold">
                        {x + 1} | {y + 1}
                      </div>
                      <div className="mt-2 text-xs text-swu-muted">
                        Systeme:{' '}
                        {sector?.playableSystemCount ??
                          sector?.systemCount ??
                          0}
                      </div>
                      <div
                        className={`text-xs ${available > 0 ? 'text-swu-success' : 'text-red-300'}`}
                      >
                        {available > 0
                          ? `Startwelten: ${available}/${sector?.totalStarterPlanets ?? 0}`
                          : 'Keine freien Startwelten'}
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
                    onClick={() => {
                      setPlanets([]);
                      setSelectedPlanetId(null);
                      setSelectedSystemId(system.id);
                    }}
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
              <h2 className="text-lg font-bold mb-2">3. Planet</h2>
              <p className="text-xs text-swu-muted mb-4">
                Nur kolonialisierbare M-, L- und O-Klasse-Planeten koennen als
                Heimatwelt gewaehlt werden.
              </p>
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {planets.length === 0 && (
                  <p className="text-swu-muted text-sm">
                    {selectedSystemId
                      ? 'In diesem System gibt es keine geeigneten Startplaneten der Klasse M, L oder O.'
                      : 'Choose system first.'}
                  </p>
                )}
                {planets.map((planet) => {
                  const classLabel = formatPlanetClass(planet.classId);
                  return (
                    <button
                      key={planet.id}
                      type="button"
                      disabled={saving}
                      onClick={() => setSelectedPlanetId(planet.id)}
                      className={`w-full rounded border p-4 text-left transition flex items-center gap-4 ${
                        selectedPlanetId === planet.id
                          ? 'border-swu-accent bg-swu-accent/10'
                          : 'border-swu-border hover:border-swu-primary'
                      }`}
                    >
                      {planet.classId && (
                        <img
                          src={planetImage(planet.classId)}
                          alt={`Klasse ${classLabel}`}
                          className="w-12 h-12 object-contain shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-bold text-swu-primary">
                          {planet.name ?? `Planet ${planet.id}`}
                        </div>
                        <div className="text-xs text-swu-muted mt-1">
                          Position: {planet.posX} | {planet.posY} · Klasse{' '}
                          {classLabel}
                          <span className="ml-1 text-swu-muted/70">
                            — {getStuClassDescription(planet.classId)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded border border-swu-border bg-swu-bg/40 p-4">
                <h4 className="text-xs font-bold text-swu-muted uppercase tracking-wide mb-2">
                  Planetentypen
                </h4>
                <p className="text-xs text-swu-muted mb-2">
                  Fuer den Spielstart sind nur M-, L- und O-Klasse erlaubt.
                </p>
                <div className="space-y-1 text-xs text-swu-muted">
                  {STARTER_PLANET_CLASS_DESCRIPTIONS.map(([key, desc]) => (
                    <div key={key}>
                      <span className="font-bold text-swu-primary">
                        {key}-Klasse:
                      </span>{' '}
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
                Final step. Creates your starter colony and stores starting
                resources there.
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
              Zusammenfassung
            </p>
            <h2 className="text-xl font-bold text-swu-accent">
              Gewaehlter Pfad
            </h2>
            <p className="text-sm text-swu-muted mt-1">
              Pruefe deine Auswahl vor der Gruendung deiner Heimatwelt.
            </p>
          </div>

          <InfoStat
            label="Faction"
            value={selectedFactionOption?.name || 'Not selected'}
          />
          <InfoStat
            label="Sector"
            value={
              selectedSector
                ? `${selectedSector.sectorX + 1} | ${selectedSector.sectorY + 1}`
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
          <div className="rounded border border-swu-border bg-swu-bg/40 p-4 text-sm text-swu-muted">
            <p className="font-bold text-swu-primary mb-2">
              Was bei der Gruendung passiert
            </p>
            <ul className="space-y-1 list-disc pl-4">
              <li>
                Deine erste Kolonie wird auf dem gewaehlten Planeten gegruendet.
              </li>
              <li>Startressourcen werden im Kolonielager eingelagert.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
