import { useCallback, useEffect, useState } from 'react';
import type {
  SpacecraftCommunicationLogPageDto,
  SpacecraftCommunicationRecipientDto,
  SpacecraftDistressSignalDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';

type Tab = 'broadcast' | 'log' | 'distress';

export function CommunicationDrawer({
  shipId,
  onClose,
}: {
  shipId: number;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('broadcast');
  const [recipients, setRecipients] = useState<
    SpacecraftCommunicationRecipientDto[]
  >([]);
  const [logs, setLogs] = useState<SpacecraftCommunicationLogPageDto['data']>(
    [],
  );
  const [distress, setDistress] = useState<SpacecraftDistressSignalDto | null>(
    null,
  );
  const [text, setText] = useState('');
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [recipientData, logData, distressData] = await Promise.all([
      api.get<SpacecraftCommunicationRecipientDto[]>(
        `/spacecraft/${shipId}/communications/recipients`,
      ),
      api.get<SpacecraftCommunicationLogPageDto>(
        `/spacecraft/${shipId}/communications/logs`,
      ),
      api.get<SpacecraftDistressSignalDto | null>(
        `/spacecraft/${shipId}/communications/distress`,
      ),
    ]);
    setRecipients(recipientData);
    setLogs(logData.data);
    setDistress(distressData);
  }, [shipId]);

  useEffect(() => {
    void refresh().catch(() =>
      setFeedback('Kommunikation konnte nicht geladen werden'),
    );
  }, [refresh]);

  const submit = async () => {
    if (!text.trim()) return;
    setPending(true);
    setFeedback(null);
    try {
      if (tab === 'broadcast') {
        await api.post(`/spacecraft/${shipId}/communications/broadcast`, {
          body: text,
        });
        setFeedback('Broadcast gesendet');
      } else if (tab === 'log') {
        if (editingLogId) {
          await api.patch(
            `/spacecraft/${shipId}/communications/logs/${editingLogId}`,
            { body: text },
          );
        } else {
          await api.post(`/spacecraft/${shipId}/communications/logs`, {
            body: text,
          });
        }
        setEditingLogId(null);
        setFeedback('Logbucheintrag gespeichert');
      } else {
        await api.post(`/spacecraft/${shipId}/communications/distress`, {
          message: text,
        });
        onClose?.();
        return;
      }
      setText('');
      await refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Aktion fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  };

  const editLog = (
    entry: SpacecraftCommunicationLogPageDto['data'][number],
  ) => {
    setEditingLogId(entry.id);
    setText(entry.body);
    setFeedback(null);
  };

  const deleteLog = async (entryId: number) => {
    setPending(true);
    setFeedback(null);
    try {
      await api.delete(`/spacecraft/${shipId}/communications/logs/${entryId}`);
      if (editingLogId === entryId) {
        setEditingLogId(null);
        setText('');
      }
      await refresh();
      setFeedback('Logbucheintrag gelöscht');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Logbucheintrag konnte nicht gelöscht werden',
      );
    } finally {
      setPending(false);
    }
  };

  const stopDistress = async () => {
    setPending(true);
    try {
      await api.delete(`/spacecraft/${shipId}/communications/distress`);
      setDistress(null);
      setFeedback('Notruf beendet');
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Notruf konnte nicht beendet werden',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="rounded-lg border border-swu-border bg-swu-surface p-3"
      aria-label="Kommunikation"
    >
      <div
        role="tablist"
        aria-label="Kommunikationsbereiche"
        className="mb-3 flex gap-1"
      >
        {(['broadcast', 'log', 'distress'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className="rounded border border-swu-border px-2 py-1 text-xs text-swu-primary"
          >
            {value === 'broadcast'
              ? 'Broadcast'
              : value === 'log'
                ? 'Logbuch'
                : 'Notruf'}
          </button>
        ))}
      </div>
      {tab === 'broadcast' && (
        <p className="mb-2 text-[11px] text-swu-muted">
          Empfänger im Radius: {recipients.length || 'keine'}
        </p>
      )}
      {tab === 'log' && logs.length > 0 && (
        <ul className="mb-2 max-h-48 space-y-2 overflow-auto text-[11px]">
          {logs.map((entry) => (
            <li key={entry.id} className="border border-swu-border bg-black/20">
              <div className="flex items-center border-b border-swu-border/60">
                <time className="flex-1 px-2 py-1 text-center font-bold text-swu-primary">
                  {new Date(entry.createdAt).toLocaleString('de-DE')}
                </time>
                <button
                  type="button"
                  onClick={() => editLog(entry)}
                  disabled={pending}
                  className="border-l border-swu-border p-1"
                  aria-label="Logbucheintrag bearbeiten"
                  title="Logbucheintrag bearbeiten"
                >
                  <img
                    src="/assets/buttons/info1.png"
                    alt=""
                    className="size-4"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteLog(entry.id)}
                  disabled={pending}
                  className="border-l border-swu-border p-1"
                  aria-label="Logbucheintrag löschen"
                  title="Logbucheintrag löschen"
                >
                  <span
                    aria-hidden="true"
                    className="text-base leading-none text-swu-muted"
                  >
                    ×
                  </span>
                </button>
              </div>
              <p className="px-2 py-1 text-swu-primary">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
      {tab === 'distress' && distress ? (
        <div className="border border-swu-border bg-black/20">
          <h3 className="border-b border-swu-border px-2 py-1 text-center text-xs font-bold text-swu-primary">
            Aktuelles Notrufsignal
          </h3>
          <p role="status" className="px-2 py-2 text-sm text-red-300">
            {distress.message}
          </p>
          <div className="border-t border-swu-border px-2 py-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => void stopDistress()}
              className="border border-swu-accent px-2 py-1 text-xs text-swu-primary"
            >
              Notruf beenden
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-swu-muted">
            {tab === 'broadcast'
              ? 'Broadcast-Text'
              : tab === 'log'
                ? 'Logbucheintrag'
                : 'Notruftext'}
            <textarea
              aria-describedby={
                tab === 'distress' ? 'distress-length' : undefined
              }
              value={text}
              maxLength={tab === 'distress' ? 250 : 5000}
              onChange={(event) => setText(event.target.value)}
              className="mt-1 min-h-20 w-full rounded border border-swu-border bg-swu-bg p-2 text-swu-primary"
            />
          </label>
          {tab === 'distress' && (
            <p id="distress-length" className="text-[11px] text-swu-muted">
              {text.length}/250 Zeichen
            </p>
          )}
          <button
            type="button"
            disabled={pending || !text.trim()}
            onClick={() => void submit()}
            className="rounded border border-swu-accent px-3 py-1 text-xs text-swu-primary disabled:opacity-40"
          >
            {pending
              ? 'Bitte warten…'
              : tab === 'broadcast'
                ? 'Senden'
                : tab === 'log'
                  ? editingLogId
                    ? 'Änderung speichern'
                    : 'Logeintrag schreiben'
                  : 'Notruf senden'}
          </button>
        </div>
      )}
      {feedback && (
        <p role="status" className="mt-2 text-[11px] text-swu-muted">
          {feedback}
        </p>
      )}
    </section>
  );
}
