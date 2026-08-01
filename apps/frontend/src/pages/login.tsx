import { useEffect, useState, type SyntheticEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { StarField } from '../components/auth/StarField';
import type { AuthResponse } from '@swuniverse/shared';

interface GalaxyStats {
  settlers: number;
  colonies: number;
  ships: number;
  totalTechs: number;
  shipClasses: number;
  planetTypes: number;
  buildingTypes: number;
}

const features = [
  {
    title: 'Kolonien & Ressourcen',
    copy: 'Baue Außenposten auf, sichere Hyperraum-Routen und optimiere jede Tick-Produktion wie ein echter Sektor-Gouverneur.',
    icon: 'orbit',
    variant: 'primary',
  },
  {
    title: 'Flotten & Taktik',
    copy: 'Plane Manöver über mehrere Ticks, stelle Verbände zusammen. Timing schlägt Reflexe.',
    icon: 'fleet',
    variant: 'secondary',
  },
  {
    title: 'Diplomatie',
    copy: 'Schmiede Bündnisse, handle Nichtangriffspakte aus. Manchmal ist Verrat mehr wert als Loyalität.',
    icon: 'signal',
    variant: 'secondary',
  },
] as const;

const steps = [
  {
    title: 'Invite Key holen',
    copy: 'Tritt dem Discord bei und sichere dir deinen persönlichen Alpha-Zugangsschlüssel.',
  },
  {
    title: 'Commander anlegen',
    copy: 'Registriere dich mit deinem Key, wähle eine Fraktion und betrete die Galaxis.',
  },
  {
    title: 'Flotte entsenden',
    copy: 'Setze Befehle, warte auf den nächsten Tick und beobachte, wie die Galaxis reagiert.',
  },
];

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = document.getElementById(`counter-${target}`);
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!started) return;
    const step = Math.ceil(target / (duration / 16));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return <span id={`counter-${target}`}>{count.toLocaleString('de-DE')}</span>;
}

// Inline SVG icons — no hand-rolled paths, just stroked geometric icons
function IconOrbit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
    </svg>
  );
}

function IconFleet() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l4-8 5 3 4-8 5 6" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  );
}

function IconSignal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5a9.5 9.5 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const iconMap = { orbit: IconOrbit, fleet: IconFleet, signal: IconSignal } as const;

export function LoginPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GalaxyStats | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    api.get<GalaxyStats>('/database/overview').then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setLoginOpen(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  async function handleLogin(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { username, password });
      setAuth(res.accessToken, res.refreshToken, res.user);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="swu-page swu-page--landing">
      <StarField />

      {/* Background layers */}
      <div className="swu-bg" aria-hidden="true">
        <div className="swu-bg__nebula" />
        <div className="swu-bg__planet" />
        <div className="swu-bg__flare" />
      </div>

      {/* Navigation */}
      <nav className="swu-nav" aria-label="Hauptnavigation">
        <a className="swu-nav__brand" href="#top" aria-label="Star Wars Universe">
          <span className="swu-nav__sigil" aria-hidden="true" />
          <span>SWU</span>
        </a>
        <div className="swu-nav__links">
          <button type="button" onClick={() => scrollTo('features')}>Features</button>
          <button type="button" onClick={() => scrollTo('stats')}>Galaxis</button>
          <button type="button" onClick={() => scrollTo('join')}>Start</button>
          <button className="swu-nav__login" type="button" onClick={() => setLoginOpen(true)}>
            Login
          </button>
          <a
            className="swu-nav__discord"
            href="https://discord.com/invite/vvUwR6UZbB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        </div>
      </nav>

      {/* Hero — asymmetric split */}
      <section className="swu-hero" id="top" aria-labelledby="hero-title">
        <div className="swu-hero__content">
          <p className="swu-eyebrow">Open Source · Closed Alpha</p>
          <h1 className="swu-hero__title" id="hero-title">
            Star Wars
            <em>Universe</em>
          </h1>
          <p className="swu-hero__tagline">
            Kolonien. Flotten. Allianzen. Ein tick-basiertes Strategiespiel
            im Star Wars Universum.
          </p>
          <div className="swu-hero__actions">
            <Link className="swu-btn swu-btn--primary" to="/register">
              Jetzt beitreten
            </Link>
            <button className="swu-btn swu-btn--ghost" type="button" onClick={() => setLoginOpen(true)}>
              Login
            </button>
          </div>
        </div>

        {/* Right visual — planet is in .swu-bg, this is just the overlay column */}
        <div className="swu-hero__visual" aria-hidden="true" />
      </section>

      {/* Features — bento grid */}
      <section className="swu-section" id="features" aria-labelledby="features-title">
        <div className="swu-section__header">
          <h2 id="features-title">Dein Imperium wartet</h2>
        </div>
        <div className="swu-bento">
          {features.map((f) => {
            const Icon = iconMap[f.icon];
            return (
              <article
                key={f.title}
                className={`swu-bento__cell${f.variant === 'primary' ? ' swu-bento__cell--primary' : ''}`}
              >
                <div className={`swu-bento__icon${f.icon === 'signal' ? ' swu-bento__icon--blue' : ''}`}>
                  <Icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Stats strip */}
      {stats && (
        <div className="swu-stats" id="stats">
          <div className="swu-stats__grid">
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.settlers} /></span>
              <span className="swu-stats__label">Siedler</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.colonies} /></span>
              <span className="swu-stats__label">Kolonien</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.ships} /></span>
              <span className="swu-stats__label">Schiffe</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.totalTechs} /></span>
              <span className="swu-stats__label">Forschungen</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.buildingTypes} /></span>
              <span className="swu-stats__label">Gebaudetypen</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value"><AnimatedCounter target={stats.shipClasses} /></span>
              <span className="swu-stats__label">Schiffsklassen</span>
            </div>
          </div>
        </div>
      )}

      {/* How to start — briefing layout */}
      <section className="swu-section" id="start" aria-labelledby="briefing-title">
        <div className="swu-briefing">
          <div className="swu-briefing__steps">
            <div className="swu-section__header" style={{ marginBottom: '32px' }}>
              <h2 id="briefing-title">So startest du</h2>
            </div>
            <div>
              {steps.map((step, i) => (
                <div className="swu-step" key={step.title}>
                  <span className="swu-step__num">0{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="swu-briefing__visual" aria-label="Starmap-Vorschau">
            <img
              src="/assets/starmap-preview.png"
              alt="Galaktische Sternenkarte"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="swu-section swu-section--cta" id="join" aria-labelledby="cta-title">
        <div className="swu-cta">
          <p className="swu-eyebrow">Closed Alpha</p>
          <h2 id="cta-title">Die Galaxis braucht dich.</h2>
          <p>Wochentliche Updates. Open Source. Kostenlos spielbar.</p>
          <div className="swu-cta__actions">
            <a
              className="swu-btn swu-btn--primary"
              href="https://discord.com/invite/vvUwR6UZbB"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord beitreten
            </a>
            <Link className="swu-btn swu-btn--ghost" to="/register">
              Key eingeben
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="swu-footer">
        <span className="swu-footer__brand">Star Wars Universe</span>
        <span>Open Source · {new Date().getFullYear()}</span>
        <div className="swu-footer__links">
          <a href="https://github.com/swuniverse" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://discord.com/invite/vvUwR6UZbB" target="_blank" rel="noopener noreferrer">Discord</a>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="swu-mobile-cta">
        <button className="swu-mobile-cta__login" type="button" onClick={() => setLoginOpen(true)}>Login</button>
        <Link className="swu-mobile-cta__register" to="/register">Registrieren</Link>
      </div>

      {/* Login Drawer */}
      <div className={`swu-login${loginOpen ? ' swu-login--open' : ''}`} aria-hidden={!loginOpen} role="dialog" aria-modal="true" aria-label="Login">
        <button className="swu-login__scrim" type="button" onClick={() => setLoginOpen(false)} aria-label="Login schliessen" tabIndex={loginOpen ? 0 : -1} />
        <form className="swu-login__panel" onSubmit={handleLogin} aria-label="Login Formular">
          <button className="swu-login__close" type="button" onClick={() => setLoginOpen(false)} aria-label="Schliessen">×</button>
          <p className="swu-eyebrow">Commander Login</p>
          <h2>Zurück auf die Brucke</h2>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label className="swu-field">
            <span>Username</span>
            <input
              name="username"
              autoComplete="username"
              placeholder="Commander"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              tabIndex={loginOpen ? 0 : -1}
            />
          </label>
          <label className="swu-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              tabIndex={loginOpen ? 0 : -1}
            />
          </label>
          <button className="swu-btn swu-btn--primary swu-btn--wide" type="submit" disabled={loading} tabIndex={loginOpen ? 0 : -1}>
            {loading ? 'Anmeldung...' : 'Login'}
          </button>
          <div className="swu-login__meta">
            <Link to="/register" tabIndex={loginOpen ? 0 : -1}>Registrieren</Link>
            <a href="https://discord.com/invite/vvUwR6UZbB" target="_blank" rel="noopener noreferrer" tabIndex={loginOpen ? 0 : -1}>Discord</a>
          </div>
        </form>
      </div>
    </main>
  );
}
