import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  DatabaseCrewDismissResultDto,
  DatabaseCrewDto,
  DatabaseCrewMemberDto,
  SpaceLocationDto,
} from '@swuniverse/shared';
import { shipImage } from '../lib/assets';
import { api } from '../services/api';

type SortKey = 'expertise' | 'name' | 'rank' | 'ship' | 'position';

interface Filters {
  name: string;
  ship: string;
  colony: string;
  ranks: Set<string>;
  positions: Set<string>;
  escapePod: boolean;
  foreignInactive: boolean;
  foreign: boolean;
}

const EMPTY_FILTERS: Filters = {
  name: '',
  ship: '',
  colony: '',
  ranks: new Set(),
  positions: new Set(),
  escapePod: false,
  foreignInactive: false,
  foreign: false,
};

const normalize = (value: string) => value.trim().toLocaleLowerCase('de');
const compareText = (a: string, b: string) => a.localeCompare(b, 'de');

function sectorText(sector: SpaceLocationDto | null | undefined) {
  if (!sector) return null;
  return sector.scope === 'SYSTEM'
    ? `System ${sector.systemId} · ${sector.x}|${sector.y}`
    : `${sector.x}|${sector.y}`;
}

function locationLabel(member: DatabaseCrewMemberDto) {
  switch (member.location?.type) {
    case 'COLONY':
      return 'Auf der Kolonie stationiert';
    case 'ESCAPE_POD':
      return 'In Rettungskapsel';
    case 'TRADE_POST':
      return 'Am Handelsposten stationiert';
    case 'STATION':
      return member.onForeignStation ? 'Auf fremder Station' : 'Auf Station';
    case 'SHIP':
      return 'Auf Schiff';
    default:
      return 'Keinem Schiff zugeteilt';
  }
}

function matches(member: DatabaseCrewMemberDto, filters: Filters) {
  const place = member.location;
  const onSpacecraft = place && place.type !== 'COLONY';
  if (filters.name && !normalize(member.name).includes(normalize(filters.name))) return false;
  if (filters.ship && !(onSpacecraft && normalize(place.name).includes(normalize(filters.ship)))) return false;
  if (filters.colony && !(place?.type === 'COLONY' && normalize(place.name).includes(normalize(filters.colony)))) return false;
  if (filters.ranks.size && !filters.ranks.has(member.rank)) return false;
  if (filters.positions.size && !(member.position && filters.positions.has(member.position))) return false;
  if (filters.escapePod && !member.inEscapePod) return false;
  if (filters.foreignInactive && !member.onForeignStationInactive) return false;
  if (filters.foreign && !member.onForeignStation) return false;
  return true;
}

/** STU sorts by the spacecraft name; colony crew has none and comes first. */
const shipName = (member: DatabaseCrewMemberDto) =>
  member.location && member.location.type !== 'COLONY' ? member.location.name : '';

function sorter(sort: SortKey): (a: DatabaseCrewMemberDto, b: DatabaseCrewMemberDto) => number {
  const byName = (a: DatabaseCrewMemberDto, b: DatabaseCrewMemberDto) => compareText(a.name, b.name);
  switch (sort) {
    case 'name':
      return byName;
    case 'rank':
      return (a, b) => b.rankExpertise - a.rankExpertise || byName(a, b);
    case 'ship':
      return (a, b) => compareText(shipName(a), shipName(b)) || byName(a, b);
    case 'position':
      return (a, b) => compareText(a.positionLabel ?? '', b.positionLabel ?? '') || byName(a, b);
    default:
      return (a, b) => b.highestExpertise - a.highestExpertise || byName(a, b);
  }
}

function toggled(set: Set<string>, value: string) {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}

export function CrewOverview({ data, onChanged }: { data: DatabaseCrewDto; onChanged: () => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('expertise');
  const [dismissMode, setDismissMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => data.members.filter((member) => matches(member, filters)).sort(sorter(sort)),
    [data.members, filters, sort],
  );
  const set = (changes: Partial<Filters>) => setFilters((current) => ({ ...current, ...changes }));

  const leaveDismissMode = () => {
    setDismissMode(false);
    setConfirming(false);
    setSelected(new Set());
  };
  const toggleSelected = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const dismiss = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<DatabaseCrewDismissResultDto>('/database/crew/dismiss', {
        crewIds: [...selected],
      });
      const parts = [`${result.dismissed} Crewmitglied(er) entlassen`];
      if (result.removedEscapePods) parts.push(`${result.removedEscapePods} leere Rettungskapsel(n) entfernt`);
      if (result.skippedIds.length) parts.push(`${result.skippedIds.length} nicht gefunden und übersprungen`);
      setMessage(`${parts.join(', ')}.`);
      leaveDismissMode();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entlassen fehlgeschlagen');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const checkbox = (label: string, checked: boolean, onChange: () => void) => (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
  const text = (label: string, key: 'name' | 'ship' | 'colony') => (
    <label className="flex flex-col gap-0.5 text-xs text-swu-muted">
      {label}
      <input
        type="text"
        value={filters[key]}
        onChange={(event) => set({ [key]: event.target.value })}
        className="border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-text"
      />
    </label>
  );

  return (
    <div className="max-w-5xl space-y-3">
      <h1 className="border border-swu-border bg-black/30 px-2 py-1 font-bold text-swu-primary">Meine Crew</h1>
      <div className="space-y-3 border border-swu-border bg-black/30 p-3 text-sm">
        <div className="flex flex-wrap gap-3">
          {text('Name', 'name')}
          {text('Station/Schiffsname', 'ship')}
          {text('Kolonie', 'colony')}
          <label className="flex flex-col gap-0.5 text-xs text-swu-muted">
            Sortierung
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-text"
            >
              <option value="expertise">Höchste Expertise</option>
              <option value="name">Name</option>
              <option value="rank">Rang</option>
              <option value="ship">Schiffsname</option>
              <option value="position">Aktueller Posten</option>
            </select>
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="text-xs text-swu-muted">Ränge</legend>
          {data.ranks.map(({ rank, label }) =>
            <span key={rank}>{checkbox(label, filters.ranks.has(rank), () => set({ ranks: toggled(filters.ranks, rank) }))}</span>,
          )}
        </fieldset>
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="text-xs text-swu-muted">Aktueller Posten</legend>
          {data.positions.map(({ position, label }) =>
            <span key={position}>{checkbox(label, filters.positions.has(position), () => set({ positions: toggled(filters.positions, position) }))}</span>,
          )}
        </fieldset>
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="text-xs text-swu-muted">Einsatzort</legend>
          {checkbox('Nur Rettungskapseln', filters.escapePod, () => set({ escapePod: !filters.escapePod }))}
          {checkbox('Auf fremden Stationen nicht im Einsatz', filters.foreignInactive, () => set({ foreignInactive: !filters.foreignInactive }))}
          {checkbox('Auf fremden Stationen', filters.foreign, () => set({ foreign: !filters.foreign }))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <span aria-live="polite" className="text-swu-muted">
            {visible.length} von {data.members.length} Crewmitgliedern
          </span>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="border border-swu-border px-2 py-1 hover:text-swu-accent"
          >
            Filter leeren
          </button>
          {dismissMode ? (
            <>
              <button
                type="button"
                disabled={!selected.size || busy}
                onClick={() => setConfirming(true)}
                className="border border-swu-border px-2 py-1 hover:text-swu-accent disabled:opacity-50"
              >
                Bestätigen ({selected.size})
              </button>
              <button type="button" onClick={leaveDismissMode} className="border border-swu-border px-2 py-1 hover:text-swu-accent">
                Abbrechen
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setDismissMode(true);
              }}
              className="border border-swu-border px-2 py-1 hover:text-swu-accent"
            >
              Entlassen
            </button>
          )}
        </div>
        {confirming && (
          <div role="alertdialog" aria-label="Entlassung bestätigen" className="border border-red-400/60 bg-red-950/30 p-2">
            <p>
              {selected.size} Crewmitglied(er) endgültig entlassen? Das kann nicht rückgängig gemacht werden.
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy} onClick={dismiss} className="border border-red-400/60 px-2 py-1 hover:text-swu-accent">
                Ja, entlassen
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="border border-swu-border px-2 py-1 hover:text-swu-accent">
                Zurück
              </button>
            </div>
          </div>
        )}
        {message && <p role="status" className="text-swu-primary">{message}</p>}
        {error && <p role="alert" className="text-red-300">{error}</p>}
      </div>

      <div className="overflow-auto border border-swu-border bg-black/30">
        <table className="w-full text-sm">
          <thead className="bg-swu-bg/60 text-left text-xs text-swu-muted">
            <tr>
              {dismissMode && <th className="px-2 py-1"><span className="sr-only">Auswahl</span></th>}
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1">Rang</th>
              <th className="px-2 py-1">Einsatzort</th>
              <th className="px-2 py-1">Posten</th>
              <th className="px-2 py-1">Positionsexpertisen</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((member) => {
              const place = member.location;
              const sector = sectorText(place?.sector);
              return (
                <tr key={member.id} className="border-t border-swu-border/60 align-top">
                  {dismissMode && (
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        aria-label={`${member.name} auswählen`}
                        checked={selected.has(member.id)}
                        onChange={() => toggleSelected(member.id)}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1 font-semibold">{member.name}</td>
                  <td className="px-2 py-1">{member.rankLabel}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-2">
                      {place?.shipClassId != null && (
                        <img src={shipImage(place.shipClassId, place.shipClassKey)} alt="" className="size-8 object-contain" />
                      )}
                      <div>
                        <div className="text-xs text-swu-muted">{locationLabel(member)}</div>
                        <div>
                          {(place?.type === 'SHIP' || place?.type === 'STATION') && place.own ? (
                            <Link to={`/spacecraft/${place.id}`} className="text-swu-primary hover:text-swu-accent">
                              {place.name}
                            </Link>
                          ) : (
                            place?.name ?? '—'
                          )}
                          {sector && <span className="ml-2 font-mono text-xs text-swu-muted">{sector}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    {member.positionLabel ?? (place?.type === 'SHIP' || place?.type === 'STATION' ? 'Ohne Position im Dienst' : '—')}
                  </td>
                  <td className="px-2 py-1">
                    {member.skills.length ? (
                      <ul className="text-xs">
                        {member.skills.map((skill) => (
                          <li key={skill.position}>
                            {skill.positionLabel} <strong>{skill.expertise} XP</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-swu-muted">Noch keine Erfahrung</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={dismissMode ? 6 : 5} className="px-2 py-2 text-swu-muted">
                  {data.members.length ? 'Keine Crew für diese Filter.' : 'Keine Crew vorhanden'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
