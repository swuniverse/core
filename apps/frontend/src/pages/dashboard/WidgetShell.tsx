import type { ReactNode } from 'react';

interface WidgetShellProps {
  title: string;
  editMode: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function WidgetShell({ title, editMode, onClose, children }: WidgetShellProps) {
  return (
    <div className="h-full flex flex-col">
      {editMode && (
        <div
          className="widget-drag-handle flex items-center justify-between px-2 py-1 bg-swu-surface border border-swu-accent/40 rounded-t cursor-grab select-none shrink-0"
          style={{ touchAction: 'none' }}
        >
          <span className="text-[10px] text-swu-accent font-mono truncate">
            ⠿ {title}
          </span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="text-[10px] text-swu-muted hover:text-red-400 transition-colors ml-2 shrink-0"
            aria-label={`${title} ausblenden`}
          >
            ✕
          </button>
        </div>
      )}
      <div className={`flex-1 min-h-0 ${editMode ? 'rounded-b overflow-hidden' : 'h-full'}`}>
        {children}
      </div>
    </div>
  );
}
