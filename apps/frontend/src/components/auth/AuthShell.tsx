import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StarField } from './StarField';
import { LegalLinks } from '../legal/LegalLinks';

/**
 * Gemeinsame Huelle fuer alle Zugangsseiten (Login, Registrierung,
 * E-Mail-Bestaetigung, Passwort vergessen und zuruecksetzen).
 */
export function AuthShell({
  title,
  lead,
  wide = false,
  children,
}: {
  title: string;
  lead?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="swu-page swu-auth">
      <StarField />
      <span className="swu-bg" aria-hidden="true" />

      <header className="swu-auth__bar">
        <Link className="swu-auth__home" to="/">
          Zur Startseite
        </Link>
      </header>

      <div
        className={`swu-auth__grid${wide ? ' swu-auth__grid--wide' : ''}`}
      >
        <section className="swu-auth__main" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {lead && <p className="swu-auth__lead">{lead}</p>}
          {children}
        </section>
      </div>

      <footer className="swu-auth__foot">
        <LegalLinks className="swu-auth__legal" />
      </footer>
    </main>
  );
}
