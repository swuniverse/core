import { useState } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function RegionEditor() {
  const {
    regions, selectedLayerId, createRegion, updateRegion, deleteRegion,
  } = useStarmapAdminStore();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('neutral');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const colorOptions = [
    'neutral', 'rebel', 'empire', 'hutt', 'mandalore', 'trade',
    'core', 'mid-rim', 'outer-rim', 'unknown-regions', 'wild-space',
  ];

  if (!selectedLayerId) return null;

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Regionen</h2>
      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text" />
          <select value={newColor} onChange={e => setNewColor(e.target.value)}
            className="rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text">
            {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => {
            if (!newName.trim()) return;
            void createRegion({ layerId: selectedLayerId, name: newName.trim(), colorKey: newColor });
            setNewName('');
          }}
            disabled={!newName.trim()}
            className="rounded border border-swu-accent px-2 py-1 text-xs text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
            +
          </button>
        </div>

        {regions.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {regions.map(r => (
              <div key={r.id} className="flex items-center gap-2 rounded border border-swu-border/50 px-2 py-1">
                {editingId === r.id ? (
                  <>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text" />
                    <select value={editColor} onChange={e => setEditColor(e.target.value)}
                      className="rounded border border-swu-border bg-swu-bg px-1 py-1 text-xs text-swu-text">
                      {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => { void updateRegion(r.id, { name: editName, colorKey: editColor }); setEditingId(null); }}
                      className="text-xs text-green-300 hover:text-green-200">OK</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-xs text-swu-muted hover:text-swu-text">X</button>
                  </>
                ) : (
                  <>
                    <span className="h-3 w-3 rounded-full border border-swu-border" style={{ background: `var(--region-${r.colorKey}, #555)` }} />
                    <span className="flex-1 text-xs text-swu-text">{r.name}</span>
                    <span className="text-[10px] text-swu-muted">{r.colorKey}</span>
                    <button onClick={() => { setEditingId(r.id); setEditName(r.name); setEditColor(r.colorKey); }}
                      className="text-xs text-swu-muted hover:text-swu-accent">E</button>
                    <button onClick={() => void deleteRegion(r.id)}
                      className="text-xs text-red-400 hover:text-red-300">X</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
