import { Link } from 'react-router-dom';
import type { DashboardData } from '../types';

export function WidgetMessages({ data }: { data: DashboardData }) {
  const messages = data.inboxMessages.filter((m) => !m.isRead).slice(0, 10);
  return (
    <div className="bg-swu-surface border border-swu-border rounded h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-swu-border/50 flex items-center justify-between shrink-0">
        <span
          className="text-xs font-bold text-swu-muted"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Nachrichten
        </span>
        <Link to="/messages" className="text-[10px] text-swu-accent hover:underline">
          Postfach →
        </Link>
      </div>
      {messages.length === 0 ? (
        <div className="px-3 py-2 text-[10px] text-swu-muted">Keine ungelesenen Nachrichten.</div>
      ) : (
        <div className="divide-y divide-swu-border/20 overflow-auto flex-1">
          {messages.map((msg) => (
            <Link
              key={msg.id}
              to="/messages"
              className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-swu-accent/5 transition-colors"
            >
              <span className="text-swu-accent shrink-0">✉</span>
              <span className="text-swu-primary truncate flex-1">{msg.subject}</span>
              <span className="text-[10px] text-swu-muted shrink-0">
                {msg.sender?.username ?? 'System'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
