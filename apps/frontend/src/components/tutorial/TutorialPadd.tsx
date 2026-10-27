import { useEffect, useMemo, useRef, useState } from 'react';
import type { TutorialStepDto, TutorialView } from '@swuniverse/shared';
import { BbCodeText } from '../BbCodeText';
import { useTutorial } from './useTutorial';

function findTargets(step: TutorialStepDto | null): HTMLElement[] {
  const keys = new Set(step?.targets ?? []);
  return Array.from(document.querySelectorAll<HTMLElement>('[data-tutorial]')).filter((element) =>
    keys.has(element.dataset.tutorial ?? ''),
  );
}

export function TutorialPadd({ view }: { view: TutorialView | null }) {
  const state = useTutorial(view);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleIndex = useMemo(() => {
    if (!state.tutorial || !state.step) return -1;
    const targets = findTargets(state.step);
    if ((state.step.targets?.length ?? 0) > 0 && targets.length === 0 && state.step.fallbackIndex != null) {
      return state.step.fallbackIndex;
    }
    return state.index;
  }, [state.index, state.step, state.tutorial]);
  const step = visibleIndex >= 0 ? state.tutorial?.steps[visibleIndex] ?? null : null;

  useEffect(() => {
    const targets = findTargets(step);
    targets.forEach((target) => target.classList.add('tutorial-target'));
    return () => targets.forEach((target) => target.classList.remove('tutorial-target'));
  }, [step]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  if (!step || !state.tutorial) return null;
  const isFirst = state.index === 0;
  const buttonClass = 'border border-swu-border bg-swu-bg px-3 py-1 text-xs text-swu-primary disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <aside
      aria-label="Tutorial"
      className="tutorial-padd fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] top-[58px] z-40 overflow-y-auto border border-swu-border bg-swu-surface text-xs md:inset-x-auto md:bottom-4 md:left-auto md:right-4 md:top-auto md:max-h-[calc(100svh-102px)] md:w-96"
    >
      <header className="flex items-center justify-between border-b border-swu-border bg-swu-header px-3 py-2">
        <h2 className="font-bold text-swu-accent">{step.title}</h2>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Tutorial schließen"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="px-2 text-swu-muted hover:text-swu-primary"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ×
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full z-10 mt-1 w-64 border border-swu-border bg-swu-surface p-1">
              <button role="menuitem" className="block w-full px-2 py-2 text-left hover:bg-swu-bg" onClick={state.dismiss}>Später</button>
              <button role="menuitem" className="block w-full px-2 py-2 text-left hover:bg-swu-bg" onClick={() => void state.finish()}>Tutorial dieser Seite beenden</button>
              <button role="menuitem" className="block w-full px-2 py-2 text-left hover:bg-swu-bg" onClick={() => void state.disable()}>Alle Tutorials abschalten</button>
            </div>
          )}
        </div>
      </header>
      <div className="space-y-3 p-3">
        <BbCodeText text={step.text} className="text-xs leading-relaxed text-swu-text" />
        <div className="flex items-center justify-between gap-3 border-t border-swu-border pt-3">
          <span className="text-swu-muted">Schritt {visibleIndex + 1}/{state.tutorial.steps.length}</span>
          <div className="flex gap-2">
            <button className={buttonClass} disabled={isFirst || state.busy} onClick={() => void state.back()}>Zurück</button>
            <button className={buttonClass} disabled={Boolean(step.waitFor) || state.busy} onClick={() => void state.next()}>Weiter</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
