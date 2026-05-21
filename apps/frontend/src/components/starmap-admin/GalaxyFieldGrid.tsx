import { useEffect, useMemo, useRef, useState } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import {
  spaceBackgroundTile,
  starWarsMarkerImage,
  systemTypeImage,
} from '../../lib/assets';
import { HyperspaceRouteOverlay } from '../starmap/HyperspaceRouteOverlay';
import { getGalaxyFieldClasses } from './utils';

export function GalaxyFieldGrid() {
  const {
    layers,
    selectedLayerId,
    sectors,
    selectedSector,
    sectorFields,
    selectedField,
    setSelectedField,
    selectedFieldIds,
    toggleFieldSelection,
    brushMode,
    openSystem,
    hyperspaceRoutes,
    selectSector,
  } = useStarmapAdminStore();
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const [hiddenRouteIds, setHiddenRouteIds] = useState<number[]>([]);
  const selectedLayer =
    layers.find((entry) => entry.id === selectedLayerId) ?? null;
  const visibleHyperspaceRoutes = useMemo(
    () =>
      hyperspaceRoutes.filter((route) => !hiddenRouteIds.includes(route.id)),
    [hiddenRouteIds, hyperspaceRoutes],
  );

  const sectorByCoord = useMemo(
    () =>
      new Map(
        sectors.map((sector) => [
          `${sector.sectorX},${sector.sectorY}`,
          sector,
        ]),
      ),
    [sectors],
  );

  const getNeighborSector = (dx: number, dy: number) => {
    if (!selectedSector) return null;
    return (
      sectorByCoord.get(
        `${selectedSector.sectorX + dx},${selectedSector.sectorY + dy}`,
      ) ?? null
    );
  };

  const currentSectorNumber =
    selectedSector && selectedLayer
      ? selectedSector.sectorY *
          Math.ceil(selectedLayer.width / selectedLayer.sectorSize) +
        selectedSector.sectorX +
        1
      : 0;

  const renderSectorNavigation = () => {
    const north = getNeighborSector(0, -1);
    const west = getNeighborSector(-1, 0);
    const east = getNeighborSector(1, 0);
    const south = getNeighborSector(0, 1);
    const navButtonClass =
      'h-8 w-12 border border-swu-border bg-swu-bg/70 text-swu-primary disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:border-swu-accent enabled:hover:text-swu-accent';

    return (
      <div className="grid grid-cols-3 gap-px rounded border border-swu-border bg-black/40 p-1 text-center text-xs">
        <div />
        <button
          className={navButtonClass}
          disabled={!north}
          onClick={() => north && void selectSector(north)}
          title="Sektor nördlich"
        >
          ∧
        </button>
        <div />
        <button
          className={navButtonClass}
          disabled={!west}
          onClick={() => west && void selectSector(west)}
          title="Sektor westlich"
        >
          &lt;
        </button>
        <div className="flex h-8 w-12 items-center justify-center border border-swu-border bg-black text-swu-primary">
          {currentSectorNumber}
        </div>
        <button
          className={navButtonClass}
          disabled={!east}
          onClick={() => east && void selectSector(east)}
          title="Sektor östlich"
        >
          &gt;
        </button>
        <div />
        <button
          className={navButtonClass}
          disabled={!south}
          onClick={() => south && void selectSector(south)}
          title="Sektor südlich"
        >
          ∨
        </button>
        <div />
      </div>
    );
  };

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedField?.id]);

  const handleClick = (
    field: (typeof sectorFields)[0],
    e: React.MouseEvent,
  ) => {
    if (brushMode === 'brush' || e.shiftKey) {
      toggleFieldSelection(field.id, true);
      return;
    }
    setSelectedField(field);
  };

  if (!selectedSector) {
    return (
      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
          Sektor
        </h2>
        <p className="mt-3 text-sm text-swu-muted">
          Sektor in der Kartenuebersicht auswaehlen.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Sektoransicht
          </h2>
          <p className="mt-1 text-xs text-swu-muted">
            Sektor [{selectedSector.sectorX + 1}, {selectedSector.sectorY + 1}]
            · {sectorFields.length} Felder
          </p>
        </div>
        <div className="flex items-start gap-3">
          {selectedField && (
            <div className="rounded border border-swu-border bg-swu-bg/60 px-2 py-1 text-xs text-swu-muted">
              Feld [{selectedField.cx}, {selectedField.cy}] ·{' '}
              {selectedField.fieldType?.name}
            </div>
          )}
          {renderSectorNavigation()}
        </div>
      </div>

      {hyperspaceRoutes.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-swu-border/60 bg-swu-bg/30 px-3 py-2 text-xs text-swu-muted">
          <span className="font-semibold text-swu-primary">Hyperrouten</span>
          {hyperspaceRoutes.map((route) => (
            <label key={route.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={!hiddenRouteIds.includes(route.id)}
                onChange={(event) => {
                  setHiddenRouteIds((current) =>
                    event.target.checked
                      ? current.filter((id) => id !== route.id)
                      : [...current, route.id],
                  );
                }}
              />
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ backgroundColor: route.color }}
              />
              <span>{route.name}</span>
            </label>
          ))}
        </div>
      )}

      <div className="min-w-max rounded border border-swu-border/50 bg-black/30 p-2">
        <div className="relative" style={{ width: '600px' }}>
          {selectedLayer && (
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: '40px',
                top: '28px',
                width: '560px',
                height: '560px',
              }}
            >
              <HyperspaceRouteOverlay
                layer={selectedLayer}
                routes={visibleHyperspaceRoutes}
                renderMode="sector"
                cellSize={28}
                widthPx={560}
                heightPx={560}
                bounds={{
                  minX: selectedSector.minX,
                  maxX: selectedSector.maxX,
                  minY: selectedSector.minY,
                  maxY: selectedSector.maxY,
                }}
              />
            </div>
          )}
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: '40px repeat(20, 28px)' }}
          >
            <div className="bg-swu-bg/50 text-xs text-swu-muted flex h-7 items-center justify-center">
              x|y
            </div>
            {Array.from({ length: 20 }, (_, index) => (
              <div
                key={`gx-${index}`}
                className="bg-swu-bg/50 text-[10px] text-swu-muted flex h-7 items-center justify-center"
              >
                {index + 1}
              </div>
            ))}
            {Array.from({ length: 20 }, (_, row) => {
              const localY = row + 1;
              return (
                <div key={`row-${localY}`} className="contents">
                  <div className="bg-swu-bg/50 text-[10px] text-swu-muted flex h-7 items-center justify-center">
                    {localY}
                  </div>
                  {Array.from({ length: 20 }, (_, col) => {
                    const localX = col + 1;
                    const field = sectorFields.find((entry) => {
                      const expectedX = selectedSector.minX + col;
                      const expectedY = selectedSector.minY + row;
                      return entry.cx === expectedX && entry.cy === expectedY;
                    });
                    if (!field)
                      return (
                        <div
                          key={`empty-${localX}-${localY}`}
                          className="h-7 w-7 bg-black"
                        />
                      );

                    const isSelected = selectedField?.id === field.id;
                    const isBulkSelected = selectedFieldIds.includes(field.id);
                    const systemAsset = field.starSystem
                      ? field.starSystem.isMapOnly
                        ? starWarsMarkerImage(
                            field.starSystem.landmarkKey,
                            field.starSystem.systemTypeId,
                          )
                        : systemTypeImage(field.starSystem.systemTypeId)
                      : field.systemTypeId
                        ? systemTypeImage(field.systemTypeId)
                        : null;

                    return (
                      <button
                        key={field.id}
                        ref={isSelected ? selectedRef : null}
                        onClick={(event) => handleClick(field, event)}
                        onDoubleClick={() =>
                          field.starSystem &&
                          !field.starSystem.isMapOnly &&
                          void openSystem(field.starSystem.id)
                        }
                        className={[
                          getGalaxyFieldClasses(field, isSelected),
                          isBulkSelected ? 'ring-2 ring-amber-400/80' : '',
                        ].join(' ')}
                        style={{
                          backgroundImage: `url(${spaceBackgroundTile(field.cx, field.cy)})`,
                          backgroundSize: 'cover',
                        }}
                        title={`${field.cx},${field.cy} · ${field.fieldType?.name ?? 'unknown'}${field.starSystem ? ` · ${field.starSystem.name}${field.starSystem.isMapOnly ? ' · Kartenmarker' : ' (Doppelklick: öffnen)'}` : ''}`}
                      >
                        {systemAsset ? (
                          <img
                            src={systemAsset}
                            alt=""
                            className={[
                              'object-contain',
                              field.starSystem?.isMapOnly
                                ? 'm-auto h-3.5 w-3.5 opacity-80 drop-shadow-[0_0_4px_rgba(250,204,21,0.65)]'
                                : 'h-full w-full',
                            ].join(' ')}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : field.fieldType.key === 'ASTEROID_CLUSTER' ? (
                          <span className="text-stone-300">·</span>
                        ) : null}
                        {field.starSystem && (
                          <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-0.5 text-[8px] text-amber-200">
                            {field.starSystem.isMapOnly ? '◇' : '★'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-swu-muted">
        Klick selektiert ein Feld zur Bearbeitung. Doppelklick auf ein System
        öffnet die Systemansicht.
      </p>
    </section>
  );
}
