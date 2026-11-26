import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { StarField } from '../components/auth/StarField';
import { formatDate } from '../lib/format';
import { LegalLinks } from '../components/legal/LegalLinks';

interface GameStatus {
  status: 'ONLINE' | 'MAINTENANCE_ANNOUNCED' | 'MAINTENANCE';
  message: string;
}

interface GalaxyStats {
  settlers: number;
  colonies: number;
  ships: number;
  totalTechs: number;
  shipClasses: number;
  planetTypes: number;
  buildingTypes: number;
}

interface PublicNews {
  id: number;
  title: string;
  renderedText: string;
  links: string[];
  isChangelog: boolean;
  createdAt: string;
}

const features = [
  {
    title: 'Kolonien & Bauketten',
    copy: 'Jeder Planet hat seine eigene Tageslänge und sein eigenes Gelände. Terraforme Felder, überkuppele Krater und setze Gebäude und Schiffe in die Warteschlange. Sie werden fertig, auch wenn du nicht online bist.',
    images: [
      {
        src: '/landing/colony-grid.jpg',
        width: 1404,
        height: 900,
        alt: 'Oberflächenraster einer Kolonie mit Solarfeldern, Wohnkomplexen, Gewächshäusern und Lagern',
        note: 'Beispielansicht aus der Entwicklungsumgebung.',
      },
    ],
  },
  {
    title: 'Fliegen & Raumkampf',
    copy: 'Fliege Feld für Feld, scanne die Umgebung und schürfe Ressourcen aus Nebelfeldern. Jedes Schiff trägt Module für Waffen, Schilde und Antrieb. Stellt sich dir ein Gegner, kämpfst du selbst.',
    images: [
      {
        src: '/landing/ships.jpg',
        width: 2744,
        height: 400,
        alt: 'Flottenübersicht mit drei Schiffen, ihrer Hülle, ihren Schilden, ihrer Energie und Crew',
        note: 'Beispielansicht aus der Entwicklungsumgebung.',
      },
    ],
  },
  {
    title: 'Allianzen & Diplomatie',
    copy: 'Handle mit anderen Spielern, schließe Bündnisse und koordiniere Flotten gemeinsam. Rebellenallianz oder Imperium: Deine Fraktion bestimmt, auf wessen Seite du stehst.',
    images: [],
  },
] as const;

const steps = [
  {
    title: 'Commander anlegen',
    copy: 'Registriere dich, wähle eine Fraktion und bestätige deine E-Mail-Adresse.',
  },
  {
    title: 'Kolonie gründen',
    copy: 'Melde dich an und richte deine erste Kolonie ein.',
  },
  {
    title: 'Losfliegen',
    copy: 'Schicke ein Schiff los und erkunde die Galaxis.',
  },
];

function AnimatedCounter({
  target,
  duration = 1800,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = document.getElementById(`counter-${target}`);
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
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

export function LandingPage() {
  const [stats, setStats] = useState<GalaxyStats | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [news, setNews] = useState<PublicNews[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    status: 'ONLINE',
    message: '',
  });
  const [searchParams] = useSearchParams();
  const maintenanceMessage = searchParams.get('maintenance');

  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    api
      .get<GalaxyStats>('/database/overview')
      .then(setStats)
      .catch(() => undefined);
    api
      .get<unknown[]>('/database/online')
      .then((list) => setOnline(Array.isArray(list) ? list.length : null))
      .catch(() => undefined);
    api.get<GameStatus>('/game-status').then(setGameStatus).catch(() => undefined);
    api.get<PublicNews[]>('/news').then((items) => setNews(Array.isArray(items) ? items : [])).catch(() => undefined);
  }, []);

  const statusTone =
    gameStatus.status === 'ONLINE'
      ? 'online'
      : gameStatus.status === 'MAINTENANCE_ANNOUNCED'
        ? 'announced'
        : 'maintenance';
  const statusMessage = maintenanceMessage || gameStatus.message;

  return (
    <main className="swu-page swu-page--landing">
      <StarField />

      <span className="swu-bg" aria-hidden="true" />

      <nav className="swu-nav" aria-label="Hauptnavigation">
        <div className="swu-nav__links">
          <button
            className="swu-nav__scroll"
            type="button"
            onClick={() => scrollTo('features')}
          >
            Features
          </button>
          <button
            className="swu-nav__scroll"
            type="button"
            onClick={() => scrollTo('stats')}
          >
            Galaxis
          </button>
          <button
            className="swu-nav__scroll"
            type="button"
            onClick={() => scrollTo('join')}
          >
            Start
          </button>
          <Link className="swu-nav__login" to="/login">
            Login
          </Link>
          <a
            href="https://wiki.swuniverse.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wiki
          </a>
          <a
            href="https://discord.com/invite/vvUwR6UZbB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        </div>
      </nav>

      <aside className="swu-top" aria-label="Status und News">
        <div className="swu-strip">
          <section
            className={`swu-game-status swu-game-status--${statusTone}`}
            aria-label="Spielstatus"
          >
            <span className="swu-game-status__label">Spielstatus</span>
            <span className="swu-game-status__state">
              {gameStatus.status === 'ONLINE'
                ? 'Online'
                : gameStatus.status === 'MAINTENANCE_ANNOUNCED'
                  ? 'Wartung angekündigt'
                  : 'Wartung läuft'}
            </span>
            {statusMessage && (
              <span className="swu-game-status__message">{statusMessage}</span>
            )}
          </section>

          {news.length === 0 ? (
            <p className="swu-news swu-news--empty">Keine System-News vorhanden.</p>
          ) : (
            <details className="swu-news">
              <summary>
                <span className="swu-news__label">System-News</span>
                <b>{news[0].title}</b>
                <time dateTime={news[0].createdAt}>
                  {formatDate(news[0].createdAt)}
                </time>
              </summary>
              <div className="swu-news__panel">
                {news.map((item, index) => (
                  <article key={item.id} className="swu-news__item">
                    {/* the newest title already sits in the summary */}
                    {index > 0 && (
                      <p className="swu-news__head">
                        <b>{item.title}</b>
                        <time dateTime={item.createdAt}>
                          {formatDate(item.createdAt)}
                        </time>
                      </p>
                    )}
                    {item.isChangelog && (
                      <span className="swu-news__tag">Changelog</span>
                    )}
                    <div
                      className="swu-news__text"
                      dangerouslySetInnerHTML={{ __html: item.renderedText }}
                    />
                    {item.links.length > 0 && (
                      <ul className="swu-news__links">
                        {item.links.map((link) => (
                          <li key={link}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </details>
          )}
        </div>
      </aside>

      <section className="swu-hero" id="top" aria-labelledby="hero-title">
        <div className="swu-hero__content">
          <h1 className="swu-hero__title" id="hero-title">
            Die Galaxis wartet auf deinen Befehl.
          </h1>
          <p className="swu-hero__tagline">
            Weltraumstrategie in Echtzeit: Kolonien bauen, Handel treiben,
            Raumkämpfe schlagen.
          </p>
          <p className="swu-hero__promise">
            Kostenlos, ohne Werbung, kein Pay-to-win.
          </p>
          <div className="swu-hero__actions">
            {gameStatus.status !== 'MAINTENANCE' && (
              <Link className="swu-btn swu-btn--primary" to="/register">
                Registrieren
              </Link>
            )}
            <Link className="swu-btn swu-btn--ghost" to="/login">
              Login
            </Link>
          </div>
        </div>
        <img
          className="swu-hero__logo"
          src="/landing/logo.png"
          width={1166}
          height={909}
          alt="Star Wars Universe: ein X-Wing wird von TIE-Jägern verfolgt"
          fetchPriority="high"
        />
      </section>

      <section
        className="swu-section"
        id="features"
        aria-labelledby="features-title"
      >
        <h2 id="features-title">Aufbauen, fliegen, verbünden.</h2>
        <ul className="swu-moments">
          {features.map((f) => (
            <li
              className={`swu-moment${f.images.length === 0 ? ' swu-moment--text' : f.images[0].width / f.images[0].height > 3 ? ' swu-moment--wide' : ''}`}
              key={f.title}
            >
              <div className="swu-moment__text">
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
              </div>
              {f.images.length > 0 && (
                <div className="swu-moment__figures">
                  {f.images.map((image) => (
                    <figure
                      className={`swu-moment__figure${image.width / image.height < 2 ? ' swu-moment__figure--square' : ''}`}
                      key={image.src}
                    >
                      <img
                        src={image.src}
                        width={image.width}
                        height={image.height}
                        alt={image.alt}
                        loading="lazy"
                      />
                      <figcaption>{image.note}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {stats && (
        <div className="swu-stats" id="stats">
          <div className="swu-stats__grid">
            <div className="swu-stats__item">
              <span className="swu-stats__value">
                <AnimatedCounter target={stats.settlers} />
              </span>
              <span className="swu-stats__label">Siedler</span>
            </div>
            {online !== null && (
              <div className="swu-stats__item">
                <span className="swu-stats__value">
                  <AnimatedCounter target={online} />
                </span>
                <span className="swu-stats__label">davon online</span>
              </div>
            )}
            <div className="swu-stats__item">
              <span className="swu-stats__value">
                <AnimatedCounter target={stats.totalTechs} />
              </span>
              <span className="swu-stats__label">Forschungen</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value">
                <AnimatedCounter target={stats.buildingTypes} />
              </span>
              <span className="swu-stats__label">Gebäudetypen</span>
            </div>
            <div className="swu-stats__item">
              <span className="swu-stats__value">
                <AnimatedCounter target={stats.shipClasses} />
              </span>
              <span className="swu-stats__label">Schiffsklassen</span>
            </div>
          </div>
        </div>
      )}

      {news.length > 1 && (
        <section
          className="swu-section swu-section--news"
          id="news"
          aria-labelledby="news-title"
        >
          <h2 id="news-title">Aktuelles</h2>
          <ul className="swu-feed">
            {news.slice(1, 4).map((item) => (
              <li className="swu-feed__item" key={item.id}>
                <time dateTime={item.createdAt}>
                  {formatDate(item.createdAt)}
                </time>
                <div>
                  <h3>
                    {item.isChangelog ? 'Changelog: ' : ''}
                    {item.title}
                  </h3>
                  <div
                    className="swu-feed__text"
                    dangerouslySetInnerHTML={{ __html: item.renderedText }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="swu-section swu-section--start"
        id="start"
        aria-labelledby="briefing-title"
      >
        <div className="swu-briefing">
          <div>
            <h2 id="briefing-title">So startest du</h2>
            <ol className="swu-steps">
              {steps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="swu-loop" aria-label="Spielrhythmus">
            <h3>Nur die Wirtschaft tickt.</h3>
            <p>
              Im Tick entstehen Rohstoffe, und deine Schiffe laden Energie. Alles
              andere läuft in Echtzeit: Du baust, fliegst und kämpfst, wann du
              willst.
            </p>
          </div>
        </div>
      </section>

      <section
        className="swu-section swu-section--cta"
        id="join"
        aria-labelledby="cta-title"
      >
        <div className="swu-cta">
          <h2 id="cta-title">Die Alpha läuft.</h2>
          <div>
            <p>
              Registriere dich, wähle deine Fraktion und fliege los.
            </p>
            <div className="swu-cta__actions">
              {gameStatus.status !== 'MAINTENANCE' && (
                <Link className="swu-btn swu-btn--primary" to="/register">
                  Registrieren
                </Link>
              )}
              <a
                className="swu-btn swu-btn--ghost"
                href="https://discord.com/invite/vvUwR6UZbB"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord beitreten
              </a>
              <a
                className="swu-btn swu-btn--ghost"
                href="https://wiki.swuniverse.net"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wiki
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="swu-footer">
        <span className="swu-footer__brand">Star Wars Universe</span>
        <span>Open Source {new Date().getFullYear()}</span>
        <div className="swu-footer__links">
          <LegalLinks className="contents" />
          <a
            href="https://github.com/swuniverse"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://discord.com/invite/vvUwR6UZbB"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="swu-mobile-cta">
        <Link className="swu-mobile-cta__login" to="/login">
          Login
        </Link>
        {gameStatus.status !== 'MAINTENANCE' && (
          <Link className="swu-mobile-cta__register" to="/register">
            Registrieren
          </Link>
        )}
      </div>
    </main>
  );
}
