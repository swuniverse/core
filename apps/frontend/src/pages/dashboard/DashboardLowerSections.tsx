import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

export function RecentEvents({ data }: { data: DashboardData }) {
  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">
        Letzte Ereignisse
      </header>
      <div className="divide-y divide-swu-border/60">
        {data.recentEvents.slice(0, 8).map((event) => (
          <div key={event.id} className="flex gap-2 px-3 py-2 text-xs">
            <time className="shrink-0 font-mono text-swu-muted">
              {new Date(event.createdAt).toLocaleTimeString('de-DE')}
            </time>
            <span className="text-swu-text">{event.text}</span>
          </div>
        ))}
      </div>
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
export function DashboardLimits({ data }: { data: DashboardData }) {
  const limits = data.colonizationLimits?.limits;
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
    </div>
  );
}
