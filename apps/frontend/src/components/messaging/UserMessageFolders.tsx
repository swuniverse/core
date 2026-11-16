import { useState } from 'react';
import { api } from '../../services/api';
export interface UserMessageFolder {
  id: number;
  name: string;
  sortOrder: number;
}
export function UserMessageFolders({
  folders,
  activeId,
  onSelect,
  onRefresh,
  moveIds,
  onMoved,
}: {
  folders: UserMessageFolder[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
  onRefresh: () => Promise<void>;
  moveIds: number[];
  onMoved: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await onRefresh();
    } catch {
      setError('Ordneraktion fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-3 rounded-lg border border-swu-border bg-swu-surface p-3 text-xs">
      <h2 className="font-bold text-swu-primary">Eigene Ordner</h2>
      {error && <p role="alert">{error}</p>}
      <ul>
        {folders.map((folder, i) => (
          <li key={folder.id} className="my-2">
            <button
              type="button"
              aria-pressed={activeId === folder.id}
              onClick={() => onSelect(folder.id)}
            >
              {folder.name}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || i === 0}
                aria-label={`${folder.name} nach oben`}
                onClick={() =>
                  void run(() =>
                    api.post(`/messages/user-folders/${folder.id}/sort`, {
                      direction: 'up',
                    }),
                  )
                }
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || i === folders.length - 1}
                aria-label={`${folder.name} nach unten`}
                onClick={() =>
                  void run(() =>
                    api.post(`/messages/user-folders/${folder.id}/sort`, {
                      direction: 'down',
                    }),
                  )
                }
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(folder.id);
                  setName(folder.name);
                }}
              >
                Umbenennen
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`${folder.name} löschen (Nachrichten bleiben erhalten)`}
                onClick={() =>
                  void run(async () => {
                    await api.delete(`/messages/user-folders/${folder.id}`);
                    if (activeId === folder.id) onSelect(null);
                  })
                }
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (editing !== null)
              await api.patch(`/messages/user-folders/${editing}`, { name });
            else await api.post('/messages/user-folders', { name });
            setName('');
            setEditing(null);
          });
        }}
      >
        <label>
          Ordnername
          <input
            className="w-full bg-swu-bg border border-swu-border p-1"
            value={name}
            maxLength={40}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button disabled={busy || !name.trim()} type="submit">
          {editing === null ? 'Ordner anlegen' : 'Name speichern'}
        </button>
        {editing !== null && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setName('');
            }}
          >
            Abbrechen
          </button>
        )}
      </form>
      {moveIds.length > 0 && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.post('/messages/user-folders/move', {
                ids: moveIds,
                folderId: target === '' ? null : Number(target),
              });
              await onMoved();
            });
          }}
        >
          <label>
            Verschieben nach
            <select
              className="w-full bg-swu-bg border border-swu-border"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Persönlich</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy}>
            {moveIds.length} Nachricht(en) verschieben
          </button>
        </form>
      )}
    </section>
  );
}
