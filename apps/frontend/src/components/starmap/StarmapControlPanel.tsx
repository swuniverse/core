import type { StarmapGalaxyFieldDto, StarmapLayerDto, StarmapSystemListItemDto } from '@swuniverse/shared';

interface StarmapControlPanelProps {
  layer: Pick<StarmapLayerDto, 'width' | 'height' | 'sectorSize'>;
  showGrid: boolean;
  onToggleGrid: (value: boolean) => void;
  selectedSector: { x: number; y: number } | null;
  onSelectSector: (sector: { x: number; y: number } | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedField: StarmapGalaxyFieldDto | null;
  selectedSystem: StarmapSystemListItemDto | null;
  onOpenSystem: () => void;
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
  onOpenSystem,
}: StarmapControlPanelProps) {
  const sectorCols = Math.ceil(layer.width / layer.sectorSize);
  const sectorRows = Math.ceil(layer.height / layer.sectorSize);
  const totalSectors = sectorCols * sectorRows;
  const sectorKey = selectedSector ? `${selectedSector.x},${selectedSector.y}` : '';
  const getSectorInfo = (cx: number, cy: number) => {
    const sx = Math.floor((cx - 1) / layer.sectorSize);
    const sy = Math.floor((cy - 1) / layer.sectorSize);
    return {
      num: sy * sectorCols + sx + 1,
      minCx: sx * layer.sectorSize + 1,
      minCy: sy * layer.sectorSize + 1,
      maxCx: Math.min((sx + 1) * layer.sectorSize, layer.width),
      maxCy: Math.min((sy + 1) * layer.sectorSize, layer.height),
    };
  };

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-3 space-y-3">
      <h4 className="text-xs font-bold text-swu-muted">Ansicht</h4>
      <div className="flex gap-1">
        <button onClick={onZoomIn} className="flex-1 border border-swu-border rounded px-2 py-1 text-sm text-swu-primary hover:bg-swu-accent/10">+</button>
        <button onClick={onZoomOut} className="flex-1 border border-swu-border rounded px-2 py-1 text-sm text-swu-primary hover:bg-swu-accent/10">−</button>
      </div>
      <label className="flex items-center gap-2 text-xs text-swu-muted">
        <input type="checkbox" checked={showGrid} onChange={(event) => onToggleGrid(event.target.checked)} />
        Raster
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-swu-muted">Sektor</span>
        <select
          className="flex-1 bg-swu-bg border border-swu-border text-swu-primary text-xs rounded px-1 py-0.5"
          value={sectorKey}
          onChange={(event) => {
            if (!event.target.value) onSelectSector(null);
            else {
              const [x, y] = event.target.value.split(',').map(Number);
              onSelectSector({ x, y });
            }
          }}
        >
          <option value="">—</option>
          {Array.from({ length: totalSectors }, (_, index) => {
            const x = index % sectorCols;
            const y = Math.floor(index / sectorCols);
            return <option key={index} value={`${x},${y}`}>Sektor {index + 1}</option>;
          })}
        </select>
      </div>
      {selectedSystem && !selectedSystem.isMapOnly && (
        <button onClick={onOpenSystem} className="w-full border border-swu-border rounded px-2 py-1 text-xs text-swu-accent hover:bg-swu-accent/10">
          Systemfelder laden
        </button>
      )}
      <div className="border-t border-swu-border pt-2 space-y-0.5">
        <p className="text-xs font-bold text-swu-primary">Feld</p>
        {selectedField ? (
          <>
            <p className="text-xs text-swu-muted">Feld {selectedField.cx} | {selectedField.cy}</p>
            <p className="text-xs text-swu-muted">{(() => {
              const info = getSectorInfo(selectedField.cx, selectedField.cy);
              return `Sektor ${info.num} (${info.minCx}|${info.minCy} bis ${info.maxCx}|${info.maxCy})`;
            })()}</p>
            <p className="text-xs text-swu-muted">{selectedField.fieldType.name || 'Weltraum'}</p>
            {selectedField.factionZone && selectedField.factionZone !== 'UNKNOWN' && <p className="text-xs text-swu-muted">Gebiet: {FACTION_LABELS[selectedField.factionZone] ?? selectedField.factionZone}</p>}
            {selectedField.starSystem && <p className="text-xs text-swu-accent">{selectedField.starSystem.isMapOnly ? 'POI' : 'System'}: {selectedField.starSystem.name}</p>}
          </>
        ) : <p className="text-xs text-swu-muted">Feld anklicken</p>}
      </div>
    </div>
  );
}