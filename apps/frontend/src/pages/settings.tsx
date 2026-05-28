import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';

type Tab =
  | 'profile'
  | 'security'
  | 'notifications'
  | 'gameplay'
  | 'invites'
  | 'danger';

type InviteStatus = 'available' | 'used' | 'revoked';

interface InviteKeyView {
  id: number;
  keyPreview: string;
  status: InviteStatus;
  usedAt: string | null;
  createdAt: string;
}

interface InviteQuotaView {
  available: number;
}

interface MyInvitesResponse {
  quota: InviteQuotaView;
  keys: InviteKeyView[];
}

interface CreateInviteResponse {
  quota: InviteQuotaView;
  inviteKey: InviteKeyView;
  plainKey: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profil' },
  { key: 'security', label: 'Sicherheit' },
  { key: 'notifications', label: 'Benachrichtigungen' },
  { key: 'gameplay', label: 'Gameplay' },
  { key: 'invites', label: 'Einladungen' },
  { key: 'danger', label: 'Gefahrenzone' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-swu-accent">Einstellungen</h1>

      <div className="flex gap-1 border-b border-swu-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-swu-accent border-b-2 border-swu-accent'
                : 'text-swu-muted hover:text-swu-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'gameplay' && <GameplayTab />}
        {activeTab === 'invites' && <InvitesTab />}
        {activeTab === 'danger' && <DangerTab />}
      </div>
    </div>
  );
}

function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<{ description: string | null }>('/auth/me').then((p) => {
      setDescription(p.description ?? '');
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/user/profile', { description });
      setMsg('Gespeichert');
    } catch (e: any) {
      setMsg(e.message || 'Fehler');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Section title="Commander-Info">
        <InfoRow label="Benutzername" value={user?.username ?? ''} />
        <InfoRow
          label="Fraktion"
          value={
            user?.faction === 'REBEL_ALLIANCE'
              ? 'Rebellenallianz'
              : user?.faction === 'GALACTIC_EMPIRE'
                ? 'Galaktisches Imperium'
                : (user?.faction ?? 'Keine')
          }
        />
        <InfoRow label="Prestige" value={String(user?.prestige ?? 0)} />
        <InfoRow
          label="Mitglied seit"
          value={
            user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString('de-DE')
              : ''
          }
        />
      </Section>

      <Section title="Beschreibung">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary resize-none"
          placeholder="Commander-Beschreibung..."
        />
        <button
          onClick={save}
          disabled={saving}
          className="mt-2 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
        {msg && <p className="text-xs text-swu-muted mt-1">{msg}</p>}
      </Section>
    </div>
  );
}

function SecurityTab() {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const [emailPw, setEmailPw] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  const changePassword = async () => {
    setPwMsg('');
    if (newPw !== newPw2) {
      setPwMsg('Passwoerter stimmen nicht ueberein');
      return;
    }
    try {
      await api.patch('/user/password', {
        oldPassword: oldPw,
        newPassword: newPw,
      });
      setPwMsg('Passwort geaendert');
      setOldPw('');
      setNewPw('');
      setNewPw2('');
    } catch (e: any) {
      setPwMsg(e.message || 'Fehler');
    }
  };

  const changeEmail = async () => {
    setEmailMsg('');
    try {
      await api.patch('/user/email', { password: emailPw, newEmail });
      setEmailMsg('E-Mail geaendert');
      setEmailPw('');
      setNewEmail('');
    } catch (e: any) {
      setEmailMsg(e.message || 'Fehler');
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Section title="Passwort aendern">
        <Input
          type="password"
          placeholder="Aktuelles Passwort"
          value={oldPw}
          onChange={setOldPw}
        />
        <Input
          type="password"
          placeholder="Neues Passwort (min 8 Zeichen)"
          value={newPw}
          onChange={setNewPw}
        />
        <Input
          type="password"
          placeholder="Neues Passwort wiederholen"
          value={newPw2}
          onChange={setNewPw2}
        />
        <button
          onClick={changePassword}
          className="mt-2 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
        >
          Passwort aendern
        </button>
        {pwMsg && <p className="text-xs text-swu-muted mt-1">{pwMsg}</p>}
      </Section>

      <Section title="E-Mail aendern">
        <Input
          type="password"
          placeholder="Aktuelles Passwort"
          value={emailPw}
          onChange={setEmailPw}
        />
        <Input
          type="email"
          placeholder="Neue E-Mail"
          value={newEmail}
          onChange={setNewEmail}
        />
        <button
          onClick={changeEmail}
          className="mt-2 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors"
        >
          E-Mail aendern
        </button>
        {emailMsg && <p className="text-xs text-swu-muted mt-1">{emailMsg}</p>}
      </Section>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<Record<string, string>>('/user/settings')
      .then((s) => {
        if (!active) return;
        setSettings(s);
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message || 'Einstellungen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggle = async (key: string) => {
    const newVal = settings[key] === '1' ? '0' : '1';
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);
    await api.patch('/user/settings', { [key]: newVal });
  };

  if (!loaded) return <p className="text-swu-muted text-sm">Laden...</p>;
  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-3 max-w-lg">
      <Section title="Benachrichtigungen">
        <Toggle
          label="E-Mail-Benachrichtigungen"
          checked={settings.email_notification === '1'}
          onChange={() => toggle('email_notification')}
        />
        <Toggle
          label="Lager-Warnungen"
          checked={settings.storage_notification === '1'}
          onChange={() => toggle('storage_notification')}
        />
        <Toggle
          label="Lesebestaetigung anzeigen"
          checked={settings.show_pm_read_receipt === '1'}
          onChange={() => toggle('show_pm_read_receipt')}
        />
      </Section>
    </div>
  );
}

function GameplayTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .get<Record<string, string>>('/user/settings')
      .then((s) => {
        if (!active) return;
        setSettings(s);
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message || 'Einstellungen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const setDefault = async (value: string) => {
    const updated = { ...settings, default_view: value };
    setSettings(updated);
    await api.patch('/user/settings', { default_view: value });
  };

  if (!loaded) return <p className="text-swu-muted text-sm">Laden...</p>;
  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-3 max-w-lg">
      <Section title="Startseite">
        <select
          value={settings.default_view || 'maindesk'}
          onChange={(e) => setDefault(e.target.value)}
          className="bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary w-full"
        >
          <option value="maindesk">Maindesk (Dashboard)</option>
          <option value="colonies">Kolonien</option>
          <option value="starmap">Sternenkarte</option>
          <option value="messages">Nachrichten</option>
        </select>
      </Section>
    </div>
  );
}

function InvitesTab() {
  const [data, setData] = useState<MyInvitesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  const loadInvites = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get<MyInvitesResponse>('/auth/invites'));
    } catch (e: any) {
      setError(e.message || 'Einladungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvites();
  }, []);

  const createInvite = async () => {
    setCreating(true);
    setError('');
    setNewKey('');
    setCopyMsg('');
    try {
      const created = await api.post<CreateInviteResponse>('/auth/invites', {});
      setNewKey(created.plainKey);
      setData((current) => ({
        quota: created.quota,
        keys: [created.inviteKey, ...(current?.keys ?? [])],
      }));
    } catch (e: any) {
      setError(e.message || 'Invite Key konnte nicht erstellt werden.');
    } finally {
      setCreating(false);
    }
  };

  const copyNewKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopyMsg('Key kopiert');
  };

  if (loading) return <p className="text-swu-muted text-sm">Laden...</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Section title="Alpha-Einladungen">
        <p className="text-sm text-swu-muted">
          Jeder Commander kann bis zu zwei Invite Keys aus seinem persönlichen
          Kontingent erzeugen und direkt an Freunde weitergeben. Keys werden aus
          Sicherheitsgruenden nur direkt nach Erstellung voll angezeigt.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <InfoRow
            label="Freies Kontingent"
            value={String(data?.quota.available ?? 0)}
          />
          <InfoRow
            label="Erzeugte Keys"
            value={String(data?.keys.length ?? 0)}
          />
          <InfoRow
            label="Aktive Keys"
            value={String(
              data?.keys.filter((key) => key.status === 'available').length ??
                0,
            )}
          />
        </div>
        <button
          onClick={createInvite}
          disabled={creating || (data?.quota.available ?? 0) <= 0}
          className="mt-4 px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
        >
          {creating ? 'Key wird erzeugt...' : 'Invite Key erzeugen'}
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </Section>

      {newKey && (
        <Section title="Neuer Invite Key">
          <p className="text-xs text-yellow-300 mb-2">
            Dies ist die einzige vollstaendige Anzeige. Kopiere den Key jetzt.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 rounded border border-swu-accent/40 bg-swu-bg px-3 py-2 text-sm text-swu-accent">
              {newKey}
            </code>
            <button
              onClick={copyNewKey}
              className="px-4 py-2 bg-swu-bg border border-swu-border text-swu-primary text-sm rounded hover:text-swu-accent transition-colors"
            >
              Kopieren
            </button>
          </div>
          {copyMsg && <p className="text-xs text-swu-muted mt-2">{copyMsg}</p>}
        </Section>
      )}

      <Section title="Meine Keys">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-swu-muted">
              <tr>
                <th className="py-2 pr-3">Vorschau</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Erstellt</th>
                <th className="py-2 pr-3">Genutzt</th>
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
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="py-2 pr-3 text-swu-muted">
                    {key.usedAt ? formatDate(key.usedAt) : '—'}
                  </td>
                </tr>
              ))}
              {(!data?.keys || data.keys.length === 0) && (
                <tr>
                  <td className="py-4 text-swu-muted" colSpan={4}>
                    Noch keine Invite Keys erzeugt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function DangerTab() {
  const [vacationLoading, setVacationLoading] = useState(false);
  const [vacationMsg, setVacationMsg] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    api.get('/auth/me').then(setProfile);
  }, []);

  const toggleVacation = async () => {
    setVacationLoading(true);
    setVacationMsg('');
    try {
      if (profile?.vacationMode) {
        await api.post('/user/vacation/deactivate', {});
        setVacationMsg('Kryoschlaf wird beendet');
      } else {
        await api.post('/user/vacation/activate', {});
        setVacationMsg('Kryoschlaf aktiviert');
      }
      const updated = await api.get('/auth/me');
      setProfile(updated);
    } catch (e: any) {
      setVacationMsg(e.message || 'Fehler');
    }
    setVacationLoading(false);
  };

  const requestDeletion = async () => {
    setDeleteMsg('');
    try {
      await api.post('/user/delete', { password: deletePw });
      setDeleteMsg('Löschung beantragt. Du wirst ausgeloggt.');
      setTimeout(() => logout(), 2000);
    } catch (e: any) {
      setDeleteMsg(e.message || 'Fehler');
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Section title="Kryoschlaf (Urlaubsmodus)">
        <p className="text-xs text-swu-muted mb-2">
          Kryoschlaf pausiert alle Tick-Verarbeitung. Nach Deaktivierung gilt
          eine 7-Tage-Abklingzeit bevor erneute Aktivierung möglich ist.
        </p>
        {profile?.vacationMode && (
          <p className="text-sm text-yellow-400 mb-2">
            Kryoschlaf aktiv seit:{' '}
            {profile.vacationStartedAt
              ? new Date(profile.vacationStartedAt).toLocaleDateString('de-DE')
              : '—'}
          </p>
        )}
        <button
          onClick={toggleVacation}
          disabled={vacationLoading}
          className="px-4 py-2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 text-sm font-semibold rounded hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
        >
          {profile?.vacationMode
            ? 'Kryoschlaf beenden'
            : 'Kryoschlaf aktivieren'}
        </button>
        {vacationMsg && (
          <p className="text-xs text-swu-muted mt-1">{vacationMsg}</p>
        )}
      </Section>

      <Section title="Konto loeschen" danger>
        <p className="text-xs text-swu-muted mb-2">
          Diese Aktion kann nicht rueckgaengig gemacht werden. Alle Daten werden
          dauerhaft geloescht.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 text-sm font-semibold rounded hover:bg-red-500/30 transition-colors"
          >
            Konto loeschen...
          </button>
        ) : (
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Passwort bestaetigen"
              value={deletePw}
              onChange={setDeletePw}
            />
            <div className="flex gap-2">
              <button
                onClick={requestDeletion}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition-colors"
              >
                Endgueltig loeschen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-swu-bg border border-swu-border text-swu-muted text-sm rounded hover:text-swu-primary transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
        {deleteMsg && <p className="text-xs text-red-400 mt-1">{deleteMsg}</p>}
      </Section>
    </div>
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

function Section({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`bg-swu-surface border rounded-lg p-4 ${
        danger ? 'border-red-500/50' : 'border-swu-border'
      }`}
    >
      <h3
        className={`text-sm font-bold mb-3 ${
          danger ? 'text-red-400' : 'text-swu-muted'
        }`}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-swu-border/30 last:border-0">
      <span className="text-xs text-swu-muted">{label}</span>
      <span className="text-sm text-swu-primary font-medium">{value}</span>
    </div>
  );
}

function Input({
  type,
  placeholder,
  value,
  onChange,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary placeholder:text-swu-muted/50"
    />
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm text-swu-primary">{label}</span>
      <div
        onClick={onChange}
        className={`w-10 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-swu-accent' : 'bg-swu-border'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </label>
  );
}
