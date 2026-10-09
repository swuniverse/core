import { Link } from 'react-router-dom';
import type { DashboardData } from './types';

/** Recent forum topics of the player's alliance; hidden without any. */
export function DashboardForum({ data }: { data: DashboardData }) {
  const topics = data.forumTopics ?? [];
  if (!topics.length) return null;
  return (
    <section className="border border-swu-border bg-swu-surface/70">
      <header className="border-b border-swu-border px-3 py-1.5 text-xs font-bold text-swu-primary">
        Letzte Forenthemen
      </header>
      <div className="divide-y divide-swu-border/60">
        {topics.map((topic) => (
          <Link
            key={topic.topicId}
            to={topic.linkTo}
            className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs hover:bg-white/[0.04]"
          >
            <strong className="truncate text-swu-text">{topic.title}</strong>
            <span className="font-mono text-[9px] text-swu-muted">
              {new Date(topic.lastActivityAt).toLocaleString('de-DE')}
            </span>
            <span className="col-span-2 text-[9px] text-swu-muted">
              in {topic.boardName}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
