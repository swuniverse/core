import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TradePostAtSpacecraftDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { TradeMenuDialog } from './TradeMenuDialog';

/** Ship detail entry into the trade menu of the post at the ship's location. */
export function TradePostEntry({
  shipId,
  onTransfer,
}: {
  shipId: number;
  onTransfer?: () => void;
}) {
  const [post, setPost] = useState<TradePostAtSpacecraftDto | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TradePostAtSpacecraftDto | null>(`/trade/spacecraft/${shipId}/post`)
      .then((next) => {
        if (!cancelled) setPost(next);
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shipId]);

  if (!post) return null;
  return (
    <section
      aria-label="Handelsposten"
      className="flex flex-wrap items-center gap-2 border border-swu-border bg-black/30 p-2 text-xs"
    >
      <span className="text-swu-muted">Handelsposten {post.tradePostName}:</span>
      {post.reason ? (
        <span className="text-amber-200">Handelsmenü nicht verfügbar – {post.reason}</span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10"
          >
            Handelsmenü
          </button>
          <Link
            to={`/trade?post=${post.tradePostId}&ship=${shipId}`}
            className="text-swu-accent hover:underline"
          >
            Posteninfo
          </Link>
        </>
      )}
      {open && (
        <TradeMenuDialog
          shipId={shipId}
          tradePostId={post.tradePostId}
          onClose={() => setOpen(false)}
          onTransfer={() => onTransfer?.()}
        />
      )}
    </section>
  );
}
