import { useEffect, useRef, useState } from 'react';
import type { NoteDto, SaveNoteRequest } from '@swuniverse/shared';
import { api } from '../services/api';

const SAVE_DELAY_MS = 600;
const validTitle = (title: string) =>
  Array.from(title).length >= 1 && Array.from(title).length <= 100;
const inputClass =
  'block w-full bg-transparent border border-swu-border rounded p-2 text-xs text-swu-primary';
const buttonClass =
  'border border-swu-border rounded px-3 py-1 text-xs text-swu-primary disabled:opacity-40';

function NoteEditor({
  note,
  creating,
  busy,
  saveQueues,
  deletedIds,
  onChange,
  onSaved,
  onCreate,
}: {
  saveQueues: Map<number, Promise<void>>;
  deletedIds: Set<number>;
  note: NoteDto;
  creating: boolean;
  busy: boolean;
  onChange: (input: SaveNoteRequest) => void;
  onSaved: (saved: NoteDto) => void;
  onCreate: () => void;
}) {
  const [status, setStatus] = useState('');
  const latest = useRef({ title: note.title, text: note.text });
  const dirty = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  function save() {
    if (
      deletedIds.has(note.id) ||
      !dirty.current ||
      !validTitle(latest.current.title)
    )
      return;
    const input = { ...latest.current };
    dirty.current = false;
    const queued = (saveQueues.get(note.id) ?? Promise.resolve()).then(
      async () => {
        if (deletedIds.has(note.id)) return;
        try {
          const saved = await api.patch<NoteDto>(
            `/user/notes/${note.id}`,
            input,
          );
          onSavedRef.current(saved);
          if (
            mounted.current &&
            !dirty.current &&
            latest.current.title === input.title &&
            latest.current.text === input.text
          ) {
            setStatus('Gespeichert');
          }
        } catch {
          if (
            latest.current.title === input.title &&
            latest.current.text === input.text
          )
            dirty.current = true;
          if (mounted.current) setStatus('Speichern fehlgeschlagen');
        }
      },
    );
    saveQueues.set(note.id, queued);
  }
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (!creating) saveRef.current();
    };
  }, [creating]);

  function change(input: SaveNoteRequest) {
    latest.current = input;
    onChange(input);
    if (creating) return;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (!validTitle(input.title)) {
      setStatus('');
      return;
    }
    setStatus('Speichert...');
    timer.current = setTimeout(() => saveRef.current(), SAVE_DELAY_MS);
  }

  return (
    <section className="bg-swu-surface border border-swu-border rounded p-3 space-y-3">
      <label className="block text-xs text-swu-muted">
        Titel
        <input
          className={inputClass}
          value={note.title}
          onChange={(event) =>
            change({ title: event.target.value, text: note.text })
          }
        />
      </label>
      {!validTitle(note.title) && (
        <p role="alert" className="text-xs text-swu-warning">
          Titel muss 1–100 Zeichen lang sein
        </p>
      )}
      <label className="block text-xs text-swu-muted">
        Text
        <textarea
          className={`${inputClass} min-h-[300px] font-mono`}
          maxLength={100_000}
          value={note.text}
          onChange={(event) =>
            change({ title: note.title, text: event.target.value })
          }
        />
      </label>
      {creating ? (
        <button
          type="button"
          className={buttonClass}
          disabled={busy || !validTitle(note.title)}
          onClick={onCreate}
        >
          Notiz anlegen
        </button>
      ) : (
        <div role="status" className="text-xs text-swu-muted">
          {status}
          {status === 'Speichern fehlgeschlagen' && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setStatus('Speichert...');
                save();
              }}
            >
              Erneut speichern
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function NotesPage() {
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [active, setActive] = useState<NoteDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const saveQueues = useRef(new Map<number, Promise<void>>());
  const deletedIds = useRef(new Set<number>());

  async function deleteNotes(ids: number[], single = false) {
    setBusy(true);
    setError('');
    try {
      if (single) await api.delete(`/user/notes/${ids[0]}`);
      else await api.delete('/user/notes', { body: JSON.stringify({ ids }) });
      ids.forEach((id) => deletedIds.current.add(id));
      setNotes((current) => current.filter((note) => !ids.includes(note.id)));
      setSelected((current) => current.filter((id) => !ids.includes(id)));
      setActive((current) =>
        current && ids.includes(current.id) ? null : current,
      );
    } catch {
      setError('Notizen konnten nicht gelöscht werden');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .get<NoteDto[]>('/user/notes')
      .then((result) => {
        if (!cancelled) {
          setNotes(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Notizen konnten nicht geladen werden');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createNote() {
    if (!active || !validTitle(active.title)) return;
    setBusy(true);
    setError('');
    try {
      const note = await api.post<NoteDto>('/user/notes', {
        title: active.title,
        text: active.text,
      });
      setNotes((current) => [note, ...current]);
      setActive(note);
      setCreating(false);
    } catch {
      setError('Notiz konnte nicht angelegt werden');
    } finally {
      setBusy(false);
    }
  }

  function changeActive(input: SaveNoteRequest) {
    if (!active) return;
    const draft = { ...active, ...input };
    setActive(draft);
    if (!creating)
      setNotes((current) =>
        current.map((note) => (note.id === draft.id ? draft : note)),
      );
  }

  function savedNote(saved: NoteDto) {
    // A response to an older save must not replace newer edits.
    const merge = (note: NoteDto) =>
      note.id === saved.id ? { ...note, updatedAt: saved.updatedAt } : note;
    setNotes((current) => current.map(merge));
    setActive((current) => (current ? merge(current) : null));
  }

  if (loading)
    return <div className="p-6 text-swu-muted">Notizen werden geladen...</div>;

  return (
    <div className="space-y-3">
      <h1
        className="text-sm font-bold text-swu-primary"
        style={{ fontFamily: 'var(--font-swu-display)' }}
      >
        Notizsammlung
      </h1>
      {error && (
        <p role="alert" className="text-xs text-swu-warning">
          {error}
        </p>
      )}
      <button
        type="button"
        className={buttonClass}
        disabled={busy || (!!error && notes.length === 0)}
        onClick={() => {
          setCreating(true);
          setActive({
            id: 0,
            title: '',
            text: '',
            createdAt: '',
            updatedAt: '',
          });
        }}
      >
        Neue Notiz
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={busy || selected.length === 0}
        onClick={() => void deleteNotes(selected)}
      >
        Ausgewählte löschen ({selected.length})
      </button>
      {notes.length === 0 && !error && (
        <p className="text-xs text-swu-muted">Noch keine Notizen</p>
      )}
      <ul className="space-y-2">
        {notes.map((note) => (
          <li
            key={note.id}
            className="bg-swu-surface border border-swu-border rounded p-3"
          >
            <input
              type="checkbox"
              className="mr-3"
              aria-label={`${note.title} auswählen`}
              disabled={busy}
              checked={selected.includes(note.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, note.id]
                    : current.filter((id) => id !== note.id),
                )
              }
            />
            <button
              type="button"
              className="text-xs text-swu-primary"
              disabled={busy}
              onClick={() => {
                setActive(note);
                setCreating(false);
              }}
            >
              {note.title}
            </button>
            <time
              className="ml-3 text-xs text-swu-muted"
              dateTime={note.createdAt}
            >
              {new Date(note.createdAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </time>
          </li>
        ))}
      </ul>
      {active && !creating && (
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => void deleteNotes([active.id], true)}
        >
          Notiz löschen
        </button>
      )}
      {active && (
        <NoteEditor
          key={active.id}
          note={active}
          creating={creating}
          busy={busy}
          saveQueues={saveQueues.current}
          deletedIds={deletedIds.current}
          onChange={changeActive}
          onSaved={savedNote}
          onCreate={() => void createNote()}
        />
      )}
    </div>
  );
}
