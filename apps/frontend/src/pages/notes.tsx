import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const STORAGE_KEY = 'swu-notes';
const SAVE_DELAY_MS = 600;

function formatSavedAt(date = new Date()) {
  return `Gespeichert um ${date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function NotesPage() {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Notizen werden geladen...');
  const initialized = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      try {
        const { notes: persistedNotes } = await api.get<{ notes: string }>(
          '/user/notes',
        );
        if (cancelled) return;

        const localNotes = localStorage.getItem(STORAGE_KEY) ?? '';
        const nextNotes = persistedNotes || localNotes;

        setNotes(nextNotes);
        localStorage.setItem(STORAGE_KEY, nextNotes);
        initialized.current = true;
        setLoading(false);

        if (!persistedNotes && localNotes) {
          await api.patch<{ notes: string }, { notes: string }>('/user/notes', {
            notes: localNotes,
          });
          if (cancelled) return;
          setStatus(formatSavedAt());
          return;
        }

        setStatus(formatSavedAt());
      } catch {
        if (cancelled) return;
        const localNotes = localStorage.getItem(STORAGE_KEY) ?? '';
        setNotes(localNotes);
        initialized.current = true;
        setLoading(false);
        setStatus('Nur lokal geladen. Datenbank momentan nicht erreichbar');
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!initialized.current) return;

    localStorage.setItem(STORAGE_KEY, notes);
    setStatus('Speichert...');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void api
        .patch<{ notes: string }, { notes: string }>('/user/notes', { notes })
        .then(() => {
          setStatus(formatSavedAt());
        })
        .catch(() => {
          setStatus('Speichern fehlgeschlagen. Lokal im Browser gesichert');
        });
    }, SAVE_DELAY_MS);
  }, [notes]);

  if (loading) {
    return <div className="p-6 text-swu-muted">Notizen werden geladen...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-swu-muted">/ Notizen</div>
      <div className="bg-swu-surface border border-swu-border rounded p-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Persoenliche Notizen..."
          className="w-full h-[calc(100vh-200px)] min-h-[300px] bg-transparent text-xs text-swu-primary placeholder-swu-muted/50 resize-none focus:outline-none font-mono"
        />
      </div>
      <div className="text-[9px] text-swu-muted">{status}</div>
    </div>
  );
}
