import { useEffect, useState } from 'react';
import type { CombatReportDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { CombatReportDialog } from './CombatReportDialog';
import { ShipSymbol } from './ShipSymbol';

export function LastCombatReportButton({
  shipId,
  available,
}: {
  shipId: number;
  available?: boolean;
}) {
  const [report, setReport] = useState<CombatReportDto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setReport(null);
    setError(null);
  }, [shipId]);
  async function open() {
    setPending(true);
    setError(null);
    try {
      setReport(
        await api.get<CombatReportDto>(
          `/spacecraft/${shipId}/last-combat-report`,
        ),
      );
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Kampfbericht konnte nicht geladen werden',
      );
    } finally {
      setPending(false);
    }
  }
  if (!available) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Letzten Kampfbericht öffnen"
        title="Letzter Kampfbericht"
        disabled={pending}
        className="rounded border border-swu-border bg-black/30 p-1 hover:border-swu-accent"
        onClick={() => void open()}
      >
        <ShipSymbol kind="combat-report" className="size-4" />
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {report && (
        <CombatReportDialog report={report} onClose={() => setReport(null)} />
      )}
    </>
  );
}
