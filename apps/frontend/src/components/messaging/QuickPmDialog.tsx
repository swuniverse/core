import { useEffect, useRef, useState } from 'react';

import { api } from '../../services/api';
import { PlayerName } from '../PlayerName';

/**
 * STU quick PM: fixed recipient, text only, sent without leaving the page.
 * `nearby` sends from an own ship/station to a target on the same field
 * (sector template and crew experience server-side).
 */
export function QuickPmDialog({
  recipient,
  nearby,
  onClose,
}: {
  recipient: { id?: number; name: string };
  nearby?: { shipId: number; targetId: number; targetName: string };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    // showModal traps focus and makes the page inert; jsdom lacks it.
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, []);

  function requestClose() {
    if (body.trim() && !sent) setConfirmDiscard(true);
    else onClose();
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      if (nearby) {
        await api.post(
          `/spacecraft/${nearby.shipId}/communications/nearby/${nearby.targetId}`,
          { body },
        );
      } else {
        await api.post('/messages', {
          recipientId: recipient.id,
          body,
        });
      }
      setSent(true);
      setBody('');
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
    <dialog
      ref={ref}
      aria-label="Neue private Nachricht"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      className="w-full max-w-lg border border-swu-border bg-swu-bg p-3 text-sm text-swu-text backdrop:bg-black/70"
    >
      <header className="mb-3 flex items-center justify-between border-b border-swu-border pb-2">
        <h3 className="font-bold text-swu-primary">Neue private Nachricht</h3>
        <button type="button" onClick={requestClose}>
          Schließen
        </button>
      </header>
      <p className="mb-2 text-swu-muted">
        Empfänger: <PlayerName name={recipient.name} />
        {recipient.id != null && ` (${recipient.id})`}
      </p>
      {sent ? (
        <p role="status" className="text-green-300">
          Die Nachricht wurde verschickt
        </p>
      ) : (
        <>
          <label className="block text-xs text-swu-muted" htmlFor="quick-pm-body">
            Nachricht{nearby ? ` an ${nearby.targetName}` : ''}
          </label>
          <textarea
            id="quick-pm-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={nearby ? 1000 : 10_000}
            rows={8}
            autoFocus
            className="mt-1 w-full border border-swu-border bg-black/30 p-2 text-swu-text"
          />
          <button
            type="button"
            disabled={sending || !body.trim()}
            onClick={() => void send()}
            className="mt-3 border border-swu-accent px-3 py-1 text-swu-accent disabled:opacity-40"
          >
            Absenden
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-300">
          {error}
        </p>
      )}
      {confirmDiscard && (
        <p role="alert" className="mt-2">
          Text verwerfen?{' '}
          <button type="button" onClick={onClose} className="text-red-300">
            Verwerfen
          </button>{' '}
          <button type="button" onClick={() => setConfirmDiscard(false)}>
            Weiter schreiben
          </button>
        </p>
      )}
    </dialog>
  );
}
