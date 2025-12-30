import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Rocket, Globe, FlaskConical, Users, LogOut, Settings, Shield, Map, Menu, X, Radio } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { useState } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const { user, player, logout } = useGameStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-space">
      <nav className="bg-space-light border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-base md:text-xl font-bold text-white">Star Wars Universe</h1>
                <p className="text-xs text-gray-400 hidden sm:block">
                  {user?.username} • {user?.player?.faction?.name}
                </p>
              </div>
              <div className="hidden lg:flex space-x-4">
                <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Rocket size={18} />
                  Übersicht
                </Link>
                <Link to="/planets" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Globe size={18} />
                  Planeten
                </Link>
                <Link to="/fleet" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Users size={18} />
                  Schiffe
                </Link>
                <Link to="/comnet" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Radio size={18} />
                  Comnet
                </Link>
                <Link to="/research" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <FlaskConical size={18} />
                  Forschung
                </Link>
                <Link to="/galaxy" className="flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  <Map size={18} />
                  Galaxie
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              {player?.isAdmin && (
                <Link
                  to="/admin"
                  className="hidden md:flex items-center gap-2 text-red-400 hover:text-red-300 px-3 py-2 rounded-md hover:bg-gray-700 transition"
                  title="Admin-Menü"
                >
                  <Shield size={18} />
                </Link>
              )}
              <Link
                to="/settings"
                className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <Settings size={18} />
              </Link>
              
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 text-gray-300 hover:text-white px-3 py-2 rounded-md hover:bg-gray-700 transition"
              >
                <LogOut size={18} />
                Abmelden
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white p-2"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-space-dark shadow-xl border-l border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-white font-bold text-lg">Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white">
                  <X size={24} />
                </button>
              </div>
              
              <Link to="/" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Rocket size={20} />
                Übersicht
              </Link>
              <Link to="/planets" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Globe size={20} />
                Planeten
              </Link>
              <Link to="/fleet" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Users size={20} />
                Schiffe
              </Link>
              <Link to="/comnet" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Radio size={20} />
                Comnet
              </Link>
              <Link to="/research" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <FlaskConical size={20} />
                Forschung
              </Link>
              <Link to="/galaxy" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Map size={20} />
                Galaxie
              </Link>
              <Link to="/settings" className="flex items-center gap-3 text-white py-3 px-4 hover:bg-gray-700 rounded transition" onClick={() => setMobileMenuOpen(false)}>
                <Settings size={20} />
                Einstellungen
              </Link>
              
              {player?.isAdmin && (
                <Link to="/admin" className="flex items-center gap-3 text-red-400 py-3 px-4 hover:bg-gray-700 rounded transition mt-2" onClick={() => setMobileMenuOpen(false)}>
                  <Shield size={20} />
                  Admin
                </Link>
              )}
              
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded transition mt-6"
              >
                <LogOut size={20} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
