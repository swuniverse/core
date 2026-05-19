import { useMemo } from 'react';
import { getStuClassLabel } from '@swuniverse/shared';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import {
  planetThumbnail,
  spaceBackgroundTile,
  starTileImage,
} from '../../lib/assets';
import {
  buildStarTileLayers,
  getObjectTypeName,
  getStarTileIdAt,
  getSystemFieldClasses,
  isStarObject,
  OBJECT_TYPE_ICONS,
} from '../../lib/starmap-render';

export function SystemEditor() {
  const {
    sectorFields,
    selectedSystemId,
    systemFields,
    selectedSystemField,
    setSelectedSystemField,
    fieldTypes,
    updateSystemFieldType,
  } = useStarmapAdminStore();

  const selectedSystem = useMemo(() => {
    if (!selectedSystemId) return null;
    return (
      sectorFields.find((f) => f.starSystem?.id === selectedSystemId)
        ?.starSystem ?? null
    );
  }, [sectorFields, selectedSystemId]);

  const systemGrid = useMemo(() => {
    if (!selectedSystem) return null;
    return {
      system: selectedSystem,
      fields: systemFields,
      celestialObjects: systemFields
        .map((field) => field.celestialObject)
        .filter(
          (object): object is NonNullable<typeof object> => object != null,
        )
        .filter(
          (object, index, all) =>
            all.findIndex((entry) => entry.id === object.id) === index,
        ),
    };
  }, [selectedSystem, systemFields]);

  const starTileLayers = useMemo(
    () => buildStarTileLayers(systemGrid),
    [systemGrid],
  );

  if (!selectedSystem || !systemGrid) {
    return (
      <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
          Systemansicht
        </h2>
        <p className="mt-3 text-sm text-swu-muted">
          In der Sektoransicht ein System per Doppelklick oeffnen oder rechts in
          der Systemliste waehlen.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-4 overflow-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
            Sternensystem
          </h2>
          <p className="mt-1 text-xs text-swu-muted">
            {selectedSystem.name} · {selectedSystem.maxX}x{selectedSystem.maxY}{' '}
            Felder · Klick selektiert Systemfeld
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 2xl:flex-row">
        <div
          className="grid gap-px min-w-max rounded border border-swu-border/50 bg-black/30 p-2"
          style={{
            gridTemplateColumns: `40px repeat(${selectedSystem.maxX}, 28px)`,
          }}
        >
          <div className="bg-swu-bg/50 text-xs text-swu-muted flex items-center justify-center">
            x|y
          </div>
          {Array.from({ length: selectedSystem.maxX }, (_, i) => (
            <div
              key={`gx-${i}`}
              className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center"
            >
              {i + 1}
            </div>
          ))}
          {Array.from({ length: selectedSystem.maxY }, (_, row) => {
            const y = row + 1;
            return (
              <div key={`row-${y}`} className="contents">
                <div className="bg-swu-bg/50 text-[10px] text-swu-muted flex items-center justify-center">
                  {y}
                </div>
                {Array.from({ length: selectedSystem.maxX }, (_, col) => {
                  const x = col + 1;
                  const field = systemFields.find(
                    (entry) => entry.sx === x && entry.sy === y,
                  );
                  if (!field)
                    return (
                      <div
                        key={`empty-${x}-${y}`}
                        className="h-7 w-7 bg-black"
                      />
                    );

                  const object = field.celestialObject;
                  const starTileId =
                    starTileLayers
                      .map((layer) =>
                        getStarTileIdAt(
                          layer.config,
                          field.sx,
                          field.sy,
                          layer.center.x,
                          layer.center.y,
                        ),
                      )
                      .find((tileId): tileId is number => tileId !== null) ??
                    null;
                  const hasImage = object?.classId != null && !starTileId;
                  const fallbackLabel =
                    !starTileId && object
                      ? OBJECT_TYPE_ICONS[object.objectType] || '●'
                      : !starTileId &&
                          field.fieldType.key === 'ASTEROID_CLUSTER'
                        ? '·'
                        : '';
                  const isSelected = selectedSystemField?.id === field.id;

                  return (
                    <button
                      key={field.id}
                      onClick={() => setSelectedSystemField(field)}
                      className={[
                        'relative h-7 w-7 rounded-sm border-0 flex items-center justify-center text-[10px] overflow-hidden',
                        starTileId
                          ? ''
                          : getSystemFieldClasses(field.fieldType.key),
                        isSelected ? 'ring-2 ring-swu-accent z-10' : '',
                      ].join(' ')}
                      style={{
                        backgroundImage: `url(${spaceBackgroundTile(field.sx, field.sy)})`,
                        backgroundSize: 'cover',
                      }}
                      title={`${field.sx},${field.sy} · ${field.fieldType.name}${object ? ` · ${object.name || getObjectTypeName(object.objectType, object.classId)}` : ''}`}
                    >
                      {starTileId ? (
                        <img
                          src={starTileImage(starTileId)}
                          alt=""
                          className="absolute inset-0 w-full h-full"
                        />
                      ) : hasImage ? (
                        <img
                          src={planetThumbnail(object!.classId!)}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        fallbackLabel
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="min-w-72 max-w-sm space-y-3">
          {selectedSystemField ? (
            <div className="rounded border border-swu-border/60 bg-swu-bg/40 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-swu-muted">
                Systemfeld bearbeiten
              </h3>
              <div className="mt-2 space-y-1 text-xs text-swu-muted">
                <p>
                  Position: [{selectedSystemField.sx}, {selectedSystemField.sy}]
                </p>
                <p>Typ: {selectedSystemField.fieldType.name}</p>
                {selectedSystemField.celestialObject && (
                  <p className="text-swu-primary">
                    Objekt:{' '}
                    {selectedSystemField.celestialObject.name ||
                      `Klasse ${getStuClassLabel(selectedSystemField.celestialObject.classId)}`}
                  </p>
                )}
              </div>
              <label className="mt-3 block text-xs text-swu-muted">
                System FieldType
                <select
                  value={selectedSystemField.fieldTypeId}
                  onChange={(e) =>
                    void updateSystemFieldType(
                      selectedSystemField.id,
                      Number(e.target.value),
                    )
                  }
                  className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-text"
                >
                  {fieldTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} ({ft.key})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="rounded border border-swu-border/60 bg-swu-bg/40 p-3 text-sm text-swu-muted">
              Systemfeld anklicken, um es zu bearbeiten.
            </p>
          )}

          <div className="rounded border border-swu-border/60 bg-swu-bg/40 p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-swu-muted">
              Objekte
            </h3>
            <div className="mt-2 space-y-1">
              {systemGrid.celestialObjects?.map((object) => (
                <div
                  key={object.id}
                  className="flex items-center gap-2 rounded border border-swu-border/50 bg-swu-bg/60 p-1.5"
                >
                  {object.classId != null && !isStarObject(object.classId) ? (
                    <img
                      src={planetThumbnail(object.classId)}
                      alt=""
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center text-sm">
                      {isStarObject(object.classId)
                        ? '✦'
                        : OBJECT_TYPE_ICONS[object.objectType] || '?'}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-swu-primary">
                      {object.name ||
                        getObjectTypeName(object.objectType, object.classId)}
                    </p>
                    <p className="text-[10px] text-swu-muted">
                      {getObjectTypeName(object.objectType, object.classId)} · [
                      {object.posX},{object.posY}]
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
