import { useRef, useState } from 'react';
import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';

export function FullMapActions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initStarWars = useFullmapEditorStore((s) => s.initializeDefaultStarWarsGalaxy);
  const initGrid = useFullmapEditorStore((s) => s.initializeLayerGrid);
  const generateSystems = useFullmapEditorStore((s) => s.generateSystemsForLayer);
  const exportLayer = useFullmapEditorStore((s) => s.exportLayer);
  const importLayer = useFullmapEditorStore((s) => s.importLayer);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    fileRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importLayer(text);
    if (fileRef.current) fileRef.current.value = '';
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded border border-swu-border px-2 py-1 text-xs text-swu-text hover:bg-swu-surface"
      >
        Aktionen ▾
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded border border-swu-border bg-[#0d121c] shadow-xl min-w-[220px]">
          <ActionBtn
            label="Star Wars Galaxie initialisieren"
            onClick={async () => {
              if (confirm('Neue Star Wars Galaxie erstellen? (überschreibt bestehenden Default-Layer)')) {
                await initStarWars();
              }
              setOpen(false);
            }}
          />
          <ActionBtn
            label="Grid initialisieren"
            onClick={async () => {
              await initGrid(1);
              setOpen(false);
            }}
          />
          <ActionBtn
            label="Systeme generieren"
            onClick={async () => {
              await generateSystems();
              setOpen(false);
            }}
          />
          <div className="border-t border-swu-border/50" />
          <ActionBtn
            label="Layer exportieren"
            onClick={async () => {
              await exportLayer();
              setOpen(false);
            }}
          />
          <ActionBtn label="Layer importieren" onClick={handleImport} />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => void onFileSelected(e)}
      />
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-3 py-2 text-xs text-swu-text hover:bg-swu-surface/80"
    >
      {label}
    </button>
  );
}
