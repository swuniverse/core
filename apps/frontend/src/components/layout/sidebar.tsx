import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

const baseNavItems = [
  { label: 'Maindesk', path: '/', icon: 'D' },
  { label: 'Kolonien', path: '/colonies', icon: 'C' },
  { label: 'Schiffe', path: '/spacecraft', icon: 'S' },
  { label: 'Sternenkarte', path: '/starmap', icon: 'M' },
  { label: 'Forschung', path: '/research', icon: 'R' },
  { label: 'Nachrichten', path: '/messages', icon: 'P' },
  { label: 'HoloNet', path: '/holonet', icon: 'H' },
  { label: 'Datenbank', path: '/database', icon: 'DB' },
  { label: 'Einstellungen', path: '/settings', icon: '⚙' },
];

const adminNavItem = { label: 'Admin', path: '/admin', icon: 'A' };

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [unreadCount, setUnreadCount] = useState(0);
  const navItems = user?.isAdmin
    ? [...baseNavItems, adminNavItem]
    : baseNavItems;

  useEffect(() => {
    if (!accessToken) return;
    if (user?.isAdmin) return;

    void api
      .get<typeof user>('/auth/me')
      .then((profile) => {
        if (profile) {
          setUser(profile);
        }
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
    <aside className="fixed top-20 left-0 w-[120px] h-[calc(100vh-80px)] bg-swu-surface border-r border-swu-border flex flex-col items-center py-4 gap-1 z-40">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2 py-3 w-full text-center text-xs transition-colors hover:text-swu-accent ${
              isActive ? 'text-swu-accent bg-swu-bg' : 'text-swu-muted'
            }`
          }
        >
          <span className="text-lg font-bold relative">
            {item.icon}
            {item.path === '/messages' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-3 bg-swu-accent text-swu-bg text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
