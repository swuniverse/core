import { useState } from 'react';
import { api } from '../../services/api';

export function NearbyMessageDialog({
  shipId,
  target,
  onClose,
}: {
  shipId: number;
  target: { id: number; name: string; username: string | null };
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    try {
      await api.post(
        `/spacecraft/${shipId}/communications/nearby/${target.id}`,
        { body },
      );
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nachricht konnte nicht gesendet werden',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Neue private Nachricht"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-lg border border-swu-border bg-swu-bg p-3 text-sm">
        <header className="mb-3 flex items-center justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">Neue private Nachricht</h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        <p className="mb-2 text-swu-muted">
          Empfänger: {target.username ?? target.name}
        </p>
        <label
          className="block text-xs text-swu-muted"
          htmlFor="nearby-message"
        >
          Nachricht an {target.name}
        </label>
        <textarea
          id="nearby-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          rows={8}
          className="mt-1 w-full border border-swu-border bg-black/30 p-2 text-swu-text"
        />
        {error && (
          <p role="alert" className="mt-2 text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={sending || !body.trim()}
          onClick={() => void send()}
          className="mt-3 border border-swu-accent px-3 py-1 text-swu-accent disabled:opacity-40"
        >
          Absenden
        </button>
      </section>
    </div>
  );
}
