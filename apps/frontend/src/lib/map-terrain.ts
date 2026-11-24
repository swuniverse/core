import { spaceBackgroundTile, starTileImage } from './assets';

export type TerrainFieldType = {
  id: number;
  key: string;
  category?: string | null;
};

export function isNebulaTerrain(type: TerrainFieldType): boolean {
  return (
    type.category === 'nebula' ||
    type.category === 'system_nebula' ||
    type.key === 'NEBULA' ||
    (type.id >= 100 && type.id <= 184)
  );
}

/** One texture policy for galaxy, inline systems, editor, database and sensors. */
export function terrainAppearance(
  type: TerrainFieldType | undefined,
  x: number,
  y: number,
) {
  if (!type || type.key === 'UNKNOWN')
    return { image: null, alpha: 1, tint: 0xffffff, filter: 'none' };
  if (
    type.key === 'EMPTY_SPACE' ||
    type.key === 'DEEP_SPACE' ||
    type.category === 'space'
  ) {
    return {
      image: spaceBackgroundTile(x, y),
      alpha: 1,
      tint: 0xffffff,
      filter: 'none',
    };
  }
  if (isNebulaTerrain(type)) {
    const canonical = type.id >= 100 && type.id <= 184;
    const level = canonical ? type.id % 10 : 0;
    return {
      image: starTileImage(canonical ? type.id : 100),
      alpha: level === 0 ? 0.58 : level === 1 ? 0.72 : 0.86,
      tint: 0xb7cddd,
      filter: 'saturate(0.75) brightness(0.88)',
    };
  }
  return {
    image: starTileImage(type.id),
    alpha: 1,
    tint: 0xffffff,
    filter: 'none',
  };
}

/** Fade the outside of a cloud, retaining an unbroken interior across tile borders. */
export function nebulaEdgeMask(
  type: TerrainFieldType | undefined,
  neighbors: {
    top?: TerrainFieldType;
    right?: TerrainFieldType;
    bottom?: TerrainFieldType;
    left?: TerrainFieldType;
  },
) {
  if (!type || !isNebulaTerrain(type)) return undefined;
  const edges = [
    neighbors.top,
    neighbors.right,
    neighbors.bottom,
    neighbors.left,
  ].map(
    (neighbor) =>
      !neighbor || neighbor.key === 'UNKNOWN' || !isNebulaTerrain(neighbor),
  );
  const directions = ['to bottom', 'to left', 'to top', 'to right'];
  const masks = edges.flatMap((edge, index) =>
    edge
      ? [`linear-gradient(${directions[index]}, transparent, black 35%)`]
      : [],
  );
  return masks.length
    ? { maskImage: masks.join(', '), maskComposite: 'intersect' }
    : undefined;
}
