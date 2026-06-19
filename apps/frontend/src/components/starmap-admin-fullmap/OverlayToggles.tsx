import { useFullmapEditorStore, type OverlayFlags } from '../../stores/fullmap-editor.store';

const OVERLAY_LABELS: { key: keyof OverlayFlags; label: string }[] = [
  { key: 'grid', label: 'Raster' },
  { key: 'regions', label: 'Regionen' },
  { key: 'adminRegions', label: 'Admin-Regionen' },
  { key: 'systemTypes', label: 'Systemtypen' },
  { key: 'impassable', label: 'Unpassierbar' },
  { key: 'borders', label: 'Grenzen' },
  { key: 'effects', label: 'Effekte' },
];

export function OverlayToggles() {
  const overlays = useFullmapEditorStore((s) => s.overlays);
  const setOverlay = useFullmapEditorStore((s) => s.setOverlay);

  return (
    <section className="border-b border-swu-border/50 pb-3">
      <h3 className="font-bold text-xs text-swu-primary mb-2">Ansicht</h3>
      <div className="space-y-1">
        {OVERLAY_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-xs text-swu-text cursor-pointer">
            <input
              type="checkbox"
              checked={overlays[key]}
              onChange={(e) => setOverlay(key, e.target.checked)}
              className="accent-swu-accent"
            />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}
