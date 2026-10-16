import { useEffect, useState } from 'react';
import type { CartographyPlanDto } from '@swuniverse/shared';
import { api } from '../../services/api';

type Props = {
  shipId: number;
  refreshKey?: number;
  onUpdate: () => Promise<void> | void;
  compact?: boolean;
  onError?: (message: string) => void;
};

const statusText: Record<CartographyPlanDto['status'], string> = {
  PLANNED: 'Messpunkte werden angeflogen',
  MEASURED: 'Messpunkte abgeschlossen',
  FINISHING: 'Kartographie wird finalisiert',
  DONE: 'System erfolgreich kartographiert',
};

/**
 * Compatibility presentation surface until the compact cartography dialog lands.
 * It deliberately exposes no action: planning and finalization belong to later tickets.
 */
export function AstrometryPanel({
  shipId,
  refreshKey = 0,
  compact = false,
  onError,
}: Props) {
  const [plan, setPlan] = useState<CartographyPlanDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    setLoading(true);
    api
      .get<CartographyPlanDto | null>(`/spacecraft/${shipId}/cartography`)
      .then((result) => {
        if (current) setPlan(result);
      })
      .catch((err: unknown) => {
        if (current) {
          onError?.(
            err instanceof Error
              ? err.message
              : 'Kartographiestatus konnte nicht geladen werden',
          );
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [shipId, refreshKey, onError]);

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-swu-primary">Kartographie</h2>
        {plan?.status === 'FINISHING' && (
          <span className="text-amber-300">Läuft</span>
        )}
      </div>
      {loading ? (
        <p className="mt-1 text-swu-muted">Status wird geladen…</p>
      ) : plan ? (
        <div className="mt-1 space-y-1">
          <p className="text-swu-text">{statusText[plan.status]}</p>
          {plan.status === 'PLANNED' && (
            <p className="text-swu-muted">
              Verbleibende Messpunkte: {plan.remainingFieldIds.length}
            </p>
          )}
          {plan.status === 'FINISHING' && plan.finalizationTick !== null && (
            <p className="text-swu-muted">
              Abschlussfortschritt: {plan.finalizationTick}/3 Hauptticks
            </p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-swu-muted">Kein Kartographieplan vorhanden.</p>
      )}
    </>
  );

  if (compact) return <div aria-label="Kartographie">{content}</div>;

  return (
    <section
      aria-label="Kartographie"
      className="border border-swu-border bg-swu-surface/50 p-3 text-xs"
    >
      {content}
    </section>
  );
}
