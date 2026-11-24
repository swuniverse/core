import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  NebulaDensity,
  NebulaPreviewDto,
  NebulaPreviewMapDto,
  NebulaSettingsDto,
  NebulaTarget,
  StarmapSystemGridDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { planetThumbnail, starTileImage, systemTypeImage } from '../../lib/assets';
import { nebulaEdgeMask, terrainAppearance, type TerrainFieldType } from '../../lib/map-terrain';
import { buildStarTileLayers, calculateRenderedStarAreaSize, getStarTileIdAt, isStarObject } from '../../lib/starmap-render';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';

const DEFAULT_SETTINGS: NebulaSettingsDto = {
  seed: 'swu-nebula-v1',
  target: 'BOTH',
  density: 'BALANCED',
};

function mapKey(map: NebulaPreviewMapDto) {
  return `${map.scope}:${map.id}`;
}

function mapLabel(map: NebulaPreviewMapDto) {
  return map.scope === 'GALAXY' ? `Galaxie — ${map.name}` : `System — ${map.name}`;
}

function changedTypeName(
  fieldTypeId: number,
  fieldTypes: { id: number; name: string }[],
) {
  return fieldTypes.find((fieldType) => fieldType.id === fieldTypeId)?.name ?? `Feldtyp ${fieldTypeId}`;
}

function getTerrainType(
  typeId: number,
  fieldTypes: { id: number; key: string; category: string | null }[],
): TerrainFieldType {
  const fieldType = fieldTypes.find((item) => item.id === typeId);
  return fieldType
    ? { id: fieldType.id, key: fieldType.key, category: fieldType.category }
    : { id: typeId, key: typeId === 1 ? 'EMPTY_SPACE' : '' };
}

function NebulaMapPreview({
  map,
  fieldTypes,
  markChanges,
}: {
  map: NebulaPreviewMapDto;
  fieldTypes: { id: number; name: string; key: string; category: string | null }[];
  markChanges: boolean;
}) {
  const changes = useMemo(() => new Map(map.changes.map((change) => [change.fieldId, change])), [map.changes]);
  const minX = map.fields.length ? Math.min(...map.fields.map((field) => field.x)) : 0;
  const minY = map.fields.length ? Math.min(...map.fields.map((field) => field.y)) : 0;
  const fieldsAt = useMemo(
    () => new Map(map.fields.map((field) => [`${field.x},${field.y}`, field])),
    [map.fields],
  );
  const starTiles = useMemo(() => {
    const tiles = new Map<string, number>();
    if (map.scope !== 'SYSTEM' || map.systemTypeId == null) return tiles;
    const systemGrid: StarmapSystemGridDto = {
      system: {
        id: map.id,
        name: map.name,
        cx: 0,
        cy: 0,
        maxX: map.width,
        maxY: map.height,
        systemTypeId: map.systemTypeId,
      },
      fields: [],
      celestialObjects: map.fields
        .filter((field) => isStarObject(field.objectClassId))
        .map((field) => ({
          id: field.id,
          objectType: 0,
          name: field.label,
          description: null,
          posX: field.x,
          posY: field.y,
          classId: field.objectClassId,
          isColonizable: false,
        })),
    };
    for (const layer of buildStarTileLayers(systemGrid)) {
      const renderedSize = calculateRenderedStarAreaSize(layer.config.gridSize, Math.min(map.width, map.height));
      for (let row = 0; row < renderedSize; row++) {
        for (let col = 0; col < renderedSize; col++) {
          const x = layer.center.x - Math.floor(renderedSize / 2) + col;
          const y = layer.center.y - Math.floor(renderedSize / 2) + row;
          if (x < 1 || y < 1 || x > map.width || y > map.height) continue;
          const tileId = getStarTileIdAt(layer.config, x, y, layer.center.x, layer.center.y);
          if (tileId) tiles.set(`${x},${y}`, tileId);
        }
      }
    }
    return tiles;
  }, [map]);
  const fallbackStarPosition = map.scope === 'SYSTEM' && map.systemTypeId == null
    ? map.fields.find((field) => field.objectClassId === 9001) ??
      map.fields.find((field) => isStarObject(field.objectClassId)) ??
      { x: Math.ceil(map.width / 2), y: Math.ceil(map.height / 2) }
    : null;
  const terrainType = (field: NebulaPreviewMapDto['fields'][number] | undefined): TerrainFieldType | undefined => {
    if (!field) return undefined;
    const typeId = changes.get(field.id)?.fieldTypeId ?? field.fieldTypeId;
    return getTerrainType(typeId, fieldTypes);
  };

  return (
    <div className="max-h-[55vh] overflow-auto rounded border border-swu-border bg-black p-3" aria-label={`${mapLabel(map)} Feldvorschau`}>
      <div
        role="grid"
        aria-label={`${mapLabel(map)} ${map.width} mal ${map.height}`}
        className="w-max"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${map.width}, 28px)`,
          gridTemplateRows: `repeat(${map.height}, 28px)`,
        }}
      >
        {map.fields.map((field) => {
          const change = changes.get(field.id);
          const currentType = getTerrainType(field.fieldTypeId, fieldTypes);
          if (currentType.key === 'UNKNOWN') return null;
          const currentTerrain = terrainAppearance(currentType, field.x, field.y);
          const nextType = change ? getTerrainType(change.fieldTypeId, fieldTypes) : undefined;
          const nextTerrain = change && nextType ? terrainAppearance(nextType, field.x, field.y) : null;
          const finalType = nextType ?? currentType;
          const finalTerrain = nextTerrain ?? currentTerrain;
          const edgeMask = nebulaEdgeMask(finalType, {
            top: terrainType(fieldsAt.get(`${field.x},${field.y - 1}`)),
            right: terrainType(fieldsAt.get(`${field.x + 1},${field.y}`)),
            bottom: terrainType(fieldsAt.get(`${field.x},${field.y + 1}`)),
            left: terrainType(fieldsAt.get(`${field.x - 1},${field.y}`)),
          });
          const marker = field.objectClassId != null && !isStarObject(field.objectClassId)
            ? planetThumbnail(field.objectClassId)
            : field.systemTypeId != null
              ? systemTypeImage(field.systemTypeId)
              : null;
          const starTile = starTiles.get(`${field.x},${field.y}`);
          const fallbackStar = fallbackStarPosition?.x === field.x && fallbackStarPosition.y === field.y;
          const currentName = changedTypeName(field.fieldTypeId, fieldTypes);
          const nextName = change ? changedTypeName(change.fieldTypeId, fieldTypes) : null;
          const ariaLabel = change
            ? `${field.label}, aktuell ${currentName} (ID ${field.fieldTypeId}), Vorschau ${nextName} (ID ${change.fieldTypeId})`
            : `${field.label}, ${currentName} (ID ${field.fieldTypeId})`;

          return (
            <div
              key={field.id}
              role="gridcell"
              aria-label={ariaLabel}
              title={ariaLabel}
              className={`relative h-7 w-7 overflow-hidden border bg-black ${markChanges && change ? 'border-emerald-300/70' : 'border-white/10'}`}
              style={{ gridColumn: field.x - minX + 1, gridRow: field.y - minY + 1 }}
            >
              {finalTerrain.image && (
                <img
                  src={finalTerrain.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ opacity: finalTerrain.alpha, filter: finalTerrain.filter, ...edgeMask }}
                />
              )}
              {starTile != null && (
                <img
                  src={starTileImage(starTile)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {fallbackStar && (
                <img
                  src={systemTypeImage(1001)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 m-auto h-[82%] w-[82%] object-contain drop-shadow-md"
                />
              )}
              {marker && (
                <img
                  src={marker}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 m-auto h-[82%] w-[82%] object-contain drop-shadow-md"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NebulaGeneratorDialog({
  layerId,
  onClose,
}: {
  layerId: number;
  onClose: () => void;
}) {
  // The dialog stays bound to the layer that was selected when it opened.
  const [capturedLayerId] = useState(layerId);
  const fieldTypes = useFullmapEditorStore((state) => state.fieldTypes);
  const loadFields = useFullmapEditorStore((state) => state.loadFields);
  const [settings, setSettings] = useState<NebulaSettingsDto>(DEFAULT_SETTINGS);
  const [preview, setPreview] = useState<NebulaPreviewDto | null>(null);
  const [selectedMap, setSelectedMap] = useState('');
  const [markChanges, setMarkChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    firstControlRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [applying, onClose]);

  const selectedPreviewMap = preview?.maps.find((map) => mapKey(map) === selectedMap) ?? preview?.maps[0] ?? null;
  const canApply = Boolean(
    preview &&
      preview.layerId === capturedLayerId &&
      preview.settings.seed === settings.seed &&
      preview.settings.target === settings.target &&
      preview.settings.density === settings.density &&
      !loading &&
      !applying,
  );

  function updateSettings(patch: Partial<NebulaSettingsDto>) {
    setSettings((current) => ({ ...current, ...patch }));
    requestVersion.current += 1;
    setPreview(null);
    setSelectedMap('');
    setLoading(false);
    setError(null);
    setNotice(null);
  }

  async function requestPreview() {
    const requestId = ++requestVersion.current;
    const requestedSettings = { ...settings, seed: settings.seed.trim() };
    setLoading(true);
    setError(null);
    setNotice(null);
    setPreview(null);
    try {
      const nextPreview = await api.post<NebulaPreviewDto>(
        `/starmap/admin/layers/${capturedLayerId}/nebula/preview`,
        requestedSettings,
      );
      if (requestId !== requestVersion.current) return;
      if (nextPreview.layerId !== capturedLayerId) {
        throw new Error('Die Vorschau gehört zu einem anderen Layer.');
      }
      setPreview(nextPreview);
      setSettings(nextPreview.settings);
      const defaultMap = nextPreview.maps.find((map) => map.scope === 'GALAXY') ?? nextPreview.maps[0];
      setSelectedMap(defaultMap ? mapKey(defaultMap) : '');
    } catch (requestError) {
      if (requestId !== requestVersion.current) return;
      setError(requestError instanceof Error ? requestError.message : 'Vorschau konnte nicht erstellt werden.');
    } finally {
      if (requestId === requestVersion.current) setLoading(false);
    }
  }

  async function applyPreview() {
    if (!preview || !canApply) return;
    const applySettings = { ...preview.settings };
    setApplying(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ changedFields: number }>(
        `/starmap/admin/layers/${capturedLayerId}/nebula/apply`,
        { ...applySettings, fingerprint: preview.fingerprint },
      );
      requestVersion.current += 1;
      setPreview(null);
      setSelectedMap('');
      setNotice(`${result.changedFields} Felder wurden mit Nebelgebieten ergänzt.`);
      await loadFields();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nebelgebiete konnten nicht übernommen werden.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nebula-dialog-title"
        className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded border border-swu-border bg-[#0d121c] p-4 text-swu-text shadow-2xl"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="nebula-dialog-title" className="text-base font-bold text-swu-primary">Nebelgebiete erzeugen</h2>
            <p className="text-xs text-swu-muted">Layer {capturedLayerId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            aria-label="Schließen"
            className="rounded border border-swu-border px-2 py-1 text-xs hover:bg-swu-surface disabled:opacity-40"
          >
            Schließen
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <label className="block text-xs">
            Seed
            <input
              value={settings.seed}
              disabled={applying}
              onChange={(event) => updateSettings({ seed: event.target.value })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs">
            Ziel
            <select
              value={settings.target}
              disabled={applying}
              onChange={(event) => updateSettings({ target: event.target.value as NebulaTarget })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1.5 text-sm"
            >
              <option value="BOTH">Galaxie und Systeme</option>
              <option value="GALAXY">Nur Galaxie</option>
              <option value="SYSTEMS">Nur Systeme</option>
            </select>
          </label>
          <label className="block text-xs">
            Dichte
            <select
              value={settings.density}
              disabled={applying}
              onChange={(event) => updateSettings({ density: event.target.value as NebulaDensity })}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1.5 text-sm"
            >
              <option value="SUBTLE">Dezent</option>
              <option value="BALANCED">Ausgewogen</option>
              <option value="RICH">Reich</option>
            </select>
          </label>
          <button
            ref={firstControlRef}
            type="button"
            onClick={() => void requestPreview()}
            disabled={loading || applying || !settings.seed.trim()}
            className="rounded border border-swu-accent px-3 py-1.5 text-xs text-swu-accent hover:bg-swu-accent/10 disabled:opacity-40"
          >
            {loading ? 'Vorschau wird erstellt…' : 'Vorschau erstellen'}
          </button>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        {notice && <p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}

        {preview && (
          <div className="mt-4 space-y-4">
            <section aria-label="Vorschauzusammenfassung" className="rounded border border-swu-border bg-swu-surface/30 p-3">
              <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span><strong>{preview.summary.changedFields}</strong> geänderte Felder</span>
                <span><strong>{preview.summary.protectedFields}</strong> geschützte Felder</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="text-swu-muted">
                    <tr>
                      <th className="p-1.5">Feldtyp</th>
                      <th className="p-1.5">Felder</th>
                      <th className="p-1.5">Energiekosten</th>
                      <th className="p-1.5">Schaden</th>
                      <th className="p-1.5">Spezialschaden</th>
                      <th className="p-1.5">Ressourcen</th>
                      <th className="p-1.5">Effekte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.summary.byFieldType.map((entry) => (
                      <tr key={entry.id} className="border-t border-swu-border/60 align-top">
                        <th className="p-1.5 font-medium">{entry.name}</th>
                        <td className="p-1.5">{entry.count}</td>
                        <td className="p-1.5">{entry.energyCost}</td>
                        <td className="p-1.5">{entry.damage}</td>
                        <td className="p-1.5">{entry.specialDamage}</td>
                        <td className="p-1.5">
                          {entry.miningResources.length
                            ? entry.miningResources.map((resource) => `Ware ${resource.commodityId}: ${resource.rate}`).join(', ')
                            : '—'}
                        </td>
                        <td className="p-1.5">{entry.effects.length ? entry.effects.join(', ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-2">
              <label className="block max-w-sm text-xs">
                Karte
                <select
                  aria-label="Vorschaukarte"
                  value={selectedPreviewMap ? mapKey(selectedPreviewMap) : ''}
                  onChange={(event) => setSelectedMap(event.target.value)}
                  className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1.5 text-sm"
                >
                  {preview.maps.map((map) => (
                    <option key={mapKey(map)} value={mapKey(map)}>{mapLabel(map)}</option>
                  ))}
                </select>
              </label>
              {selectedPreviewMap
                ? <NebulaMapPreview map={selectedPreviewMap} fieldTypes={fieldTypes} markChanges={markChanges} />
                : <p className="text-sm text-swu-muted">Keine Karten in der Vorschau enthalten.</p>}
              <label className="inline-flex items-center gap-2 text-xs text-swu-muted">
                <input
                  type="checkbox"
                  checked={markChanges}
                  onChange={(event) => setMarkChanges(event.target.checked)}
                />
                Änderungen markieren
              </label>
              <p className="text-xs text-swu-muted">Feldtitel zeigen bei Änderungen aktuellen und geplanten Feldtyp samt ID.</p>
            </section>

          </div>
        )}

        <footer className="mt-4 flex flex-wrap justify-end gap-2 border-t border-swu-border pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded border border-swu-border px-3 py-1.5 text-xs hover:bg-swu-surface disabled:opacity-40"
          >
            Abbrechen
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => void applyPreview()}
              disabled={!canApply}
              className="rounded border border-emerald-500 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40"
            >
              {applying ? 'Wird übernommen…' : 'Nebelgebiete übernehmen'}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
