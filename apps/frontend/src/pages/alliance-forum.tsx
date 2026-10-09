import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type {
  CreateForumPostResponse,
  CreateForumTopicResponse,
  ForumAuthorDto,
  ForumBoardPageDto,
  ForumOverviewDto,
  ForumPaginationDto,
  ForumTopicPageDto,
} from '@swuniverse/shared';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';
import { getErrorMessage } from '../lib/errors';

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const formatDateTime = (iso: string) => dateTimeFormatter.format(new Date(iso));

const inputClass =
  'w-full border border-swu-border bg-swu-bg px-2 py-1.5 text-sm text-swu-text focus:border-swu-accent focus:outline-none';
const buttonClass =
  'border border-swu-border px-3 py-1 text-xs text-swu-muted hover:text-swu-primary disabled:opacity-40';
const primaryButtonClass =
  'border border-swu-accent bg-swu-accent/10 px-3 py-1 text-xs text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40';

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="text-2xl font-bold text-swu-accent"
      style={{ fontFamily: 'var(--font-swu-display)' }}
    >
      {children}
    </h1>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border border-swu-danger/60 bg-swu-danger/10 px-3 py-2 text-sm text-red-300"
    >
      {message}
    </p>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-xs text-swu-muted hover:text-swu-accent">
      ← {label}
    </Link>
  );
}

function AuthorLine({ author }: { author: ForumAuthorDto }) {
  const meta = [author.factionName, author.roleTitle].filter(Boolean);
  return (
    <span>
      {author.userId === null ? (
        <span className="text-swu-muted">{author.name}</span>
      ) : (
        <Link
          to={`/players/${author.userId}`}
          className="text-swu-accent hover:underline"
        >
          {author.name}
        </Link>
      )}
      {meta.length > 0 && (
        <span className="text-swu-muted"> ({meta.join(', ')})</span>
      )}
    </span>
  );
}

function Pagination({
  pagination,
  onPage,
}: {
  pagination: ForumPaginationDto;
  onPage: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav aria-label="Seiten" className="flex items-center gap-3 text-xs">
      <button
        type="button"
        className={buttonClass}
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
      >
        Zurück
      </button>
      <span className="text-swu-muted">
        Seite {pagination.page} von {pagination.totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPage(pagination.page + 1)}
      >
        Weiter
      </button>
    </nav>
  );
}

function useLoad<T>(load: () => Promise<T>, fallback: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setData(null);
      setError(getErrorMessage(err, fallback));
    }
  }, [load, fallback]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload };
}

function pageParam(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

// --- Forum (board list) ---

export function AllianceForumPage() {
  const { id } = useParams<{ id: string }>();
  const base = `/alliances/${id}`;
  const load = useCallback(
    () => api.get<ForumOverviewDto>(`${base}/forum/boards`),
    [base],
  );
  const { data, error, reload } = useLoad(
    load,
    'Das Forum konnte nicht geladen werden.',
  );
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api.post(`${base}/forum/boards`, { name });
      setName('');
      await reload();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Das Board konnte nicht angelegt werden.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackLink to={base} label="Zur Allianz" />
      <Title>Allianzforum</Title>
      <ErrorMessage message={error} />
      {data && (
        <>
          {data.boards.length === 0 ? (
            <p className="text-sm text-swu-muted">Noch keine Boards vorhanden.</p>
          ) : (
            <ul className="space-y-2">
              {data.boards.map((board) => (
                <li
                  key={board.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-swu-border p-3"
                >
                  <div>
                    <Link
                      to={`${base}/forum/boards/${board.id}`}
                      className="font-semibold text-swu-accent hover:underline"
                    >
                      {board.name}
                    </Link>
                    <p className="text-xs text-swu-muted">
                      {board.topicCount} Themen, {board.postCount} Beiträge
                    </p>
                  </div>
                  <div className="text-xs text-swu-muted">
                    {board.lastPost ? (
                      <>
                        Letzter Beitrag:{' '}
                        <Link
                          to={`${base}/forum/topics/${board.lastPost.topicId}`}
                          className="hover:text-swu-accent"
                        >
                          {board.lastPost.topicTitle}
                        </Link>{' '}
                        von <AuthorLine author={board.lastPost.author} />,{' '}
                        {formatDateTime(board.lastPost.createdAt)}
                      </>
                    ) : (
                      'Noch keine Beiträge'
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.capabilities.manageBoards && (
            <form onSubmit={submit} className="space-y-2 border border-swu-border p-3">
              <label htmlFor="forum-board-name" className="text-xs text-swu-muted">
                Neues Board
              </label>
              <input
                id="forum-board-name"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <ErrorMessage message={formError} />
              <button type="submit" className={primaryButtonClass} disabled={busy}>
                Board anlegen
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

// --- Board (topic list) ---

export function AllianceForumBoardPage() {
  const { id, boardId } = useParams<{ id: string; boardId: string }>();
  const base = `/alliances/${id}`;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = pageParam(params);
  const load = useCallback(
    () =>
      api.get<ForumBoardPageDto>(
        `${base}/forum/boards/${boardId}/topics?page=${page}`,
      ),
    [base, boardId, page],
  );
  const { data, error } = useLoad(load, 'Das Board konnte nicht geladen werden.');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const created = await api.post<CreateForumTopicResponse>(
        `${base}/forum/boards/${boardId}/topics`,
        { title, text },
      );
      navigate(`${base}/forum/topics/${created.topicId}?page=${created.page}`);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Das Thema konnte nicht angelegt werden.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackLink to={`${base}/forum`} label="Zum Forum" />
      {data && <Title>{data.board.name}</Title>}
      <ErrorMessage message={error} />
      {data && (
        <>
          {data.topics.length === 0 ? (
            <p className="text-sm text-swu-muted">Noch keine Themen vorhanden.</p>
          ) : (
            <ul className="space-y-2">
              {data.topics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border border-swu-border p-3"
                >
                  <div>
                    {topic.important && (
                      <span className="mr-2 border border-swu-accent px-1 text-xs text-swu-accent">
                        Wichtig
                      </span>
                    )}
                    <Link
                      to={`${base}/forum/topics/${topic.id}`}
                      className="font-semibold text-swu-accent hover:underline"
                    >
                      {topic.title}
                    </Link>
                    <p className="text-xs text-swu-muted">
                      von <AuthorLine author={topic.author} />,{' '}
                      {formatDateTime(topic.createdAt)}
                    </p>
                  </div>
                  <div className="text-xs text-swu-muted">
                    {topic.postCount} Beiträge, zuletzt{' '}
                    {formatDateTime(topic.lastActivityAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            pagination={data.pagination}
            onPage={(next) => setParams({ page: String(next) })}
          />
          <form onSubmit={submit} className="space-y-2 border border-swu-border p-3">
            <h2 className="text-sm font-semibold text-swu-text">Neues Thema</h2>
            <label htmlFor="forum-topic-title" className="text-xs text-swu-muted">
              Titel
            </label>
            <input
              id="forum-topic-title"
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <label htmlFor="forum-topic-text" className="text-xs text-swu-muted">
              Beitrag
            </label>
            <textarea
              id="forum-topic-text"
              rows={6}
              className={inputClass}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <ErrorMessage message={formError} />
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              Thema anlegen
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// --- Topic (posts) ---

export function AllianceForumTopicPage() {
  const { id, topicId } = useParams<{ id: string; topicId: string }>();
  const base = `/alliances/${id}`;
  const [params, setParams] = useSearchParams();
  const page = pageParam(params);
  const load = useCallback(
    () =>
      api.get<ForumTopicPageDto>(
        `${base}/forum/topics/${topicId}?page=${page}`,
      ),
    [base, topicId, page],
  );
  const { data, error, reload } = useLoad(
    load,
    'Das Thema konnte nicht geladen werden.',
  );
  const [text, setText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const created = await api.post<CreateForumPostResponse>(
        `${base}/forum/topics/${topicId}/posts`,
        { text },
      );
      setText('');
      if (created.page === page) await reload();
      else setParams({ page: String(created.page) });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Der Beitrag konnte nicht gesendet werden.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {data && (
        <BackLink
          to={`${base}/forum/boards/${data.board.id}`}
          label={data.board.name}
        />
      )}
      {data && (
        <Title>
          {data.topic.important && (
            <span className="mr-2 text-sm">[Wichtig]</span>
          )}
          {data.topic.title}
        </Title>
      )}
      <ErrorMessage message={error} />
      {data && (
        <>
          <ul className="space-y-3">
            {data.posts.map((post) => (
              <li key={post.id} className="space-y-2 border border-swu-border p-3">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <AuthorLine author={post.author} />
                  <span className="text-swu-muted">
                    {formatDateTime(post.createdAt)}
                    {post.editedAt &&
                      ` (zuletzt bearbeitet ${formatDateTime(post.editedAt)})`}
                  </span>
                </div>
                {post.deleted ? (
                  <p className="text-sm italic text-swu-muted">
                    Beitrag von der Moderation entfernt
                    {post.deleted.moderatorName &&
                      ` (${post.deleted.moderatorName}, ${formatDateTime(post.deleted.deletedAt)})`}
                    {!post.deleted.moderatorName &&
                      ` (${formatDateTime(post.deleted.deletedAt)})`}
                  </p>
                ) : (
                  <BbCodeText text={post.text} className="text-sm" />
                )}
              </li>
            ))}
          </ul>
          <Pagination
            pagination={data.pagination}
            onPage={(next) => setParams({ page: String(next) })}
          />
          <form onSubmit={submit} className="space-y-2 border border-swu-border p-3">
            <label htmlFor="forum-reply" className="text-xs text-swu-muted">
              Antworten
            </label>
            <textarea
              id="forum-reply"
              rows={5}
              className={inputClass}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <ErrorMessage message={formError} />
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              Antwort senden
            </button>
          </form>
        </>
      )}
    </div>
  );
}
