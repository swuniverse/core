import type { ReactNode } from 'react';

export function ColonyContextPanel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-swu-border/60 pb-2">
        <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
        <button
          type="button"
          className="shrink-0 text-xs text-swu-accent hover:text-swu-primary"
          onClick={onBack}
        >
          Zurück zu Informationen
        </button>
      </div>
      {children}
    </section>
  );
}
