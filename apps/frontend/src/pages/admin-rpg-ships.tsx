import { useEffect, useState } from 'react';
import type {
  RpgScenePlotDto,
  RpgSceneSpacecraftDto,
} from '@swuniverse/shared';
import { api } from '../services/api';
import { getErrorMessage } from '../lib/errors';

export function AdminRpgShipsPage() {
  const [ships, setShips] = useState<RpgSceneSpacecraftDto[]>([]);
  const [plots, setPlots] = useState<RpgScenePlotDto[]>([]);
  const [shipId, setShipId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get<RpgSceneSpacecraftDto[]>('/spacecraft/admin/rpg'),
      api.get<RpgScenePlotDto[]>('/spacecraft/admin/rpg/plots'),
    ])
      .then(([ownShips, ownPlots]) => {
        if (!alive) return;
        setShips(ownShips);
        setPlots(ownPlots);
        setShipId(String(ownShips[0]?.id ?? ''));
        setPlotId(String(ownPlots[0]?.id ?? ''));
      })
      .catch((reason) => {
        if (alive)
          setError(
            getErrorMessage(
              reason,
              'Szenenschiffe konnten nicht geladen werden',
            ),
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  const ship = ships.find((item) => String(item.id) === shipId);
  async function change(action: 'assign' | 'remove' | 'toggle') {
    if (!ship) return;
    setBusy(true);
    setError('');
    try {
      const path = `/spacecraft/admin/rpg/${ship.id}`;
      const updated =
        action === 'assign'
          ? await api.put<RpgSceneSpacecraftDto>(`${path}/transponder`, {
              plotId: Number(plotId),
            })
          : action === 'remove'
            ? await api.delete<RpgSceneSpacecraftDto>(`${path}/transponder`)
            : await api.patch<RpgSceneSpacecraftDto>(`${path}/visibility`, {
                hidden: !ship.hidden,
              });
      setShips((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setError(
        getErrorMessage(reason, 'RPG-Transponder konnte nicht geändert werden'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 text-swu-text">
      <h1 className="text-xl font-bold text-swu-primary">RPG-Szenenschiffe</h1>
      <p>
        Verwalte den RPG-Transponder deiner eigenen Szenenschiffe. Verdeckte
        Schiffe fehlen in allen Spieleransichten und können dort keine Aktionen
        ausführen. Der Transponder kostet keine EPS.
      </p>
      {error && (
        <p role="alert" className="text-swu-negative">
          {error}
        </p>
      )}
      <label className="block">
        Eigenes Szenenschiff
        <select
          aria-label="Eigenes Szenenschiff"
          value={shipId}
          disabled={busy}
          onChange={(event) => setShipId(event.target.value)}
          className="block w-full rounded border border-swu-border bg-swu-bg p-2"
        >
          {ships.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.hidden ? ' (verdeckt)' : ''}
            </option>
          ))}
        </select>
      </label>
      {!ships.length && <p>Keine eigenen Schiffe vorhanden.</p>}
      {ship && (
        <>
          <p role="status">
            {ship.hidden ? 'Für Spieler verdeckt' : 'Für Spieler sichtbar'} ·{' '}
            {ship.plotTitle ?? 'Kein RPG-Transponder'}
          </p>
          <label className="block">
            Eigener aktiver RPG-Plot
            <select
              aria-label="Eigener aktiver RPG-Plot"
              value={plotId}
              disabled={busy}
              onChange={(event) => setPlotId(event.target.value)}
              className="block w-full rounded border border-swu-border bg-swu-bg p-2"
            >
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.title}
                </option>
              ))}
            </select>
          </label>
          {!plots.length && (
            <p>Erstelle zuerst einen eigenen RPG-Plot im Rollenspielbereich.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border border-swu-border p-2 disabled:opacity-40"
              disabled={busy || !plotId}
              onClick={() => void change('assign')}
            >
              Transponder zuordnen
            </button>
            <button
              className="rounded border border-swu-border p-2 disabled:opacity-40"
              disabled={busy || ship.plotId == null}
              onClick={() => void change('toggle')}
            >
              {ship.hidden ? 'Einblenden' : 'Ausblenden'}
            </button>
            <button
              className="rounded border border-swu-border p-2 disabled:opacity-40"
              disabled={busy || ship.plotId == null}
              onClick={() => void change('remove')}
            >
              Transponder entfernen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
