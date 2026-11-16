import { PlayerName } from '../PlayerName';
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useHolonetUnreadStore } from '../../stores/holonet-unread.store';
import { NavigationIcon } from './navigation-icon';

const primaryTabs = [
  { label: 'Kolonien', path: '/colonies', icon: 'planets' },
  { label: 'Schiffe', path: '/spacecraft', icon: 'ships' },
  { label: 'Maindesk', path: '/', icon: 'maindesk' },
];

const moreItems = [
  { label: 'Karte', path: '/starmap', icon: 'map' },
  { label: 'Forschung', path: '/research', icon: 'forsch' },
  { label: 'Nachrichten', path: '/messages', icon: 'msg' },
  { label: 'HoloNet', path: '/holonet', icon: 'comm' },
  { label: 'Allianzen', path: '/alliances', icon: 'ally' },
  { label: 'Handel', path: '/trade', icon: 'trade' },
  { label: 'Datenbank', path: '/database', icon: 'data' },
  { label: 'Ereignisse', path: '/events', icon: 'history' },
  { label: 'Einstellungen', path: '/settings', icon: 'option' },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const holonetUnread = useHolonetUnreadStore((state) => state.count);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const allMoreItems = user?.isAdmin
    ? [...moreItems, { label: 'Admin', path: '/admin', icon: 'admin' }]
    : moreItems;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-swu-surface border-t border-swu-border rounded-t-lg p-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {allMoreItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                title={item.label}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-swu-accent bg-swu-accent/10'
                      : 'text-swu-muted hover:text-swu-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <NavigationIcon name={item.icon} active={isActive} size="small" />
                      {item.path === '/holonet' && holonetUnread > 0 && (
                        <span
                          aria-label={`${holonetUnread} neue HoloNet-Beiträge`}
                          className="absolute -right-3 -top-2 min-w-4 rounded-full bg-swu-danger px-1 text-[9px] font-bold leading-4 text-white"
                        >
                          {holonetUnread}
                        </span>
                      )}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                setMoreOpen(false);
              }}
              className="group flex items-center gap-3 px-3 py-2.5 rounded text-sm text-swu-danger w-full text-left"
            >
              <NavigationIcon name="logout" active={false} size="small" />
              <span>Logout (<PlayerName name={user?.username} />)</span>
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-swu-surface border-t border-swu-border z-[60] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-[56px]">
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/'}
              aria-label={tab.label}
              title={tab.label}
              className={({ isActive }) =>
                `group flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] transition-colors ${
                  isActive ? 'text-swu-accent' : 'text-swu-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <NavigationIcon name={tab.icon} active={isActive} size="small" />
                  <span className="text-[9px]">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            aria-label="Mehr"
            title="Mehr"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`group flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] transition-colors ${
              moreOpen ? 'text-swu-accent' : 'text-swu-muted'
            }`}
          >
            <NavigationIcon name="more" active={moreOpen} size="small" />
            <span className="text-[9px]">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}
