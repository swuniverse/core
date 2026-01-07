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
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
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
      <div className="bg-space-light rounded-lg border border-gray-700 shadow-xl mb-6">
        {/* Header */}
        <div className="border-b border-gray-700 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Radio size={24} className="text-cyan-400" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">HoloNet</h1>
              <p className="text-sm text-gray-400">Galaktisches Kommunikationsnetzwerk - Rollenspiel & Story</p>
            </div>
          </div>
        </div>

        {/* New Post Form */}
        <form onSubmit={sendMessage} className="p-4 md:p-6 border-b border-gray-700 bg-gray-800/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Neuer Beitrag
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel (optional)"
              maxLength={100}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
              disabled={sending}
            />
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Dein Rollenspiel-Text oder Story... (max 5000 Zeichen)"
              maxLength={5000}
              rows={6}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none resize-y"
              disabled={sending}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {newMessage.length}/5000 Zeichen
              </p>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition flex items-center gap-2"
              >
                <Send size={18} />
                Veröffentlichen
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
          <div className="bg-space-light rounded-lg border border-gray-700 p-12 text-center text-gray-500">
            <Radio size={48} className="mx-auto mb-4 opacity-20" />
            <p>Noch keine Beiträge im HoloNet.</p>
            <p className="text-sm mt-2">Sei der Erste, der eine Story veröffentlicht!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-space-light rounded-lg border border-gray-700 shadow-lg overflow-hidden"
            >
              {/* Post Header */}
              <div className="bg-gray-800/50 px-4 md:px-6 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {msg.player.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {msg.player.username}
                        </span>
                        <span className={`text-xs ${getFactionColor(msg.player.factionName)}`}>
                          [{msg.player.factionName}]
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.createdAt)}
                        {msg.updatedAt && msg.updatedAt !== msg.createdAt && (
                          <span className="ml-2 text-gray-600">(bearbeitet)</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {canEdit(msg) && editingId !== msg.id && (
                    <button
                      onClick={() => startEdit(msg)}
                      className="text-gray-400 hover:text-cyan-400 transition"
                      title="Bearbeiten"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="p-4 md:p-6">
                {editingId === msg.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titel (optional)"
                      maxLength={100}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      maxLength={5000}
                      rows={6}
                      className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none resize-y"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {editMessage.length}/5000 Zeichen
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition flex items-center gap-2"
                        >
                          <X size={16} />
                          Abbrechen
                        </button>
                        <button
                          onClick={() => saveEdit(msg.id)}
                          disabled={!editMessage.trim() || sending}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition flex items-center gap-2"
                        >
                          <Send size={16} />
                          Speichern
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.title && (
                      <h3 className="text-xl font-bold text-white mb-3">
                        {msg.title}
                      </h3>
                    )}
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
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
