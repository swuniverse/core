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
    <div className="min-h-screen" style={{ backgroundImage: `linear-gradient(135deg, #000a0a 0%, #001a2e 100%)`, backgroundAttachment: 'fixed' }}>
      <nav className="border-b border-holo/50 bg-holo-card/30 backdrop-blur-sm" style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-base md:text-xl font-bold text-holo animate-glow">SWHOLO.NET</h1>
                <p className="text-xs text-holo/60 hidden sm:block font-mono">
                  [CMDR] {user?.username} • {user?.player?.faction?.name}
                </p>
              </div>
              <div className="hidden lg:flex space-x-4">
                <Link to="/" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <Rocket size={18} />
                  Übersicht
                </Link>
                <Link to="/planets" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <Globe size={18} />
                  Planeten
                </Link>
                <Link to="/fleet" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <Users size={18} />
                  Schiffe
                </Link>
                <Link to="/holonet" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <Radio size={18} />
                  HoloNet
                </Link>
                <Link to="/research" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <FlaskConical size={18} />
                  Forschung
                </Link>
                <Link to="/galaxy" className="flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono">
                  <Map size={18} />
                  Galaxie
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              {player?.isAdmin && (
                <Link
                  to="/admin"
                  className="hidden md:flex items-center gap-2 text-holo hover:text-holo/80 px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono"
                  title="Admin-Menü"
                >
                  <Shield size={18} />
                </Link>
              )}
              <Link
                to="/settings"
                className="hidden md:flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono"
              >
                <Settings size={18} />
              </Link>
              
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 text-holo/70 hover:text-holo px-3 py-2 rounded-md transition-all hover:shadow-holo font-mono"
              >
                <LogOut size={18} />
                Abmelden
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-holo p-2"
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
        <div className="lg:hidden fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 holo-terminal border-l border-holo" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="holo-text font-bold text-lg">NAVIGATION</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-holo">
                  <X size={24} />
                </button>
              </div>
              
              <Link to="/" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Rocket size={20} />
                Übersicht
              </Link>
              <Link to="/planets" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Globe size={20} />
                Planeten
              </Link>
              <Link to="/fleet" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Users size={20} />
                Schiffe
              </Link>
              <Link to="/holonet" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Radio size={20} />
                HoloNet
              </Link>
              <Link to="/research" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <FlaskConical size={20} />
                Forschung
              </Link>
              <Link to="/galaxy" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Map size={20} />
                Galaxie
              </Link>
              <Link to="/settings" className="flex items-center gap-3 text-holo/70 hover:text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono" onClick={() => setMobileMenuOpen(false)}>
                <Settings size={20} />
                Einstellungen
              </Link>
              
              {player?.isAdmin && (
                <Link to="/admin" className="flex items-center gap-3 text-holo py-3 px-4 hover:bg-holo/10 rounded transition font-mono mt-2" onClick={() => setMobileMenuOpen(false)}>
                  <Shield size={20} />
                  Admin
                </Link>
              )}
              
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 holo-button rounded transition mt-6 font-mono"
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
