import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  RpgPlotDto,
  RpgPlotListDto,
  SaveRpgPlotDto,
} from '@swuniverse/shared';
import { BbCodeText } from '../components/BbCodeText';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface PlotPost {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  author: { username: string };
}

interface PlotPostsResponse {
  data: PlotPost[];
  total: number;
  page: number;
  limit: number;
}

const panel = 'border border-swu-border bg-black/40';
const heading =
  'border-b border-swu-border bg-swu-surface/80 px-3 py-1 text-xs font-bold text-swu-primary';
const input =
  'w-full border border-swu-border bg-swu-bg px-2 py-1.5 text-sm text-swu-primary focus:border-swu-accent focus:outline-none';
const button =
  'border border-swu-border px-3 py-1 text-xs text-swu-muted hover:text-swu-primary disabled:opacity-40';
const primary =
  'border border-swu-accent bg-swu-accent/10 px-3 py-1 text-xs text-swu-accent hover:bg-swu-accent/20 disabled:opacity-40';

function PlotNavigation() {
  return (
    <nav className="flex flex-wrap gap-2 text-xs" aria-label="HoloNet-Plotnavigation">
      <Link className={button} to="/holonet">HoloNet</Link>
      <Link className={button} to="/holonet/plots">Plots</Link>
      <Link className={primary} to="/holonet/plots/new">Plot anlegen</Link>
    </nav>
  );
}

export function RpgPlotListPage() {
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RpgPlotListDto | null>(null);

  useEffect(() => {
    const path = mine ? '/rpg/plots/mine' : '/rpg/plots';
    void api.get<RpgPlotListDto>(`${path}?page=${page}`).then(setResult);
  }, [mine, page]);

  return (
    <div className="space-y-3 p-2 text-swu-muted md:p-4">
      <PlotNavigation />
      <section className={panel}>
        <h1 className={heading}>/ HoloNet / RPG-Plots</h1>
        <div className="flex gap-2 border-b border-swu-border p-2">
          <button className={!mine ? primary : button} onClick={() => { setMine(false); setPage(1); }}>Alle Plots</button>
          <button className={mine ? primary : button} onClick={() => { setMine(true); setPage(1); }}>Meine Plots</button>
        </div>
        <div className="space-y-2 p-2">
          {!result ? <p>Lade Plots...</p> : result.data.length === 0 ? <p>Keine Plots vorhanden.</p> : result.data.map((plot) => (
            <article key={plot.id} className="grid gap-2 border border-swu-border bg-swu-surface/50 p-3 text-xs md:grid-cols-[1fr_auto]">
              <div>
                <Link className="text-sm font-bold text-swu-primary hover:text-swu-accent" to={`/holonet/plots/${plot.id}`}>{plot.title}</Link>
                <p>{plot.members.length} Schreiber · Erstellt von {plot.creatorName}</p>
              </div>
              <div className="text-right">
                <p>{new Date(plot.startedAt).toLocaleDateString('de-DE')}</p>
                <p className={plot.endedAt ? 'text-orange-300' : 'text-green-300'}>{plot.endedAt ? 'Beendet' : 'Aktiv'}</p>
              </div>
            </article>
          ))}
        </div>
        {result && result.totalPages > 1 && (
          <div className="flex items-center gap-3 border-t border-swu-border p-2 text-xs">
            <button className={button} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Zurück</button>
            <span>Seite {page} von {result.totalPages}</span>
            <button className={button} disabled={page >= result.totalPages} onClick={() => setPage((value) => value + 1)}>Weiter</button>
          </div>
        )}
      </section>
    </div>
  );
}

export function RpgPlotCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await api.post<RpgPlotDto, SaveRpgPlotDto>('/rpg/plots', { title, description });
      navigate(`/holonet/plots/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Plot konnte nicht angelegt werden');
    }
  }

  return (
    <div className="space-y-3 p-2 text-swu-muted md:p-4">
      <PlotNavigation />
      <form className={panel} onSubmit={(event) => void submit(event)}>
        <h1 className={heading}>RPG-Plot anlegen</h1>
        <div className="space-y-3 p-3">
          {error && <p className="text-xs text-red-300">{error}</p>}
          <label className="block text-xs">Titel<input className={`${input} mt-1`} value={title} minLength={6} maxLength={80} required onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="block text-xs">Beschreibung<textarea className={`${input} mt-1`} value={description} maxLength={5000} rows={14} onChange={(event) => setDescription(event.target.value)} /></label>
          <button className={primary} type="submit" disabled={title.trim().length < 6}>Plot anlegen</button>
        </div>
      </form>
    </div>
  );
}

export function RpgPlotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [plot, setPlot] = useState<RpgPlotDto | null>(null);
  const [memberId, setMemberId] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posts, setPosts] = useState<PlotPostsResponse | null>(null);
  const [postPage, setPostPage] = useState(1);

  const load = useCallback(async () => {
    const [loaded, loadedPosts] = await Promise.all([
      api.get<RpgPlotDto>(`/rpg/plots/${id}`),
      api.get<PlotPostsResponse>(`/holonet?plotId=${id}&page=${postPage}`),
    ]);
    setPlot(loaded);
    setPosts(loadedPosts);
    setTitle(loaded.title);
    setDescription(loaded.description);
  }, [id, postPage]);

  useEffect(() => { void load(); }, [load]);

  if (!plot) return <div className="p-4 text-swu-muted">Lade Plot...</div>;
  const manages = user?.id === plot.creatorId;
  const active = plot.endedAt === null;

  async function addMember() {
    await api.post(`/rpg/plots/${plot!.id}/members`, { userId: Number(memberId) });
    setMemberId('');
    await load();
  }

  async function removeMember(userId: number) {
    await api.delete(`/rpg/plots/${plot!.id}/members/${userId}`);
    await load();
  }

  async function save() {
    const updated = await api.patch<RpgPlotDto, SaveRpgPlotDto>(`/rpg/plots/${plot!.id}`, { title, description });
    setPlot(updated);
    setEditing(false);
  }

  async function end() {
    setPlot(await api.post<RpgPlotDto, Record<string, never>>(`/rpg/plots/${plot!.id}/end`, {}));
  }

  return (
    <div className="space-y-3 p-2 text-swu-muted md:p-4">
      <PlotNavigation />
      <section className={panel}>
        <h1 className={heading}>/ HoloNet / Plots / {plot.title}</h1>
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <main className="space-y-3">
            <section className={panel}>
              <h2 className={heading}>Beschreibung</h2>
              <div className="p-3">
                {editing ? <><label className="block text-xs">Titel<input className={`${input} mt-1`} value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label><label className="mt-3 block text-xs">Beschreibung<textarea className={`${input} mt-1`} rows={12} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className={`${primary} mt-3`} onClick={() => void save()}>Speichern</button></> : <BbCodeText text={plot.description} className="whitespace-pre-wrap text-sm" />}
              </div>
            </section>
            <section className={panel}>
              <h2 className={heading}>Beiträge</h2>
              <div className="divide-y divide-swu-border/60">
                {!posts || posts.data.length === 0 ? (
                  <p className="p-3 text-xs">Noch keine Beiträge.</p>
                ) : posts.data.map((post) => (
                  <article key={post.id} className="p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Link
                        to={`/holonet/${post.id}`}
                        className="font-bold text-swu-primary hover:text-swu-accent"
                        aria-label={`Beitrag #${post.id} öffnen`}
                      >
                        {post.title || `Beitrag #${post.id}`}
                      </Link>
                      <span>{post.author.username} · {new Date(post.createdAt).toLocaleString('de-DE')}</span>
                    </div>
                    <BbCodeText text={post.body} className="whitespace-pre-wrap text-sm" />
                  </article>
                ))}
              </div>
              {posts && posts.total > posts.limit && (
                <div className="flex items-center gap-3 border-t border-swu-border p-2 text-xs">
                  <button className={button} disabled={postPage <= 1} onClick={() => setPostPage((value) => value - 1)}>Zurück</button>
                  <span>Seite {postPage} von {Math.ceil(posts.total / posts.limit)}</span>
                  <button className={button} disabled={postPage >= Math.ceil(posts.total / posts.limit)} onClick={() => setPostPage((value) => value + 1)}>Weiter</button>
                </div>
              )}
            </section>
            <section className={panel}>
              <h2 className={heading}>Schreiber</h2>
              <div className="divide-y divide-swu-border/60">
                {plot.members.map((member) => <div key={member.userId} className="flex items-center justify-between p-2 text-xs"><Link to={`/players/${member.userId}`} className="text-swu-primary">{member.username} (#{member.userId})</Link>{manages && active && member.userId !== plot.creatorId && <button className={button} aria-label={`${member.username} entfernen`} onClick={() => void removeMember(member.userId)}>Entfernen</button>}</div>)}
              </div>
            </section>
          </main>
          <aside className={`${panel} h-fit text-xs`}>
            <h2 className={heading}>Status</h2>
            <div className="space-y-2 p-3">
              <p>Ersteller: {plot.creatorName}</p>
              <p>Beginn: {new Date(plot.startedAt).toLocaleString('de-DE')}</p>
              <p>{active ? 'Plot ist aktiv' : `Beendet: ${new Date(plot.endedAt!).toLocaleString('de-DE')}`}</p>
              {manages && active && <><button className={button} onClick={() => setEditing((value) => !value)}>Bearbeiten</button><button className="ml-2 border border-red-500/60 px-3 py-1 text-red-300" onClick={() => void end()}>Plot beenden</button><label className="mt-4 block">Spieler-ID<input className={`${input} mt-1`} inputMode="numeric" value={memberId} onChange={(event) => setMemberId(event.target.value.replace(/\D/g, ''))} /></label><button className={`${primary} mt-2`} disabled={!memberId} onClick={() => void addMember()}>Schreiber hinzufügen</button></>}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
