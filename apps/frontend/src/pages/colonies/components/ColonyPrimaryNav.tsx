import {
  COLONY_MAIN_VIEWS,
  type ColonyMainView,
} from '../colony-navigation';

type ColonyPrimaryNavProps = {
  activeView: ColonyMainView;
  onViewChange: (view: ColonyMainView) => void;
};

export function ColonyPrimaryNav({
  activeView,
  onViewChange,
}: ColonyPrimaryNavProps) {
  return (
    <nav aria-label="Koloniebereiche" className="overflow-x-auto scrollbar-none">
      <div className="flex w-max min-w-full gap-1">
        {COLONY_MAIN_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            aria-current={activeView === view.key ? 'page' : undefined}
            onClick={() => onViewChange(view.key)}
            className={`whitespace-nowrap rounded border px-3 py-1.5 text-xs font-bold transition-colors ${
              activeView === view.key
                ? 'border-swu-accent bg-swu-accent/12 text-swu-accent'
                : 'border-swu-border/60 bg-swu-surface text-swu-muted hover:text-swu-primary'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
