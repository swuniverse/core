import { useEffect, useState, useRef } from 'react';
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

interface InboxResponse {
  data: MessageSummary[];
  total: number;
  page: number;
  limit: number;
}

type Tab = 'inbox' | 'sent' | 'system' | 'compose';

export function MessagesPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [compose, setCompose] = useState({
    recipientName: '',
    subject: '',
    body: '',
  });
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<
    { id: number; username: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = async (t: Tab, p: number) => {
    setLoading(true);
    if (t === 'system') {
      const res = await api.get<InboxResponse>(`/messages/inbox?page=${p}`);
      const systemMsgs = res.data.filter((m) => m.isSystem);
      setMessages(systemMsgs);
      setTotal(systemMsgs.length);
    } else if (t === 'inbox') {
      const res = await api.get<InboxResponse>(`/messages/inbox?page=${p}`);
      setMessages(res.data.filter((m) => !m.isSystem));
      setTotal(res.total);
    } else if (t === 'sent') {
      const res = await api.get<InboxResponse>(`/messages/sent?page=${p}`);
      setMessages(res.data);
      setTotal(res.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== 'compose') {
      loadMessages(tab, page);
    }
  }, [tab, page]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
    setSelected(null);
  };

  const openMessage = async (id: number) => {
    const msg = await api.get<MessageDetail>(`/messages/${id}`);
    setSelected(msg);
  };

  const deleteMessage = async (id: number) => {
    await api.delete(`/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
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
    setTab('compose');
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
    switchTab('sent');
  };

  const totalPages = Math.ceil(total / limit);

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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Nachrichten</h1>

      <div className="flex gap-2 mb-4">
        {(['inbox', 'sent', 'system', 'compose'] as const).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              tab === t
                ? 'border-swu-accent text-swu-accent bg-swu-accent/10'
                : 'border-swu-border text-swu-muted hover:border-swu-primary'
            }`}
          >
            {t === 'inbox'
              ? 'Posteingang'
              : t === 'sent'
                ? 'Gesendet'
                : t === 'system'
                  ? 'System'
                  : 'Verfassen'}
          </button>
        ))}
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
        <div className="flex gap-4">
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
                    } ${!msg.isRead && tab === 'inbox' ? 'border-l-2 border-l-swu-accent' : ''}`}
                  >
                    <button
                      onClick={() => openMessage(msg.id)}
                      className="flex-1 text-left p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm ${
                            !msg.isRead && tab === 'inbox'
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
                        {tab === 'sent'
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
            <div className="w-96 bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="font-bold text-swu-primary mb-1">
                {selected.subject}
              </h3>
              <p className="text-[10px] text-swu-muted mb-3">
                {selected.sender?.username || 'System'} ·{' '}
                {timeAgo(selected.createdAt)}
              </p>
              <div className="text-sm text-swu-muted whitespace-pre-wrap mb-4">
                {selected.body}
              </div>
              {!selected.isSystem && tab !== 'sent' && (
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
