import { Link } from 'react-router-dom';

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Rechtliches und Hilfe">
      <Link to="/impressum">Impressum</Link>
      <Link to="/datenschutz">Datenschutz</Link>
      <Link to="/hilfe">Hilfe</Link>
    </nav>
  );
}
