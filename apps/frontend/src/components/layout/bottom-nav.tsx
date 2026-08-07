import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

const primaryTabs = [
  { label: 'Kolonien', path: '/colonies', icon: '◉' },
  { label: 'Schiffe', path: '/spacecraft', icon: '△' },
  { label: 'Maindesk', path: '/', icon: '◫' },
  { label: 'Scans', path: '/colony-scans', icon: '◎' },
];

const moreItems = [
  { label: 'Karte', path: '/starmap', icon: '✦' },
  { label: 'Forschung', path: '/research', icon: '⚗' },
  { label: 'Nachrichten', path: '/messages', icon: '✉' },
  { label: 'HoloNet', path: '/holonet', icon: '▣' },
  { label: 'Datenbank', path: '/database', icon: '▤' },
  { label: 'Einstellungen', path: '/settings', icon: '⚙' },
];

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const allMoreItems = user?.isAdmin
    ? [...moreItems, { label: 'Admin', path: '/admin', icon: '⚡' }]
    : moreItems;

  return (
    <>
      {/* More Overlay */}
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'text-swu-accent bg-swu-accent/10'
                      : 'text-swu-muted hover:text-swu-primary'
                  }`
                }
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => {
                logout();
                setMoreOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sm text-swu-danger w-full text-left"
            >
              <span className="text-base w-5 text-center">✕</span>
              <span>Logout ({user?.username})</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-swu-surface border-t border-swu-border z-[60] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-[56px]">
          {primaryTabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] transition-colors ${
                  isActive ? 'text-swu-accent' : 'text-swu-muted'
                }`
              }
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[9px]">{tab.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px] transition-colors ${
              moreOpen ? 'text-swu-accent' : 'text-swu-muted'
            }`}
          >
            <span className="text-lg">⋯</span>
            <span className="text-[9px]">Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}
