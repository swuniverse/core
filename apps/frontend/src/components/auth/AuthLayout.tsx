import type { ReactNode } from 'react';
import { StarField } from './StarField';
import { LegalLinks } from '../legal/LegalLinks';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <StarField />

      <div className="auth-scanlines" />

      <div className="auth-nebula auth-nebula--left" />
      <div className="auth-nebula auth-nebula--right" />

      <div className="relative z-10 w-full max-w-lg auth-panel-enter">
        <div className="auth-panel">
          <div className="auth-panel__corner auth-panel__corner--tl" />
          <div className="auth-panel__corner auth-panel__corner--tr" />
          <div className="auth-panel__corner auth-panel__corner--bl" />
          <div className="auth-panel__corner auth-panel__corner--br" />

          <div className="auth-panel__content">{children}</div>
        </div>

        <div className="auth-footer">
          <span className="auth-footer__line" />
          <span className="auth-footer__text">STAR WARS UNIVERSE</span>
          <span className="auth-footer__line" />
        </div>
        <LegalLinks className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-swu-primary" />
      </div>
    </div>
  );
}
