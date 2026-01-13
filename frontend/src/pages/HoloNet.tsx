import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Radio, Send, FileText, Edit2, X } from 'lucide-react';
import api from '../lib/api';
import logger from '../lib/logger';

interface HoloNetMessage {
  id: number;
  title?: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  player: {
    id: number;
    username: string;
    factionName: string;
  };
}

export default function HoloNet() {
  const socket = useGameStore((state) => state.socket);
  const user = useGameStore((state) => state.user);
  const [messages, setMessages] = useState<HoloNetMessage[]>([]);
  const [title, setTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: HoloNetMessage) => {
      logger.socket('New HoloNet message received:', message);
      setMessages((prev) => [...prev, message]);
      setTimeout(scrollToBottom, 100);
    };

    const handleUpdatedMessage = (updatedMsg: HoloNetMessage) => {
      logger.socket('HoloNet message updated:', updatedMsg);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
      );
    };

    socket.on('holonet:message', handleNewMessage);
    socket.on('holonet:updated', handleUpdatedMessage);

    return () => {
      socket.off('holonet:message', handleNewMessage);
      socket.off('holonet:updated', handleUpdatedMessage);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await api.get('/holonet/messages');

      // Type check: ensure response.data is an array
      if (Array.isArray(response.data)) {
        setMessages(response.data);
      } else {
        console.error('Expected array but got:', typeof response.data, response.data);
        setMessages([]); // Fallback to empty array
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]); // Ensure messages is always an array
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await api.post('/holonet/messages', { 
        title: title.trim() || undefined,
        message: newMessage 
      });
      // Füge die neue Nachricht direkt hinzu, falls Socket nicht sofort triggert
      setMessages((prev) => [...prev, response.data]);
      setTitle('');
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  const startEdit = (msg: HoloNetMessage) => {
    setEditingId(msg.id);
    setEditTitle(msg.title || '');
    setEditMessage(msg.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditMessage('');
  };

  const saveEdit = async (id: number) => {
    if (!editMessage.trim()) return;

    setSending(true);
    try {
      await api.put(`/holonet/messages/${id}`, {
        title: editTitle.trim() || undefined,
        message: editMessage,
      });
      setEditingId(null);
      setEditTitle('');
      setEditMessage('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Fehler beim Bearbeiten');
    } finally {
      setSending(false);
    }
  };

  const canEdit = (msg: HoloNetMessage) => {
    if (msg.player.id !== user?.player?.id) return false;
    const now = new Date();
    const created = new Date(msg.createdAt);
    const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
    return diffMinutes <= 30;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFactionColor = (factionName: string) => {
    if (factionName.includes('Imperium') || factionName.includes('Empire')) {
      return 'text-red-400';
    }
    return 'text-blue-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Lade HoloNet...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 rounded-lg backdrop-blur-sm mb-8">
        {/* Imperial Command Header */}
        <div className="border-b border-cyan-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-900/40 border border-cyan-500/40 rounded">
              <Radio size={24} className="text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-100 font-mono tracking-wider">HOLONET</h1>
              <p className="text-sm text-cyan-400/70 font-mono">GALAKTISCHES KOMMUNIKATIONSNETZWERK - ROLLENSPIEL & STORY</p>
            </div>
          </div>
        </div>

        {/* Imperial Command New Post Form */}
        <form onSubmit={sendMessage} className="p-6 border-b border-cyan-500/20 bg-slate-950/20">
          <div className="mb-4 pb-3 border-b border-cyan-500/20">
            <h2 className="text-lg font-semibold text-cyan-100 flex items-center gap-2 font-mono tracking-wider">
              <FileText size={18} />
              NEUER BEITRAG
            </h2>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel (optional)"
              maxLength={100}
              className="w-full bg-slate-800/60 border border-cyan-500/30 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono backdrop-blur-sm"
              disabled={sending}
            />
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Dein Rollenspiel-Text oder Story... (max 5000 Zeichen)"
              maxLength={5000}
              rows={6}
              className="w-full bg-slate-800/60 border border-cyan-500/30 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono resize-y backdrop-blur-sm"
              disabled={sending}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-cyan-400/60 font-mono">
                {newMessage.length}/5000 ZEICHEN
              </p>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-gradient-to-r from-cyan-900/40 to-cyan-800/30 border border-cyan-500/30 text-cyan-100 rounded hover:from-cyan-800/50 hover:to-cyan-700/40 transition-all disabled:from-slate-800/30 disabled:to-slate-700/20 disabled:border-slate-600/20 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2 font-mono"
              >
                <Send size={16} />
                <span className="tracking-wider">VERÖFFENTLICHEN</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Lade HoloNet...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-dashed border-cyan-500/30 rounded p-12 text-center backdrop-blur-sm">
            <div className="p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-full w-fit mx-auto mb-6">
              <Radio size={48} className="text-cyan-400/60" />
            </div>
            <p className="text-cyan-200 text-lg font-mono tracking-wider">KEINE ÜBERTRAGUNGEN EMPFANGEN</p>
            <p className="text-cyan-400/60 text-sm font-mono mt-2">
              SENDE DIE ERSTE NACHRICHT INS HOLONET
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-gradient-to-br from-slate-950/40 to-cyan-950/20 border border-cyan-500/30 rounded backdrop-blur-sm overflow-hidden"
            >
              {/* Imperial Command Post Header */}
              <div className="bg-gradient-to-r from-slate-900/60 to-slate-800/40 border-b border-cyan-500/20 px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/80 to-blue-600/80 border border-cyan-400/40 rounded-full flex items-center justify-center text-white font-bold font-mono backdrop-blur-sm">
                      {msg.player.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100 font-semibold font-mono tracking-wider">
                          {msg.player.username.toUpperCase()}
                        </span>
                        <span className={`text-xs font-mono tracking-wider ${getFactionColor(msg.player.factionName)}`}>
                          [{msg.player.factionName.toUpperCase()}]
                        </span>
                      </div>
                      <span className="text-xs text-cyan-400/60 font-mono tracking-wider">
                        {formatTime(msg.createdAt).toUpperCase()}
                        {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                          <span className="ml-2 text-cyan-400/40">(BEARBEITET)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {canEdit(msg) && editingId !== msg.id && (
                    <button
                      onClick={() => startEdit(msg)}
                      className="p-2 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-900/20 border border-transparent hover:border-cyan-500/30 rounded transition-all"
                      title="Bearbeiten"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Imperial Command Post Content */}
              <div className="p-4 md:p-6">
                {editingId === msg.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titel (optional)"
                      maxLength={100}
                      className="w-full bg-slate-800/60 border border-cyan-500/30 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono backdrop-blur-sm"
                    />
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      maxLength={5000}
                      rows={6}
                      className="w-full bg-slate-800/60 border border-cyan-500/30 rounded px-4 py-3 text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono resize-y backdrop-blur-sm"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-cyan-400/60 font-mono tracking-wider">
                        {editMessage.length}/5000 ZEICHEN
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-500/30 text-slate-200 rounded hover:from-slate-700/70 hover:to-slate-600/50 transition-all flex items-center gap-2 font-mono tracking-wider"
                        >
                          <X size={16} />
                          ABBRECHEN
                        </button>
                        <button
                          onClick={() => saveEdit(msg.id)}
                          disabled={!editMessage.trim() || sending}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-900/40 to-cyan-800/30 border border-cyan-500/30 text-cyan-100 rounded hover:from-cyan-800/50 hover:to-cyan-700/40 disabled:from-slate-800/30 disabled:to-slate-700/20 disabled:border-slate-600/20 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-mono tracking-wider"
                        >
                          <Send size={16} />
                          SPEICHERN
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.title && (
                      <h3 className="text-xl font-bold text-cyan-100 mb-4 font-mono tracking-wider">
                        {msg.title}
                      </h3>
                    )}
                    <div className="text-cyan-200/90 whitespace-pre-wrap leading-relaxed font-mono">
                      {msg.message}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
