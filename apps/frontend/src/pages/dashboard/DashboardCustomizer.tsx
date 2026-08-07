import { useAuthStore } from '../../stores/auth.store';
import { useDashboardLayoutStore, DEFAULT_LAYOUT_LG } from '../../stores/dashboard-layout.store';
import { WIDGET_REGISTRY } from './widget-registry';

export function DashboardCustomizer() {
  const user = useAuthStore((s) => s.user);
  const { layouts, editMode, toggleWidget, toggleEditMode, resetLayout } =
    useDashboardLayoutStore();

  const widgetMap = new Map(layouts.lg.map((w) => [w.id, w]));

  const visibleWidgets = WIDGET_REGISTRY.filter(
    (def) => !def.adminOnly || user?.isAdmin,
  );

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleEditMode}
        className={`text-[10px] px-2 py-1 rounded border transition-colors font-mono ${
          editMode
            ? 'bg-swu-accent/20 border-swu-accent text-swu-accent'
            : 'bg-swu-surface border-swu-border text-swu-muted hover:border-swu-accent/40'
        }`}
      >
        {editMode ? '✓ Fertig' : '⚙ Anpassen'}
      </button>

      {editMode && (
        <div className="relative">
          <div className="absolute top-8 right-0 z-50 bg-swu-surface border border-swu-border rounded shadow-lg p-3 min-w-[220px]">
            <div className="text-[10px] text-swu-muted uppercase tracking-wider mb-2">
              Widgets ein/ausblenden
            </div>
            <div className="space-y-1.5 max-h-64 overflow-auto">
              {visibleWidgets.map((def) => {
                const slot = widgetMap.get(def.id);
                const enabled = slot?.enabled ?? DEFAULT_LAYOUT_LG.find(d => d.id === def.id)?.enabled ?? true;
                return (
                  <label
                    key={def.id}
                    className="flex items-center gap-2 cursor-pointer text-xs group"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleWidget(def.id)}
                      className="accent-swu-accent"
                    />
                    <span
                      className={`${enabled ? 'text-swu-primary' : 'text-swu-muted'} group-hover:text-swu-text transition-colors`}
                    >
                      {def.title}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              onClick={resetLayout}
              className="mt-3 w-full text-[10px] px-2 py-1 border border-swu-border text-swu-muted rounded hover:border-swu-warning/40 hover:text-swu-warning transition-colors"
            >
              Layout zurücksetzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
