import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useStatusBar, formatTickCountdown } from '../../hooks/use-status-bar';
import { api } from '../../services/api';

const NAV_ITEMS = [
  { label: 'Maindesk', path: '/', icon: NavIconMaindesk },
  { label: 'Kolonien', path: '/colonies', icon: NavIconColonies },
  { label: 'Schiffe', path: '/spacecraft', icon: NavIconShips },
  { label: 'Scans', path: '/colony-scans', icon: NavIconScans },
  { label: 'KommNet', path: '/holonet', icon: NavIconHolonet },
  { label: 'Nachrichten', path: '/messages', icon: NavIconMessages },
  { label: 'Forschung', path: '/research', icon: NavIconResearch },
  { label: 'Datenbank', path: '/database', icon: NavIconDatabase },
  { label: 'Karte', path: '/starmap', icon: NavIconMap },
];

const adminNavItem = { label: 'Admin', path: '/admin', icon: NavIconAdmin };
const mapEditorNavItem = {
  label: 'Karteneditor',
  path: '/admin/starmap',
  icon: NavIconMap,
};

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const { tick } = useStatusBar();
  const extraItems = user?.isAdmin
    ? [adminNavItem, mapEditorNavItem]
    : user?.permissions?.includes('MAP_EDITOR')
      ? [mapEditorNavItem]
      : [];
  const items = [...NAV_ITEMS, ...extraItems];

  useEffect(() => {
    if (!accessToken) return;
    if (user?.isAdmin) return;
    void api
      .get<typeof user>('/auth/me')
      .then((profile) => {
        if (profile) setUser(profile);
      })
      .catch(() => undefined);
  }, [accessToken, setUser, user?.isAdmin]);

  useEffect(() => {
    if (!accessToken) return;
    const fetchUnread = () => {
      api
        .get<number>('/messages/unread')
        .then(setUnreadCount)
        .catch(() => undefined);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [accessToken]);

  return (
    <aside className="hidden md:flex fixed top-[52px] left-0 w-[68px] h-[calc(100vh-52px)] bg-swu-surface border-r border-swu-border flex-col items-center py-3 z-40">
      <div className="flex flex-col items-center gap-1 flex-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-1 py-2 w-full text-center transition-colors hover:text-swu-accent ${
                isActive ? 'text-swu-accent bg-swu-accent/10' : 'text-swu-muted'
              }`
            }
          >
            <span className="relative">
              <item.icon />
              {item.path === '/messages' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2.5 bg-swu-accent text-swu-bg text-[7px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[10px] leading-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto pt-2 border-t border-swu-border/50 w-full flex flex-col items-center">
        <TickRing
          msToNext={tick.msToNext}
          tickIndex={tick.currentTickIndex}
          totalTicks={tick.totalTicks}
        />
      </div>
    </aside>
  );
}

function NavIconMaindesk() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function NavIconColonies() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
      <path d="M3 12h18" />
    </svg>
  );
}

function NavIconShips() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L4 20h16L12 2z" />
      <path d="M12 2v18" />
    </svg>
  );
}

function NavIconMap() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function NavIconResearch() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3v12l-3 3h12l-3-3V3" />
      <path d="M9 3h6" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  );
}

function NavIconMessages() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function NavIconHolonet() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v12H4z" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function NavIconDatabase() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  );
}

function NavIconScans() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <circle cx="12" cy="12" r="4" />
      <path d="M9.5 12a2.5 2.5 0 0 1 2.5-2.5" />
    </svg>
  );
}

function NavIconSettings() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function NavIconAdmin() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

const TICK_INTERVAL_MS = 3 * 60 * 60 * 1000;

function TickRing({
  msToNext,
  tickIndex,
  totalTicks,
}: {
  msToNext: number;
  tickIndex: number;
  totalTicks: number;
}) {
  const progress = 1 - Math.min(msToNext / TICK_INTERVAL_MS, 1);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-[52px] h-[52px] flex items-center justify-center">
      <svg width="52" height="52" className="absolute -rotate-90">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--color-swu-border)"
          strokeWidth="3"
          opacity="0.4"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="var(--color-swu-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-[10px] font-mono font-bold text-swu-accent leading-none">
          {formatTickCountdown(msToNext)}
        </div>
        <div className="text-[8px] text-swu-muted leading-none mt-0.5">
          {tickIndex + 1}/{totalTicks}
        </div>
      </div>
    </div>
  );
}
