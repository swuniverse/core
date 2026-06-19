import { useState } from 'react';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';

export function LayerCreateDialog({ onClose }: { onClose: () => void }) {
  const createLayer = useFullmapEditorStore((s) => s.createLayer);
  const [name, setName] = useState('New Galaxy');
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(120);
  const [sectorSize, setSectorSize] = useState(20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLayer({ name, width, height, sectorSize });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded border border-swu-border bg-[#0d121c] p-4 space-y-3 w-80"
      >
        <h3 className="text-sm font-bold text-swu-primary">Neuen Layer erstellen</h3>

        <label className="block text-xs text-swu-text">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-sm text-swu-text"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs text-swu-text">
            Breite
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-sm text-swu-text"
            />
          </label>
          <label className="block text-xs text-swu-text">
            Höhe
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-sm text-swu-text"
            />
          </label>
          <label className="block text-xs text-swu-text">
            Sektor
            <input
              type="number"
              value={sectorSize}
              onChange={(e) => setSectorSize(Number(e.target.value))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-surface px-2 py-1 text-sm text-swu-text"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-swu-border px-3 py-1 text-xs text-swu-text hover:bg-swu-surface"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded border border-swu-accent px-3 py-1 text-xs text-swu-accent hover:bg-swu-accent/10"
          >
            Erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
