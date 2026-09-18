interface DirectionalControlsProps {
  onMove: (dx: number, dy: number) => void;
  stepSize: number;
  onStepChange: (step: number) => void;
  disabled: boolean;
}

export function DirectionalControls({
  onMove,
  stepSize,
  onStepChange,
  disabled,
}: DirectionalControlsProps) {
  const btnClass = disabled
    ? 'border-swu-border/40 text-swu-muted/40 cursor-not-allowed'
    : 'border-swu-border bg-swu-surface text-swu-primary hover:border-swu-accent hover:bg-swu-accent/10 active:scale-95';

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
    </div>
  );
}
