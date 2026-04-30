import { useEffect, useState } from 'react';
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
}

interface InboxResponse {
  data: MessageSummary[];
  total: number;
  page: number;
}

export function MessagesPage() {
  const [tab, setTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [compose, setCompose] = useState({ recipientId: '', subject: '', body: '' });

  const loadInbox = async () => {
    const res = await api.get<InboxResponse>('/messages/inbox');
    setMessages(res.data);
    setLoading(false);
  };

  const loadSent = async () => {
    const res = await api.get<InboxResponse>('/messages/sent');
    setMessages(res.data);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'inbox') loadInbox();
    else if (tab === 'sent') loadSent();
  }, [tab]);

  const openMessage = async (id: number) => {
    const msg = await api.get<MessageDetail>(`/messages/${id}`);
    setSelected(msg);
  };

  const sendMessage = async () => {
    await api.post('/messages', {
      recipientId: Number(compose.recipientId),
      subject: compose.subject,
      body: compose.body,
    });
    setCompose({ recipientId: '', subject: '', body: '' });
    setTab('sent');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Messages</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['inbox', 'sent', 'compose'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected(null); }}
            className={`px-3 py-1 text-sm rounded border transition-colors ${
              tab === t
                ? 'border-swu-accent text-swu-accent bg-swu-accent/10'
                : 'border-swu-border text-swu-muted hover:border-swu-primary'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'compose' ? (
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 max-w-lg space-y-3">
          <div>
            <label className="text-xs text-swu-muted">Recipient ID</label>
            <input
              value={compose.recipientId}
              onChange={(e) => setCompose({ ...compose, recipientId: e.target.value })}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1"
              placeholder="User ID"
            />
          </div>
          <div>
            <label className="text-xs text-swu-muted">Subject</label>
            <input
              value={compose.subject}
              onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-swu-muted">Body</label>
            <textarea
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              rows={5}
              className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary mt-1 resize-none"
            />
          </div>
          <button
            onClick={sendMessage}
            className="px-4 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors"
          >
            Send
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Message List */}
          <div className="flex-1 bg-swu-surface border border-swu-border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-4 text-swu-muted text-sm">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="p-4 text-swu-muted text-sm">No messages.</div>
            ) : (
              <div className="divide-y divide-swu-border/50">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => openMessage(msg.id)}
                    className={`w-full text-left p-3 hover:bg-swu-bg/50 transition-colors ${
                      selected?.id === msg.id ? 'bg-swu-bg/50' : ''
                    } ${!msg.isRead && tab === 'inbox' ? 'border-l-2 border-l-swu-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${!msg.isRead ? 'font-bold text-swu-primary' : 'text-swu-muted'}`}>
                        {msg.subject}
                      </span>
                      <span className="text-[10px] text-swu-muted">
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-swu-muted mt-0.5">
                      {tab === 'inbox' ? `From: ${msg.sender?.username || 'System'}` : `To: ${msg.recipient?.username}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          {selected && (
            <div className="w-80 bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="font-bold text-swu-primary mb-1">{selected.subject}</h3>
              <p className="text-[10px] text-swu-muted mb-3">
                {selected.sender?.username || 'System'} · {new Date(selected.createdAt).toLocaleString()}
              </p>
              <div className="text-sm text-swu-muted whitespace-pre-wrap">{selected.body}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
