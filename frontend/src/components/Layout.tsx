import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Rocket, Globe, FlaskConical, Users, LogOut, Settings } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout, isConnected } = useGameStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-space">
      <nav className="bg-space-light border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div>
                <h1 className="text-xl font-bold text-white">Star Wars Universe</h1>
                <p className="text-xs text-gray-400">
                  {user?.username} • {user?.player?.faction?.name}
                </p>
              </div>
              <div className="flex space-x-4">
                <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Rocket size={18} />
                  Übersicht
                </Link>
                <Link to="/galaxy" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Globe size={18} />
                  Galaxie
                </Link>
                <Link to="/research" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <FlaskConical size={18} />
                  Forschung
                </Link>
                <Link to="/fleet" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Users size={18} />
                  Flotte
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                to="/settings"
                className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <Settings size={18} />
              </Link>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <LogOut size={18} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
