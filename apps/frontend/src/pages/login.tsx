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
  },
  {
    title: 'Flotten & Taktik',
    copy: 'Plane Manöver über mehrere Ticks, stelle Verbände zusammen und nutze Timing statt Reflexe als wichtigste Waffe.',
    icon: 'fleet',
  },
  {
    title: 'Diplomatie & Allianzen',
    copy: 'Schmiede Bündnisse, handle Nichtangriffspakte aus und entscheide, wann Verrat mehr wert ist als Loyalität.',
    icon: 'signal',
  },
];

const steps = [
  { title: 'Invite Key holen', copy: 'Tritt dem Discord bei und sichere dir deinen persönlichen Alpha-Zugangsschlüssel.' },
  { title: 'Commander anlegen', copy: 'Registriere dich mit deinem Key, wähle eine Fraktion und betrete die Galaxis.' },
  { title: 'Flotte entsenden', copy: 'Setze Befehle, warte auf den nächsten Tick und beobachte, wie die Galaxis reagiert.' },
];

function CinematicBackdrop() {
  return (
    <div className="swu-backdrop" aria-hidden="true">
      <div className="swu-backdrop__stars swu-backdrop__stars--near" />
      <div className="swu-backdrop__stars swu-backdrop__stars--far" />
      <div className="swu-backdrop__nebula" />
      <div className="swu-backdrop__planet" />
      <div className="swu-backdrop__destroyer" />
      <div className="swu-backdrop__rays" />
      <div className="swu-backdrop__flare" />
    </div>
  );
}

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 },
    );
    const el = document.getElementById(`counter-${target}`);
    if (el) observer.observe(el);
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

export function LoginPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GalaxyStats | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    api.get<GalaxyStats>('/database/overview').then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLoginOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
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
      <CinematicBackdrop />

      <nav className="swu-nav" aria-label="Hauptnavigation">
        <a className="swu-nav__brand" href="#top" aria-label="Star Wars Universe Start">
          <span className="swu-nav__sigil" aria-hidden="true" />
          <span>SWU</span>
        </a>
        <div className="swu-nav__links">
          <button type="button" onClick={() => scrollTo('features')}>Features</button>
          <button type="button" onClick={() => scrollTo('galaxy')}>Galaxis</button>
          <button type="button" onClick={() => scrollTo('start')}>Start</button>
          <button className="swu-nav__login" type="button" onClick={() => setLoginOpen(true)}>Login</button>
          <a className="swu-nav__discord" href="https://discord.com/invite/vvUwR6UZbB" target="_blank" rel="noopener noreferrer">Discord</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="swu-hero" id="top">
        <div className="swu-hero__aura" aria-hidden="true" />
        <div className="swu-hero__content">
          <p className="swu-eyebrow">Open Source · Closed Alpha</p>
          <h1 className="swu-hero__title swu-hero__title--reveal">Star Wars Universe</h1>
          <p className="swu-hero__tagline">
            Kolonien. Flotten. Allianzen. — Ein tick-basiertes Strategiespiel im Star Wars Universum.
          </p>
          <div className="swu-hero__actions">
            <Link className="swu-btn swu-btn--primary" to="/register">
              Jetzt beitreten
            </Link>
            <button className="swu-btn swu-btn--ghost" type="button" onClick={() => setLoginOpen(true)}>
              Login
            </button>
          </div>
          <button type="button" onClick={() => scrollTo('features')} className="swu-hero__scroll" aria-label="Weiter scrollen">
            <span className="swu-hero__chevron" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="swu-section swu-section--features" id="features">
        <div className="swu-section__header">
          <p className="swu-eyebrow">Strategie mit Lichtgeschwindigkeit</p>
          <h2>Dein Imperium wartet</h2>
        </div>
        <div className="swu-feature-grid">
          {features.map((feature) => (
            <article className="swu-feature-card" key={feature.title}>
              <div className={`swu-feature-card__icon swu-feature-card__icon--${feature.icon}`} aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Galaxy Stats */}
      {stats && (
        <section className="swu-section swu-section--galaxy" id="galaxy">
          <div className="swu-section__header swu-section__header--center">
            <p className="swu-eyebrow">Echtzeit-Daten</p>
            <h2>Die Galaxis in Zahlen</h2>
          </div>
          <div className="swu-galaxy-stats">
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.settlers} /></span>
              <span className="swu-galaxy-stat__label">Siedler</span>
            </div>
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.colonies} /></span>
              <span className="swu-galaxy-stat__label">{stats.colonies === 1 ? 'Kolonie' : 'Kolonien'}</span>
            </div>
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.ships} /></span>
              <span className="swu-galaxy-stat__label">{stats.ships === 1 ? 'Schiff' : 'Schiffe'}</span>
            </div>
          </div>
          <div className="swu-galaxy-stats swu-galaxy-stats--secondary">
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.totalTechs} /></span>
              <span className="swu-galaxy-stat__label">Forschungen</span>
            </div>
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.buildingTypes} /></span>
              <span className="swu-galaxy-stat__label">Gebäudetypen</span>
            </div>
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.planetTypes} /></span>
              <span className="swu-galaxy-stat__label">Planetentypen</span>
            </div>
            <div className="swu-galaxy-stat">
              <span className="swu-galaxy-stat__value"><AnimatedCounter target={stats.shipClasses} /></span>
              <span className="swu-galaxy-stat__label">{stats.shipClasses === 1 ? 'Schiffsklasse' : 'Schiffsklassen'}</span>
            </div>
          </div>
        </section>
      )}

      {/* Timeline / Mission Briefing */}
      <section className="swu-section swu-section--timeline" id="start">
        <div className="swu-section__header swu-section__header--center">
          <p className="swu-eyebrow">▰▰▰ Mission Briefing ▰▰▰</p>
          <h2>So startest du</h2>
        </div>
        <div className="swu-briefing__classified" aria-hidden="true">CLASSIFIED</div>
        <ol className="swu-timeline">
          {steps.map((step, index) => (
            <li className="swu-timeline__item" key={step.title}>
              <span className="swu-timeline__node">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="swu-section swu-section--cta" id="join">
        <div className="swu-cta-card">
          <p className="swu-eyebrow">Closed Alpha</p>
          <h2>Die Galaxis braucht dich.</h2>
          <p>Wöchentliche Updates · Open Source</p>
          <a
            className="swu-btn swu-btn--primary swu-btn--wide"
            href="https://discord.com/invite/vvUwR6UZbB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord beitreten & Key holen
          </a>
          <Link className="swu-btn swu-btn--ghost swu-btn--wide" to="/register" style={{ marginTop: '12px' }}>
            Bereits einen Key? Registrieren
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="swu-footer">
        <span className="swu-footer__logo">Star Wars Universe</span>
        <span>Open Source · {new Date().getFullYear()}</span>
        <div>
          <a href="https://github.com/swuniverse" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://discord.com/invite/vvUwR6UZbB" target="_blank" rel="noopener noreferrer">Discord</a>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="swu-mobile-cta">
        <button className="swu-mobile-cta__login" type="button" onClick={() => setLoginOpen(true)}>Login</button>
        <Link className="swu-mobile-cta__register" to="/register">Registrieren →</Link>
      </div>

      {/* Login Drawer */}
      <div className={`swu-login ${loginOpen ? 'swu-login--open' : ''}`} aria-hidden={!loginOpen}>
        <button className="swu-login__scrim" type="button" onClick={() => setLoginOpen(false)} aria-label="Login schließen" />
        <form className="swu-login__panel" onSubmit={handleLogin} aria-label="Login Formular">
          <button className="swu-login__close" type="button" onClick={() => setLoginOpen(false)} aria-label="Schließen">×</button>
          <p className="swu-eyebrow">Commander Login</p>
          <h2>Zurück auf die Brücke</h2>
          {error && <div className="auth-error">{error}</div>}
          <label className="swu-field">
            <span>Username</span>
            <input
              name="username"
              autoComplete="username"
              placeholder="Commander"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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
            />
          </label>
          <button className="swu-btn swu-btn--primary swu-btn--wide" type="submit" disabled={loading}>
            {loading ? 'Login...' : 'Login'}
          </button>
          <div className="swu-login__meta">
            <Link to="/register">Register</Link>
            <a href="https://discord.com/invite/vvUwR6UZbB" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
        </form>
      </div>
    </main>
  );
}
