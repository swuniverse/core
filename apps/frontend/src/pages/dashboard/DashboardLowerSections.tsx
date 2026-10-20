import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import type { DashboardData } from './types';

export function RecentEvents({ data }: { data: DashboardData }) {
  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="flex items-center justify-between border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
        <span>Letzte Ereignisse</span>
        <Link to="/events" className="text-swu-muted hover:text-swu-accent">
          Alle Ereignisse
        </Link>
      </header>
      {data.recentEvents.length ? (
        <div className="divide-y divide-swu-border/60">
          {data.recentEvents.slice(0, 10).map((event) => {
            const location =
              event.location?.scope === 'GALAXY'
                ? `Ebene ${event.location.layerId} · ${event.location.x}|${event.location.y}`
                : event.location?.scope === 'SYSTEM'
                  ? `System ${event.location.systemId} · ${event.location.x}|${event.location.y}`
                  : event.scope === 'GALAXY' && event.layerId != null && event.x != null && event.y != null
                    ? `Ebene ${event.layerId} · ${event.x}|${event.y}`
                    : event.scope === 'SYSTEM' && event.systemId != null && event.x != null && event.y != null
                      ? `System ${event.systemId} · ${event.x}|${event.y}`
                      : null;

            return (
              <div key={event.id} className="px-3 py-2 text-xs">
                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <time className="shrink-0 font-mono text-swu-muted">
                    {new Date(event.createdAt).toLocaleString('de-DE')}
                  </time>
                  <span className="text-swu-text">{event.text}</span>
                </div>
                {location && (
                  <span className="mt-0.5 block font-mono text-[10px] text-swu-muted">
                    {location}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-swu-muted">
          Keine aktuellen Ereignisse.
        </p>
      )}
    </section>
  );
}
export function DashboardMessages({ data }: { data: DashboardData }) {
  const posts = data.holonetPosts.slice(0, 5);
  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="flex justify-between border-b border-swu-border px-3 py-1.5 text-xs font-bold text-swu-primary">
        <span>Neue HoloNet-Beiträge ({posts.length})</span>
        <Link to="/holonet" className="text-swu-muted hover:text-swu-accent">
          HoloNet →
        </Link>
      </header>
      {posts.length ? (
        <div className="divide-y divide-swu-border/60">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/holonet/${post.id}`}
              className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs hover:bg-white/[0.04]"
            >
              <strong className="truncate text-swu-text">{post.title}</strong>
              <span className="font-mono text-[9px] text-swu-muted">
                {post.commentCount} Kommentare
              </span>
              <span className="col-span-2 text-[9px] text-swu-muted">
                von {post.author?.username ?? post.authorName ?? 'Unbekannt'} ·{' '}
                {new Date(post.createdAt).toLocaleString('de-DE')}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-3 py-3 text-xs text-swu-muted">
          Keine neuen Beiträge.
        </p>
      )}
    </section>
  );
}
/** Picks a random player once and keeps them until they go offline. */
function useStableRandomPlayer(players: DashboardData['onlinePlayers']) {
  const pickedId = useRef<number | null>(null);
  const current = players.find((p) => p.id === pickedId.current);
  if (current) return current;
  if (players.length === 0) {
    pickedId.current = null;
    return null;
  }
  const picked = players[Math.floor(Math.random() * players.length)];
  pickedId.current = picked.id;
  return picked;
}

export function DashboardLimits({ data }: { data: DashboardData }) {
  const limits = data.colonizationLimits?.limits;
  const randomPlayer = useStableRandomPlayer(data.onlinePlayers);
  return (
    <div className="space-y-2">
      <section className="border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-1.5 text-center text-xs font-bold text-swu-primary">
          Kolonielimitierung
        </header>
        <div className="flex items-center justify-center gap-4 px-3 py-3 font-mono text-xs text-swu-text">
          <span className="flex items-center gap-1" title="Planeten">
            <img
              src="/assets/planets/201s.png"
              alt=""
              className="size-5 object-contain"
            />
            {limits ? `${limits.planet.count}/${limits.planet.limit}` : '—'}
          </span>
          <span className="flex items-center gap-1" title="Monde">
            <img
              src="/assets/planets/401s.png"
              alt=""
              className="size-5 object-contain"
            />
            {limits ? `${limits.moon.count}/${limits.moon.limit}` : '—'}
          </span>
          <span className="flex items-center gap-1" title="Asteroiden">
            <img
              src="/assets/planets/701s.png"
              alt=""
              className="size-5 object-contain"
            />
            {limits ? `${limits.asteroid.count}/${limits.asteroid.limit}` : '—'}
          </span>
        </div>
      </section>
      <section className="border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-1.5 text-center text-xs font-bold text-swu-primary">
          Crewlimitierung
        </header>
        <div className="flex items-center justify-center gap-1 px-3 py-3 font-mono text-xs text-swu-text">
          <img
            src="/assets/navigation/menu_ships0.png"
            alt=""
            className="size-6 object-contain"
            title="Crew auf Schiffen und Stationen"
          />
          {data.crewInfo
            ? `${data.crewInfo.assigned}/${data.crewInfo.globalLimit}`
            : '—'}
          <img
            src="/assets/bev/bev_free_5_1.png"
            alt=""
            className="size-6 object-contain"
            title="Globales Crewlimit"
          />
        </div>
      </section>
      <section className="border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border px-3 py-1.5 text-center text-xs font-bold text-swu-primary">
          Zufällige Spieler (online)
        </header>
        {randomPlayer ? (
          <Link
            to={`/players/${randomPlayer.id}`}
            className="flex flex-col items-center gap-1 px-3 py-3 hover:bg-white/[0.04]"
          >
            <PlayerAvatar
              name={randomPlayer.username}
              avatar={randomPlayer.avatar}
              faction={randomPlayer.faction as never}
              alt={randomPlayer.username}
              className="size-10"
            />
            <span className="text-xs text-swu-text">{randomPlayer.username}</span>
          </Link>
        ) : (
          <p className="px-3 py-3 text-center text-xs text-swu-muted">
            Keine Spieler online
          </p>
        )}
      </section>
    </div>
  );
}
