import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

const baseNavItems = [
  { label: 'Dashboard', path: '/', icon: 'D' },
  { label: 'Colonies', path: '/colonies', icon: 'C' },
  { label: 'Ships', path: '/spacecraft', icon: 'S' },
  { label: 'Starmap', path: '/starmap', icon: 'M' },
  { label: 'Research', path: '/research', icon: 'R' },
  { label: 'Messages', path: '/messages', icon: 'P' },
  { label: 'HoloNet', path: '/holonet', icon: 'H' },
];

const adminNavItem = { label: 'Map Admin', path: '/admin/starmap', icon: 'A' };

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);
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
          <span className="text-lg font-bold">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
