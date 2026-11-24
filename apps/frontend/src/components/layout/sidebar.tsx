import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import {
  useStatusBar,
  formatTickCountdown,
  formatTickTime,
} from '../../hooks/use-status-bar';
import { api } from '../../services/api';
import { useHolonetUnreadStore } from '../../stores/holonet-unread.store';
import { NavigationIcon } from './navigation-icon';

const NAV_ITEMS = [
  { label: 'Maindesk', path: '/', icon: 'maindesk' },
  { label: 'Kolonien', path: '/colonies', icon: 'planets' },
  { label: 'Schiffe', path: '/spacecraft', icon: 'ships' },
  { label: 'HoloNet', path: '/holonet', icon: 'comm' },
  { label: 'Nachrichten', path: '/messages', icon: 'msg' },
  { label: 'Allianzen', path: '/alliances', icon: 'ally' },
  { label: 'Forschung', path: '/research', icon: 'forsch' },
  { label: 'Handel', path: '/trade', icon: 'trade' },
  { label: 'Datenbank', path: '/database', icon: 'data' },
  { label: 'Ereignisse', path: '/events', icon: 'history' },
  { label: 'Karte', path: '/starmap', icon: 'map' },
];

const stationsNavItem = { label: 'Stationen', path: '/stations', icon: 'station' };
const adminNavItem = { label: 'Admin', path: '/admin', icon: 'admin' };
const mapEditorNavItem = {
  label: 'Karteneditor',
  path: '/admin/starmap',
  icon: 'mapeditor',
};

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const holonetUnread = useHolonetUnreadStore((state) => state.count);
  const refreshHolonetUnread = useHolonetUnreadStore((state) => state.refresh);
  const { tick, serverTime } = useStatusBar();
  const extraItems = user?.isAdmin
    ? [adminNavItem, mapEditorNavItem]
    : user?.permissions?.includes('MAP_EDITOR')
      ? [mapEditorNavItem]
      : [];
  // STU: "Stationen" only once stations are available to the player.
  const navItems =
    user?.hasStationsNavigation || user?.isAdmin
      ? NAV_ITEMS.flatMap((item) =>
          item.path === '/spacecraft' ? [item, stationsNavItem] : [item],
        )
      : NAV_ITEMS;
  const items = [...navItems, ...extraItems];

  useEffect(() => {
    if (accessToken) void refreshHolonetUnread();
  }, [accessToken, refreshHolonetUnread]);

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

  return (
    <aside
      data-tutorial="main-navigation"
      className="fixed left-0 top-[86px] z-40 hidden h-[calc(100vh-86px)] w-[68px] flex-col items-center border-r border-swu-border bg-swu-surface py-3 md:flex"
    >
      <div className="flex flex-col items-center gap-1 flex-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            aria-label={item.label}
            title={item.label}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-0.5 px-1 py-2 w-full text-center transition-colors hover:text-swu-accent ${
                isActive ? 'text-swu-accent bg-swu-accent/10' : 'text-swu-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <NavigationIcon name={item.icon} active={isActive} />
                  {item.path === '/holonet' && holonetUnread > 0 && (
                    <span
                      aria-label={`${holonetUnread} neue HoloNet-Beiträge`}
                      className="absolute -right-3 -top-2 min-w-4 rounded-full bg-swu-danger px-1 text-[9px] font-bold leading-4 text-white"
                    >
                      {holonetUnread}
                    </span>
                  )}
                </span>
                <span className="text-[10px] leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto pt-2 border-t border-swu-border/50 w-full flex flex-col items-center">
        <TickRing
          msToNext={tick.msToNext}
          tickIndex={tick.currentTickIndex}
          totalTicks={tick.totalTicks}
          progress={tick.progress}
          loaded={tick.loaded}
          nextTickAt={tick.nextTickAt}
        />
        <div
          title="Serverzeit"
          className="mt-1 font-mono text-[9px] text-swu-muted"
        >
          {serverTime
            ? [
                serverTime.getHours(),
                serverTime.getMinutes(),
                serverTime.getSeconds(),
              ]
                .map((value) => String(value).padStart(2, '0'))
                .join(':')
            : '--:--:--'}
        </div>
      </div>
    </aside>
  );
}

function TickRing({
  msToNext,
  tickIndex,
  totalTicks,
  progress,
  loaded,
  nextTickAt,
}: {
  msToNext: number;
  tickIndex: number;
  totalTicks: number;
  progress: number;
  loaded: boolean;
  nextTickAt: Date;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div
      className="relative w-[52px] h-[52px] flex items-center justify-center"
      title={
        loaded ? `Nächster Tick: ${formatTickTime(nextTickAt)}` : undefined
      }
    >
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
          {loaded ? formatTickCountdown(msToNext) : '--'}
        </div>
        <div className="text-[8px] text-swu-muted leading-none mt-0.5">
          {loaded ? `${tickIndex + 1}/${totalTicks}` : '--'}
        </div>
      </div>
    </div>
  );
}
