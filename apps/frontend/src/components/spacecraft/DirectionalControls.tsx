import type { BountyHunterSignal } from './LssMap';

export const HUNTER_SIGNAL_STYLE: Record<
  BountyHunterSignal,
  { button: string; glow: string; text: string }
> = {
  YELLOW: { button: 'border-yellow-400 bg-yellow-500/20 text-yellow-200', glow: '0 0 18px 3px rgba(250,204,21,0.55)', text: 'text-yellow-300' },
  ORANGE: { button: 'border-orange-400 bg-orange-500/20 text-orange-200', glow: '0 0 18px 3px rgba(251,146,60,0.6)', text: 'text-orange-300' },
  RED: { button: 'border-red-500 bg-red-500/25 text-red-200', glow: '0 0 20px 4px rgba(239,68,68,0.65)', text: 'text-red-300' },
};

interface DirectionalControlsProps {
  onMove: (dx: number, dy: number) => void;
  stepSize: number;
  onStepChange: (step: number) => void;
  disabled: boolean;
  /** Nearest active anomaly colours the buttons and shows a hint. */
  signal?: BountyHunterSignal | null;
}

export function DirectionalControls({
  onMove,
  stepSize,
  onStepChange,
  disabled,
  signal = null,
}: DirectionalControlsProps) {
  const signalStyle = signal ? HUNTER_SIGNAL_STYLE[signal] : null;
  const btnClass = disabled
    ? 'border-swu-border/40 text-swu-muted/40 cursor-not-allowed'
    : `${signalStyle?.button ?? 'border-swu-border bg-swu-surface text-swu-primary'} hover:border-swu-accent hover:bg-swu-accent/10 active:scale-95`;

  return (
    <div
      className="flex flex-col items-center gap-1"
      aria-label="Richtungssteuerung"
    >
      <button
        type="button"
        aria-label="Nach Norden fliegen"
        disabled={disabled}
        onClick={() => onMove(0, -1)}
        className={`flex h-10 w-10 items-center justify-center rounded border text-base font-bold transition-all ${btnClass}`}
      >
        ▲
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Nach Westen fliegen"
          disabled={disabled}
          onClick={() => onMove(-1, 0)}
          className={`flex h-10 w-10 items-center justify-center rounded border text-base font-bold transition-all ${btnClass}`}
        >
          ◄
        </button>
        <label className="sr-only" htmlFor="ship-step-size">
          Felder pro Schritt
        </label>
        <input
          id="ship-step-size"
          aria-label="Felder pro Schritt"
          type="number"
          min={1}
          max={9}
          value={stepSize}
          onChange={(e) => {
            const v = Math.max(1, Math.min(9, Number(e.target.value) || 1));
            onStepChange(v);
          }}
          disabled={disabled}
          className="h-10 w-10 rounded border border-swu-accent/50 bg-swu-accent/10 text-center text-sm font-bold text-swu-accent focus:outline-none focus:ring-1 focus:ring-swu-accent disabled:opacity-40"
        />
        <button
          type="button"
          aria-label="Nach Osten fliegen"
          disabled={disabled}
          onClick={() => onMove(1, 0)}
          className={`flex h-10 w-10 items-center justify-center rounded border text-base font-bold transition-all ${btnClass}`}
        >
          ►
        </button>
      </div>
      <button
        type="button"
        aria-label="Nach Süden fliegen"
        disabled={disabled}
        onClick={() => onMove(0, 1)}
        className={`flex h-10 w-10 items-center justify-center rounded border text-base font-bold transition-all ${btnClass}`}
      >
        ▼
      </button>
      {signalStyle && (
        <div
          role="status"
          data-testid="hunter-signal"
          className={`mt-1 text-center text-xs font-bold ${signalStyle.text}`}
        >
          Raumanomalie erkannt
        </div>
      )}
    </div>
  );
}
