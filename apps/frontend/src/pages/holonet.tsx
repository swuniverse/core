import { PlayerName } from '../components/PlayerName';
import { useCallback, useEffect, useState } from 'react';
import { formatGameDate, formatGameDateTime } from '../lib/format';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { useHolonetUnreadStore } from '../stores/holonet-unread.store';
import { PmLink } from '../components/PmLink';
import type { RpgPlotDto, RpgPlotListDto, UserCharacterDto } from '@swuniverse/shared';
import { tutorialEvent } from '../components/tutorial/useTutorial';

type Character = Pick<UserCharacterDto, 'id' | 'userId' | 'name' | 'avatar' | 'description'>;
type TaggedCharacter = Character & { user: { id: number; username: string } };

function CharacterAvatar({ character }: { character: Character }) {
  return character.avatar
    ? <img src={character.avatar} alt={`${character.name} Avatar`} className="size-10 rounded object-cover" />
    : <span aria-label={`${character.name} Avatar`} className="flex size-10 items-center justify-center rounded bg-swu-bg text-swu-primary">{character.name[0]}</span>;
}

function CharacterSelector({ selected, onChange }: {
  selected: Character[];
  onChange: (characters: Character[]) => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const [available, setAvailable] = useState<Character[]>(selected);
  const [playerId, setPlayerId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void api.get<UserCharacterDto[]>(`/rpg/characters/player/${userId}`)
      .then((characters) => { if (active && Array.isArray(characters)) setAvailable((current) => [...current, ...characters.filter((character) => !current.some((item) => item.id === character.id))]); })
      .catch(() => { if (active) setError('Eigene Charaktere konnten nicht geladen werden.'); });
    return () => { active = false; };
  }, [userId]);

  const loadPlayer = async () => {
    try {
      setError('');
      const characters = await api.get<UserCharacterDto[]>(`/rpg/characters/player/${Number(playerId)}`);
      setAvailable((current) => [...current, ...characters.filter((character) => !current.some((item) => item.id === character.id))]);
      if (characters.length === 0) setError('Dieser Spieler hat keine Charaktere.');
    } catch {
      setError('Charaktere konnten nicht geladen werden.');
    }
  };
  const characters = [...selected, ...available.filter((character) => !selected.some((item) => item.id === character.id))];

  return <fieldset className="space-y-2 border border-swu-border p-3 text-xs">
    <legend className="font-bold text-swu-primary">Charaktere markieren (maximal 10)</legend>
    <div className="flex flex-wrap items-end gap-2">
      <label>Spieler-ID für Charaktere
        <input value={playerId} inputMode="numeric" onChange={(event) => setPlayerId(event.target.value.replace(/\D/g, ''))} className="ml-2 w-24 border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary" />
      </label>
      <button type="button" disabled={!Number(playerId)} onClick={loadPlayer} className="border border-swu-border px-2 py-1 disabled:opacity-40">Charaktere laden</button>
    </div>
    {error && <p role="status" className="text-swu-danger">{error}</p>}
    {characters.map((character) => {
      const checked = selected.some((item) => item.id === character.id);
      return <label key={character.id} className="flex items-center gap-2">
        <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 10} onChange={() => onChange(checked ? selected.filter((item) => item.id !== character.id) : [...selected, character])} />
        {character.name} (Spieler #{character.userId})
      </label>;
    })}
  </fieldset>;
}

interface HolonetPost {
  id: number;
  title: string;
  body: string;
  category: string;
  isUnread?: boolean;
  commentCount: number;
  rating: number;
  positiveCount: number;
  totalCount: number;
  createdAt: string;
  /** `null` once the author deleted the account ("Gelöschter Siedler"). */
  authorId: number | null;
  author: { username: string };
  plotId?: number | null;
  plot?: { id: number; title: string } | null;
  characters?: TaggedCharacter[];
}

interface Comment {
  id: number;
  body: string;
  createdAt: string;
  /** `null` once the author deleted the account ("Gelöschter Siedler"). */
  authorId: number | null;
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

interface PlotPostRequest {
  id: number;
  postId: number;
  plotId: number;
  requesterId: number;
  post: Pick<HolonetPost, 'id' | 'title'>;
  plot: Pick<RpgPlotDto, 'id' | 'title'>;
  requester: { username: string };
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
  const refreshHolonetUnread = useHolonetUnreadStore((state) => state.refresh);
  const clearHolonetUnread = useHolonetUnreadStore((state) => state.clear);
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
  const [viewCharacter, setViewCharacter] = useState<TaggedCharacter | null>(null);
  const [adminDeletePost, setAdminDeletePost] = useState<HolonetPost | null>(null);
  const [adminDeleteReason, setAdminDeleteReason] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCharacters, setEditCharacters] = useState<Character[]>([]);
  const [editError, setEditError] = useState('');
  const [textSearch, setTextSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [myPlots, setMyPlots] = useState<RpgPlotDto[]>([]);
  const [plotRequests, setPlotRequests] = useState<PlotPostRequest[]>([]);
  const [assigningPost, setAssigningPost] = useState<number | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [plotRequestError, setPlotRequestError] = useState('');
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

  const loadPlotWorkflow = useCallback(async () => {
    const [plotsResult, requestsResult] = await Promise.allSettled([
      Promise.resolve().then(() => api.get<RpgPlotListDto>('/rpg/plots/mine?page=1')),
      Promise.resolve().then(() => api.get<PlotPostRequest[]>('/holonet/plot-post-requests')),
    ]);
    if (plotsResult.status === 'fulfilled') {
      setMyPlots(plotsResult.value.data.filter((plot) => plot.endedAt === null));
    }
    if (requestsResult.status === 'fulfilled') {
      setPlotRequests(requestsResult.value);
    }
  }, []);

  useEffect(() => {
    void load();
    void refreshHolonetUnread();
    if (user?.id) void loadPlotWorkflow();
  }, [load, loadPlotWorkflow, refreshHolonetUnread, user?.id]);

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
    clearHolonetUnread();
    void refreshHolonetUnread();
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

  const addPostToPlot = async (post: HolonetPost) => {
    if (!selectedPlotId) return;
    setPlotRequestError('');
    try {
      await api.post(`/holonet/${post.id}/plots`, { plotId: Number(selectedPlotId) });
      setAssigningPost(null);
      setSelectedPlotId('');
      if (post.authorId === user?.id) {
        setPosts((current) => current.map((item) =>
          item.id === post.id ? { ...item, plotId: Number(selectedPlotId), category: 'ROLEPLAY' } : item,
        ));
      }
      await loadPlotWorkflow();
    } catch (error) {
      setPlotRequestError(error instanceof Error ? error.message : 'Der Beitrag konnte nicht zugeordnet werden.');
    }
  };

  const decidePlotRequest = async (request: PlotPostRequest, accept: boolean) => {
    setPlotRequestError('');
    try {
      await api.post(`/holonet/plot-post-requests/${request.id}/${accept ? 'accept' : 'reject'}`, {});
      setPlotRequests((current) => current.filter((item) => item.id !== request.id));
      if (accept) {
        setPosts((current) => current.map((item) =>
          item.id === request.postId ? { ...item, plotId: request.plotId, category: 'ROLEPLAY' } : item,
        ));
      }
    } catch (error) {
      setPlotRequestError(error instanceof Error ? error.message : 'Der Antrag konnte nicht bearbeitet werden.');
    }
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
    await api.post<{ rating: number }>(`/holonet/${post.id}/rate`, { value });
    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id
          ? {
              ...item,
              rating: item.rating + value,
              positiveCount: item.positiveCount + (value === 1 ? 1 : 0),
              totalCount: item.totalCount + 1,
            }
          : item,
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
    setEditCharacters(post.characters ?? []);
    setEditError('');
  };

  const saveEdit = async (post: HolonetPost) => {
    try {
      setEditError('');
      const updated = await api.patch<HolonetPost>(`/holonet/${post.id}`, {
        title: editTitle,
        body: editBody,
        characterIds: editCharacters.map((character) => character.id),
      });
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, title: updated.title, body: updated.body, characters: updated.characters }
            : item,
        ),
      );
      setEditingPostId(null);
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : 'Beitrag konnte nicht gespeichert werden.');
    }
  };



  const confirmAdminDelete = async () => {
    if (!adminDeletePost) return;
    await api.delete(`/holonet/${adminDeletePost.id}/admin`, {
      body: JSON.stringify({ reason: adminDeleteReason }),
    });
    setPosts((prev) => prev.filter((post) => post.id !== adminDeletePost.id));
    setAdminDeletePost(null);
    setAdminDeleteReason('');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 text-swu-muted md:p-4">
      {viewCharacter && (
        <div role="dialog" aria-modal="true" aria-label={viewCharacter.name} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onKeyDown={(event) => { if (event.key === 'Escape') setViewCharacter(null); }}>
          <div className="w-full max-w-lg space-y-3 border border-swu-border bg-swu-bg p-4">
            <h2 className="text-sm font-bold text-swu-primary">{viewCharacter.name}</h2>
            <CharacterAvatar character={viewCharacter} />
            <BbCodeText allowExternalImages text={viewCharacter.description} className="whitespace-pre-wrap text-sm" />
            <p className="text-xs">Besitzer: <Link to={`/players/${viewCharacter.user.id}`} className="text-swu-accent"><PlayerName name={viewCharacter.user.username} /></Link></p>
            <button type="button" autoFocus onClick={() => setViewCharacter(null)} className="border border-swu-border px-3 py-1 text-xs">Schließen</button>
          </div>
        </div>
      )}
      {adminDeletePost && (
        <div role="dialog" aria-modal="true" aria-labelledby="admin-delete-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg border border-swu-border bg-swu-bg p-4">
            <h2 id="admin-delete-title" className="mb-3 text-sm font-bold text-swu-primary">
              HoloNet-Beitrag #{adminDeletePost.id} löschen
            </h2>
            <label className="block text-xs text-swu-muted">
              Begründung (optional)
              <textarea
                value={adminDeleteReason}
                maxLength={500}
                onChange={(event) => setAdminDeleteReason(event.target.value)}
                rows={4}
                className="mt-1 w-full border border-swu-border bg-black/40 p-2 text-swu-primary"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button onClick={() => setAdminDeletePost(null)} className="border border-swu-border px-3 py-1">
                Abbrechen
              </button>
              <button onClick={confirmAdminDelete} className="border border-red-500/60 px-3 py-1 text-red-300">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
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
          {user && plotRequests.length > 0 && (
            <aside className="w-full space-y-2 md:w-64 md:shrink-0">
              <section className="border border-swu-border bg-black/40">
                <h2 className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">Offene Plot-Anträge</h2>
                {plotRequests.map((request) => (
                  <article key={request.id} className="space-y-2 border-b border-swu-border/60 p-3 text-xs">
                    <p><Link className="text-swu-accent hover:underline" to={`/holonet/${request.postId}`}>{request.post.title}</Link> für Plot „{request.plot.title}“</p>
                    <p className="text-swu-muted">Antrag von <PlayerName name={request.requester.username} /></p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void decidePlotRequest(request, true)} className="border border-green-500/50 px-2 py-1 text-green-400">Annehmen</button>
                      <button type="button" onClick={() => void decidePlotRequest(request, false)} className="border border-red-500/50 px-2 py-1 text-red-400">Ablehnen</button>
                    </div>
                  </article>
                ))}
              </section>
              {plotRequestError && <p role="alert" className="text-xs text-swu-danger">{plotRequestError}</p>}
            </aside>
          )}
          <main data-tutorial="holonet-archive" className="min-w-0 flex-1 space-y-2">
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
                          <span><PlayerName name={post.author.username} /></span>
                          <span className="text-red-400">
                            {formatGameDate(post.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-swu-muted">
                        <span>Beitrag #{post.id}</span>
                        <span>{post.commentCount} Kommentare</span>
                        {post.totalCount > 0 && (
                          <span>Bewertung {post.positiveCount}/{post.totalCount}</span>
                        )}
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
                              <CharacterSelector selected={editCharacters} onChange={setEditCharacters} />
                              {editError && <p role="alert" className="text-xs text-swu-danger">{editError}</p>}
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
                                  {post.plot && (
                                    <Link
                                      to={`/holonet/plots/${post.plot.id}`}
                                      className="text-[11px] text-swu-accent hover:underline"
                                    >
                                      Plot: {post.plot.title}
                                    </Link>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {user && myPlots.length > 0 && post.plotId == null && (post.authorId === user.id || post.category === 'ROLEPLAY') && (
                                    <button type="button" onClick={() => { setAssigningPost(post.id); setSelectedPlotId(''); setPlotRequestError(''); }} className="text-[10px] text-swu-accent hover:underline">
                                      Zu Plot hinzufügen
                                    </button>
                                  )}
                                  {post.authorId === user?.id && (
                                    <button
                                      onClick={() => startEdit(post)}
                                      className="text-[10px] text-swu-muted hover:text-swu-accent"
                                    >
                                      Bearbeiten
                                    </button>
                                  )}
                                  {user?.isAdmin && post.authorId !== user.id && (
                                    <button
                                      onClick={() => setAdminDeletePost(post)}
                                      className="text-[10px] text-red-400 hover:text-red-300"
                                    >
                                      Löschen (Admin)
                                    </button>
                                  )}
                                </div>
                              </div>
                              <BbCodeText
                                text={post.body}
                                allowExternalImages
                                className="whitespace-pre-wrap text-sm leading-relaxed text-swu-muted"
                              />
                              {assigningPost === post.id && (
                                <div className="mt-3 flex flex-wrap items-end gap-2 border border-swu-border p-2 text-xs">
                                  <label>Plot auswählen
                                    <select aria-label="Plot auswählen" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)} className="ml-2 border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary">
                                      <option value="">Plot wählen</option>
                                      {myPlots.map((plot) => <option key={plot.id} value={plot.id}>{plot.title}</option>)}
                                    </select>
                                  </label>
                                  <button type="button" disabled={!selectedPlotId} onClick={() => void addPostToPlot(post)} className="border border-swu-accent px-2 py-1 text-swu-accent disabled:opacity-40">{post.authorId === user?.id ? 'Zuordnen' : 'Antrag stellen'}</button>
                                  <button type="button" onClick={() => setAssigningPost(null)} className="border border-swu-border px-2 py-1 text-swu-muted">Abbrechen</button>
                                  {plotRequestError && <p role="alert" className="w-full text-swu-danger">{plotRequestError}</p>}
                                </div>
                              )}
                              {!!post.characters?.length && <section className="mt-3 space-y-2">
                                <h4 className="text-xs font-bold text-swu-primary">Markierte Charaktere</h4>
                                <div className="flex flex-wrap gap-2">{post.characters.map((character) => (
                                  <button key={character.id} type="button" aria-label={character.name} onClick={() => setViewCharacter(character)} className="flex items-center gap-2 border border-swu-border px-2 py-1 text-xs text-swu-accent">
                                    <CharacterAvatar character={character} />{character.name}
                                  </button>
                                ))}</div>
                              </section>}
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
                              {post.totalCount > 0 && (
                                <div
                                  role="progressbar"
                                  aria-label={`Bewertung ${post.positiveCount} von ${post.totalCount}`}
                                  aria-valuemin={0}
                                  aria-valuemax={post.totalCount}
                                  aria-valuenow={post.positiveCount}
                                  className="relative h-5 min-w-28 overflow-hidden border border-yellow-500/60 bg-black/50 text-center text-[10px] text-yellow-100"
                                >
                                  <div
                                    className="absolute inset-y-0 left-0 bg-yellow-500/40"
                                    style={{
                                      width: `${(post.positiveCount / post.totalCount) * 100}%`,
                                    }}
                                  />
                                  <span className="relative">Bewertung {post.positiveCount} / {post.totalCount}</span>
                                </div>
                              )}
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
                                      <PlayerName name={comment.author.username} />
                                    </span>
                                    <div className="flex items-center gap-2 text-swu-muted">
                                      <span>
                                        {formatGameDate(comment.createdAt)}
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
                                    allowExternalImages
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
                            {formatGameDateTime(post.createdAt)}
                          </p>
                          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center border border-swu-border bg-swu-bg text-lg font-bold text-swu-primary">
                            {post.author.username.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs text-swu-primary"><PlayerName name={post.author.username} /></p>
                          {post.authorId !== null && (
                            <p className="text-[10px] text-swu-muted">Siedler #{post.authorId}</p>
                          )}
                          <div className="mt-3 flex justify-center gap-1">
                            {post.authorId !== null && (
                              <>
                                <PmLink
                                  playerId={post.authorId}
                                  playerName={post.author.username}
                                  className="border border-swu-border p-1 text-swu-primary hover:border-swu-accent"
                                />
                                <Link
                                  to={`/players/${post.authorId}`}
                                  className="border border-swu-border p-1 text-swu-primary hover:border-swu-accent"
                                  title={`Profil von ${post.author.username} öffnen`}
                                  aria-label={`Profil von ${post.author.username} öffnen`}
                                >
                                  <img src="/assets/buttons/info1.png" alt="" className="size-4" />
                                </Link>
                              </>
                            )}
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
                <button
                  onClick={() => navigate('/holonet/plots')}
                  className="w-full border border-swu-border px-2 py-1 text-left text-swu-primary hover:border-swu-accent"
                >
                  ▣ Plots
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
    plotId: null as number | null,
  });
  const [plots, setPlots] = useState<RpgPlotDto[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [setBookmark, setSetBookmark] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    void api.get<RpgPlotListDto>('/rpg/plots/mine?page=1').then((result) => {
      setPlots(result.data.filter((plot) => plot.endedAt === null));
    });
  }, []);

  const createPost = async () => {
    let post: HolonetPost;
    try {
      setCreateError('');
      post = await api.post<HolonetPost>('/holonet', {
        title: compose.title,
        body: compose.body,
        category: compose.plotId ? 'ROLEPLAY' : compose.category,
        ...(compose.plotId ? { plotId: compose.plotId } : {}),
        ...(selectedCharacters.length ? { characterIds: selectedCharacters.map((character) => character.id) } : {}),
      });
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'Beitrag konnte nicht erstellt werden.');
      return;
    }
    await tutorialEvent('holonet.post.created');
    if (setBookmark) {
      await api.post('/holonet/checkpoint', { postId: post.id });
    }
    navigate(`/holonet/${post.id}`);
  };

  return (
    <div className="p-2 text-swu-muted md:p-4">
      <div className="border border-swu-border bg-black/40">
        <div className="border-b border-swu-border bg-swu-surface/70 px-3 py-1 text-xs font-bold text-swu-primary">
          / HoloNet / Beitrag schreiben
        </div>
        <div data-tutorial="holonet-compose" className="space-y-4 p-3">
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
            Plot
            <select
              value={compose.plotId ?? ''}
              onChange={(event) => {
                const plotId = event.target.value ? Number(event.target.value) : null;
                setCompose({
                  ...compose,
                  plotId,
                  category: plotId ? 'ROLEPLAY' : compose.category,
                });
              }}
              className="mt-1 w-full border border-swu-border bg-swu-bg px-2 py-1 text-sm font-normal text-swu-primary"
            >
              <option value="">Kein Plot</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>{plot.title}</option>
              ))}
            </select>
          </label>

          <label className="block max-w-xs text-xs font-bold text-swu-primary">
            Kategorie
            <select
              value={compose.plotId ? 'ROLEPLAY' : compose.category}
              disabled={compose.plotId !== null}
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

          <CharacterSelector selected={selectedCharacters} onChange={setSelectedCharacters} />
          {createError && <p role="alert" className="text-xs text-swu-danger">{createError}</p>}

          {showPreview && (
            <section className="border border-swu-accent/50 bg-black/30 p-3">
              <h2 className="mb-2 text-sm font-bold text-swu-primary">
                {compose.title.trim() || 'Ohne Titel'}
              </h2>
              <BbCodeText
                text={compose.body}
                allowExternalImages
                className="whitespace-pre-wrap text-sm text-swu-primary"
              />
            </section>
          )}

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
              data-tutorial="holonet-publish"
              onClick={createPost}
              disabled={(!compose.plotId && !compose.title.trim()) || !compose.body.trim()}
              className="border border-swu-accent bg-swu-accent/10 px-3 py-1 text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40"
            >
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => setShowPreview((value) => !value)}
              className="border border-swu-border px-3 py-1 text-swu-muted hover:text-swu-primary"
            >
              {showPreview ? 'Bearbeiten' : 'Vorschau'}
            </button>
            <button
              onClick={() => navigate('/holonet')}
              className="border border-swu-border px-3 py-1 text-swu-muted hover:text-swu-primary"
            >
              Abbrechen
            </button>
            <label className="ml-auto flex items-center gap-2 text-[10px] text-swu-muted">
              <input
                type="checkbox"
                checked={setBookmark}
                onChange={(event) => setSetBookmark(event.target.checked)}
              />
              Lesezeichen auf diesen Beitrag setzen
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
