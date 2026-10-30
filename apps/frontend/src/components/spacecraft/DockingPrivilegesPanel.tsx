import { useCallback, useEffect, useState } from 'react';
import type {
  DockingPrivilegeMode,
  DockingPrivilegesDto,
  DockingPrivilegeTargetType,
} from '@swuniverse/shared';
import { api } from '../../services/api';

const TYPE_LABELS: Record<DockingPrivilegeTargetType, string> = {
  USER: 'Spieler-ID',
  ALLIANCE: 'Allianz-ID',
  FACTION: 'Fraktions-ID',
  SHIP: 'Schiffs-ID',
};

/** Station owner's access rules for docking (deny beats allow) and the auto-read switch. */
export function DockingPrivilegesPanel({ stationId }: { stationId: number }) {
  const base = `/spacecraft/${stationId}/docking-privileges`;
  const [data, setData] = useState<DockingPrivilegesDto | null>(null);
  const [targetType, setTargetType] = useState<DockingPrivilegeTargetType>('USER');
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<DockingPrivilegeMode>('ALLOW');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.get<DockingPrivilegesDto>(base));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Dockingrechte konnten nicht geladen werden');
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(work: () => Promise<DockingPrivilegesDto>) {
    setBusy(true);
    setError(null);
    try {
      setData(await work());
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Aktion fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  const parsedId = Number(targetId);
  const validId = Number.isInteger(parsedId) && parsedId > 0;

  return (
    <section className="mt-2 border border-swu-border bg-swu-surface text-xs">
      <header className="flex items-center justify-between border-b border-swu-border bg-black/30 px-3 py-2">
        <h2 className="font-bold text-swu-primary">Dockingrechte</h2>
        <label className="flex items-center gap-2 font-normal">
          <input
            type="checkbox"
            checked={data?.autoRead ?? false}
            disabled={busy || !data}
            onChange={(event) =>
              void run(() =>
                api.post<DockingPrivilegesDto>(`${base}/auto-read`, {
                  enabled: event.target.checked,
                }),
              )
            }
          />
          Dock-Nachrichten automatisch gelesen
        </label>
      </header>
      {error && (
        <p role="alert" className="px-3 py-2 text-red-300">
          {error}
        </p>
      )}
      {data && data.privileges.length === 0 && (
        <p className="px-3 py-2 text-swu-muted">
          Keine Regeln: Nur du darfst andocken.
        </p>
      )}
      {data && data.privileges.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="text-left text-swu-muted">
              <th className="px-3 py-1">Ziel</th>
              <th className="px-3 py-1">Modus</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.privileges.map((rule) => (
              <tr key={rule.id} className="border-t border-swu-border/50">
                <td className="px-3 py-1">
                  {rule.targetName}{' '}
                  <span className="text-swu-muted">({TYPE_LABELS[rule.targetType]} {rule.targetId})</span>
                </td>
                <td
                  className={`px-3 py-1 ${rule.mode === 'ALLOW' ? 'text-green-400' : 'text-red-300'}`}
                >
                  {rule.mode === 'ALLOW' ? 'Erlaubt' : 'Verboten'}
                </td>
                <td className="px-3 py-1 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Regel für ${rule.targetName} löschen`}
                    onClick={() =>
                      void run(() => api.delete<DockingPrivilegesDto>(`${base}/${rule.id}`))
                    }
                    className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        className="flex flex-wrap items-center gap-2 border-t border-swu-border px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validId) return;
          void run(() =>
            api.post<DockingPrivilegesDto>(base, { targetType, targetId: parsedId, mode }),
          ).then(() => setTargetId(''));
        }}
      >
        <select
          aria-label="Zieltyp"
          value={targetType}
          onChange={(event) => setTargetType(event.target.value as DockingPrivilegeTargetType)}
          className="border border-swu-border bg-black/40 px-1 py-0.5"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          aria-label="Ziel-ID"
          inputMode="numeric"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          className="w-24 border border-swu-border bg-black/40 px-1 py-0.5"
        />
        <select
          aria-label="Modus"
          value={mode}
          onChange={(event) => setMode(event.target.value as DockingPrivilegeMode)}
          className="border border-swu-border bg-black/40 px-1 py-0.5"
        >
          <option value="ALLOW">Erlauben</option>
          <option value="DENY">Verbieten</option>
        </select>
        <button
          type="submit"
          disabled={busy || !validId}
          className="border border-swu-border px-2 py-0.5 disabled:opacity-40"
        >
          Regel hinzufügen
        </button>
      </form>
    </section>
  );
}
