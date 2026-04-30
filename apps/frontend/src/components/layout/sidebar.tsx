import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/', icon: 'D' },
  { label: 'Colonies', path: '/colonies', icon: 'C' },
  { label: 'Ships', path: '/spacecraft', icon: 'S' },
  { label: 'Starmap', path: '/starmap', icon: 'M' },
  { label: 'Research', path: '/research', icon: 'R' },
  { label: 'Messages', path: '/messages', icon: 'P' },
  { label: 'HoloNet', path: '/holonet', icon: 'H' },
];

export function Sidebar() {
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
