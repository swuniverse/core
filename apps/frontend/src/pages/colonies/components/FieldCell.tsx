import { buildingImage, colonyFieldTileImage } from '../../../lib/assets';
import type { ColonyField } from '../types';
import {
  BONUS_MARKER_FRAME_CLASS,
  BONUS_MARKER_META,
  BonusMarkerBadge,
} from '../../../lib/bonus-markers';
import {
  FIELD_TYPE_COLORS,
  FIELD_TYPE_NAMES,
  TILE_TYPE_NAMES,
} from '../constants';

// ─── FieldCell ───────────────────────────────────────────────

export function FieldCell({
  field,
  buildingName,
  buildingId,
  isSelected,
  isHighlighted,
  isBuildMode,
  isFieldActive,
  buildPreviewTitle,
  timeState,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  field: ColonyField;
  buildingName?: string;
  buildingId?: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isBuildMode: boolean;
  isFieldActive: boolean;
  buildPreviewTitle?: string;
  /** Nur SWU-Kolonien: Tag (t) oder Nacht (n) Kachel. */
  timeState?: 'day' | 'night';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick: () => void;
}) {
  const terrainTileId = field.terrainTileId ?? field.fieldType;
  const inactive = buildingId && !field.isBuilding && !isFieldActive;
  // terrainTileId kann string|number sein: SWU-Codes werden zu NaN (=> false).
  const isBonus = Number(terrainTileId) >= 10000;
  const bonusUsed = isBonus && !!buildingId && !field.isBuilding;
  const marker = field.bonusMarker
    ? BONUS_MARKER_META[field.bonusMarker]
    : undefined;
  const damaged =
    !!buildingId &&
    !field.isBuilding &&
    field.maxIntegrity != null &&
    field.maxIntegrity > 0 &&
    (field.integrity ?? field.maxIntegrity) < field.maxIntegrity;

  // Untergrund vor Forschung "Untergrund-Wissen" verborgen: Backend schickt
  // keine echten Felddaten, hier gibt es nichts darzustellen.
  if (field.locked && !field.adminPreview) {
    return (
      <button
        onClick={onClick}
        aria-label={`Feld ${field.fieldIndex}: verborgen`}
        className={`relative w-full aspect-square overflow-hidden text-xs flex items-center justify-center border border-gray-500 bg-swu-bg/90
          ${isSelected ? 'ring-2 ring-swu-accent z-10' : ''}`}
        title={`Erfordert Forschung: Untergrund-Wissen (${field.fieldIndex})`}
      >
        <span className="text-swu-muted text-sm opacity-60">🔒</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Feld ${field.fieldIndex}${buildingName ? ': ' + buildingName : ''}${inactive ? ' (deaktiviert)' : ''}${damaged ? ' (beschädigt)' : ''}${field.locked ? ' (Admin-Vorschau, unerforscht)' : ''}`}
      className={`relative w-full aspect-square overflow-hidden text-xs flex items-center justify-center border border-gray-500
        ${isSelected ? 'ring-2 ring-swu-accent z-10' : ''}
        ${isHighlighted ? 'ring-2 ring-swu-accent/60 animate-pulse z-10' : ''}
        ${inactive ? 'border-red-600' : ''}
        ${damaged && !inactive ? 'border-orange-500' : ''}
        ${!isSelected && !isHighlighted && !inactive && !damaged && isBonus && !bonusUsed ? 'border-yellow-400/70' : ''}
        ${!isSelected && !isHighlighted && !inactive && bonusUsed ? 'border-green-400/70' : ''}
        ${FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg'}
        ${marker && !buildingId && !field.isBuilding && field.bonusMarkerActive !== false && !isSelected && !isHighlighted ? BONUS_MARKER_FRAME_CLASS : ''}
        ${field.isBuilding ? 'animate-pulse' : ''}
        ${field.terraformingId ? 'border-2 border-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}
        ${isBuildMode && !isHighlighted && !field.buildingId ? 'opacity-30' : ''}
        ${isHighlighted ? 'cursor-crosshair' : ''}
        ${field.locked ? 'grayscale opacity-60' : ''}`}
      title={[
        `${TILE_TYPE_NAMES[terrainTileId] || FIELD_TYPE_NAMES[field.fieldType] || '?'}${isBonus ? ' ★' : ''}${buildingName ? ' — ' + buildingName : ''}${inactive ? ' (deaktiviert)' : ''}${damaged ? ` beschädigt ${field.integrity}/${field.maxIntegrity}` : ''}${field.terraformingId ? ' ⟳ Geoengineering' : ''}${field.locked ? ' — Admin-Vorschau (Spieler: unerforscht)' : ''} (${field.fieldIndex})`,
        buildPreviewTitle,
      ]
        .filter(Boolean)
        .join('\n')}
    >
      <img
        key={`${terrainTileId}-${timeState ?? 'static'}`}
        src={colonyFieldTileImage(terrainTileId, timeState)}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          // Gibt es die Kachel nur in der anderen Variante (z.B. Orbit-Kacheln
          // OO10-OO40 nur als Nacht), dorthin ausweichen - einmalig.
          if (event.currentTarget.dataset.fallback) return;
          event.currentTarget.dataset.fallback = '1';
          event.currentTarget.src = colonyFieldTileImage(
            terrainTileId,
            timeState === 'night' ? 'day' : 'night',
          );
        }}
      />
      {marker && (
        <BonusMarkerBadge
          emoji={marker.emoji}
          inactive={field.bonusMarkerActive === false}
          title={`${marker.label} – ${marker.effect}${field.bonusMarkerActive === false ? ' (auf diesem Tile nicht nutzbar)' : ''}`}
        />
      )}
      {field.terraformingId && (
        <span className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
          <span className="text-cyan-300 text-[10px] font-bold drop-shadow-[0_0_4px_rgba(34,211,238,0.8)]">⟳</span>
        </span>
      )}
      {buildingId && (
        <>
          <span
            className={`absolute inset-[8%] rounded-md ${inactive ? '' : 'bg-black/18 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}
          />
          {damaged && (
            <span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.9)]" />
          )}
          <img
            src={buildingImage(buildingId)}
            alt=""
            className={`absolute inset-[5%] w-[90%] h-[90%] object-contain ${inactive ? '' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]'}`}
            style={{
              filter: inactive ? undefined : 'contrast(1.08) saturate(1.08)',
            }}
            loading="lazy"
          />
        </>
      )}
    </button>
  );
}
