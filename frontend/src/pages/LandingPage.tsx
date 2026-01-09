import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import {
  Sword,
  Rocket,
  Coins,
  Users,
  Shield,
  Zap,
  Globe,
  ChevronDown,
} from 'lucide-react';

// Feature data
const features = [
  {
    icon: Sword,
    title: 'Strategie & Eroberung',
    description:
      'Plane deine Feldzuege, erobere Systeme und baue dein galaktisches Imperium auf. Jede Entscheidung zaehlt in einem Universum voller Moeglichkeiten und Gefahren.',
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: Rocket,
    title: 'Modularer Schiffsbau',
    description:
      'Entwirf deine eigenen Raumschiffe mit unserem modularen Blueprint-System. Von kleinen Jaegern bis zu massiven Sternenzerstoerern - du bestimmst das Design.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Coins,
    title: 'Ressourcen & Wirtschaft',
    description:
      'Baue Minen, verwalte Handelsrouten und sichere dir wertvolle Ressourcen wie Durastahl, Tibanna-Gas und seltene Kyber-Kristalle.',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Users,
    title: 'Fraktionen & Loyalitaet',
    description:
      'Waehle deine Seite: Kaempfe fuer das Imperium, die Rebellion oder gruende deine eigene Fraktion. Allianzen und Verrat prraegen die Galaxis.',
    color: 'from-purple-500 to-pink-500',
  },
];

// Star field generator
function StarField() {
  const [stars, setStars] = useState<
    { x: number; y: number; size: number; opacity: number; delay: number }[]
  >([]);

  useEffect(() => {
    const generatedStars = Array.from({ length: 150 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      delay: Math.random() * 3,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Nebula background
function NebulaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-3xl animate-nebula-drift"
        style={{
          background:
            'radial-gradient(circle, rgba(0,100,255,0.4) 0%, rgba(100,0,200,0.2) 50%, transparent 70%)',
          top: '-20%',
          left: '-10%',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-3xl animate-nebula-drift-reverse"
        style={{
          background:
            'radial-gradient(circle, rgba(0,200,200,0.3) 0%, rgba(0,100,150,0.2) 50%, transparent 70%)',
          bottom: '-10%',
          right: '-5%',
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const login = useGameStore((state) => state.login);
  const isAuthenticated = useGameStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentifizierung fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToFeatures = () => {
    document
      .getElementById('features')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* === HERO SECTION: HoloNet Terminal Login === */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000510] via-[#001020] to-[#000a15]" />
        <NebulaBackground />
        <StarField />

        {/* Grid Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, 0.03) 25%, rgba(0, 255, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.03) 75%, rgba(0, 255, 255, 0.03) 76%, transparent 77%, transparent),
                             linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, 0.03) 25%, rgba(0, 255, 255, 0.03) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, 0.03) 75%, rgba(0, 255, 255, 0.03) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Terminal Login Card */}
        <div className="relative z-10 w-full max-w-lg">
          {/* Terminal Header */}
          <div className="bg-gradient-to-r from-cyan-900/50 via-cyan-800/50 to-cyan-900/50 border border-cyan-500/50 rounded-t-lg px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            </div>
            <span className="font-mono text-xs text-cyan-400/70 tracking-wider">
              SWHOLO.NET TERMINAL ACCESS - PORT 77
            </span>
          </div>

          {/* Terminal Body */}
          <div className="relative holo-terminal rounded-b-lg p-8 backdrop-blur-md">
            {/* Scan Line Effect */}
            <div className="holo-scan-line" />

            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <h1 className="text-5xl md:text-6xl font-bold font-mono tracking-wider animate-glow">
                  <span className="text-cyan-400">SWHOLO</span>
                  <span className="text-cyan-200">.NET</span>
                </h1>
                <div
                  className="absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full -z-10 animate-pulse"
                  style={{ animationDuration: '3s' }}
                />
              </div>
              <p className="mt-3 text-cyan-500/70 font-mono text-sm tracking-[0.3em]">
                GALAKTISCHES STRATEGIE-TERMINAL
              </p>
              <div className="holo-divider mt-4" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 holo-error">
                <p className="font-bold">FEHLER</p>
                <p>{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-cyan-500/80 font-mono text-sm mb-2 tracking-wider">
                  ACCESS CODE
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 holo-input rounded-md font-mono"
                  placeholder="commander@republic.holo"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-cyan-500/80 font-mono text-sm mb-2 tracking-wider">
                  SECURITY KEY
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 holo-input rounded-md font-mono"
                  placeholder="************************"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full holo-button rounded-md py-4 font-bold text-lg uppercase tracking-wider mt-6 group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Zap className="w-5 h-5 animate-spin" />
                      AUTHENTIFIZIERUNG...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5 group-hover:animate-pulse" />
                      LOG IN
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="holo-divider my-6" />

            {/* Links */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link
                to="/register"
                className="holo-link uppercase tracking-wider flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Register New Identity
              </Link>
              <span className="hidden sm:block text-cyan-700">|</span>
              <button className="holo-link uppercase tracking-wider flex items-center gap-1 opacity-50 cursor-not-allowed">
                <Globe className="w-4 h-4" />
                Forgot Credentials
              </button>
            </div>

            {/* Status Bar */}
            <div className="holo-divider mt-6 mb-3" />
            <div className="flex justify-between items-center text-xs font-mono text-cyan-600/50">
              <span>STARDATE {new Date().toLocaleDateString('de-DE')}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                SYS.STATUS: ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <button
          onClick={scrollToFeatures}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cyan-500/50 hover:text-cyan-400 transition-colors animate-bounce"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </section>

      {/* === FEATURES SECTION === */}
      <section
        id="features"
        className="relative py-20 px-4 bg-gradient-to-b from-[#000a15] via-[#001525] to-[#000a15]"
      >
        {/* Section Header */}
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-mono text-cyan-400 mb-4">
            ENTDECKE DIE GALAXIS
          </h2>
          <p className="text-cyan-600/70 font-mono max-w-2xl mx-auto">
            Tauche ein in ein lebendiges Star Wars Universum, in dem du dein
            eigenes Schicksal formst.
          </p>
          <div className="holo-divider max-w-md mx-auto mt-6" />
        </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border border-cyan-800/30 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden"
            >
              {/* Glow Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              />

              {/* Icon */}
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4`}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-cyan-300 mb-3 font-mono">
                {feature.title}
              </h3>
              <p className="text-cyan-600/80 leading-relaxed">
                {feature.description}
              </p>

              {/* Placeholder for Hero Image */}
              <div className="mt-6 h-40 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-800/20 flex items-center justify-center">
                <span className="text-cyan-700/50 font-mono text-sm">
                  [HERO IMAGE PLACEHOLDER]
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-16">
          <Link
            to="/register"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all uppercase tracking-wider"
          >
            <Rocket className="w-6 h-6" />
            Jetzt Spielen!
          </Link>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-[#000508] border-t border-cyan-900/30 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo & Description */}
            <div>
              <h3 className="text-2xl font-bold font-mono text-cyan-400 mb-3">
                SWHOLO.NET
              </h3>
              <p className="text-cyan-700/70 text-sm">
                Das ultimative Star Wars Browsergame. Baue dein Imperium,
                erobere die Galaxis.
              </p>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-cyan-500 font-mono font-bold mb-3 tracking-wider">
                RECHTLICHES
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-cyan-700/70 hover:text-cyan-400 text-sm transition-colors"
                  >
                    Impressum
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-cyan-700/70 hover:text-cyan-400 text-sm transition-colors"
                  >
                    Datenschutzerklaerung
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-cyan-700/70 hover:text-cyan-400 text-sm transition-colors"
                  >
                    AGB
                  </a>
                </li>
              </ul>
            </div>

            {/* Social Media */}
            <div>
              <h4 className="text-cyan-500 font-mono font-bold mb-3 tracking-wider">
                FOLGE UNS
              </h4>
              <div className="flex gap-4">
                {/* Social Media Placeholders */}
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-cyan-900/30 border border-cyan-800/30 flex items-center justify-center text-cyan-600 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                >
                  <span className="text-xs">X</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-cyan-900/30 border border-cyan-800/30 flex items-center justify-center text-cyan-600 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                >
                  <span className="text-xs">DC</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-cyan-900/30 border border-cyan-800/30 flex items-center justify-center text-cyan-600 hover:text-cyan-400 hover:border-cyan-500/50 transition-all"
                >
                  <span className="text-xs">YT</span>
                </a>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="holo-divider" />

          {/* Copyright */}
          <div className="text-center text-cyan-800/60 text-xs font-mono mt-6">
            <p>
              &copy; 2024 swholo.net. Alle Rechte vorbehalten.
            </p>
            <p className="mt-1">
              Star Wars&trade; ist ein eingetragenes Warenzeichen von Lucasfilm
              Ltd.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
