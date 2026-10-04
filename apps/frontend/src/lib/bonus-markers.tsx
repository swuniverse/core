/** SWU planetare Bonus-Marker (Emoji-Fallback, siehe backend swu-bonus-markers.ts). */
export const BONUS_MARKER_META: Record<
  string,
  { emoji: string; label: string; effect: string }
> = {
  KYBER: { emoji: '💎', label: 'Kyber-Vorkommen', effect: 'zusätzliches Kybervorkommen' },
  PHRIK: { emoji: '⛏️', label: 'Ergiebiges Phrik-Vorkommen', effect: 'zählt wie zwei Felder' },
  FERTILE: { emoji: '🌾', label: 'Fruchtbar', effect: 'zählt wie zwei Felder' },
  FERTILE_WATER: { emoji: '🪼', label: 'Fruchtbar', effect: 'zählt wie zwei Felder' },
  ENERGY: { emoji: '⚡', label: 'Energiereich', effect: 'zählt wie zwei Felder' },
  ATTRACTIVE: { emoji: '✨', label: 'Anziehend', effect: 'Wohngebäude zählen wie zwei Felder' },
};

export function BonusMarkerBadge({
  emoji,
  title,
  inactive = false,
}: {
  emoji: string;
  title?: string;
  /** Marker passt nicht zum aktuellen Tile: grau statt farbig. */
  inactive?: boolean;
}) {
  return (
    <span
      title={title}
      className={`pointer-events-none absolute right-0 top-0 z-10 flex h-[10px] w-[10px] items-center justify-center text-[8px] leading-none drop-shadow-[0_0_2px_rgba(0,0,0,0.9)] ${inactive ? 'opacity-50 grayscale' : ''}`}
    >
      {emoji}
    </span>
  );
}

/** Goldener Rahmen um unbebaute Felder mit nutzbarem Marker (damit er auffaellt). */
export const BONUS_MARKER_FRAME_CLASS =
  'ring-2 ring-inset ring-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.8)]';
