import type { StarmapGalaxyFieldDto, StarmapLayerDto, StarmapSystemListItemDto } from '@swuniverse/shared';

interface StarmapControlPanelProps {
  layer: Pick<StarmapLayerDto, 'width' | 'height' | 'sectorSize'>;
  showGrid: boolean;
  onToggleGrid: (v: boolean) => void;
  selectedSector: { x: number; y: number } | null;
  onSelectSector: (sector: { x: number; y: number } | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedField: StarmapGalaxyFieldDto | null;
  selectedSystem: StarmapSystemListItemDto | null;
  onEnterSystem: () => void;
  inSystemMode: boolean;
}

const FACTION_LABELS: Record<string, string> = {
  REBEL: 'Rebellen',
  EMPIRE: 'Imperium',
  CONTESTED: 'Umkämpft',
  NEUTRAL: 'Neutral',
  UNKNOWN: 'Unbekannt',
};

export function StarmapControlPanel({
  layer,
  showGrid,
  onToggleGrid,
  selectedSector,
  onSelectSector,
  onZoomIn,
  onZoomOut,
  selectedField,
  selectedSystem,
  onEnterSystem,
  inSystemMode,
}: StarmapControlPanelProps) {
  const sectorCols = Math.ceil(layer.width / layer.sectorSize);
  const sectorRows = Math.ceil(layer.height / layer.sectorSize);
  const totalSectors = sectorCols * sectorRows;

  const sectorKey = selectedSector ? `${selectedSector.x},${selectedSector.y}` : '';

  function getSectorInfo(cx: number, cy: number) {
    const sx = Math.floor((cx - 1) / layer.sectorSize);
    const sy = Math.floor((cy - 1) / layer.sectorSize);
    const num = sy * sectorCols + sx + 1;
    const minCx = sx * layer.sectorSize + 1;
    const minCy = sy * layer.sectorSize + 1;
    const maxCx = Math.min((sx + 1) * layer.sectorSize, layer.width);
    const maxCy = Math.min((sy + 1) * layer.sectorSize, layer.height);
    return { num, minCx, minCy, maxCx, maxCy };
  }

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-3 space-y-3">
      <h4 className="text-xs font-bold text-swu-muted">Ansicht</h4>

      {/* Zoom */}
      <div className="flex gap-1">
        <button
          onClick={onZoomIn}
          className="flex-1 border border-swu-border rounded px-2 py-1 text-sm text-swu-primary hover:bg-swu-accent/10"
        >+</button>
        <button
          onClick={onZoomOut}
          className="flex-1 border border-swu-border rounded px-2 py-1 text-sm text-swu-primary hover:bg-swu-accent/10"
        >−</button>
      </div>

      {/* Toggles */}
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-xs text-swu-muted">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onToggleGrid(e.target.checked)}
          />
          Raster
        </label>
        {!inSystemMode && (
          <label className="flex items-center gap-2 text-xs text-swu-muted opacity-50">
            <input type="checkbox" disabled />
            Eigene Schiffe
          </label>
        )}
      </div>

      {/* Sector selector — galaxy only */}
      {!inSystemMode && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-swu-muted">Sektor</span>
          <select
            className="flex-1 bg-swu-bg border border-swu-border text-swu-primary text-xs rounded px-1 py-0.5"
            value={sectorKey}
            onChange={(e) => {
              if (!e.target.value) {
                onSelectSector(null);
              } else {
                const [x, y] = e.target.value.split(',').map(Number);
                onSelectSector({ x, y });
              }
            }}
          >
            <option value="">—</option>
            {Array.from({ length: totalSectors }, (_, i) => {
              const x = i % sectorCols;
              const y = Math.floor(i / sectorCols);
              return (
                <option key={i} value={`${x},${y}`}>
                  Sektor {i + 1}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Systemkarte button — galaxy only */}
      {!inSystemMode && selectedSystem && (
        <button
          onClick={onEnterSystem}
          className="w-full border border-swu-border rounded px-2 py-1 text-xs text-swu-accent hover:bg-swu-accent/10"
        >
          Systemkarte
        </button>
      )}

      {/* Field info — galaxy only */}
      {!inSystemMode && (
        <div className="border-t border-swu-border pt-2 space-y-0.5">
          <p className="text-xs font-bold text-swu-primary">Feld</p>
          {selectedField ? (
            <>
              <p className="text-xs text-swu-muted">
                Feld {selectedField.cx} | {selectedField.cy}
              </p>
              <p className="text-xs text-swu-muted">
                {(() => {
                  const info = getSectorInfo(selectedField.cx, selectedField.cy);
                  return `Sektor ${info.num} (${info.minCx}|${info.minCy} bis ${info.maxCx}|${info.maxCy})`;
                })()}
              </p>
              <p className="text-xs text-swu-muted">
                {selectedField.fieldType.name || 'Weltraum'}
              </p>
              {selectedField.factionZone && selectedField.factionZone !== 'UNKNOWN' && (
                <p className="text-xs text-swu-muted">
                  Gebiet: {FACTION_LABELS[selectedField.factionZone] ?? selectedField.factionZone}
                </p>
              )}
              {selectedField.starSystem && (
                <p className="text-xs text-swu-accent">
                  {selectedField.starSystem.isMapOnly ? 'POI' : 'System'}: {selectedField.starSystem.name}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-swu-muted">Feld anklicken</p>
          )}
        </div>
      )}
    </div>
  );
}
