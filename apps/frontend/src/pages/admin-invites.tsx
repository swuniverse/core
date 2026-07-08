import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

type InviteStatus = 'available' | 'used' | 'revoked';

interface InviteUserSummary {
  id: number;
  username: string;
  email?: string;
}

interface InviteKeyView {
  id: number;
  keyPreview: string;
  status: InviteStatus;
  createdByUserId: number | null;
  ownerUserId: number | null;
  usedByUserId: number | null;
  usedAt: string | null;
  createdAt: string;
  createdByUser?: InviteUserSummary | null;
  ownerUser?: InviteUserSummary | null;
  usedByUser?: InviteUserSummary | null;
}

interface InviteQuotaView {
  id: number;
  userId: number;
  available: number;
  updatedAt: string;
  user?: InviteUserSummary | null;
}

interface AdminInvitesResponse {
  keys: InviteKeyView[];
  quotas: InviteQuotaView[];
}

interface AdminCreateInvitesResponse {
  plainKeys: string[];
  keys: InviteKeyView[];
  quota: InviteQuotaView | null;
}

export function AdminInvitesPage() {
  const [data, setData] = useState<AdminInvitesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [keyCount, setKeyCount] = useState('1');
  const [additionalQuota, setAdditionalQuota] = useState('0');
  const [creating, setCreating] = useState(false);
  const [createdKeys, setCreatedKeys] = useState<string[]>([]);
  const [copyMsg, setCopyMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get<AdminInvitesResponse>('/auth/admin/invites'));
    } catch (e: any) {
      setError(e.message || 'Invite-Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setCreating(true);
    setError('');
    setCreatedKeys([]);
    setCopyMsg('');
    try {
      const response = await api.post<AdminCreateInvitesResponse>(
        '/auth/admin/invites',
        {
          ownerUserId: ownerUserId ? Number(ownerUserId) : undefined,
          keyCount: Number(keyCount) || 1,
          additionalQuota: Number(additionalQuota) || 0,
        },
      );
      setCreatedKeys(response.plainKeys);
      await load();
    } catch (e: any) {
      setError(e.message || 'Invite Keys konnten nicht erstellt werden.');
    } finally {
      setCreating(false);
    }
  };

  const copyKeys = async () => {
    await navigator.clipboard.writeText(createdKeys.join('\n'));
    setCopyMsg('Keys kopiert');
  };

  if (loading)
    return <div className="p-6 text-swu-muted">Lade Invite-Verwaltung...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-swu-muted">
          <Link to="/admin" className="hover:text-swu-accent">
            Admin
          </Link>{' '}
          / Einladungen
        </div>
        <h1 className="mt-2 text-2xl font-bold text-swu-accent" style={{ fontFamily: 'var(--font-swu-display)' }}>
          Invite-Verwaltung
        </h1>
        <p className="mt-1 text-sm text-swu-muted">
          Closed-Alpha Keys und Spieler-Kontingente verwalten. Vollstaendige
          Keys werden nur bei Erstellung angezeigt.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-swu-border bg-swu-surface p-5">
        <h2 className="text-lg font-semibold text-swu-text">
          Neue Keys / Kontingent
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Input
            label="Owner User ID"
            value={ownerUserId}
            onChange={setOwnerUserId}
            placeholder="optional"
          />
          <Input
            label="Anzahl Keys"
            value={keyCount}
            onChange={setKeyCount}
            placeholder="1"
          />
          <Input
            label="Zusaetzliches Kontingent"
            value={additionalQuota}
            onChange={setAdditionalQuota}
            placeholder="0"
          />
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="mt-4 rounded border border-swu-accent bg-swu-accent/10 px-4 py-2 text-sm font-semibold text-swu-accent transition hover:bg-swu-accent/20 disabled:opacity-50"
        >
          {creating ? 'Erstelle...' : 'Ausstellen'}
        </button>
      </section>

      {createdKeys.length > 0 && (
        <section className="rounded-lg border border-swu-accent/50 bg-swu-accent/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-swu-accent">
                Neu erzeugte Keys
              </h2>
              <p className="mt-1 text-xs text-swu-warning">
                Einmalige Klartext-Anzeige. Jetzt kopieren.
              </p>
            </div>
            <button
              onClick={copyKeys}
              className="rounded border border-swu-border bg-swu-bg px-3 py-2 text-sm text-swu-primary hover:text-swu-accent"
            >
              Alle kopieren
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {createdKeys.map((key) => (
              <code
                key={key}
                className="block rounded border border-swu-accent/30 bg-swu-bg px-3 py-2 text-sm text-swu-accent"
              >
                {key}
              </code>
            ))}
          </div>
          {copyMsg && <p className="mt-2 text-xs text-swu-muted">{copyMsg}</p>}
        </section>
      )}

      <section className="rounded-lg border border-swu-border bg-swu-surface p-5">
        <h2 className="text-lg font-semibold text-swu-text">Kontingente</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-swu-muted">
              <tr>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">User ID</th>
                <th className="py-2 pr-3">Frei</th>
                <th className="py-2 pr-3">Aktualisiert</th>
              </tr>
            </thead>
            <tbody>
              {(data?.quotas ?? []).map((quota) => (
                <tr key={quota.id} className="border-t border-swu-border/40">
                  <td className="py-2 pr-3 text-swu-primary">
                    {quota.user?.username ?? '—'}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">{quota.userId}</td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {quota.available}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {formatDate(quota.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-5">
        <h2 className="text-lg font-semibold text-swu-text">
          Alle Invite Keys
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-swu-muted">
              <tr>
                <th className="py-2 pr-3">Vorschau</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Genutzt von</th>
                <th className="py-2 pr-3">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {(data?.keys ?? []).map((key) => (
                <tr key={key.id} className="border-t border-swu-border/40">
                  <td className="py-2 pr-3 font-mono text-swu-primary">
                    {key.keyPreview}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {formatInviteStatus(key.status)}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {key.ownerUser?.username ?? key.ownerUserId ?? 'Admin-Pool'}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {key.usedByUser?.username ?? '—'}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {formatDate(key.createdAt)}
                  </td>
                </tr>
              ))}
              {(!data?.keys || data.keys.length === 0) && (
                <tr>
                  <td className="py-4 text-swu-muted" colSpan={5}>
                    Noch keine Invite Keys.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-swu-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-3 py-2 text-swu-primary outline-none focus:border-swu-accent"
      />
    </label>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('de-DE');
}

function formatInviteStatus(status: InviteStatus): string {
  switch (status) {
    case 'available':
      return 'Verfuegbar';
    case 'used':
      return 'Verwendet';
    case 'revoked':
      return 'Widerrufen';
    default:
      return status;
  }
}
