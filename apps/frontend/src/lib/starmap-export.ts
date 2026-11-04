import type { StarmapExportDto } from '@swuniverse/shared';
import { STARMAP_CELL_SIZE } from './starmap-render';

/** A fresh data-only canvas: no viewport, textures, sensors or spacecraft. */
export async function createStarmapPng(data: StarmapExportDto): Promise<Blob> {
  if (data.fields.length === 0) throw new Error('Noch keine Felder erkundet.');
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const field of data.fields) {
    minX = Math.min(minX, field.cx);
    maxX = Math.max(maxX, field.cx);
    minY = Math.min(minY, field.cy);
    maxY = Math.max(maxY, field.cy);
  }
  const columns = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const heading = 60;
  // Keep both edges within 4096px (and the area within 16MP), including on Safari.
  const cellSize = Math.min(STARMAP_CELL_SIZE, 4096 / columns, (4096 - heading) / rows);
  const canvas = document.createElement('canvas');
  try {
    canvas.width = Math.ceil(columns * cellSize);
    canvas.height = Math.ceil(rows * cellSize) + heading;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Der Browser unterstützt keinen Bildexport.');
    context.fillStyle = '#080818';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e2e8f0';
    context.font = '12px sans-serif';
    context.fillText(data.layer.name, 4, 18, canvas.width - 8);
    context.font = '10px sans-serif';
    context.fillText(`${minX}|${minY} – ${maxX}|${maxY}`, 4, 34, canvas.width - 8);
    context.fillText(cellSize < 12 ? '■ Eigene Kolonie' : '★ System · ⌂ Eigene Kolonie', 4, 50, canvas.width - 8);
    const colonies = new Map<string, string[]>();
    for (const colony of data.colonies) {
      const key = `${colony.cx}:${colony.cy}`;
      colonies.set(key, [...(colonies.get(key) ?? []), colony.name]);
    }
    for (const field of data.fields) {
      const x = (field.cx - minX) * cellSize;
      const y = (field.cy - minY) * cellSize + heading;
      context.fillStyle = '#1e293b';
      context.fillRect(x, y, cellSize, cellSize);
      const names = colonies.get(`${field.cx}:${field.cy}`);
      if (cellSize < 12) {
        if (names) {
          context.fillStyle = '#e2e8f0';
          context.fillRect(x + cellSize / 4, y + cellSize / 4, cellSize / 2, cellSize / 2);
        }
        continue;
      }
      context.strokeStyle = '#64748b';
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      context.fillStyle = '#e2e8f0';
      context.font = '8px sans-serif';
      context.fillText(field.fieldType.name || field.fieldType.key, x + 2, y + 9, cellSize - 4);
      if (field.starSystem) {
        context.fillText('★', x + 2, y + 18);
        context.fillText(field.starSystem.name, x + 10, y + 18, cellSize - 12);
      }
      if (names) {
        context.fillText('⌂', x + 2, y + 27);
        context.fillText(names.join(', '), x + 10, y + 27, cellSize - 12);
      }
    }
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG konnte nicht erstellt werden.')), 'image/png');
    });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    canvas.remove();
  }
}

export function downloadStarmapBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Browsers may consume the URL after click() returns.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
