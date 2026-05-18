import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface HolonetPost {
  id: number;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  commentCount: number;
  rating: number;
  createdAt: string;
  authorId: number;
  author: { username: string };
}

interface Comment {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  author: { username: string };
}

interface PostsResponse {
  data: HolonetPost[];
  total: number;
  page: number;
  limit: number;
}

interface CommentsResponse {
  data: Comment[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORIES = ['NEWS', 'ROLEPLAY', 'TRADE', 'RECRUITMENT'] as const;

const CATEGORY_STYLES: Record<string, string> = {
  NEWS: 'bg-blue-900/30 text-blue-300',
  ROLEPLAY: 'bg-purple-900/30 text-purple-300',
  TRADE: 'bg-green-900/30 text-green-300',
  RECRUITMENT: 'bg-orange-900/30 text-orange-300',
};

export function HolonetPage() {
  const user = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<HolonetPost[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<HolonetPost | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ title: '', body: '', category: 'NEWS' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const limit = 20;

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Rating state
  const [myRating, setMyRating] = useState(0);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const load = async (p = page) => {
    const params = new URLSearchParams();
    if (filter) params.set('category', filter);
    params.set('page', String(p));
    const q = params.toString();
    const res = await api.get<PostsResponse>(`/holonet?${q}`);
    setPosts(res.data);
    setTotal(res.total);
    setLoading(false);
  };

  const loadNewCount = async () => {
    const count = await api.get<number>('/holonet/new-count');
    setNewCount(count);
  };

  useEffect(() => {
    load();
    loadNewCount();
  }, [filter, page]);

  const loadComments = async (postId: number) => {
    setCommentsLoading(true);
    const res = await api.get<CommentsResponse>(`/holonet/${postId}/comments`);
    setComments(res.data);
    setCommentsLoading(false);
  };

  const loadMyRating = async (postId: number) => {
    const val = await api.get<number>(`/holonet/${postId}/my-rating`);
    setMyRating(val);
  };

  const selectPost = async (post: HolonetPost) => {
    setSelected(post);
    setEditing(false);
    loadComments(post.id);
    loadMyRating(post.id);
  };

  const createPost = async () => {
    await api.post('/holonet', compose);
    setCompose({ title: '', body: '', category: 'NEWS' });
    setShowCompose(false);
    load();
  };

  const submitComment = async () => {
    if (!selected || !commentBody.trim()) return;
    await api.post(`/holonet/${selected.id}/comments`, { body: commentBody });
    setCommentBody('');
    loadComments(selected.id);
    setSelected({ ...selected, commentCount: selected.commentCount + 1 });
  };

  const deleteComment = async (commentId: number) => {
    if (!selected) return;
    await api.delete(`/holonet/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setSelected({ ...selected, commentCount: selected.commentCount - 1 });
  };

  const rate = async (value: number) => {
    if (!selected) return;
    const res = await api.post<{ rating: number }>(`/holonet/${selected.id}/rate`, { value });
    setSelected({ ...selected, rating: res.rating });
    setMyRating((prev) => (prev === value ? 0 : value));
  };

  const markAsRead = async () => {
    await api.post('/holonet/checkpoint', {});
    setNewCount(0);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditBody(selected.body);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    const updated = await api.patch<HolonetPost>(`/holonet/${selected.id}`, {
      title: editTitle,
      body: editBody,
    });
    setSelected({ ...selected, title: editTitle, body: editBody });
    setPosts((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...p, title: editTitle, body: editBody } : p)),
    );
    setEditing(false);
  };

  const togglePin = async (postId: number) => {
    const updated = await api.patch<HolonetPost>(`/holonet/${postId}/pin`, {});
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isPinned: updated.isPinned } : p)),
    );
    if (selected?.id === postId) {
      setSelected({ ...selected, isPinned: updated.isPinned });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-swu-accent">HoloNet</h1>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors"
        >
          {showCompose ? 'Abbrechen' : 'Neuer Beitrag'}
        </button>
      </div>

      {newCount > 0 && (
        <button
          onClick={markAsRead}
          className="w-full mb-4 py-2 bg-swu-accent/10 border border-swu-accent/30 rounded text-sm text-swu-accent hover:bg-swu-accent/20 transition-colors"
        >
          {newCount} neue{newCount === 1 ? 'r' : ''} Beitr{newCount === 1 ? 'ag' : 'aege'} seit letztem Besuch — als gelesen markieren
        </button>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setFilter(''); setPage(1); }}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            !filter ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted hover:border-swu-primary'
          }`}
        >
          Alle
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setFilter(cat); setPage(1); }}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              filter === cat ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted hover:border-swu-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 mb-4 max-w-lg space-y-3">
          <input
            value={compose.title}
            onChange={(e) => setCompose({ ...compose, title: e.target.value })}
            placeholder="Titel"
            className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary"
          />
          <select
            value={compose.category}
            onChange={(e) => setCompose({ ...compose, category: e.target.value })}
            className="bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <textarea
            value={compose.body}
            onChange={(e) => setCompose({ ...compose, body: e.target.value })}
            rows={4}
            placeholder="Beitrag schreiben..."
            className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary resize-none"
          />
          <button
            onClick={createPost}
            disabled={!compose.title || !compose.body}
            className="px-4 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
          >
            Veroeffentlichen
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          {loading ? (
            <p className="text-swu-muted text-sm">Laden...</p>
          ) : posts.length === 0 ? (
            <p className="text-swu-muted text-sm">Keine Beitraege.</p>
          ) : (
            posts.map((post) => (
              <button
                key={post.id}
                onClick={() => selectPost(post)}
                className={`w-full text-left bg-swu-surface border rounded-lg p-3 transition-colors hover:border-swu-primary ${
                  selected?.id === post.id ? 'border-swu-accent' : 'border-swu-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {post.isPinned && <span className="text-xs" title="Angepinnt">📌</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLES[post.category] || ''}`}>
                    {post.category}
                  </span>
                  <span className="text-sm font-bold text-swu-primary flex-1">{post.title}</span>
                  <span className="text-[10px] text-swu-muted">
                    {post.rating !== 0 && (
                      <span className={post.rating > 0 ? 'text-green-400' : 'text-red-400'}>
                        {post.rating > 0 ? '+' : ''}{post.rating}
                      </span>
                    )}
                    {post.commentCount > 0 && <span className="ml-2">💬{post.commentCount}</span>}
                  </span>
                </div>
                <p className="text-[10px] text-swu-muted">
                  {post.author.username} · {new Date(post.createdAt).toLocaleDateString('de-DE')}
                </p>
              </button>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
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

        {/* Detail Panel */}
        {selected && (
          <div className="w-[420px] bg-swu-surface border border-swu-border rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              {selected.isPinned && <span title="Angepinnt">📌</span>}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLES[selected.category] || ''}`}>
                {selected.category}
              </span>
              {user?.isAdmin && (
                <button
                  onClick={() => togglePin(selected.id)}
                  className="ml-auto text-[10px] text-swu-muted hover:text-swu-accent"
                >
                  {selected.isPinned ? 'Loslösen' : 'Anheften'}
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2 mb-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-swu-bg border border-swu-border rounded px-2 py-1 text-sm text-swu-primary"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full bg-swu-bg border border-swu-border rounded px-2 py-1 text-sm text-swu-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1 text-xs bg-swu-accent/20 border border-swu-accent text-swu-accent rounded"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1 text-xs border border-swu-border text-swu-muted rounded"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-bold text-swu-primary mb-1">{selected.title}</h2>
                  {selected.authorId === user?.id && (
                    <button
                      onClick={startEdit}
                      className="text-xs text-swu-muted hover:text-swu-accent"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-swu-muted mb-3">
                  {selected.author.username} · {new Date(selected.createdAt).toLocaleString('de-DE')}
                </p>
                <div className="text-sm text-swu-muted whitespace-pre-wrap mb-4">
                  {selected.body}
                </div>
              </>
            )}

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4 py-2 border-t border-b border-swu-border/50">
              <button
                onClick={() => rate(1)}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  myRating === 1
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-swu-muted hover:text-green-400'
                }`}
              >
                👍
              </button>
              <span className={`text-sm font-bold ${
                selected.rating > 0 ? 'text-green-400' : selected.rating < 0 ? 'text-red-400' : 'text-swu-muted'
              }`}>
                {selected.rating > 0 ? '+' : ''}{selected.rating}
              </span>
              <button
                onClick={() => rate(-1)}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  myRating === -1
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-swu-muted hover:text-red-400'
                }`}
              >
                👎
              </button>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-swu-muted">
                Kommentare ({selected.commentCount})
              </h4>

              {commentsLoading ? (
                <p className="text-xs text-swu-muted">Laden...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-swu-muted">Noch keine Kommentare.</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-swu-bg/50 border border-swu-border/30 rounded p-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-swu-primary">
                        {c.author.username}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-swu-muted">
                          {new Date(c.createdAt).toLocaleDateString('de-DE')}
                        </span>
                        {c.authorId === user?.id && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="text-[9px] text-red-400 hover:text-red-300"
                          >
                            X
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-swu-muted">{c.body}</p>
                  </div>
                ))
              )}

              {/* Comment Form */}
              <div className="pt-2">
                <div className="relative">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value.slice(0, 250))}
                    rows={2}
                    placeholder="Kommentar (max 250 Zeichen)..."
                    className="w-full bg-swu-bg border border-swu-border rounded px-2 py-1.5 text-xs text-swu-primary resize-none"
                  />
                  <span className="absolute bottom-2 right-2 text-[9px] text-swu-muted">
                    {commentBody.length}/250
                  </span>
                </div>
                <button
                  onClick={submitComment}
                  disabled={!commentBody.trim()}
                  className="mt-1 px-3 py-1 text-xs bg-swu-accent/20 border border-swu-accent text-swu-accent rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
                >
                  Kommentieren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
