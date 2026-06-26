import { useCallback, useRef, useState } from 'react';

// ─── Floating Panel ─────────────────────────────────────────

export function FloatingPanel({
  title,
  startX,
  startY,
  onClose,
  children,
}: {
  title: string;
  startX?: number;
  startY?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: startX ?? 64, y: startY ?? 64 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      offset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-swu-surface border border-swu-border rounded-lg shadow-2xl w-[340px] max-w-[90vw]"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-swu-border cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="text-xs font-bold text-swu-primary">{title}</span>
        <button
          onClick={onClose}
          className="text-swu-muted hover:text-swu-primary text-sm leading-none"
        >
          ✕
        </button>
      </div>
      <div className="px-3 py-2 max-h-[70vh] overflow-y-auto">{children}</div>
    </div>
  );
}

