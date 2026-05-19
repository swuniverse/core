const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || '/assets';

const PNG_PLANET_IMAGES = new Set([
  701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718,
]);

const PNG_PLANET_THUMBNAILS = new Set([
  701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718,
]);

function planetAssetExtension(
  classId: number,
  thumbnail = false,
): 'gif' | 'png' {
  const pngSet = thumbnail ? PNG_PLANET_THUMBNAILS : PNG_PLANET_IMAGES;
  return pngSet.has(classId) ? 'png' : 'gif';
}

export function planetImage(classId: number): string {
  return `${ASSET_BASE}/planets/${classId}.${planetAssetExtension(classId)}`;
}

export function planetThumbnail(classId: number): string {
  return `${ASSET_BASE}/planets/${classId}s.${planetAssetExtension(classId, true)}`;
}

export function shipImage(shipClassId: number): string {
  return `${ASSET_BASE}/ships/${shipClassId}.png`;
}

export function commodityImage(commodityId: number): string {
  return `${ASSET_BASE}/commodities/${commodityId}.png`;
}

export function researchImage(techId: number): string {
  return `${ASSET_BASE}/research/${techId}.png`;
}

export function spaceBackgroundTile(cx: number, cy: number): string {
  const row = String((Math.abs(cy) % 40) + 1).padStart(2, '0');
  const col = String((Math.abs(cx) % 40) + 1).padStart(2, '0');
  return `${ASSET_BASE}/map/starmap/${row}${col}.png`;
}

export function systemTypeImage(systemTypeId: number): string {
  return `${ASSET_BASE}/map/systemtypes/${systemTypeId}.png`;
}

export function starTileImage(fieldTypeId: number): string {
  return `${ASSET_BASE}/map/${fieldTypeId}.png`;
}
