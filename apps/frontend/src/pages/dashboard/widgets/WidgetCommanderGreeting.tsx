import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import type { DashboardData } from '../types';

export function WidgetCommanderGreeting({ data }: { data: DashboardData }) {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex items-center justify-between h-full px-1">
      <div>
        <h1
          className="text-base font-bold text-swu-primary"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Commander {user?.username}
        </h1>
        <div className="text-[10px] text-swu-muted font-mono">
          {user?.faction === 'REBEL_ALLIANCE'
            ? 'Rebellenallianz'
            : 'Galaktisches Imperium'}
          {user?.prestige != null && <> · Prestige {user.prestige}</>}
        </div>
      </div>
      {data.unreadMessages > 0 && (
        <Link
          to="/messages"
          className="text-[10px] px-2 py-1 bg-swu-accent/15 border border-swu-accent/40 rounded text-swu-accent hover:bg-swu-accent/25 transition-colors"
        >
          ✉ {data.unreadMessages} ungelesen
        </Link>
      )}
    </div>
  );
}
