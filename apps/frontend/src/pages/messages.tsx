import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';

type OriginSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface MessageSummary {
  id: number;
  subject: string;
  isRead: boolean;
  isSystem: boolean;
  createdAt: string;
  originSeverity?: OriginSeverity | null;
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

const severityStyles: Record<OriginSeverity, string> = {
  INFO: 'border-sky-400/60 bg-sky-950/50 text-sky-200',
  WARNING: 'border-amber-400/60 bg-amber-950/50 text-amber-200',
  CRITICAL: 'border-red-400/60 bg-red-950/50 text-red-200',
};

function OriginSeverityBadge({ severity }: { severity: OriginSeverity | null | undefined }) {
  if (!severity) return null;
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold ${severityStyles[severity]}`}
      aria-label={`Schweregrad: ${severity}`}
    >
      {severity}
    </span>
  );
}

function MessageActionRail({
  folder,
  folders,
  messages,
  selectedIds,
  isCompose,
  onCompose,
  onFolder,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onMarkFolderRead,
  onEmptyFolder,
}: {
  folder: MessageFolder;
  folders: FolderSummary[];
  messages: MessageSummary[];
  selectedIds: Set<number>;
  isCompose: boolean;
  onCompose: () => void;
  onFolder: (folder: MessageFolder) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onMarkFolderRead: () => void;
  onEmptyFolder: () => void;
}) {
  const incomingFolder = folder !== 'OUTBOX';

  return (
    <div className="space-y-3 rounded-lg border border-swu-border bg-swu-surface p-3 text-xs">
      <RailSection title="Aktionen">
        <RailButton onClick={onCompose}>Nachricht verfassen</RailButton>
        {!isCompose && incomingFolder && (
          <>
            <RailButton onClick={onSelectAll} disabled={messages.length === 0}>
              Alle selektieren
            </RailButton>
            <RailButton onClick={onClearSelection} disabled={selectedIds.size === 0}>
              Alle deselektieren
            </RailButton>
            <RailButton onClick={onDeleteSelected} disabled={selectedIds.size === 0}>
              Alle selektierten löschen{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </RailButton>
            <RailButton onClick={onMarkFolderRead}>
              Ordner als gelesen markieren
            </RailButton>
            <RailButton onClick={onEmptyFolder} danger>
              Ordner leeren
            </RailButton>
          </>
        )}
      </RailSection>

      <RailSection title="Notizen">
        <Link
          to="/notes"
          aria-label="Notizzettel öffnen"
          className="block rounded px-2 py-1.5 text-swu-muted hover:bg-swu-bg hover:text-swu-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent"
        >
          Notizzettel öffnen
        </Link>
      </RailSection>

      <RailSection title="Ordner">
        <nav aria-label="Nachrichtenordner" className="space-y-1">
          {MESSAGE_FOLDERS.map((entry) => {
            const summary = folders.find((item) => item.folder === entry.folder) ?? {
              unread: 0,
              total: 0,
            };
            const active = !isCompose && folder === entry.folder;
            return (
              <button
                key={entry.folder}
                type="button"
                onClick={() => onFolder(entry.folder)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent ${
                  active
                    ? 'bg-swu-accent/15 text-swu-accent'
                    : 'text-swu-muted hover:bg-swu-bg hover:text-swu-primary'
                }`}
              >
                <span>
                  <span aria-hidden="true" className="mr-1.5">{entry.icon}</span>
                  {entry.label}
                </span>
                <span className="font-mono text-[10px]">{summary.unread}/{summary.total}</span>
              </button>
            );
          })}
        </nav>
      </RailSection>
    </div>
  );
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 border-b border-swu-border pb-1 font-bold text-swu-primary">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function RailButton({
  children,
  onClick,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full rounded px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-red-400 hover:bg-red-950/30 hover:text-red-300'
          : 'text-swu-muted hover:bg-swu-bg hover:text-swu-primary'
      }`}
    >
      {children}
    </button>
  );
}

function ConfirmationDialog({
  kind,
  count,
  onCancel,
  onConfirm,
}: {
  kind: Exclude<Confirmation, null>;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const emptyFolder = kind === 'empty-folder';
  const title = emptyFolder ? 'Ordner leeren?' : 'Nachrichten löschen?';
  const description = emptyFolder
    ? 'Alle Nachrichten im aktuellen Ordner werden entfernt.'
    : `${count} ausgewählte Nachrichten werden entfernt.`;
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="message-confirmation-title"
      aria-describedby="message-confirmation-description"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-swu-border bg-swu-bg p-4"
      >
        <h2 id="message-confirmation-title" className="font-bold text-swu-primary">{title}</h2>
        <p id="message-confirmation-description" className="mt-2 text-sm text-swu-muted">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded border border-swu-border px-3 py-1.5 text-xs text-swu-primary"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            aria-label={emptyFolder ? 'Ordner leeren bestätigen' : 'Nachrichten löschen bestätigen'}
            className="rounded border border-red-500/70 bg-red-950/40 px-3 py-1.5 text-xs text-red-300"
          >
            {emptyFolder ? 'Ordner leeren' : 'Löschen'}
          </button>
        </div>
      </section>
    </div>
  );
}

interface InboxResponse {
  data: MessageSummary[];
  total: number;
  page: number;
  limit: number;
}

type Tab = 'folders' | 'compose';
type Confirmation = 'bulk-delete' | 'empty-folder' | null;

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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
      setSelectedIds(new Set());
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
    setSelectedIds(new Set());
    setSearchParams({ folder: nextFolder.toLowerCase() });
  };

  const switchToCompose = () => {
    setTab('compose');
    setSelected(null);
    setSelectedIds(new Set());
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
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (selected?.id === id) setSelected(null);
    await refreshFolders();
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(messages.map((message) => message.id)));

  const clearSelection = () => setSelectedIds(new Set());

  const refreshCurrentFolder = async (nextPage = page) => {
    await Promise.all([loadMessages(folder, nextPage), refreshFolders()]);
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (ids.length > 1 && !confirmation) {
      setConfirmation('bulk-delete');
      return;
    }
    setActionError(null);
    try {
      await api.post('/messages/bulk-delete', { ids });
      setConfirmation(null);
      setSelected(null);
      await refreshCurrentFolder();
    } catch {
      setActionError('Nachrichten konnten nicht gelöscht werden.');
    }
  };

  const markFolderRead = async () => {
    if (folder === 'OUTBOX') return;
    setActionError(null);
    try {
      await api.post(`/messages/folders/${folder.toLowerCase()}/mark-read`, {});
      setSelected(null);
      await refreshCurrentFolder();
    } catch {
      setActionError('Der Ordner konnte nicht als gelesen markiert werden.');
    }
  };

  const emptyFolder = async () => {
    if (folder === 'OUTBOX') return;
    if (confirmation !== 'empty-folder') {
      setConfirmation('empty-folder');
      return;
    }
    setActionError(null);
    try {
      await api.post(`/messages/folders/${folder.toLowerCase()}/empty`, {});
      setConfirmation(null);
      setSelected(null);
      setSelectedIds(new Set());
      setPage(1);
      await refreshCurrentFolder(1);
    } catch {
      setActionError('Der Ordner konnte nicht geleert werden.');
    }
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

      <button
        type="button"
        onClick={() => setMobileActionsOpen((open) => !open)}
        aria-expanded={mobileActionsOpen}
        aria-controls="mobile-message-actions"
        className="mb-3 w-full rounded-lg border border-swu-border bg-swu-surface px-3 py-2 text-left text-xs text-swu-primary md:hidden"
      >
        Aktionen und Ordner anzeigen
      </button>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside
          id="mobile-message-actions"
          aria-label="Nachrichtenaktionen"
          className={`${mobileActionsOpen ? 'block' : 'hidden'} order-first w-full md:order-last md:block md:w-60 md:shrink-0`}
        >
          <MessageActionRail
            folder={folder}
            folders={folders}
            messages={messages}
            selectedIds={selectedIds}
            isCompose={tab === 'compose'}
            onCompose={switchToCompose}
            onFolder={switchFolder}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onDeleteSelected={deleteSelected}
            onMarkFolderRead={markFolderRead}
            onEmptyFolder={emptyFolder}
          />
        </aside>

        <div className="min-w-0 flex-1">
      {actionError && (
        <p role="alert" className="mb-3 rounded border border-red-500/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {actionError}
        </p>
      )}
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
                    {folder !== 'OUTBOX' && (
                      <label className="flex shrink-0 items-center px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(msg.id)}
                          onChange={() => toggleSelection(msg.id)}
                          aria-label={`Nachricht ${msg.subject} auswählen`}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => openMessage(msg.id)}
                      className="flex-1 text-left p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm ${
                            !msg.isRead && folder !== 'OUTBOX'
                              ? 'font-bold text-swu-primary'
                              : 'text-swu-muted'
                          }`}
                        >
                          {msg.subject}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <OriginSeverityBadge severity={msg.originSeverity} />
                          <span className="text-[10px] text-swu-muted">
                            {timeAgo(msg.createdAt)}
                          </span>
                        </div>
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
                      type="button"
                      onClick={() => deleteMessage(msg.id)}
                      className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      title="Loeschen"
                      aria-label="Nachricht löschen"
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
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-bold text-swu-primary">
                  {selected.subject}
                </h3>
                <OriginSeverityBadge severity={selected.originSeverity} />
              </div>
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
      </div>

      {confirmation && (
        <ConfirmationDialog
          kind={confirmation}
          count={selectedIds.size}
          onCancel={() => setConfirmation(null)}
          onConfirm={() =>
            confirmation === 'bulk-delete' ? deleteSelected() : emptyFolder()
          }
        />
      )}
    </div>
  );
}
