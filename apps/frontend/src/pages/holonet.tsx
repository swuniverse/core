import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface HolonetPost {
  id: number;
  title: string;
  body: string;
  category: string;
  isUnread?: boolean;
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
  unreadCount?: number;
  lastReadPostId?: number;
}

interface CommentsResponse {
  data: Comment[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORIES = ['NEWS', 'ROLEPLAY', 'TRADE', 'RECRUITMENT'] as const;

const CATEGORY_STYLES: Record<string, string> = {
  NEWS: 'border-blue-500/40 bg-blue-950/30 text-blue-200',
  ROLEPLAY: 'border-purple-500/40 bg-purple-950/30 text-purple-200',
  TRADE: 'border-green-500/40 bg-green-950/30 text-green-200',
  RECRUITMENT: 'border-orange-500/40 bg-orange-950/30 text-orange-200',
};

const categoryLabel: Record<string, string> = {
  NEWS: 'News',
  ROLEPLAY: 'Roleplay',
  TRADE: 'Handel',
  RECRUITMENT: 'Rekrutierung',
};

export function HolonetPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { id: routePostId } = useParams<{ id: string }>();
  const [posts, setPosts] = useState<HolonetPost[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [openPostIds, setOpenPostIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadPostId, setLastReadPostId] = useState(0);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [ratingsByPost, setRatingsByPost] = useState<Record<number, number>>({});
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const limit = 20;

  const selectedPostId = routePostId ? Number(routePostId) : null;

  const loadComments = useCallback(async (postId: number) => {
    setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    const res = await api.get<CommentsResponse>(`/holonet/${postId}/comments`);
    setCommentsByPost((prev) => ({ ...prev, [postId]: res.data }));
    setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
  }, []);

  const loadMyRating = useCallback(async (postId: number) => {
    const val = await api.get<number>(`/holonet/${postId}/my-rating`);
    setRatingsByPost((prev) => ({ ...prev, [postId]: val }));
  }, []);

  const openPost = useCallback(
    (post: HolonetPost) => {
      setOpenPostIds((prev) => new Set(prev).add(post.id));
      void loadComments(post.id);
      void loadMyRating(post.id);
    },
    [loadComments, loadMyRating],
  );

  const load = useCallback(
    async (p = page, postId = selectedPostId) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.set('category', filter);
      const trimmedTextSearch = textSearch.trim();
      const trimmedAuthorSearch = authorSearch.trim();
      const trimmedPostSearch = postSearch.trim();
      if (trimmedTextSearch) params.set('text', trimmedTextSearch);
      if (trimmedAuthorSearch) params.set('authorId', trimmedAuthorSearch);
      if (trimmedPostSearch) params.set('postId', trimmedPostSearch);
      params.set('page', String(p));
      const res = await api.get<PostsResponse>(`/holonet?${params.toString()}`);
      const filteredPosts = filter
        ? res.data.filter((post) => post.category === filter)
        : res.data;
      setPosts(filteredPosts);
      setTotal(res.total);
      setUnreadCount(
        res.unreadCount ?? res.data.filter((post) => post.isUnread).length,
      );
      setLastReadPostId(res.lastReadPostId ?? 0);
      setLoading(false);

      if (postId === null || !Number.isFinite(postId)) return;

      const foundPost = filteredPosts.find((post) => post.id === postId);
      if (foundPost) {
        openPost(foundPost);
        return;
      }

      if (filter) return;

      try {
        const fetchedPost = await api.get<HolonetPost>(`/holonet/${postId}`);
        setPosts((prev) => [fetchedPost, ...prev]);
        openPost(fetchedPost);
      } catch {
        setOpenPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
    },
    [authorSearch, filter, openPost, page, postSearch, selectedPostId, textSearch],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const togglePost = (post: HolonetPost) => {
    if (openPostIds.has(post.id)) {
      setOpenPostIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
      return;
    }

    navigate(`/holonet/${post.id}`);
    openPost(post);
  };

  const setBookmark = async (post: HolonetPost) => {
    await api.post('/holonet/checkpoint', { postId: post.id });
    setLastReadPostId(post.id);
    setUnreadCount(posts.filter((item) => item.id > post.id).length);
    setPosts((prev) =>
      prev.map((item) => ({ ...item, isUnread: item.id > post.id })),
    );
  };

  const submitComment = async (post: HolonetPost) => {
    const body = commentDrafts[post.id]?.trim();
    if (!body) return;
    await api.post(`/holonet/${post.id}/comments`, { body });
    setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
    await loadComments(post.id);
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, commentCount: item.commentCount + 1 }
          : item,
      ),
    );
  };

  const deleteComment = async (post: HolonetPost, commentId: number) => {
    await api.delete(`/holonet/comments/${commentId}`);
    setCommentsByPost((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] ?? []).filter((comment) => comment.id !== commentId),
    }));
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
          : item,
      ),
    );
  };

  const rate = async (post: HolonetPost, value: number) => {
    const res = await api.post<{ rating: number }>(`/holonet/${post.id}/rate`, {
      value,
    });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id ? { ...item, rating: res.rating } : item,
      ),
    );
    setRatingsByPost((prev) => ({
      ...prev,
      [post.id]: value,
    }));
  };

  const startEdit = (post: HolonetPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditBody(post.body);
  };

  const saveEdit = async (post: HolonetPost) => {
    const updated = await api.patch<HolonetPost>(`/holonet/${post.id}`, {
      title: editTitle,
      body: editBody,
    });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? { ...item, title: updated.title, body: updated.body }
          : item,
      ),
    );
    setEditingPostId(null);
  };



  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 text-swu-muted md:p-4">
      <div className="border border-swu-border bg-black/40">
        <div className="border-b border-swu-border bg-swu-surface/70 px-3 py-1 text-xs font-bold text-swu-primary">
          / HoloNet / Archiv
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-swu-border/70 bg-swu-bg/70 px-3 py-2 text-[11px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-swu-border px-2 py-0.5 text-swu-muted hover:text-swu-primary disabled:opacity-30"
          >
            &lt;
          </button>
          <span className="border border-swu-border px-2 py-0.5 text-swu-primary">
            Seite {page}{totalPages > 0 ? ` / ${totalPages}` : ''}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={page >= totalPages}
            className="border border-swu-border px-2 py-0.5 text-swu-muted hover:text-swu-primary disabled:opacity-30"
          >
            &gt;
          </button>
        </div>

        <div className="flex flex-col gap-3 p-2 md:flex-row md:items-start">
          <main className="min-w-0 flex-1 space-y-2">
            {loading ? (
              <div className="border border-swu-border bg-swu-surface/40 p-4 text-sm">
                Archivdaten werden geladen...
              </div>
            ) : posts.length === 0 ? (
              <div className="border border-swu-border bg-swu-surface/40 p-4 text-sm">
                Keine Beitraege.
              </div>
            ) : (
              posts.map((post) => {
                const isOpen = openPostIds.has(post.id);
                const comments = commentsByPost[post.id] ?? [];
                const myRating = ratingsByPost[post.id] ?? 0;
                const commentDraft = commentDrafts[post.id] ?? '';
                return (
                  <article
                    key={post.id}
                    className="border border-swu-border bg-swu-surface/70"
                  >
                    <button
                      onClick={() => togglePost(post)}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-swu-bg/50"
                    >
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {lastReadPostId === post.id && (
                            <span className="border border-swu-accent/50 bg-swu-accent/10 px-1.5 py-0.5 text-[10px] text-swu-accent">
                              LESEZEICHEN
                            </span>
                          )}
                          <span
                            className={`border px-1.5 py-0.5 text-[10px] ${CATEGORY_STYLES[post.category] || 'border-swu-border text-swu-muted'}`}
                          >
                            {post.category}
                          </span>
                          <h2 className="truncate text-sm font-bold text-swu-primary">
                            {post.title}
                          </h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[10px] text-swu-muted">
                          <span>{post.author.username}</span>
                          <span className="text-red-400">
                            {new Date(post.createdAt).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-swu-muted">
                        <span>Beitrag #{post.id}</span>
                        <span>{post.commentCount} Kommentare</span>
                        <span>
                          Bewertung {post.rating > 0 ? '+' : ''}
                          {post.rating}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-swu-border/70 md:grid md:grid-cols-[minmax(0,1fr)_132px]">
                        <div className="min-w-0 p-3">
                          {editingPostId === post.id ? (
                            <div className="space-y-2">
                              <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-primary"
                              />
                              <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={6}
                                className="w-full resize-y border border-swu-border bg-swu-bg px-2 py-1 text-sm text-swu-primary"
                              />
                              <div className="flex gap-2 text-xs">
                                <button
                                  onClick={() => saveEdit(post)}
                                  className="border border-swu-accent bg-swu-accent/10 px-3 py-1 text-swu-accent"
                                >
                                  Speichern
                                </button>
                                <button
                                  onClick={() => setEditingPostId(null)}
                                  className="border border-swu-border px-3 py-1 text-swu-muted hover:text-swu-primary"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-base font-bold text-swu-primary">
                                    {post.title}
                                  </h3>
                                  <p className="text-[10px] text-swu-muted">
                                    Gesendet über HoloNet-Kanal {post.category}
                                  </p>
                                </div>
                                {post.authorId === user?.id && (
                                  <button
                                    onClick={() => startEdit(post)}
                                    className="text-[10px] text-swu-muted hover:text-swu-accent"
                                  >
                                    Bearbeiten
                                  </button>
                                )}
                              </div>
                              <BbCodeText
                                text={post.body}
                                className="whitespace-pre-wrap text-sm leading-relaxed text-swu-muted"
                              />
                            </>
                          )}

                          {post.authorId === user?.id ? (
                            <div className="mt-4 border-y border-swu-border/50 py-2 text-xs text-swu-muted">
                              Eigene Beiträge können nicht bewertet werden.
                            </div>
                          ) : (
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-swu-border/50 py-2 text-xs">
                              <button
                                onClick={() => rate(post, -1)}
                                disabled={myRating !== 0}
                                className={`border px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  myRating === -1
                                    ? 'border-red-400 bg-red-500/20 text-red-300'
                                    : 'border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:hover:bg-transparent'
                                }`}
                              >
                                -
                              </button>
                              <span
                                className={`min-w-8 text-center font-bold ${
                                  post.rating > 0
                                    ? 'text-green-400'
                                    : post.rating < 0
                                      ? 'text-red-400'
                                      : 'text-swu-muted'
                                }`}
                              >
                                {post.rating > 0 ? '+' : ''}
                                {post.rating}
                              </span>
                              <button
                                onClick={() => rate(post, 1)}
                                disabled={myRating !== 0}
                                className={`border px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                                  myRating === 1
                                    ? 'border-green-400 bg-green-500/20 text-green-300'
                                    : 'border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:hover:bg-transparent'
                                }`}
                              >
                                +
                              </button>
                              <span className="ml-auto text-[10px] text-swu-muted">
                                {post.commentCount} Kommentare
                              </span>
                            </div>
                          )}

                          <section className="mt-3 space-y-2">
                            <h4 className="text-xs font-bold text-swu-primary">
                              Kommentare ({post.commentCount})
                            </h4>
                            {commentsLoading[post.id] ? (
                              <p className="text-xs text-swu-muted">Laden...</p>
                            ) : comments.length === 0 ? (
                              <p className="text-xs text-swu-muted">Noch keine Kommentare.</p>
                            ) : (
                              comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="border border-swu-border/40 bg-swu-bg/50 p-2"
                                >
                                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
                                    <span className="font-bold text-swu-primary">
                                      {comment.author.username}
                                    </span>
                                    <div className="flex items-center gap-2 text-swu-muted">
                                      <span>
                                        {new Date(comment.createdAt).toLocaleDateString(
                                          'de-DE',
                                        )}
                                      </span>
                                      {comment.authorId === user?.id && (
                                        <button
                                          onClick={() => deleteComment(post, comment.id)}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          X
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <BbCodeText
                                    text={comment.body}
                                    className="whitespace-pre-wrap text-xs text-swu-muted"
                                  />
                                </div>
                              ))
                            )}

                            <div className="relative">
                              <textarea
                                value={commentDraft}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value.slice(0, 250),
                                  }))
                                }
                                rows={2}
                                placeholder="Kommentar (max 250 Zeichen)..."
                                className="w-full resize-none border border-swu-border bg-swu-bg px-2 py-1.5 pr-12 text-xs text-swu-primary"
                              />
                              <span className="absolute bottom-2 right-2 text-[9px] text-swu-muted">
                                {commentDraft.length}/250
                              </span>
                            </div>
                            <button
                              onClick={() => submitComment(post)}
                              disabled={!commentDraft.trim()}
                              className="border border-swu-accent bg-swu-accent/10 px-3 py-1 text-xs text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40"
                            >
                              Kommentieren
                            </button>
                          </section>
                        </div>

                        <aside className="border-t border-swu-border/70 bg-black/30 p-3 text-center md:border-l md:border-t-0">
                          <p className="mb-3 text-[11px] font-bold text-red-400">
                            {new Date(post.createdAt).toLocaleString('de-DE')}
                          </p>
                          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center border border-swu-border bg-swu-bg text-lg font-bold text-swu-primary">
                            {post.author.username.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs text-swu-primary">{post.author.username}</p>
                          <p className="text-[10px] text-swu-muted">Siedler #{post.authorId}</p>
                          <div className="mt-3 flex justify-center gap-1">
                            <button
                              onClick={() => navigate('/messages')}
                              className="border border-swu-border px-1.5 py-0.5 text-xs text-swu-primary hover:border-swu-accent hover:text-swu-accent"
                              title="Nachricht schreiben"
                            >
                              ✉
                            </button>
                            <button
                              disabled
                              className="border border-swu-border px-1.5 py-0.5 text-xs text-swu-muted opacity-60"
                              title="Siedlerprofil vorbereitet"
                            >
                              ?
                            </button>
                            <button
                              onClick={() => setBookmark(post)}
                              className="border border-swu-accent/60 px-1.5 py-0.5 text-[10px] text-swu-accent hover:bg-swu-accent/10"
                            >
                              Lesezeichen
                            </button>
                          </div>
                        </aside>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </main>

          <aside className="w-full shrink-0 space-y-3 md:w-72">
            <section className="border border-swu-border bg-black/40">
              <h3 className="border-b border-swu-border bg-swu-surface/80 px-3 py-1 text-center text-xs font-bold text-swu-primary">
                Holo-Netzwerk
              </h3>
              <div className="space-y-3 p-3 text-xs">
                <button
                  onClick={() => navigate('/holonet/new')}
                  className="w-full border border-swu-accent/70 bg-swu-accent/10 px-2 py-1 text-left text-swu-accent hover:bg-swu-accent/20"
                >
                  ▣ Beitrag schreiben
                </button>
                <div>
                  <h4 className="mb-1 font-bold text-swu-primary">Übersicht</h4>
                  <p>&gt; Neue Beiträge ab Lesezeichen: {unreadCount}</p>
                  <p>&gt; Alle Beiträge: {total}</p>
                  <p className="text-[10px] text-swu-muted">
                    &gt; Lesezeichen: {lastReadPostId > 0 ? `#${lastReadPostId}` : 'nicht gesetzt'}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-bold text-swu-primary">Kategorien</h4>
                  <button
                    onClick={() => {
                      setFilter('');
                      setPage(1);
                    }}
                    className={`block text-left ${!filter ? 'text-swu-accent' : 'hover:text-swu-primary'}`}
                  >
                    &gt; Alle
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilter(cat);
                        setPage(1);
                      }}
                      className={`block text-left ${filter === cat ? 'text-swu-accent' : 'hover:text-swu-primary'}`}
                    >
                      &gt; {categoryLabel[cat]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="border border-swu-border bg-black/40">
              <h3 className="border-b border-swu-border bg-swu-surface/80 px-3 py-1 text-center text-xs font-bold text-swu-primary">
                Suche
              </h3>
              <div className="space-y-1 p-3 text-xs">
                <input
                  value={textSearch}
                  onChange={(e) => {
                    setTextSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="nach Text suchen"
                  className="w-full border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary placeholder:text-swu-muted"
                />
                <input
                  value={authorSearch}
                  onChange={(e) => {
                    setAuthorSearch(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  placeholder="nach Spieler-ID suchen"
                  inputMode="numeric"
                  className="w-full border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary placeholder:text-swu-muted"
                />
                <input
                  value={postSearch}
                  onChange={(e) => {
                    setPostSearch(e.target.value.replace(/\D/g, ''));
                    setPage(1);
                  }}
                  placeholder="nach Beitrag-ID suchen"
                  inputMode="numeric"
                  className="w-full border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary placeholder:text-swu-muted"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function HolonetComposePage() {
  const navigate = useNavigate();
  const [compose, setCompose] = useState({
    title: '',
    body: '',
    category: 'NEWS',
  });

  const createPost = async () => {
    const post = await api.post<HolonetPost>('/holonet', compose);
    navigate(`/holonet/${post.id}`);
  };

  return (
    <div className="p-2 text-swu-muted md:p-4">
      <div className="border border-swu-border bg-black/40">
        <div className="border-b border-swu-border bg-swu-surface/70 px-3 py-1 text-xs font-bold text-swu-primary">
          / HoloNet / Beitrag schreiben
        </div>
        <div className="space-y-4 p-3">
          <label className="block text-xs font-bold text-swu-primary">
            Titel
            <input
              value={compose.title}
              maxLength={80}
              onChange={(e) => setCompose({ ...compose, title: e.target.value })}
              className="mt-1 w-full border border-swu-border bg-swu-bg px-2 py-1 text-sm font-normal text-swu-primary"
            />
          </label>

          <label className="block max-w-xs text-xs font-bold text-swu-primary">
            Kategorie
            <select
              value={compose.category}
              onChange={(e) => setCompose({ ...compose, category: e.target.value })}
              className="mt-1 w-full border border-swu-border bg-swu-bg px-2 py-1 text-sm font-normal text-swu-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel[cat]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-swu-primary">
            Text
            <textarea
              value={compose.body}
              onChange={(e) => setCompose({ ...compose, body: e.target.value })}
              rows={14}
              className="mt-1 w-full resize-y border border-swu-border bg-swu-bg px-2 py-1 text-sm font-normal text-swu-primary"
            />
          </label>

          <section className="border border-swu-border/60 bg-swu-bg/50 p-3 text-xs text-swu-muted">
            <h3 className="mb-2 font-bold text-swu-primary">BB-Code Hilfe</h3>
            <div className="grid gap-1 md:grid-cols-2">
              <code>[b]fett[/b]</code>
              <code>[i]kursiv[/i]</code>
              <code>[u]unterstrichen[/u]</code>
              <code>[h2]Überschrift[/h2]</code>
              <code>[h3]Unterüberschrift[/h3]</code>
              <code>[quote]Zitat[/quote]</code>
              <code className="md:col-span-2">
                [translate]Hello World[translation]Hallo Welt[/translate]
              </code>
            </div>
            <p className="mt-2 text-[10px]">
              Übersetzungen erscheinen unterstrichen und wechseln per Klick zwischen Original und Übersetzung.
            </p>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-swu-border pt-3 text-xs">
            <button
              onClick={createPost}
              disabled={!compose.title.trim() || !compose.body.trim()}
              className="border border-swu-accent bg-swu-accent/10 px-3 py-1 text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => navigate('/holonet')}
              className="border border-swu-border px-3 py-1 text-swu-muted hover:text-swu-primary"
            >
              Abbrechen
            </button>
            <span className="ml-auto text-[10px] text-swu-muted">
              Lesezeichen werden im Archiv manuell gesetzt.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
