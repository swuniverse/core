import { buildingImage, colonyFieldTileImage } from '../../../lib/assets';
import type { ColonyField } from '../types';
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
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick: () => void;
}) {
  const terrainTileId = field.terrainTileId ?? field.fieldType;
  const inactive = buildingId && !field.isBuilding && !isFieldActive;
  const isBonus = terrainTileId >= 10000;
  const bonusUsed = isBonus && !!buildingId && !field.isBuilding;
  const damaged =
    !!buildingId &&
    !field.isBuilding &&
    field.maxIntegrity != null &&
    field.maxIntegrity > 0 &&
    (field.integrity ?? field.maxIntegrity) < field.maxIntegrity;
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`Feld ${field.fieldIndex}${buildingName ? ': ' + buildingName : ''}${inactive ? ' (deaktiviert)' : ''}${damaged ? ' (beschädigt)' : ''}`}
      className={`relative w-full aspect-square overflow-hidden text-xs flex items-center justify-center border border-gray-500
        ${isSelected ? 'ring-2 ring-swu-accent z-10' : ''}
        ${isHighlighted ? 'ring-2 ring-swu-accent/60 animate-pulse z-10' : ''}
        ${inactive ? 'border-red-600' : ''}
        ${damaged && !inactive ? 'border-orange-500' : ''}
        ${!isSelected && !isHighlighted && !inactive && !damaged && isBonus && !bonusUsed ? 'border-yellow-400/70' : ''}
        ${!isSelected && !isHighlighted && !inactive && bonusUsed ? 'border-green-400/70' : ''}
        ${FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg'}
        ${field.isBuilding ? 'animate-pulse' : ''}
        ${field.terraformingId ? 'border-2 border-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}
        ${isBuildMode && !isHighlighted && !field.buildingId ? 'opacity-30' : ''}
        ${isHighlighted ? 'cursor-crosshair' : ''}`}
      title={[
        `${TILE_TYPE_NAMES[terrainTileId] || FIELD_TYPE_NAMES[field.fieldType] || '?'}${isBonus ? ' ★' : ''}${buildingName ? ' — ' + buildingName : ''}${inactive ? ' (deaktiviert)' : ''}${damaged ? ` beschädigt ${field.integrity}/${field.maxIntegrity}` : ''}${field.terraformingId ? ' ⟳ Terraform' : ''} (${field.fieldIndex})`,
        buildPreviewTitle,
      ]
        .filter(Boolean)
        .join('\n')}
    >
      <img
        src={colonyFieldTileImage(terrainTileId)}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
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
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.9)]" />
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
