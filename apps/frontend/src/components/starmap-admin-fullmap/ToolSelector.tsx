import { useFullmapEditorStore, type ToolMode } from '../../stores/fullmap-editor.store';

const TOOLS: { mode: ToolMode; label: string }[] = [
  { mode: 'select', label: 'Nur Auswahl' },
  { mode: 'fieldType', label: 'Feldtyp' },
  { mode: 'systemType', label: 'Systemtyp' },
  { mode: 'region', label: 'Region' },
  { mode: 'adminRegion', label: 'Admin-Region' },
  { mode: 'passable', label: 'Passierbar' },
  { mode: 'border', label: 'Grenze' },
  { mode: 'effects', label: 'Effekte' },
];

export function ToolSelector() {
  const tool = useFullmapEditorStore((s) => s.tool);
  const setTool = useFullmapEditorStore((s) => s.setTool);
  const rectSelect = useFullmapEditorStore((s) => s.rectSelect);
  const setRectSelect = useFullmapEditorStore((s) => s.setRectSelect);
  const selectedFieldIds = useFullmapEditorStore((s) => s.selectedFieldIds);
  const applyToSelection = useFullmapEditorStore((s) => s.applyToSelection);

  return (
    <section className="border-b border-swu-border/50 pb-3">
      <h3 className="font-bold text-xs text-swu-primary mb-2">Werkzeug</h3>
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map(({ mode, label }) => (
          <label key={mode} className="flex items-center gap-1.5 text-xs text-swu-text cursor-pointer">
            <input
              type="radio"
              name="tool"
              checked={tool === mode}
              onChange={() => setTool(mode)}
              className="accent-swu-accent"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-2 text-xs text-swu-muted">
        {tool === 'select' ? 'Nur Feldauswahl' : `Modus: ${TOOLS.find((t) => t.mode === tool)?.label}`}
      </div>
      <label className="flex items-center gap-2 mt-2 text-xs text-swu-text cursor-pointer">
        <input
          type="checkbox"
          checked={rectSelect}
          onChange={(e) => setRectSelect(e.target.checked)}
          className="accent-swu-accent"
        />
        Rechteckauswahl
      </label>
      {selectedFieldIds.length > 0 && (
        <button
          onClick={() => void applyToSelection()}
          className="mt-2 rounded border border-swu-accent px-2 py-1 text-xs text-swu-accent hover:bg-swu-accent/10"
        >
          Auf Auswahl anwenden ({selectedFieldIds.length})
        </button>
      )}
    </section>
  );
}
