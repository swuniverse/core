import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetHoloNet({ data }: { data: DashboardData }) {
  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 flex items-center justify-between shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          HoloNet · Neue vom Lesezeichen
        </span>
        <Link to="/holonet" className="text-[10px] text-swu-accent hover:underline">
          Archiv →
        </Link>
      </div>
      {data.holonetPosts.length === 0 ? (
        <div className="px-3 py-2 text-[10px] text-swu-muted">
          Keine neuen Beiträge seit dem gesetzten Lesezeichen.
        </div>
      ) : (
        <div className="divide-y divide-swu-border/20 overflow-auto flex-1">
          {data.holonetPosts.map((post) => (
            <Link
              key={post.id}
              to={`/holonet/${post.id}`}
              className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-swu-accent/5 transition-colors"
            >
              <span className="text-[9px] text-swu-muted uppercase w-10 shrink-0">
                {post.category?.slice(0, 4) ?? 'POST'}
              </span>
              <span className="text-swu-primary truncate flex-1">{post.title}</span>
              <span className="text-[10px] text-swu-muted shrink-0">
                {post.author?.username ?? post.authorName ?? 'Unbekannt'}
              </span>
              {post.commentCount > 0 && (
                <span className="text-[10px] text-swu-muted shrink-0">
                  💬{post.commentCount}
                </span>
              )}
              <span className="text-[10px] text-swu-muted shrink-0">
                {new Date(post.createdAt).toLocaleDateString('de-DE')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
