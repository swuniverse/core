import { useCallback, useEffect, useState } from 'react';
import type { TickRunDto, TickRunType } from '@swuniverse/shared';
import { TICK_RUN_TYPES } from '@swuniverse/shared';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import { api } from '../services/api';

const LABELS: Record<TickRunType, string> = {
  MAIN: 'Haupttick',
  BUILDING_COMPLETION: 'Bauabschluss',
  MAINTENANCE: 'Maintenance',
};

const STATUS_COLORS = {
  STARTED: 'bg-swu-warning',
  COMPLETED: 'bg-swu-positive',
  FAILED: 'bg-swu-negative',
} as const;

export function AdminTicksPage() {
  const [runs, setRuns] = useState<TickRunDto[]>([]);
  const [running, setRunning] = useState<TickRunType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRuns(await api.get<TickRunDto[]>('/admin/ticks?limit=50'));
  }, []);

  useEffect(() => {
    void load().catch((reason) =>
      setError(getErrorMessage(reason, 'Tick-Läufe konnten nicht geladen werden.')),
    );
  }, [load]);

  async function run(type: TickRunType) {
    if (!window.confirm(`${LABELS[type]} jetzt starten?`)) return;
    setRunning(type);
    setError(null);
    try {
      await api.post(`/admin/ticks/${type}/run`, {});
      await load();
    } catch (reason) {
      setError(getErrorMessage(reason, `${LABELS[type]} konnte nicht gestartet werden.`));
    } finally {
      setRunning(null);
    }
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <PageHeader segments={[{ label: 'Admin', to: '/admin' }, { label: 'Ticks' }]} />
      <section className="border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
          Einzeljobs
        </header>
        <div className="flex flex-wrap gap-2 p-3">
          {TICK_RUN_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={running !== null}
              onClick={() => void run(type)}
              className="border border-swu-accent px-2 py-1 text-xs text-swu-accent hover:bg-swu-accent/10 disabled:opacity-40"
              aria-label={`${LABELS[type]} starten`}
            >
              {running === type ? 'Läuft…' : LABELS[type]}
            </button>
          ))}
        </div>
        {error && <p className="border-t border-swu-border px-3 py-2 text-xs text-swu-negative">{error}</p>}
      </section>

      <section className="border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
          Letzte Läufe
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-black/40 text-center font-bold text-swu-primary">
              <tr>
                <th className="border border-swu-border px-1.5 py-1">Status</th>
                <th className="border border-swu-border px-1.5 py-1">Typ</th>
                <th className="border border-swu-border px-1.5 py-1">Tick</th>
                <th className="border border-swu-border px-1.5 py-1">Geplant</th>
                <th className="border border-swu-border px-1.5 py-1">Start</th>
                <th className="border border-swu-border px-1.5 py-1">Ende</th>
                <th className="border border-swu-border px-1.5 py-1">Dauer</th>
                <th className="border border-swu-border px-1.5 py-1">Fehler</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((item) => (
                <tr key={`${item.type}:${item.tickNumber}`} className="hover:bg-white/5">
                  <td className="border border-swu-border px-1.5 py-1 text-center" title={item.status}>
                    <span className={`inline-block size-1.5 rounded-full ${STATUS_COLORS[item.status]}`} />
                  </td>
                  <td className="border border-swu-border px-1.5 py-1">{LABELS[item.type]}</td>
                  <td className="border border-swu-border px-1.5 py-1 text-right font-mono">{item.tickNumber}</td>
                  <td className="border border-swu-border px-1.5 py-1">{formatDateTime(item.scheduledFor)}</td>
                  <td className="border border-swu-border px-1.5 py-1">{item.startedAt ? formatDateTime(item.startedAt) : '—'}</td>
                  <td className="border border-swu-border px-1.5 py-1">{item.completedAt ? formatDateTime(item.completedAt) : '—'}</td>
                  <td className="border border-swu-border px-1.5 py-1 text-right font-mono">{item.durationMs == null ? '—' : `${(item.durationMs / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`}</td>
                  <td className="max-w-80 border border-swu-border px-1.5 py-1 text-swu-negative">{item.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
