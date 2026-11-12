import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TradePostAtSpacecraftDto } from '@swuniverse/shared';
import { api } from '../../services/api';

/** Ship detail entry into the trade menu of the post at the ship's location. */
export function TradePostEntry({ shipId }: { shipId: number }) {
  const [post, setPost] = useState<TradePostAtSpacecraftDto | null>(null);

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
      className="border border-swu-border bg-black/30 p-2 text-xs"
    >
      <span className="text-swu-muted">Handelsposten {post.tradePostName}: </span>
      {post.reason ? (
        <span className="text-amber-200">Handelsmenü nicht verfügbar – {post.reason}</span>
      ) : (
        <Link
          to={`/trade?tab=posts&post=${post.tradePostId}&ship=${shipId}`}
          className="text-swu-accent hover:underline"
        >
          Handelsmenü
        </Link>
      )}
    </section>
  );
}
