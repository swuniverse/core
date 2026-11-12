import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type {
  SpaceLocationDto,
  TradeAccountStorageDto,
  TradeLicenseDto,
  TradeOverviewDto,
  TradePostListItemDto,
} from '@swuniverse/shared';
import { PageHeader, type PageHeaderSegment } from '../components/PageHeader';
import { TradeLicensePanel } from '../components/trade/TradeLicensePanel';
import { commodityImage } from '../lib/assets';
import { formatDateTime, formatNumber } from '../lib/format';
import { api } from '../services/api';

type TradeTab = 'accounts' | 'posts' | 'licenses';

type CommodityName = { id: number; name: string };

const TABS: { key: TradeTab; label: string }[] = [
  { key: 'accounts', label: 'Warenkonten' },
  { key: 'posts', label: 'Handelsposten' },
  { key: 'licenses', label: 'Lizenzen' },
];

function locationLink(location: SpaceLocationDto) {
  if (location.scope === 'GALAXY') {
    const { layerId } = location;
    return (
      <Link
        to={`/starmap?layer=${layerId}&x=${location.x}&y=${location.y}`}
        className="text-swu-accent hover:underline"
      >
        Ebene {layerId} {location.x}:{location.y}
      </Link>
    );
  }
  return (
    <span>
      System {location.systemId} {location.x}:{location.y}
    </span>
  );
}

function PostLocation({ post }: { post: TradePostListItemDto }) {
  if (!post.location) return <span className="text-swu-muted">Unbekannt</span>;
  return locationLink(post.location);
}

export function TradePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<TradePostListItemDto[] | null>(null);
  const [overview, setOverview] = useState<TradeOverviewDto | null>(null);
  const [commodities, setCommodities] = useState<CommodityName[]>([]);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get('tab');
  const tab: TradeTab = tabParam === 'posts' || tabParam === 'licenses' ? tabParam : 'accounts';
  const selectedPostId = Number(searchParams.get('post')) || null;
  const shipId = Number(searchParams.get('ship')) || null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<TradePostListItemDto[]>('/trade/posts'),
      api.get<TradeOverviewDto>('/trade/overview'),
      api.get<CommodityName[]>('/database/commodities'),
    ])
      .then(([nextPosts, nextOverview, nextCommodities]) => {
        if (cancelled) return;
        setPosts(nextPosts);
        setOverview(nextOverview);
        setCommodities(nextCommodities);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Handelsdaten konnten nicht geladen werden',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commodityName = useMemo(() => {
    const names = new Map(commodities.map((entry) => [entry.id, entry.name]));
    return (id: number) => names.get(id) ?? `Ware #${id}`;
  }, [commodities]);

  const selectedPost = posts?.find((post) => post.id === selectedPostId) ?? null;

  const select = (next: { tab?: TradeTab; post?: number | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set('tab', next.tab);
    if (next.post === null) {
      params.delete('post');
      params.delete('ship');
    }
    else if (next.post !== undefined) params.set('post', String(next.post));
    setSearchParams(params);
  };

  const segments: PageHeaderSegment[] = [{ label: 'Handel', to: '/trade' }];
  if (tab === 'licenses') {
    segments.push({ label: 'Lizenzen' });
  } else if (tab === 'posts' || selectedPost) {
    segments.push({ label: selectedPost?.name ?? 'Handelsposten' });
  }

  return (
    <main className="space-y-2 text-xs">
      <PageHeader segments={segments} />
      <nav className="flex gap-1" aria-label="Handelsbereiche">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={tab === entry.key}
            onClick={() => select({ tab: entry.key, post: null })}
            className={`border px-3 py-1 ${
              tab === entry.key
                ? 'border-swu-accent bg-black/40 text-swu-primary'
                : 'border-swu-border bg-black/20 text-swu-muted hover:text-swu-text'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="text-red-300">{error}</p>
      ) : !posts || !overview ? (
        <p className="text-swu-muted">Handelsdaten werden geladen...</p>
      ) : tab === 'accounts' ? (
        <AccountsTab
          posts={posts}
          accounts={overview.accounts}
          commodityName={commodityName}
          onSelect={(id) => select({ tab: 'posts', post: id })}
        />
      ) : tab === 'licenses' ? (
        <LicensesTab onSelect={(id) => select({ tab: 'posts', post: id })} />
      ) : selectedPost ? (
        <PostInfo
          post={selectedPost}
          overview={overview}
          commodityName={commodityName}
          shipId={shipId}
          onBack={() => select({ post: null })}
        />
      ) : (
        <PostsTab
          posts={posts}
          onSelect={(id) => select({ post: id })}
        />
      )}
    </main>
  );
}

function AccountsTab({
  posts,
  accounts,
  commodityName,
  onSelect,
}: {
  posts: TradePostListItemDto[];
  accounts: TradeAccountStorageDto[];
  commodityName: (id: number) => string;
  onSelect: (postId: number) => void;
}) {
  const postsWithAccounts = posts.filter((post) =>
    accounts.some((account) => account.tradePostId === post.id),
  );
  if (postsWithAccounts.length === 0) {
    return (
      <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">
        Du besitzt keine Warenkonten.
      </p>
    );
  }
  return (
    <div className="max-w-3xl space-y-2">
      {postsWithAccounts.map((post) => {
        const rows = accounts.filter(
          (account) => account.tradePostId === post.id && account.amount > 0,
        );
        const total = rows.reduce((sum, row) => sum + row.amount, 0);
        return (
          <section key={post.id} className="border border-swu-border bg-black/30">
            <h2 className="flex justify-between border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
              <button
                type="button"
                onClick={() => onSelect(post.id)}
                className="text-swu-accent hover:underline"
              >
                {post.name}
              </button>
              <span className="font-mono text-swu-muted">
                {formatNumber(total)} / {formatNumber(post.storageLimit)}
              </span>
            </h2>
            <table className="w-full">
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-2 py-1 text-swu-muted">Konto ist leer.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.commodityId} className="border-t border-swu-border/60">
                      <td className="px-2 py-1">
                        <span className="flex items-center gap-2">
                          <img
                            src={commodityImage(row.commodityId, commodityName(row.commodityId))}
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                          {commodityName(row.commodityId)}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {formatNumber(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function LicensesTab({ onSelect }: { onSelect: (postId: number) => void }) {
  const [licenses, setLicenses] = useState<TradeLicenseDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<TradeLicenseDto[]>('/trade/licenses')
      .then(setLicenses)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Lizenzen konnten nicht geladen werden'),
      );
  }, []);
  if (error) return <p role="alert" className="text-red-300">{error}</p>;
  if (!licenses) return <p className="text-swu-muted">Lizenzen werden geladen...</p>;
  if (licenses.length === 0) {
    return (
      <p className="border border-swu-border bg-black/30 p-2 text-swu-muted">
        Du besitzt keine gültigen Handelslizenzen.
      </p>
    );
  }
  return (
    <div className="max-w-3xl overflow-hidden border border-swu-border bg-black/30">
      <table className="w-full">
        <thead className="bg-swu-bg/60 text-left text-swu-muted">
          <tr>
            <th className="px-2 py-1">Handelsposten</th>
            <th className="px-2 py-1">Handelsnetz</th>
            <th className="px-2 py-1">Gültig bis</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((license) => (
            <tr key={license.id} className="border-t border-swu-border/60">
              <td className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => onSelect(license.tradePostId)}
                  className="text-swu-accent hover:underline"
                >
                  {license.tradePostName}
                </button>
              </td>
              <td className="px-2 py-1">Netz {license.networkId}</td>
              <td className="px-2 py-1 font-mono">{formatDateTime(license.expiresAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostsTab({
  posts,
  onSelect,
}: {
  posts: TradePostListItemDto[];
  onSelect: (postId: number) => void;
}) {
  return (
    <div className="max-w-4xl overflow-hidden border border-swu-border bg-black/30">
      <table className="w-full">
        <thead className="bg-swu-bg/60 text-left text-swu-muted">
          <tr>
            <th className="px-2 py-1">Handelsposten</th>
            <th className="px-2 py-1">Handelsnetz</th>
            <th className="px-2 py-1">Betreiber</th>
            <th className="px-2 py-1">Ort</th>
            <th className="px-2 py-1">Konto</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className="border-t border-swu-border/60">
              <td className="px-2 py-1">
                <button
                  type="button"
                  onClick={() => onSelect(post.id)}
                  className="text-swu-accent hover:underline"
                >
                  {post.name}
                </button>
              </td>
              <td className="px-2 py-1">Netz {post.networkId}</td>
              <td className="px-2 py-1">{post.owner.name}</td>
              <td className="px-2 py-1">
                <PostLocation post={post} />
              </td>
              <td className="px-2 py-1">
                {post.licenseStatus === 'ACCOUNT' ? 'Vorhanden' : 'Keines'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostInfo({
  post,
  overview,
  commodityName,
  shipId,
  onBack,
}: {
  post: TradePostListItemDto;
  overview: TradeOverviewDto;
  commodityName: (id: number) => string;
  shipId: number | null;
  onBack: () => void;
}) {
  const ships = overview.spacecraft.filter((ship) => ship.tradePostId === post.id);
  const stock = overview.accounts.filter(
    (account) => account.tradePostId === post.id && account.amount > 0,
  );
  return (
    <section className="max-w-3xl border border-swu-border bg-black/30">
      <h2 className="flex justify-between border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
        <span>Posteninfo: {post.name}</span>
        <button type="button" onClick={onBack} className="text-swu-accent hover:underline">
          Zurück zur Liste
        </button>
      </h2>
      <dl className="grid grid-cols-[10rem_1fr] gap-x-2 gap-y-1 p-2">
        <dt className="text-swu-muted">Beschreibung</dt>
        <dd>{post.description || '—'}</dd>
        <dt className="text-swu-muted">Handelsnetz</dt>
        <dd>Netz {post.networkId}</dd>
        <dt className="text-swu-muted">Betreiber</dt>
        <dd>{post.owner.name}</dd>
        <dt className="text-swu-muted">Ort</dt>
        <dd>
          <PostLocation post={post} />
        </dd>
        <dt className="text-swu-muted">Stufe</dt>
        <dd>{post.level}</dd>
        <dt className="text-swu-muted">Lagerlimit</dt>
        <dd className="font-mono">{formatNumber(post.storageLimit)}</dd>
        <dt className="text-swu-muted">Transferkapazität</dt>
        <dd className="font-mono">{formatNumber(post.transferCapacity)}</dd>
        <dt className="text-swu-muted">Warenkonto</dt>
        <dd>
          {post.licenseStatus === 'ACCOUNT'
            ? stock.length === 0
              ? 'Vorhanden, leer'
              : stock
                  .map((row) => `${commodityName(row.commodityId)} ${formatNumber(row.amount)}`)
                  .join(', ')
            : 'Keines'}
        </dd>
        <dt className="text-swu-muted">Eigene Schiffe vor Ort</dt>
        <dd>
          {ships.length === 0 ? (
            '—'
          ) : (
            <ul>
              {ships.map((ship) => (
                <li key={ship.spacecraftId}>
                  <Link
                    to={`/spacecraft/${ship.spacecraftId}`}
                    className="text-swu-accent hover:underline"
                  >
                    {ship.spacecraftName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
      <TradeLicensePanel tradePostId={post.id} shipId={shipId} />
    </section>
  );
}
