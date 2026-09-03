import { planetImage } from '../../../lib/assets';
import type { Colony } from '../types';

export function ColonyCommandBar({
  colony,
  onBack,
}: {
  colony: Colony;
  onBack: () => void;
}) {
  return (
    <div className="rounded border border-swu-border bg-swu-surface/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="rounded border border-swu-border/60 px-2 py-1 text-[11px] text-swu-muted transition-colors hover:border-swu-accent/60 hover:text-swu-accent"
        >
          ← Kolonien
        </button>
        {colony.celestialObject?.classId && (
          <img
            src={planetImage(colony.celestialObject.classId)}
            alt=""
            className="h-9 w-9 object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-base font-bold text-swu-primary"
            style={{ fontFamily: 'var(--font-swu-display)' }}
          >
            {colony.name}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-swu-muted">
            {colony.locationLabel && <span>{colony.locationLabel}</span>}
            {colony.starSystem?.name && <span>{colony.starSystem.name}</span>}
            {colony.posX != null && colony.posY != null && (
              <span className="font-mono">
                {colony.posX}|{colony.posY}
              </span>
            )}
            {colony.stats?.isBlockaded && (
              <span className="font-bold text-red-400">Blockade</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
