import { useState } from 'react';
import { useStarmapAdminStore } from '../../stores/starmap-admin.store';

export function BorderTypeEditor() {
  const {
    borderTypes, createBorderType, updateBorderType, deleteBorderType,
  } = useStarmapAdminStore();

  const [newName, setNewName] = useState('');
  const [newStyle, setNewStyle] = useState('solid');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editStyle, setEditStyle] = useState('');

  const styleOptions = ['solid', 'dashed', 'dotted', 'double'];

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">Border-Typen</h2>
      <div className="mt-3 space-y-3">
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text" />
          <select value={newStyle} onChange={e => setNewStyle(e.target.value)}
            className="rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text">
            {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => {
            if (!newName.trim()) return;
            void createBorderType({ name: newName.trim(), style: newStyle });
            setNewName('');
          }}
            disabled={!newName.trim()}
            className="rounded border border-swu-accent px-2 py-1 text-xs text-swu-accent enabled:hover:bg-swu-accent/10 disabled:opacity-50">
            +
          </button>
        </div>

        {borderTypes.length > 0 && (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {borderTypes.map(bt => (
              <div key={bt.id} className="flex items-center gap-2 rounded border border-swu-border/50 px-2 py-1">
                {editingId === bt.id ? (
                  <>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-text" />
                    <select value={editStyle} onChange={e => setEditStyle(e.target.value)}
                      className="rounded border border-swu-border bg-swu-bg px-1 py-1 text-xs text-swu-text">
                      {styleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => { void updateBorderType(bt.id, { name: editName, style: editStyle }); setEditingId(null); }}
                      className="text-xs text-green-300 hover:text-green-200">OK</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-xs text-swu-muted hover:text-swu-text">X</button>
                  </>
                ) : (
                  <>
                    <span className="h-3 w-6 border-t-2" style={{ borderStyle: bt.style }} />
                    <span className="flex-1 text-xs text-swu-text">{bt.name}</span>
                    <span className="text-[10px] text-swu-muted">{bt.style}</span>
                    <button onClick={() => { setEditingId(bt.id); setEditName(bt.name); setEditStyle(bt.style); }}
                      className="text-xs text-swu-muted hover:text-swu-accent">E</button>
                    <button onClick={() => void deleteBorderType(bt.id)}
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
