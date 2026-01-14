import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import {
  Rocket,
  Coins,
  Users,
  Shield,
  Zap,
  Globe,
  ChevronDown,
  Star,
  Target,
  Crown,
} from 'lucide-react';

// Feature data with improved hierarchy and visual structure
const features = [
  {
    icon: Target,
    title: 'Galaktische Strategie',
    description: 'Erobere Sternensysteme und baue dein Imperium auf. Jede Entscheidung beeinflusst das Schicksal der Galaxis.',
    highlight: 'Tick-basierte Schlachten',
    stats: '50+ Sternensysteme',
    color: 'from-cyan-400 to-cyan-600',
    bgColor: 'from-cyan-950/30 to-cyan-900/20',
  },
  {
    icon: Rocket,
    title: 'Modularer Schiffsbau',
    description: 'Entwirf einzigartige Raumschiffe mit unserem Blueprint-System. Von Jaegern bis zu Sternenzerstoerern.',
    highlight: 'Individuelle Designs',
    stats: '100+ Module verfügbar',
    color: 'from-blue-400 to-blue-600',
    bgColor: 'from-blue-950/30 to-blue-900/20',
  },
  {
    icon: Coins,
    title: 'Ressourcenverwaltung',
    description: 'Baue Minen, verwalte Handelsrouten und sichere wertvolle Materialien wie Kyber-Kristalle.',
    highlight: 'Wirtschaftssystem',
    stats: 'Credits • Metall • Kristalle',
    color: 'from-amber-400 to-amber-600',
    bgColor: 'from-amber-950/20 to-amber-900/10',
  },
  {
    icon: Crown,
    title: 'Fraktionskriege',
    description: 'Kaempfe für Imperium oder Rebellion. Schmiede Allianzen oder fuehre Verrat aus.',
    highlight: 'Persistente Welt',
    stats: 'Imperium vs. Rebellion',
    color: 'from-red-400 to-red-600',
    bgColor: 'from-red-950/20 to-red-900/10',
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
      {/* === HERO SECTION: Imperial Command Terminal === */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Deep Space Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#000408] via-[#000812] to-[#000204]" />
        <NebulaBackground />
        <StarField />

        {/* Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 49%, rgba(0, 255, 255, 0.1) 50%, transparent 51%),
                             linear-gradient(90deg, transparent 49%, rgba(0, 255, 255, 0.1) 50%, transparent 51%)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Command Terminal Interface */}
        <div className="relative z-10 w-full max-w-md">
          {/* Terminal Header */}
          <div className="bg-gradient-to-r from-cyan-950/80 to-cyan-900/60 border border-cyan-500/30 rounded-t-lg px-4 py-3 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400/50 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
            </div>
            <span className="font-mono text-xs text-cyan-400/60 tracking-[0.2em] uppercase">
              Imp-Net Terminal v2.7
            </span>
          </div>

          {/* Terminal Body */}
          <div className="relative bg-gradient-to-br from-cyan-950/40 via-slate-950/50 to-cyan-950/30 border border-cyan-500/20 rounded-b-lg p-8 backdrop-blur-sm">
            {/* Scan Line Effect */}
            <div className="holo-scan-line" />

            {/* Branding */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <h1 className="text-4xl font-bold font-mono tracking-[0.1em] text-cyan-300 relative">
                  STAR WARS
                  <div className="text-lg text-cyan-500/80 font-normal tracking-[0.3em] mt-1">
                    UNIVERSE
                  </div>
                </h1>
                {/* Subtle glow effect */}
                <div className="absolute -inset-6 bg-cyan-400/10 blur-2xl rounded-full -z-10" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-full mb-4">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-cyan-400/80 font-mono tracking-wider uppercase">
                  Galaktisches Strategienetzwerk
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-6" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 holo-error">
                <p className="font-bold">FEHLER</p>
                <p>{error}</p>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    BENUTZER-ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="commander@imperium.net"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-cyan-400/90 font-mono text-sm mb-2 tracking-wider font-medium">
                    SICHERHEITSCODE
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-900/60 border border-cyan-500/30 text-cyan-200 placeholder-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 rounded-md font-mono text-sm backdrop-blur-sm transition-colors"
                    placeholder="••••••••••••••••"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-900 font-mono font-bold text-sm tracking-wider uppercase rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40"
              >
                <span className="flex items-center justify-center gap-3">
                  {isLoading ? (
                    <>
                      <Zap className="w-4 h-4 animate-spin" />
                      Authentifizierung läuft...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Terminal Zugang
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-6" />

            {/* Navigation Links */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <Link
                to="/register"
                className="text-cyan-400 hover:text-cyan-300 font-mono tracking-wider flex items-center gap-2 transition-colors group"
              >
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Neuen Account erstellen
              </Link>
              <div className="w-px h-4 bg-cyan-600/30" />
              <button
                disabled
                className="text-cyan-600/40 font-mono tracking-wider flex items-center gap-2 cursor-not-allowed"
              >
                <Globe className="w-4 h-4" />
                Passwort vergessen
              </button>
            </div>

            {/* Terminal Status */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent mt-6 mb-4" />
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-cyan-500/60">
                DATUM: {new Date().toLocaleDateString('de-DE')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
                <span className="text-cyan-500/60">VERBINDUNG: AKTIV</span>
              </div>
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
        className="relative py-24 px-4 bg-gradient-to-b from-[#000204] via-[#000812] to-[#000408]"
      >
        {/* Section Header */}
        <div className="max-w-6xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold font-mono text-cyan-300 mb-6 tracking-tight">
            EROBERE DIE GALAXIS
          </h2>
          <p className="text-cyan-500/70 font-mono max-w-3xl mx-auto text-lg leading-relaxed">
            Tauche ein in ein lebendiges Star Wars Universum mit persistenter Welt,
            strategischer Tiefe und endlosen Möglichkeiten.
          </p>
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent max-w-lg mx-auto mt-8" />
        </div>

        {/* Feature Cards Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 border border-cyan-500/20 rounded-2xl p-8 hover:border-cyan-400/40 transition-all duration-500 backdrop-blur-sm"
            >
              {/* Accent Line */}
              <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r ${feature.color}`} />

              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.bgColor} border border-current border-opacity-20`}>
                  <feature.icon className={`w-8 h-8 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-cyan-500/60 font-mono tracking-wider uppercase mb-1">
                    {feature.highlight}
                  </div>
                  <div className="text-xs text-cyan-400/80 font-mono">
                    {feature.stats}
                  </div>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-cyan-200 mb-4 font-mono tracking-wide">
                {feature.title}
              </h3>
              <p className="text-cyan-300/70 leading-relaxed text-base mb-6">
                {feature.description}
              </p>

              {/* Visual Preview Placeholder */}
              <div className="relative h-48 bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-xl border border-cyan-600/20 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-center p-4 rounded-lg bg-gradient-to-br ${feature.bgColor}`}>
                    <feature.icon className={`w-8 h-8 mx-auto mb-2 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
                    <div className="text-xs text-cyan-500/60 font-mono">
                      Game Preview
                    </div>
                  </div>
                </div>
                {/* Subtle overlay grid */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `linear-gradient(0deg, transparent 90%, rgba(0, 255, 255, 0.1) 100%),
                                     linear-gradient(90deg, transparent 90%, rgba(0, 255, 255, 0.1) 100%)`,
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <div className="max-w-md mx-auto mb-8">
            <h3 className="text-2xl font-bold text-cyan-300 mb-4 font-mono">
              BEREIT FÜR DIE GALAXIS?
            </h3>
            <p className="text-cyan-400/70 font-mono text-sm">
              Schließe dich tausenden Spielern an und forme das Schicksal der Sterne.
            </p>
          </div>

          <Link
            to="/register"
            className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 font-mono font-bold text-lg rounded-xl shadow-xl shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all transform hover:scale-[1.02] hover:-translate-y-1"
          >
            <Star className="w-6 h-6" />
            <span className="tracking-wider">JETZT BEITRETEN</span>
            <Rocket className="w-6 h-6" />
          </Link>

          <div className="mt-6 text-xs text-cyan-500/50 font-mono">
            Kostenlos • Sofort spielbar • Keine Downloads
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="relative bg-gradient-to-b from-[#000204] to-[#000102] border-t border-cyan-500/20 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold font-mono text-cyan-300 mb-4 tracking-wide">
                STAR WARS UNIVERSE
              </h3>
              <p className="text-cyan-400/70 text-sm leading-relaxed max-w-md">
                Das ultimative Star Wars Strategiespiel im Browser. Erobere die Galaxis,
                baue dein Imperium und schreibe Geschichte in einer weit, weit entfernten Galaxis.
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-cyan-500/60 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <a
                  href="https://discord.gg/thR3x6hedp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500/60 hover:text-cyan-400 transition-colors"
                >
                  Discord Community beitreten
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-cyan-400 font-mono font-semibold mb-4 tracking-wider text-sm">
                RECHTLICHES
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-cyan-500/70 hover:text-cyan-400 text-sm transition-colors font-mono"
                  >
                    Impressum
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-cyan-500/70 hover:text-cyan-400 text-sm transition-colors font-mono"
                  >
                    Datenschutz
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-cyan-500/70 hover:text-cyan-400 text-sm transition-colors font-mono"
                  >
                    Nutzungsbedingungen
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-cyan-400 font-mono font-semibold mb-4 tracking-wider text-sm">
                COMMUNITY
              </h4>
              <div className="space-y-3">
                <a
                  href="https://discord.gg/thR3x6hedp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-cyan-500/70 hover:text-cyan-400 text-sm transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-cyan-600/20 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                    <span className="text-xs font-mono">DC</span>
                  </div>
                  Discord Server
                </a>
                <a
                  href="#"
                  className="flex items-center gap-3 text-cyan-500/70 hover:text-cyan-400 text-sm transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-cyan-600/20 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                    <span className="text-xs font-mono">GH</span>
                  </div>
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-cyan-500/50 font-mono">
              &copy; 2024 Star Wars Universe. Alle Rechte vorbehalten.
            </div>
            <div className="text-xs text-cyan-600/40 font-mono">
              Star Wars™ ist ein Warenzeichen von Lucasfilm Ltd.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
