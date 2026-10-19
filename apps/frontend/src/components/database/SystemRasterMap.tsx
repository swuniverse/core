import { Fragment } from 'react';
import { PlanetImg } from '../PlanetImg';
import { spaceBackgroundTile, starTileImage } from '../../lib/assets';
import { getSystemFieldStyle } from '../spacecraft/field-styles';
import {
  buildStarTileLayers,
  getStarTileIdAt,
  isStarObject,
} from '../../lib/starmap-render';

export type SystemRasterField = {
  id: number;
  sx: number;
  sy: number;
  fieldType: { id: number; key: string; name: string };
  celestialObject: {
    id: number;
    objectType: number;
    name: string | null;
    description: string | null;
    posX: number;
    posY: number;
    classId: number | null;
    isColonizable: boolean;
  } | null;
};

export type SystemRasterDetail = {
  systemTypeId: number;
  maxX: number;
  maxY: number;
  fields: SystemRasterField[];
};

const OBJECT_TYPE_LABELS: Record<number, string> = {
  1: 'Planet',
  2: 'Mond',
  3: 'Asteroidenfeld',
};

const CELL_SIZE = 40;

export function SystemRasterMap({
  detail,
  selectedFieldId,
  onSelectField,
}: {
  detail: SystemRasterDetail;
  selectedFieldId: number | null;
  onSelectField: (fieldId: number) => void;
}) {
  const fieldsByCoordinate = new Map(
    detail.fields.map((field) => [`${field.sx}:${field.sy}`, field]),
  );
  const starLayers = buildStarTileLayers({
    system: {
      id: 0,
      name: '',
      cx: 0,
      cy: 0,
      maxX: detail.maxX,
      maxY: detail.maxY,
      systemTypeId: detail.systemTypeId,
      systemTypeName: '',
      isLandmark: false,
      isMapOnly: false,
      landmarkKey: null,
      landmarkCategory: null,
    },
    fields: [],
    celestialObjects: detail.fields.flatMap((field) =>
      field.celestialObject ? [field.celestialObject] : [],
    ),
  });
  const xValues = Array.from({ length: detail.maxX }, (_, index) => index + 1);
  const yValues = Array.from({ length: detail.maxY }, (_, index) => index + 1);

  return (
    <div
      aria-label="Kartographische Systemkarte"
      className="overflow-auto border border-swu-border bg-black/50"
    >
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `40px repeat(${detail.maxX}, ${CELL_SIZE}px)`,
        }}
      >
        <div className="sticky left-0 top-0 z-20 flex items-center justify-center border-b border-r border-swu-border bg-swu-bg text-xs font-bold text-swu-muted">
          x|y
        </div>
        {xValues.map((x) => (
          <div
            key={`header-x-${x}`}
            className="sticky top-0 z-10 flex h-10 items-center justify-center border-b border-r border-swu-border bg-swu-bg text-xs font-bold text-swu-muted"
          >
            {x}
          </div>
        ))}

        {yValues.map((y) => (
          <Fragment key={`row-${y}`}>
            <div className="sticky left-0 z-10 flex items-center justify-center border-b border-r border-swu-border bg-swu-bg text-xs font-bold text-swu-muted">
              {y}
            </div>
            {xValues.map((x) => {
              const field = fieldsByCoordinate.get(`${x}:${y}`);
              const object = field?.celestialObject;
              const starTileId = starLayers
                .map((layer) =>
                  getStarTileIdAt(layer.config, x, y, layer.center.x, layer.center.y),
                )
                .find((tileId): tileId is number => tileId != null);
              const isStar = object ? isStarObject(object.classId) : false;
              const showStarTile = starTileId != null && (!object || isStar);
              const fieldType = field?.fieldType;
              const label = field
                ? `Feld ${x}:${y}: ${object?.name ?? fieldType?.name ?? 'Unbekannt'}`
                : `Feld ${x}:${y}: Unkartographiertes Rasterfeld`;

              return (
                <button
                  key={`${x}:${y}`}
                  type="button"
                  disabled={!field}
                  onClick={() => field && onSelectField(field.id)}
                  aria-label={label}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  className={[
                    'relative flex items-center justify-center overflow-hidden border-b border-r text-xs',
                    getSystemFieldStyle(
                      showStarTile ? 'EMPTY_SPACE' : fieldType?.key,
                    ),
                    selectedFieldId === field?.id
                      ? 'ring-2 ring-inset ring-swu-accent z-10'
                      : '',
                    !field ? 'cursor-default opacity-50' : 'hover:brightness-125',
                  ].join(' ')}
                >
                  {!showStarTile && !object && (
                    <img
                      src={
                        fieldType?.key === 'EMPTY_SPACE' ||
                        fieldType?.key === 'DEEP_SPACE'
                          ? spaceBackgroundTile(x, y)
                          : starTileImage(fieldType?.id ?? 1)
                      }
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-90"
                    />
                  )}
                  {showStarTile && (
                    <img
                      src={starTileImage(starTileId)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {object && !isStar && object.objectType === 3 && (
                    <span className="relative z-10 text-xl">☄️</span>
                  )}
                  {object &&
                    !isStar &&
                    object.objectType !== 3 &&
                    object.classId != null && (
                      <PlanetImg
                        classId={object.classId}
                        name={object.name}
                        objectType={object.objectType}
                        thumbnail
                        className="relative z-10 h-8 w-8 object-contain"
                        emojiClassName="relative z-10 text-2xl"
                      />
                    )}
                  {object &&
                    !isStar &&
                    object.objectType !== 3 &&
                    object.classId == null && (
                      <span className="relative z-10 text-xl">●</span>
                    )}
                  {!object && fieldType?.key === 'ASTEROID_CLUSTER' && (
                    <span className="relative z-10 text-xl">☄️</span>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function celestialObjectTypeLabel(objectType: number): string {
  return OBJECT_TYPE_LABELS[objectType] ?? 'Himmelskörper';
}
