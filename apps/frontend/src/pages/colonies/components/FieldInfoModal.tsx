import { buildingImage, commodityImage } from '../../../lib/assets';
import type { BuildingDef, ColonyField, CommodityDef } from '../types';
import { FIELD_TYPE_NAMES, TILE_TYPE_NAMES } from '../constants';
import { formatSignedAmount } from '../utils';
import { FloatingPanel } from './FloatingPanel';

// ─── Field Info Panel ────────────────────────────────────────

export function FieldInfoModal({
  field,
  building,
  commodityMap,
  onClose,
  onDemolish,
  onToggle,
}: {
  field: ColonyField;
  building: BuildingDef | undefined;
  commodityMap: Record<number, CommodityDef>;
  onClose: () => void;
  onDemolish: () => void;
  onToggle: () => void;
}) {
  if (!building) return null;
  const terrainName =
    TILE_TYPE_NAMES[field.terrainTileId ?? field.fieldType] ||
    FIELD_TYPE_NAMES[field.fieldType] ||
    '?';
  const isHQ = [1, 82010100, 82010300].includes(field.buildingId!);
  const isBonus = (field.terrainTileId ?? field.fieldType) >= 10000;
  const integrityCurrent = field.integrity ?? building.integrity ?? 0;
  const integrityMax = field.maxIntegrity ?? building.integrity ?? 0;
  const integrityPercent =
    integrityMax > 0
      ? Math.round((integrityCurrent / integrityMax) * 100)
      : 100;

  return (
    <FloatingPanel
      title={`Feld ${field.fieldIndex} - Informationen`}
      startX={Math.round(window.innerWidth / 2 - 170)}
      startY={Math.round(window.innerHeight / 2 - 200)}
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Building info */}
        <div className="flex items-center gap-3">
          <img
            src={buildingImage(building.id)}
            alt=""
            className="h-12 w-12 object-contain"
          />
          <div>
            <div className="text-sm font-bold text-swu-primary">
              {building.name}
            </div>
            <div className="text-[10px] text-swu-muted">
              auf {terrainName}
              {isBonus && (
                <span className="ml-1 text-yellow-400">★ Bonusfeld</span>
              )}
            </div>
            {!field.isActive && (
              <div className="text-[10px] text-red-400 font-bold">
                DEAKTIVIERT
              </div>
            )}
            {integrityMax > 0 && (
              <div
                className={`text-[10px] ${integrityPercent < 50 ? 'text-orange-400 font-bold' : 'text-swu-muted'}`}
              >
                Integrität: {integrityCurrent}/{integrityMax} (
                {integrityPercent}%)
              </div>
            )}
            {building.functions && building.functions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {building.functions.map((functionId) => (
                  <span
                    key={functionId}
                    className="px-1 rounded border border-swu-border/60 bg-swu-bg/50 text-[9px] text-swu-primary"
                  >
                    Funktion #{functionId}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Auswirkungen */}
        {((building.bevUse || 0) > 0 ||
          (building.bevPro || 0) > 0 ||
          building.bonuses.storage !== 0) && (
          <div>
            <div className="text-[10px] text-swu-muted uppercase font-bold mb-1">
              Auswirkungen
            </div>
            <div className="space-y-0.5 text-xs">
              {(building.bevUse || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">👤 Arbeiter</span>
                  <span className="text-red-400">-{building.bevUse}</span>
                </div>
              )}
              {(building.bevPro || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">🏠 Wohnraum</span>
                  <span className="text-green-400">+{building.bevPro}</span>
                </div>
              )}
              {building.bonuses.storage !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">📦 Lager</span>
                  <span
                    className={
                      building.bonuses.storage > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {formatSignedAmount(building.bonuses.storage)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Produktion */}
        {((building.epsProc || 0) !== 0 || building.production.length > 0) && (
          <div>
            <div className="text-[10px] text-swu-muted uppercase font-bold mb-1">
              Produktion
            </div>
            <div className="space-y-0.5 text-xs">
              {(building.epsProc || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">⚡ Energie</span>
                  <span
                    className={
                      (building.epsProc || 0) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }
                  >
                    {formatSignedAmount(building.epsProc || 0)}
                  </span>
                </div>
              )}
              {building.production.map((p) => (
                <div
                  key={p.commodityId}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <img
                      src={commodityImage(
                        p.commodityId,
                        commodityMap[p.commodityId]?.name,
                      )}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                    <span className="text-swu-muted">
                      {commodityMap[p.commodityId]?.name || '?'}
                    </span>
                  </span>
                  <span
                    className={p.amount < 0 ? 'text-red-400' : 'text-green-400'}
                  >
                    {formatSignedAmount(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-swu-border/50">
          {!isHQ && (
            <button
              onClick={onToggle}
              className={`px-3 py-1 text-[10px] font-bold rounded border transition-colors ${field.isActive ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/40' : 'bg-green-900/20 border-green-500/50 text-green-400 hover:bg-green-900/40'}`}
            >
              {field.isActive ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          )}
          {!isHQ && (
            <button
              onClick={onDemolish}
              className="px-3 py-1 bg-red-900/20 border border-red-500/50 text-red-400 text-[10px] font-bold rounded hover:bg-red-900/40 transition-colors"
            >
              Demontieren
            </button>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}
