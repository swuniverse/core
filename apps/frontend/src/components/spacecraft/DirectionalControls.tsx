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
    <div className="flex flex-col items-center gap-1">
      <button
        disabled={disabled}
        onClick={() => onMove(0, -1)}
        className={`w-10 h-10 rounded border text-base font-bold flex items-center justify-center transition-all ${btnClass}`}
      >
        ▲
      </button>
      <div className="flex items-center gap-1">
        <button
          disabled={disabled}
          onClick={() => onMove(-1, 0)}
          className={`w-10 h-10 rounded border text-base font-bold flex items-center justify-center transition-all ${btnClass}`}
        >
          ◄
        </button>
        <input
          type="number"
          min={1}
          max={9}
          value={stepSize}
          onChange={(e) => {
            const v = Math.max(1, Math.min(9, Number(e.target.value) || 1));
            onStepChange(v);
          }}
          disabled={disabled}
          className="w-10 h-10 rounded border border-swu-accent/50 bg-swu-accent/10 text-swu-accent text-center text-sm font-bold focus:outline-none focus:ring-1 focus:ring-swu-accent disabled:opacity-40"
        />
        <button
          disabled={disabled}
          onClick={() => onMove(1, 0)}
          className={`w-10 h-10 rounded border text-base font-bold flex items-center justify-center transition-all ${btnClass}`}
        >
          ►
        </button>
      </div>
      <button
        disabled={disabled}
        onClick={() => onMove(0, 1)}
        className={`w-10 h-10 rounded border text-base font-bold flex items-center justify-center transition-all ${btnClass}`}
      >
        ▼
      </button>
      <span className="text-[10px] text-swu-muted mt-1">Felder/Schritt</span>
    </div>
  );
}
