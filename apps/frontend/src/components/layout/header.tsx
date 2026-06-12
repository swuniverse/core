import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useStatusBar } from '../../hooks/use-status-bar';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { unreadMessages } = useStatusBar();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-[52px] bg-swu-surface border-b border-swu-border flex items-center px-3 z-50">
      {/* Left: User Block */}
      {user && (
        <Link
          to="/"
          className="flex items-center gap-3 shrink-0 rounded px-1 py-0.5 transition-colors hover:bg-swu-accent/10 focus:outline-none focus:ring-1 focus:ring-swu-accent/60"
          title="Zum Maindesk"
        >
          <div className="leading-tight">
            <div className="text-xs font-bold text-swu-primary">
              {user.username}
            </div>
            <div className="text-[9px] text-swu-muted font-mono">
              ID: {user.id} · Prestige: {user.prestige}
            </div>
          </div>
        </Link>
      )}

      {/* Notizen */}
      <Link
        to="/notes"
        className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-swu-border/50 text-[10px] text-swu-muted hover:text-swu-accent transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Notizen</span>
      </Link>

      {/* Nachrichten */}
      <Link
        to="/messages"
        className="relative flex items-center gap-1 ml-3 pl-3 border-l border-swu-border/50 text-swu-muted hover:text-swu-accent transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Settings + Logout */}
      <div className="flex items-center gap-2 ml-4 pl-4 border-l border-swu-border/50 shrink-0">
        {user?.isAdmin && (
          <Link
            to="/admin"
            className="text-[9px] bg-swu-accent/20 text-swu-accent px-1.5 py-0.5 rounded hover:bg-swu-accent/30 transition-colors"
          >
            ADM
          </Link>
        )}
        <Link
          to="/settings"
          className="text-swu-muted hover:text-swu-accent transition-colors"
          title="Einstellungen"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </Link>
        <button
          onClick={handleLogout}
          className="text-swu-muted hover:text-swu-danger transition-colors text-xs"
          title="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
