import { Link } from 'react-router-dom';

export const LEGAL_PAGES_ENABLED = import.meta.env.VITE_LEGAL_PAGES_ENABLED === 'true';

export function LegalLinks({ className }: { className?: string }) {
  if (!LEGAL_PAGES_ENABLED) return null;

  return (
    <nav className={className} aria-label="Rechtliches und Hilfe">
      <Link to="/impressum">Impressum</Link>
      <Link to="/datenschutz">Datenschutz</Link>
      <Link to="/hilfe">Hilfe</Link>
    </nav>
  );
}
