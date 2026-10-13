import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';

interface MessageSummary {
  id: number;
  subject: string;
  isRead: boolean;
  isSystem: boolean;
  createdAt: string;
  sender?: { username: string };
  recipient?: { username: string };
}

interface MessageDetail extends MessageSummary {
  body: string;
  senderId: number;
  recipientId: number;
}

interface FolderSummary {
  folder: MessageFolder;
  unread: number;
  total: number;
}

type MessageFolder =
  | 'PERSONAL'
  | 'SHIP'
  | 'COLONY'
  | 'TRADE'
  | 'SYSTEM'
  | 'OUTBOX'
  | 'STATION';

const MESSAGE_FOLDERS: Array<{
  folder: MessageFolder;
  label: string;
  route: string;
  icon: string;
}> = [
  { folder: 'PERSONAL', label: 'Persönlich', route: 'personal', icon: '✉' },
  { folder: 'SHIP', label: 'Schiffe', route: 'ship', icon: '▲' },
  { folder: 'COLONY', label: 'Kolonien', route: 'colony', icon: '◉' },
  { folder: 'TRADE', label: 'Handel', route: 'trade', icon: '↔' },
  { folder: 'SYSTEM', label: 'System', route: 'system', icon: '◆' },
  { folder: 'OUTBOX', label: 'Postausgang', route: 'outbox', icon: '↗' },
  { folder: 'STATION', label: 'Station', route: 'station', icon: '▣' },
];

function parseFolder(value: string | null): MessageFolder {
  const selected = MESSAGE_FOLDERS.find((folder) => folder.route === value);
  return selected?.folder ?? 'PERSONAL';
}

interface InboxResponse {
  data: MessageSummary[];
  total: number;
  page: number;
  limit: number;
}

type Tab = 'folders' | 'compose';

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const initialRecipientId = Number(searchParams.get('to'));
  const startsCompose =
    initialTab === 'compose' &&
    Number.isInteger(initialRecipientId) &&
    initialRecipientId > 0;
  const [tab, setTab] = useState<Tab>(startsCompose ? 'compose' : 'folders');
  const [folder, setFolder] = useState<MessageFolder>(() =>
    parseFolder(searchParams.get('folder')),
  );
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [compose, setCompose] = useState({
    recipientName: startsCompose ? (searchParams.get('name') ?? '') : '',
    subject: '',
    body: '',
  });
  const [recipientId, setRecipientId] = useState<number | null>(
    startsCompose ? initialRecipientId : null,
  );
  const [suggestions, setSuggestions] = useState<
    { id: number; username: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshFolders = async () => {
    const response = await api.get<FolderSummary[]>('/messages/folders');
    setFolders(response);
  };

  const loadMessages = async (selectedFolder: MessageFolder, p: number) => {
    setLoading(true);
    try {
      const response = await api.get<InboxResponse>(
        `/messages/folders/${selectedFolder.toLowerCase()}?page=${p}`,
      );
      setMessages(response.data);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshFolders().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab === 'folders') void loadMessages(folder, page);
  }, [folder, page, tab]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'compose' && startsCompose) return;
    setTab(requestedTab === 'compose' ? 'compose' : 'folders');
    setFolder(parseFolder(searchParams.get('folder')));
    setPage(1);
    setSelected(null);
  }, [searchParams, startsCompose]);

  const switchFolder = (nextFolder: MessageFolder) => {
    setFolder(nextFolder);
    setTab('folders');
    setPage(1);
    setSelected(null);
    setSearchParams({ folder: nextFolder.toLowerCase() });
  };

  const switchToCompose = () => {
    setTab('compose');
    setSelected(null);
    setSearchParams({ tab: 'compose' });
  };

  const openMessage = async (id: number) => {
    const msg = await api.get<MessageDetail>(`/messages/${id}`);
    setSelected(msg);
    if (!msg.isRead && folder !== 'OUTBOX') {
      setMessages((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, isRead: true } : entry,
        ),
      );
      setFolders((current) =>
        current.map((entry) =>
          entry.folder === folder
            ? { ...entry, unread: Math.max(0, entry.unread - 1) }
            : entry,
        ),
      );
    }
    await refreshFolders();
  };

  const deleteMessage = async (id: number) => {
    await api.delete(`/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
    await refreshFolders();
  };

  const replyTo = () => {
    if (!selected) return;
    setCompose({
      recipientName: selected.sender?.username || '',
      subject: selected.subject.startsWith('Re: ')
        ? selected.subject
        : `Re: ${selected.subject}`,
      body: '',
    });
    setRecipientId(selected.senderId);
    switchToCompose();
  };

  const searchUser = (query: string) => {
    setCompose((c) => ({ ...c, recipientName: query }));
    setRecipientId(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const results = await api.get<{ id: number; username: string }[]>(
        `/user/search?q=${encodeURIComponent(query)}`,
      );
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);
  };

  const selectRecipient = (user: { id: number; username: string }) => {
    setCompose((c) => ({ ...c, recipientName: user.username }));
    setRecipientId(user.id);
    setShowSuggestions(false);
  };

  const sendMessage = async () => {
    if (!recipientId) return;
    await api.post('/messages', {
      recipientId,
      subject: compose.subject,
      body: compose.body,
    });
    setCompose({ recipientName: '', subject: '', body: '' });
    setRecipientId(null);
    switchFolder('OUTBOX');
    await refreshFolders();
  };

  const totalPages = Math.ceil(total / limit);
  const currentFolder = MESSAGE_FOLDERS.find(
    (entry) => entry.folder === folder,
  )!;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return `vor ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `vor ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `vor ${days}d`;
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  return (
    <div className="p-3 md:p-6">
      <h1
        className="text-2xl font-bold text-swu-accent mb-4"
        style={{ fontFamily: 'var(--font-swu-display)' }}
      >
        Nachrichten
      </h1>

      <div
        className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-swu-border bg-swu-surface p-1"
        aria-label="Nachrichtenordner"
      >
        {MESSAGE_FOLDERS.map((entry) => {
          const summary = folders.find(
            (item) => item.folder === entry.folder,
          ) ?? {
            unread: 0,
            total: 0,
          };
          return (
            <button
              key={entry.folder}
              type="button"
              onClick={() => switchFolder(entry.folder)}
              aria-pressed={tab === 'folders' && folder === entry.folder}
              className={`shrink-0 rounded px-2 py-1 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent ${
                tab === 'folders' && folder === entry.folder
                  ? 'bg-swu-accent/15 text-swu-accent'
                  : 'text-swu-muted hover:bg-swu-bg hover:text-swu-primary'
              }`}
            >
              <span aria-hidden="true" className="mr-1">
                {entry.icon}
              </span>
              <span>{entry.label}</span>
              <span className="ml-1 font-mono text-[10px]">
                {summary.unread}/{summary.total}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={switchToCompose}
          aria-pressed={tab === 'compose'}
          className={`shrink-0 rounded px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent ${
            tab === 'compose'
              ? 'bg-swu-accent/15 text-swu-accent'
              : 'text-swu-muted hover:bg-swu-bg hover:text-swu-primary'
          }`}
        >
          Verfassen
        </button>
      </div>

      {tab === 'compose' ? (
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 max-w-lg space-y-3">
          <div className="relative">
            <label className="text-xs text-swu-muted">Empfaenger</label>
            <input
              value={compose.recipientName}
              onChange={(e) => searchUser(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1"
              placeholder="Username eingeben..."
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-swu-surface border border-swu-border rounded shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    onMouseDown={() => selectRecipient(u)}
                    className="w-full text-left px-3 py-2 text-sm text-swu-primary hover:bg-swu-bg transition-colors"
                  >
                    {u.username}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-swu-muted">Betreff</label>
            <input
              value={compose.subject}
              onChange={(e) =>
                setCompose({ ...compose, subject: e.target.value })
              }
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-swu-muted">Nachricht</label>
            <textarea
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              rows={5}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1 resize-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!recipientId || !compose.subject}
            className="px-4 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
          >
            Senden
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <h2 className="sr-only">{currentFolder.label}</h2>
          <div className="flex-1 bg-swu-surface border border-swu-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-4 text-swu-muted text-sm">Laden...</div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-swu-muted text-sm">
                Keine Nachrichten.
              </div>
            ) : (
              <div className="divide-y divide-swu-border/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-center hover:bg-swu-bg/50 transition-colors ${
                      selected?.id === msg.id ? 'bg-swu-bg/50' : ''
                    } ${!msg.isRead && folder !== 'OUTBOX' ? 'border-l-2 border-l-swu-accent' : ''}`}
                  >
                    <button
                      onClick={() => openMessage(msg.id)}
                      className="flex-1 text-left p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm ${
                            !msg.isRead && folder !== 'OUTBOX'
                              ? 'font-bold text-swu-primary'
                              : 'text-swu-muted'
                          }`}
                        >
                          {msg.subject}
                        </span>
                        <span className="text-[10px] text-swu-muted">
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-[10px] text-swu-muted mt-0.5">
                        {folder === 'OUTBOX'
                          ? `An: ${msg.recipient?.username}`
                          : msg.isSystem
                            ? 'System'
                            : `Von: ${msg.sender?.username || 'System'}`}
                      </p>
                    </button>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      title="Loeschen"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-swu-border/50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs text-swu-muted hover:text-swu-primary disabled:opacity-30"
                >
                  Zurueck
                </button>
                <span className="text-xs text-swu-muted">
                  Seite {page} von {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs text-swu-muted hover:text-swu-primary disabled:opacity-30"
                >
                  Weiter
                </button>
              </div>
            )}
          </div>

          {selected && (
            <div className="w-full bg-swu-surface border border-swu-border rounded-lg p-4 md:w-96">
              <h3 className="font-bold text-swu-primary mb-1">
                {selected.subject}
              </h3>
              <p className="text-[10px] text-swu-muted mb-3">
                {selected.sender?.username || 'System'} ·{' '}
                {timeAgo(selected.createdAt)}
              </p>
              <BbCodeText
                text={selected.body}
                className="text-sm text-swu-muted whitespace-pre-wrap mb-4"
              />
              {!selected.isSystem && folder !== 'OUTBOX' && (
                <button
                  onClick={replyTo}
                  className="px-3 py-1 text-xs bg-swu-accent/20 border border-swu-accent text-swu-accent rounded hover:bg-swu-accent/30 transition-colors"
                >
                  Antworten
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
