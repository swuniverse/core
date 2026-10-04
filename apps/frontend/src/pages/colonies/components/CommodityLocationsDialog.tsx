import { useEffect, useRef, useState } from 'react';
import type { CommodityLocationsDto } from '@swuniverse/shared';
import { planetThumbnail, shipImage } from '../../../lib/assets';

type CommodityLocationsDialogProps = {
  commodityId: number;
  trigger: HTMLElement;
  load: (commodityId: number) => Promise<CommodityLocationsDto>;
  onClose: () => void;
};

export function CommodityLocationsDialog({
  commodityId,
  trigger,
  load,
  onClose,
}: CommodityLocationsDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const requestSequenceRef = useRef(0);
  const [data, setData] = useState<CommodityLocationsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  onCloseRef.current = onClose;

  useEffect(() => {
    const requestSequence = ++requestSequenceRef.current;
    setData(null);
    setError(null);
    setLoading(true);
    void load(commodityId)
      .then((result) => {
        if (requestSequence === requestSequenceRef.current) setData(result);
      })
      .catch((reason: unknown) => {
        if (requestSequence === requestSequenceRef.current) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Lagerorte konnten nicht geladen werden',
          );
        }
      })
      .finally(() => {
        if (requestSequence === requestSequenceRef.current) setLoading(false);
      });
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [commodityId, load]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (trigger.isConnected) trigger.focus();
    };
  }, [trigger]);

  const empty =
    data && data.colonies.length === 0 && data.spacecraft.length === 0;

  return (
    <div
      data-testid="commodity-locations-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commodity-locations-title"
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded border border-swu-border bg-swu-surface p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-swu-border/50 pb-3">
          <div>
            <h2
              id="commodity-locations-title"
              className="text-base font-bold text-swu-primary"
            >
              Lagerorte der Ware
            </h2>
            {data && (
              <div className="mt-0.5 text-xs text-swu-accent">
                {data.commodityName}
              </div>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            className="text-sm text-swu-muted hover:text-swu-primary"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {loading && (
            <div role="status" className="text-xs text-swu-muted">
              Lagerorte werden geladen...
            </div>
          )}
          {error && (
            <div role="alert" className="text-xs text-red-400">
              {error}
            </div>
          )}
          {empty && (
            <div className="text-xs text-swu-muted">
              Keine eigenen Lagerorte gefunden.
            </div>
          )}
          {data && data.colonies.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-swu-muted">
                  <th className="w-20 py-1 text-right">Anzahl</th>
                  <th className="py-1 pl-3">auf Kolonie</th>
                </tr>
              </thead>
              <tbody>
                {data.colonies.map((location) => (
                  <tr
                    key={location.colonyId}
                    className="border-t border-swu-border/40"
                  >
                    <td className="py-1.5 text-right font-mono tabular-nums text-swu-primary">
                      {location.amount}
                    </td>
                    <td className="py-1.5 pl-3">
                      <a
                        href={`/colonies?selected=${location.colonyId}`}
                        className="inline-flex items-center gap-2 text-swu-accent hover:underline"
                      >
                        <img
                          src={planetThumbnail(location.colonyClassId)}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                        {location.colonyName}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && data.spacecraft.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-swu-muted">
                  <th className="w-20 py-1 text-right">Anzahl</th>
                  <th className="py-1 pl-3">auf Station/Schiff</th>
                </tr>
              </thead>
              <tbody>
                {data.spacecraft.map((location) => (
                  <tr
                    key={location.spacecraftId}
                    className="border-t border-swu-border/40"
                  >
                    <td className="py-1.5 text-right font-mono tabular-nums text-swu-primary">
                      {location.amount}
                    </td>
                    <td className="py-1.5 pl-3">
                      <a
                        href={`/spacecraft/${location.spacecraftId}`}
                        className="inline-flex items-center gap-2 text-swu-accent hover:underline"
                      >
                        <img
                          src={shipImage(
                            location.shipClassId,
                            location.shipClassKey,
                          )}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                        {location.spacecraftName}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
