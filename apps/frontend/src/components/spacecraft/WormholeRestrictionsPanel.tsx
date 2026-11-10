import { useEffect, useState } from 'react';
import {
  WORMHOLE_RESTRICTION_MODES,
  WORMHOLE_RESTRICTION_TARGET_TYPES,
  type CreateWormholeRestrictionDto,
  type StationWormholeRestrictionsDto,
  type WormholeRestrictionMode,
  type WormholeRestrictionTargetType,
} from '@swuniverse/shared';
import { api, ApiError } from '../../services/api';
import { formatNumber } from '../../lib/format';

const TYPE_LABELS: Record<WormholeRestrictionTargetType, string> = {
  USER: 'Spieler-ID',
  ALLIANCE: 'Allianz-ID',
  FACTION: 'Fraktions-ID',
  SHIP: 'Schiffs-ID',
};
const control =
  'border border-swu-border bg-swu-bg px-2 py-1 text-xs disabled:opacity-40';

/** Entry station operator's explicit privileges; the server owns authorization. */
export function WormholeRestrictionsPanel({
  stationId,
}: {
  stationId: number;
}) {
  const base = `/spacecraft/${stationId}/wormhole-restrictions`;
  const [data, setData] = useState<StationWormholeRestrictionsDto | null>(null);
  const [holeId, setHoleId] = useState('');
  const [targetType, setTargetType] =
    useState<WormholeRestrictionTargetType>('USER');
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<WormholeRestrictionMode>('ALLOW');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    void api
      .get<StationWormholeRestrictionsDto>(base)
      .then((result) => {
        if (!current) return;
        setData(result);
        setHoleId(String(result.wormholes[0]?.id ?? ''));
      })
      .catch((reason: unknown) => {
        if (current && !(reason instanceof ApiError && reason.status === 403))
          setError(
            reason instanceof Error
              ? reason.message
              : 'Zugangsregeln konnten nicht geladen werden',
          );
      });
    return () => {
      current = false;
    };
  }, [base]);

  async function run(work: () => Promise<StationWormholeRestrictionsDto>) {
    setBusy(true);
    setError(null);
    try {
      setData(await work());
      return true;
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : 'Aktion fehlgeschlagen',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!data && !error) return null;
  const valid =
    Number.isInteger(Number(targetId)) &&
    Number(targetId) > 0 &&
    Number(targetId) <= 2147483647;
  return (
    <section className="mt-2 border border-swu-border bg-swu-surface/70 text-xs">
      <header className="border-b border-swu-border px-3 py-2 text-swu-primary">
        <h2 className="font-bold">Wurmloch-Zugangsregeln</h2>
      </header>
      {error && (
        <p role="alert" className="px-3 py-2 text-swu-danger">
          {error}
        </p>
      )}
      {data?.wormholes.map((hole) => (
        <div key={hole.id}>
          <h3 className="px-3 py-1 font-bold text-swu-primary">
            {hole.name ?? `Wurmloch ${formatNumber(hole.id)}`}
          </h3>
          {hole.restrictions.length === 0 ? (
            <p className="px-3 py-2 text-swu-muted">
              Keine Regeln: Einflug erlaubt.
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-black/40 text-swu-primary">
                  <th className="border border-swu-border px-2 py-1">Ziel</th>
                  <th className="border border-swu-border px-2 py-1">Modus</th>
                  <th className="border border-swu-border px-2 py-1">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {hole.restrictions.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/5">
                    <td className="border border-swu-border px-2 py-1">
                      {TYPE_LABELS[rule.targetType]}{' '}
                      {formatNumber(rule.targetId)}
                    </td>
                    <td className="border border-swu-border px-2 py-1">
                      {rule.mode === 'ALLOW' ? 'Erlaubt' : 'Verboten'}
                    </td>
                    <td className="border border-swu-border px-2 py-1 text-right">
                      <button
                        type="button"
                        className={`${control} border-swu-danger`}
                        disabled={busy}
                        aria-label={`Regel für ${TYPE_LABELS[rule.targetType]} ${formatNumber(rule.targetId)} löschen`}
                        onClick={() =>
                          void run(() =>
                            api.delete<StationWormholeRestrictionsDto>(
                              `${base}/${rule.id}`,
                            ),
                          )
                        }
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
      {data && (
        <form
          className="flex flex-wrap gap-2 border-t border-swu-border px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid || busy) return;
            const request: CreateWormholeRestrictionDto = {
              wormholeId: Number(holeId),
              targetType,
              targetId: Number(targetId),
              mode,
            };
            void run(() =>
              api.post<StationWormholeRestrictionsDto>(base, request),
            ).then((success) => {
              if (success) setTargetId('');
            });
          }}
        >
          <select
            aria-label="Wurmloch"
            className={control}
            value={holeId}
            onChange={(event) => setHoleId(event.target.value)}
            disabled={busy}
          >
            {data.wormholes.map((hole) => (
              <option key={hole.id} value={hole.id}>
                {hole.name ?? `Wurmloch ${formatNumber(hole.id)}`}
              </option>
            ))}
          </select>
          <select
            aria-label="Wurmloch-Zieltyp"
            className={control}
            value={targetType}
            disabled={busy}
            onChange={(event) => {
              const value = WORMHOLE_RESTRICTION_TARGET_TYPES.find(
                (type) => type === event.target.value,
              );
              if (value) setTargetType(value);
            }}
          >
            {WORMHOLE_RESTRICTION_TARGET_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            aria-label="Wurmloch-Ziel-ID"
            inputMode="numeric"
            className={`${control} w-24`}
            value={targetId}
            disabled={busy}
            onChange={(event) => setTargetId(event.target.value)}
          />
          <select
            aria-label="Wurmloch-Modus"
            className={control}
            value={mode}
            disabled={busy}
            onChange={(event) => {
              const value = WORMHOLE_RESTRICTION_MODES.find(
                (mode) => mode === event.target.value,
              );
              if (value) setMode(value);
            }}
          >
            <option value="ALLOW">Erlauben</option>
            <option value="DENY">Verbieten</option>
          </select>
          <button
            type="submit"
            className={control}
            disabled={busy || !valid || !holeId}
          >
            Wurmlochregel hinzufügen
          </button>
        </form>
      )}
    </section>
  );
}
