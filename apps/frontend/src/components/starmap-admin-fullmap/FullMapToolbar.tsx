import { useRef, useState } from 'react';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';
import { LayerCreateDialog } from './LayerCreateDialog';
import { FullMapActions } from './FullMapActions';

export function FullMapToolbar() {
  const layers = useFullmapEditorStore((s) => s.layers);
  const selectedLayerId = useFullmapEditorStore((s) => s.selectedLayerId);
  const selectLayer = useFullmapEditorStore((s) => s.selectLayer);
  const loadFields = useFullmapEditorStore((s) => s.loadFields);
  const deleteSelectedLayer = useFullmapEditorStore((s) => s.deleteSelectedLayer);
  const status = useFullmapEditorStore((s) => s.status);

  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-swu-border bg-[#0d121c] flex-wrap">
      <select
        value={selectedLayerId ?? ''}
        onChange={(e) => void selectLayer(Number(e.target.value))}
        className="rounded border border-swu-border bg-swu-surface px-2 py-1 text-sm text-swu-text"
      >
        {layers.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      <button
        onClick={() => setShowCreate(true)}
        className="rounded border border-green-600 px-2 py-1 text-xs text-green-300 hover:bg-green-950/40"
        title="Neuer Layer"
      >
        + Layer
      </button>

      <button
        onClick={() => {
          if (confirm('Layer wirklich löschen?')) void deleteSelectedLayer();
        }}
        disabled={!selectedLayerId || layers.length <= 1}
        className="rounded border border-red-600 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
        title="Layer löschen"
      >
        Löschen
      </button>

      <FullMapActions />

      <button
        onClick={() => void loadFields()}
        className="rounded border border-swu-border px-2 py-1 text-xs text-swu-text hover:bg-swu-surface"
      >
        Neu laden
      </button>

      {status && <span className="text-xs text-swu-muted">{status}</span>}

      {showCreate && <LayerCreateDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
