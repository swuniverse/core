import { useAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-swu-surface border-b-2 border-swu-border flex items-center justify-between px-5 z-50">
      <h1 className="text-xl font-bold text-swu-accent">Star Wars Universe</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-swu-muted">{user?.username}</span>
        <button
          onClick={handleLogout}
          className="bg-swu-danger hover:bg-swu-danger/80 text-white text-sm px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
