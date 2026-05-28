import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { StarField } from '../components/auth/StarField';
import type { AuthResponse } from '@swuniverse/shared';

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

function PlanetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <PlanetIcon />,
    title: 'Kolonien gruenden',
    desc: 'Beanspruche Planeten, baue Infrastruktur, wachse zur Supermacht.',
  },
  {
    icon: <RocketIcon />,
    title: 'Flotten befehligen',
    desc: 'Baue Schiffe, stelle Flotten zusammen, erkunde unbekannte Sektoren.',
  },
  {
    icon: <StarIcon />,
    title: 'Galaxie erkunden',
    desc: 'Interaktive Sternenkarte mit tausenden Systemen und Sektoren.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Fraktionen & Diplomatie',
    desc: 'Waehle deine Seite. Verbünde dich — oder erobere.',
  },
];

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  function scrollToLandingInfo() {
    document
      .getElementById('landing-info')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', {
        username,
        password,
      });
      setAuth(res.accessToken, res.refreshToken, res.user);
      navigate('/onboarding');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing">
      <StarField />
      <div className="auth-scanlines" />
      <div className="auth-nebula auth-nebula--left" />
      <div className="auth-nebula auth-nebula--right" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav__logo">SWU</div>
        <div className="landing-nav__links">
          <a
            href="https://github.com/swuniverse"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-nav__link"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <a
            href="https://discord.com/invite/URaHDQAPev"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-nav__link"
            aria-label="Discord"
          >
            <DiscordIcon />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />
        <div className="landing-hero__content">
          <div className="landing-hero__text">
            <p className="landing-hero__tagline">
              Browsergame · Open Source · Closed Alpha
            </p>
            <h1 className="landing-hero__title" aria-label="Star Wars Universe">
              <span className="sr-only">Star Wars Universe</span>
              STAR WARS
              <span className="landing-hero__title--accent"> UNIVERSE</span>
            </h1>
            <p className="landing-hero__desc">
              Star Wars Universe befindet sich in der Closed Alpha. Wir suchen
              aktive Tester, ehrliches Feedback und Mitentwickler, die das Spiel
              frueh mitpraegen wollen.
            </p>
            <div className="landing-hero__actions">
              <Link to="/register" className="auth-btn landing-hero__cta">
                Closed Alpha joinen
              </Link>
              <a
                href="https://discord.com/invite/URaHDQAPev"
                target="_blank"
                rel="noopener noreferrer"
                className="auth-btn auth-btn--secondary landing-hero__cta"
              >
                <DiscordIcon /> Discord beitreten
              </a>
            </div>
            <div className="landing-hero__invite-note">
              <span className="landing-hero__invite-badge">2x Player Invites</span>
              <p>
                Nach deiner Registrierung bekommst du ein eigenes Kontingent und
                kannst bis zu zwei weitere Spieler selbst einladen.
              </p>
            </div>
          </div>

          {/* Login form */}
          <div className="landing-hero__form">
            <div className="auth-panel">
              <div className="auth-panel__corner auth-panel__corner--tl" />
              <div className="auth-panel__corner auth-panel__corner--tr" />
              <div className="auth-panel__corner auth-panel__corner--bl" />
              <div className="auth-panel__corner auth-panel__corner--br" />
              <div className="auth-panel__content">
                <div className="auth-stagger space-y-5">
                  <div>
                    <p className="auth-subtitle">Kommandozentrale</p>
                    <h2 className="auth-title text-xl!">Anmelden</h2>
                  </div>

                  <div className="auth-notice">
                    Closed Alpha: Neue Accounts benoetigen aktuell einen Invite
                    Key. Bitte tritt dem Discord bei oder registriere dich mit
                    deinem Invite.
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="auth-label" htmlFor="login-user">
                        Benutzername
                      </label>
                      <input
                        id="login-user"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="auth-input"
                        required
                        autoComplete="username"
                      />
                    </div>
                    <div>
                      <label className="auth-label" htmlFor="login-pass">
                        Passwort
                      </label>
                      <input
                        id="login-pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="auth-btn"
                    >
                      {loading ? 'Authentifiziere...' : 'Zugang erhalten'}
                    </button>
                  </form>

                  <p className="text-center text-sm text-swu-muted">
                    Noch kein Konto?{' '}
                    <Link to="/register" className="auth-link">
                      Mit Invite registrieren
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={scrollToLandingInfo}
          className="landing-scroll-cue"
          aria-label="Mehr Informationen anzeigen"
        >
          <span className="landing-scroll-cue__text">Mehr entdecken</span>
          <span className="landing-scroll-cue__line" />
          <span className="landing-scroll-cue__chevron">⌄</span>
        </button>
      </section>

      {/* Features */}
      <section id="landing-info" className="landing-features">
        <p className="auth-subtitle text-center">Was dich erwartet</p>
        <h2 className="landing-features__title">Deine Galaxie wartet</h2>
        <div className="landing-features__grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-card__icon">{f.icon}</div>
              <h3 className="landing-feature-card__title">{f.title}</h3>
              <p className="landing-feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-flow">
        <div className="landing-flow__content">
          <p className="auth-subtitle text-center">Closed Alpha Zugang</p>
          <h2 className="landing-flow__title">So kommst du in die Galaxie</h2>
          <div className="landing-flow__grid">
            <div className="landing-flow__step">
              <div className="landing-flow__step-number">1</div>
              <h3 className="landing-flow__step-title">Discord joinen</h3>
              <p className="landing-flow__step-desc">
                Tritt dem Server bei, hol dir Orientierung und frage in #rollen
                nach einem Start-Invite, wenn du direkt mitmachen willst.
              </p>
            </div>
            <div className="landing-flow__step">
              <div className="landing-flow__step-number">2</div>
              <h3 className="landing-flow__step-title">Account erstellen</h3>
              <p className="landing-flow__step-desc">
                Registriere dich mit deinem Invite Key, waehle deine Fraktion und
                starte in die Closed Alpha.
              </p>
            </div>
            <div className="landing-flow__step">
              <div className="landing-flow__step-number">3</div>
              <h3 className="landing-flow__step-title">2 Freunde einladen</h3>
              <p className="landing-flow__step-desc">
                Jeder neue Spieler erhaelt danach bis zu zwei eigene Invite Keys
                und kann weitere Commander direkt selbst reinholen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-needs">
        <div className="landing-needs__content">
          <p className="auth-subtitle text-center">Invite-System</p>
          <h2 className="landing-needs__title">Wachse ueber die Community</h2>
          <div className="landing-needs__grid">
            <div className="landing-needs__card">
              <h3 className="landing-needs__card-title">Start-Invites via Discord</h3>
              <p className="landing-needs__card-desc">
                Neue Spieler kommen ueber Discord rein, stellen sich kurz vor und
                erhalten dort ihren ersten Zugang zur Closed Alpha.
              </p>
            </div>
            <div className="landing-needs__card">
              <h3 className="landing-needs__card-title">2 eigene Player Keys</h3>
              <p className="landing-needs__card-desc">
                Jeder registrierte Commander kann spaeter bis zu zwei eigene Keys
                im Spiel erzeugen und direkt an Freunde weitergeben.
              </p>
            </div>
            <div className="landing-needs__card">
              <h3 className="landing-needs__card-title">Kontrolliertes Wachstum</h3>
              <p className="landing-needs__card-desc">
                So bleibt die Alpha bewusst klein, aber gute Spieler koennen selbst
                weitere starke Tester und Mitbauer nachholen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="landing-community">
        <div className="landing-community__content">
          <h2 className="landing-community__title">Community</h2>
          <p className="landing-community__desc">
            Closed Alpha mit Community-Wachstum: erste Zugänge laufen über
            Discord, danach kann jeder registrierte Spieler bis zu zwei weitere
            Commander selbst per Invite Key einladen.
          </p>
          <div className="landing-community__links">
            <a
              href="https://github.com/swuniverse"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-community__card"
            >
              <GithubIcon />
              <div>
                <div className="landing-community__card-title">GitHub</div>
                <div className="landing-community__card-desc">
                  Source Code & Issues
                </div>
              </div>
            </a>
            <a
              href="https://discord.com/invite/URaHDQAPev"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-community__card"
            >
              <DiscordIcon />
              <div>
                <div className="landing-community__card-title">Discord</div>
                <div className="landing-community__card-desc">
                  Chat & Announcements
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span className="landing-footer__line" />
        <span className="landing-footer__text">
          STAR WARS UNIVERSE · OPEN SOURCE · {new Date().getFullYear()}
        </span>
        <span className="landing-footer__line" />
      </footer>
    </div>
  );
}
