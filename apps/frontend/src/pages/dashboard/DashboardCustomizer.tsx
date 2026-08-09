import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useDashboardLayoutStore, DEFAULT_LAYOUT_LG } from '../../stores/dashboard-layout.store';
import { WIDGET_REGISTRY } from './widget-registry';

export function DashboardCustomizer() {
  const user = useAuthStore((s) => s.user);
  const { layouts, editMode, toggleWidget, toggleEditMode, resetLayout } =
    useDashboardLayoutStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);

  const widgetMap = new Map(layouts.lg.map((w) => [w.id, w]));

  const visibleWidgets = WIDGET_REGISTRY.filter(
    (def) => !def.adminOnly || user?.isAdmin,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!editMode) setMenuOpen(false);
  }, [editMode]);

  const handleButtonClick = () => {
    if (!editMode) {
      toggleEditMode();
      setMenuOpen(true);
    } else if (isMobile) {
      setMenuOpen((o) => !o);
    } else {
      toggleEditMode();
    }
  };

  useEffect(() => {
    if (!menuOpen || isMobile || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [menuOpen, isMobile]);

  const menuContent = (
    <>
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
    </>
  );

  return (
    <div className="flex items-center gap-2">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className={`text-[10px] px-2 py-1 rounded border transition-colors font-mono ${
          editMode
            ? 'bg-swu-accent/20 border-swu-accent text-swu-accent'
            : 'bg-swu-surface border-swu-border text-swu-muted hover:border-swu-accent/40'
        }`}
      >
        {editMode ? '⚙ Widgets' : '⚙ Anpassen'}
      </button>

      {editMode && isMobile && (
        <button
          onClick={toggleEditMode}
          className="text-[10px] px-2 py-1 rounded border transition-colors font-mono bg-swu-accent/20 border-swu-accent text-swu-accent"
        >
          ✓ Fertig
        </button>
      )}

      {/* Mobile: Bottom Sheet — nur wenn menuOpen, NICHT dauerhaft im editMode */}
      {menuOpen && isMobile && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-swu-surface border-t border-swu-border rounded-t-lg p-4">
            {menuContent}
            <button
              onClick={() => setMenuOpen(false)}
              className="mt-3 w-full text-[10px] px-2 py-1 border border-swu-accent/40 text-swu-accent rounded transition-colors"
            >
              Schließen — Widgets verschieben
            </button>
          </div>
        </div>
      )}

      {/* Desktop: fixed Dropdown */}
      {menuOpen && !isMobile && (
        <div
          style={{ top: menuPos.top, right: menuPos.right }}
          className="fixed z-50 bg-swu-surface border border-swu-border rounded shadow-lg p-3 min-w-[220px]"
        >
          {menuContent}
        </div>
      )}
    </div>
  );
}
