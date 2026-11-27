import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  WORMHOLE_RESTRICTION_MODES,
  WORMHOLE_RESTRICTION_TARGET_TYPES,
  type AdminWormholeRestrictionsDto,
  type CreateWormholeRestrictionDto,
  type WormholeRestrictionMode,
  type WormholeRestrictionTargetType,
} from '@swuniverse/shared';
import { api } from '../services/api';
import { getErrorMessage } from '../lib/errors';
import { formatNumber } from '../lib/format';

type Hole = AdminWormholeRestrictionsDto['wormholes'][number];

const TYPE_LABELS: Record<WormholeRestrictionTargetType, string> = {
  USER: 'Spieler',
  ALLIANCE: 'Allianz',
  FACTION: 'Fraktion',
  SHIP: 'Schiff',
};
const control =
  'border border-swu-border bg-swu-bg px-2 py-1 text-xs disabled:opacity-40';

const holeName = (hole: Hole) =>
  hole.name ?? `Wurmloch ${formatNumber(hole.id)}`;
const place = ({ layerId, x, y }: Hole['entry']) => `Layer ${layerId} · ${x}|${y}`;

/** STU "Wurmlochkontrolle": without a matching ALLOW rule no ship may pass. */
export function AdminWormholesPage() {
  const [data, setData] = useState<AdminWormholeRestrictionsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<AdminWormholeRestrictionsDto>('/starmap/admin/wormhole-restrictions')
      .then(setData)
      .catch((reason: unknown) =>
        setError(getErrorMessage(reason, 'Wurmlöcher konnten nicht geladen werden')),
      );
  }, []);

  async function run(work: () => Promise<AdminWormholeRestrictionsDto>) {
    setBusy(true);
    setError(null);
    try {
      setData(await work());
      return true;
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Aktion fehlgeschlagen'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 p-6">
      <div className="text-xs text-swu-muted">
        <Link to="/admin" className="hover:text-swu-accent">
          Admin
        </Link>{' '}
        / Wurmlochkontrolle
      </div>
      <div>
        <h1 className="text-2xl font-bold text-swu-accent">Wurmlochkontrolle</h1>
        <p className="mt-1 text-sm text-swu-muted">
          Ein Verbot gewinnt immer, sonst braucht ein Schiff eine passende
          Erlaubnis. Wurmlöcher ohne Regeln sind gesperrt.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {data?.wormholes.length === 0 && (
        <p className="text-sm text-swu-muted">Keine Wurmlöcher vorhanden.</p>
      )}
      {data?.wormholes.map((hole) => (
        <WormholeRules key={hole.id} hole={hole} busy={busy} run={run} />
      ))}
    </section>
  );
}

function WormholeRules({
  hole,
  busy,
  run,
}: {
  hole: Hole;
  busy: boolean;
  run: (work: () => Promise<AdminWormholeRestrictionsDto>) => Promise<boolean>;
}) {
  const base = `/starmap/admin/wormholes/${hole.id}/restrictions`;
  const [targetType, setTargetType] =
    useState<WormholeRestrictionTargetType>('USER');
  const [targetId, setTargetId] = useState('');
  const [mode, setMode] = useState<WormholeRestrictionMode>('ALLOW');
  const id = Number(targetId);
  const valid = Number.isInteger(id) && id > 0 && id <= 2147483647;
  const name = holeName(hole);

  return (
    <article
      aria-label={name}
      className="border border-swu-border bg-swu-surface text-xs"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 border-b border-swu-border px-3 py-2">
        <h2 className="font-bold text-swu-primary">{name}</h2>
        <span className="text-swu-muted">
          {place(hole.entry)} {hole.isBidirectional ? '⇄' : '→'} {place(hole.exit)}
          {!hole.isActive && ' · inaktiv'}
        </span>
      </header>
      {hole.restrictions.length === 0 ? (
        <p className="px-3 py-2 text-swu-danger">
          Keine Regeln: Wurmloch gesperrt.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/40 text-left text-swu-primary">
              <th className="border border-swu-border px-2 py-1">Ziel</th>
              <th className="border border-swu-border px-2 py-1">Modus</th>
              <th className="border border-swu-border px-2 py-1">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {hole.restrictions.map((rule) => {
              const label = `${TYPE_LABELS[rule.targetType]} ${formatNumber(rule.targetId)}`;
              return (
                <tr key={rule.id} className="hover:bg-white/5">
                  <td className="border border-swu-border px-2 py-1">{label}</td>
                  <td className="border border-swu-border px-2 py-1">
                    {rule.mode === 'ALLOW' ? 'Erlaubt' : 'Verboten'}
                  </td>
                  <td className="border border-swu-border px-2 py-1 text-right">
                    <button
                      type="button"
                      className={`${control} border-swu-danger`}
                      disabled={busy}
                      aria-label={`Regel für ${label} löschen`}
                      onClick={() =>
                        void run(() =>
                          api.delete<AdminWormholeRestrictionsDto>(
                            `${base}/${rule.id}`,
                          ),
                        )
                      }
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <form
        className="flex flex-wrap gap-2 border-t border-swu-border px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || busy) return;
          const request: CreateWormholeRestrictionDto = {
            targetType,
            targetId: id,
            mode,
          };
          void run(() =>
            api.post<AdminWormholeRestrictionsDto>(base, request),
          ).then((success) => {
            if (success) setTargetId('');
          });
        }}
      >
        <select
          aria-label={`Zieltyp ${name}`}
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
          aria-label={`Ziel-ID ${name}`}
          inputMode="numeric"
          className={`${control} w-24`}
          value={targetId}
          disabled={busy}
          onChange={(event) => setTargetId(event.target.value)}
        />
        <select
          aria-label={`Modus ${name}`}
          className={control}
          value={mode}
          disabled={busy}
          onChange={(event) => {
            const value = WORMHOLE_RESTRICTION_MODES.find(
              (entry) => entry === event.target.value,
            );
            if (value) setMode(value);
          }}
        >
          <option value="ALLOW">Erlauben</option>
          <option value="DENY">Verbieten</option>
        </select>
        <button type="submit" className={control} disabled={busy || !valid}>
          Regel hinzufügen
        </button>
      </form>
    </article>
  );
}
