import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StarField } from '../auth/StarField';

export function PublicInfoLayout({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-layout min-h-screen relative overflow-auto px-4 py-10">
      <StarField />
      <div className="auth-scanlines" />
      <div className="auth-nebula auth-nebula--left" />
      <div className="auth-nebula auth-nebula--right" />

      <article className="auth-panel relative z-10 mx-auto w-full max-w-4xl">
        <div className="auth-panel__content space-y-6 p-6 md:p-10">
          <header className="border-b border-swu-border pb-4">
            <p className="swu-eyebrow">{eyebrow}</p>
            <h1 className="text-3xl font-bold text-swu-accent">{title}</h1>
          </header>
          <div className="space-y-6 text-sm leading-7 text-swu-text">{children}</div>
          <footer className="flex flex-wrap gap-4 border-t border-swu-border pt-4 text-sm">
            <Link className="text-swu-primary hover:text-swu-accent" to="/login">
              Zur Landing Page
            </Link>
            <Link className="text-swu-primary hover:text-swu-accent" to="/impressum">
              Impressum
            </Link>
            <Link className="text-swu-primary hover:text-swu-accent" to="/datenschutz">
              Datenschutz
            </Link>
            <Link className="text-swu-primary hover:text-swu-accent" to="/hilfe">
              Hilfe
            </Link>
          </footer>
        </div>
      </article>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-swu-primary">{title}</h2>
      {children}
    </section>
  );
}

export function OperatorPlaceholder({ children }: { children: ReactNode }) {
  return (
    <mark
      className="border border-amber-400 bg-amber-400/10 px-1 py-0.5 font-mono text-amber-200"
      data-operator-placeholder="true"
    >
      {children}
    </mark>
  );
}
