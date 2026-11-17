import { refreshPlayerNames } from '../stores/player-names.store';
import { applyInterfaceTheme } from '../hooks/use-interface-theme';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountDeletionMark, VACATION_DELAY_MS, type AuthFeaturesDto } from '@swuniverse/shared';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../services/api';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { getErrorMessage } from '../lib/errors';
import { formatDate } from '../lib/format';
import { LEGAL_PAGES_ENABLED } from '../components/legal/LegalLinks';

type Tab =
  | 'profile'
  | 'security'
  | 'notifications'
  | 'gameplay'
  | 'danger';

const TABS: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profil' },
  { key: 'security', label: 'Sicherheit' },
  { key: 'notifications', label: 'Benachrichtigungen' },
  { key: 'gameplay', label: 'Gameplay' },
  { key: 'danger', label: 'Gefahrenzone' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-swu-accent" style={{ fontFamily: 'var(--font-swu-display)' }}>Einstellungen</h1>

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

      {LEGAL_PAGES_ENABLED && (
        <section className="border border-swu-border bg-swu-surface/60 p-3" aria-labelledby="legal-links-title">
          <h2 id="legal-links-title" className="mb-2 font-bold text-swu-primary">
            Rechtliches und Hilfe
          </h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link className="text-swu-accent hover:underline" to="/impressum">Impressum</Link>
            <Link className="text-swu-accent hover:underline" to="/datenschutz">Datenschutz</Link>
            <Link className="text-swu-accent hover:underline" to="/hilfe">Hilfe</Link>
          </div>
        </section>
      )}

      <div className="mt-4">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'gameplay' && <GameplayTab />}
        {activeTab === 'danger' && <DangerTab />}
      </div>
    </div>
  );
}

function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<{ description: string | null; displayName: string | null; displayNameMarkup?: string | null; avatar: string | null }>('/auth/me').then((p) => {
      setDescription(p.description ?? '');
      setDisplayName(p.displayNameMarkup ?? p.displayName ?? '');
      setAvatar(p.avatar ?? null);
    });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setMsg('');
    try {
      const result = await api.patch<{ description: string | null; displayName: string | null; displayNameMarkup?: string | null }>('/user/profile', { description, displayName });
      if (user) {
        setUser({ ...user, displayName: result.displayName, displayNameMarkup: result.displayNameMarkup });
      }
      void refreshPlayerNames().catch(() => undefined);
      setMsg('Gespeichert');
    } catch (error: unknown) {
      setMsg(getErrorMessage(error, 'Fehler'));
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg('Nur Bilddateien erlaubt');
      return;
    }
    if (file.size > 200_000) {
      setMsg('Max. 200 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await api.patch('/user/avatar', { avatar: dataUrl });
        setAvatar(dataUrl);
        if (user) setUser({ ...user, avatar: dataUrl });
        setMsg('Avatar gespeichert');
      } catch (error: unknown) {
        setMsg(getErrorMessage(error, 'Fehler beim Avatar-Upload'));
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = async () => {
    try {
      await api.patch('/user/avatar', { avatar: null });
      setAvatar(null);
      if (user) setUser({ ...user, avatar: null });
      setMsg('Persönlicher Avatar entfernt. Der Fraktionsstandard wird wiederhergestellt.');
    } catch (error: unknown) {
      setMsg(getErrorMessage(error, 'Fehler'));
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <PlayerAvatar
            name={displayName || user?.username || '?'}
            avatar={avatar}
            faction={user?.faction}
            alt="Dein Avatar"
            className="size-20 text-2xl"
          />
          <div className="flex flex-col gap-2">
            <label className="px-3 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-semibold rounded hover:bg-swu-accent/30 transition-colors cursor-pointer">
              Bild hochladen
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            {avatar && (
              <button onClick={removeAvatar} className="text-xs text-swu-muted hover:text-red-400 transition-colors">
                Entfernen
              </button>
            )}
            <p className="text-[10px] text-swu-muted">PNG/JPG, max 200 KB</p>
          </div>
        </div>
      </Section>

      <Section title="Commander-Info">
        <InfoRow label="Login-Name" value={user?.username ?? ''} />
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

      <Section title="Anzeigename">
        <p className="text-xs text-swu-muted mb-2">
          Dein öffentlicher Name. Erlaubt: [color=#rrggbb], [b] und [i], jeweils mit schließendem Tag. 3–60 sichtbare Zeichen; leer verwendet den Login-Namen.
        </p>
        <Input
          type="text"
          placeholder="Anzeigename (3-60 Zeichen)"
          value={displayName}
          onChange={setDisplayName}
        />
      </Section>

      <Section title="Beschreibung">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          className="w-full bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary resize-none"
          placeholder="Commander-Beschreibung..."
        />
      </Section>

      <button
        onClick={saveProfile}
        disabled={saving}
        className="px-4 py-2 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm font-semibold rounded hover:bg-swu-accent/30 transition-colors disabled:opacity-50"
      >
        {saving ? 'Speichern...' : 'Profil speichern'}
      </button>
      {msg && <p className="text-xs text-swu-muted mt-1">{msg}</p>}
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
    } catch (error: unknown) {
      setPwMsg(getErrorMessage(error, 'Fehler'));
    }
  };

  const changeEmail = async () => {
    setEmailMsg('');
    try {
      await api.patch('/user/email', { password: emailPw, newEmail });
      setEmailMsg('E-Mail geaendert');
      setEmailPw('');
      setNewEmail('');
    } catch (error: unknown) {
      setEmailMsg(getErrorMessage(error, 'Fehler'));
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Section title="Passwort ändern">
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
          Passwort ändern
        </button>
        {pwMsg && <p className="text-xs text-swu-muted mt-1">{pwMsg}</p>}
      </Section>

      <Section title="E-Mail ändern">
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
          E-Mail ändern
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
          description="E-Mails bei neuen persönlichen Nachrichten werden nur verschickt, wenn der Betreiber den Versand aktiviert hat."
          checked={settings.email_notification === '1'}
          onChange={() => toggle('email_notification')}
        />
        <Toggle
          label="Lager-Warnungen"
          checked={settings.storage_notification === '1'}
          onChange={() => toggle('storage_notification')}
        />
        <Toggle
          label="Lesebestätigung anzeigen"
          description="Wird mit Lesebestätigungen im Nachrichtenausgang wirksam."
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
  const [tutorialsEnabled, setTutorialsEnabled] = useState(false);
  const [tutorialsBusy, setTutorialsBusy] = useState(false);
  const [tutorialsError, setTutorialsError] = useState('');
  const [colorError, setColorError] = useState('');
  const [colorBusy, setColorBusy] = useState(false);

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

  const setCreationDefault = async (key: 'fleet_fixed_default' | 'reactor_auto_carryover_default') => {
    const previous = settings[key] ?? '0';
    const value = previous === '1' ? '0' : '1';
    setSettings(current => ({ ...current, [key]: value }));
    try { await api.patch('/user/settings', { [key]: value }); }
    catch (error: unknown) {
      setSettings(current => ({ ...current, [key]: previous }));
      setError(getErrorMessage(error, 'Erzeugungsstandard konnte nicht gespeichert werden.'));
    }
  };

  const setColorScheme = async (value: string) => {
    const previous = settings.css_color_sheet ?? 'default';
    const faction = useAuthStore.getState().user?.faction;
    setSettings(current => ({ ...current, css_color_sheet: value }));
    applyInterfaceTheme(value, faction);
    try { await api.patch('/user/settings', { css_color_sheet: value }); }
    catch (error: unknown) {
      setSettings(current => ({ ...current, css_color_sheet: previous }));
      applyInterfaceTheme(previous, faction);
      setError(getErrorMessage(error, 'Farbschema konnte nicht gespeichert werden.'));
    }
  };

  const setDefault = async (value: string) => {
    const updated = { ...settings, default_view: value };
    setSettings(updated);
    await api.patch('/user/settings', { default_view: value });
  };

  const setOnlineStatus = async (enabled: boolean) => {
    const value = enabled ? '1' : '0';
    const previous = settings.show_online_status ?? '1';
    setSettings(current => ({ ...current, show_online_status: value }));
    try { await api.patch('/user/settings', { show_online_status: value }); }
    catch (error: unknown) {
      setSettings(current => ({ ...current, show_online_status: previous }));
      setError(getErrorMessage(error, 'Online-Status konnte nicht gespeichert werden.'));
    }
  };

  const setProfileVisitOptOut = async (enabled: boolean) => {
    const value = enabled ? '1' : '0';
    setSettings((current) => ({ ...current, profile_visit_optout: value }));
    try {
      await api.patch('/user/settings', { profile_visit_optout: value });
    } catch (error: unknown) {
      setSettings((current) => ({
        ...current,
        profile_visit_optout: enabled ? '0' : '1',
      }));
      setError(
        getErrorMessage(error, 'Datenschutzeinstellung konnte nicht gespeichert werden.'),
      );
    }
  };

  const setInboxMessengerStyle = async (enabled: boolean) => {
    const value = enabled ? '1' : '0';
    setSettings((current) => ({ ...current, inbox_messenger_style: value }));
    try {
      await api.patch('/user/settings', { inbox_messenger_style: value });
    } catch (error: unknown) {
      setSettings((current) => ({
        ...current,
        inbox_messenger_style: enabled ? '0' : '1',
      }));
      setError(
        getErrorMessage(error, 'Nachrichtenansicht konnte nicht gespeichert werden.'),
      );
    }
  };

  const setTerritorialColor = async (value: string) => {
    const previous = settings.rgb_code || '';
    setSettings((current) => ({ ...current, rgb_code: value }));
    setColorBusy(true);
    setColorError('');
    try {
      await api.patch('/user/settings', { rgb_code: value });
    } catch (error: unknown) {
      setSettings((current) => ({ ...current, rgb_code: previous }));
      setColorError(getErrorMessage(error, 'Territorialfarbe konnte nicht gespeichert werden.'));
    } finally {
      setColorBusy(false);
    }
  };

  const setTutorials = async (enabled: boolean) => {
    setTutorialsBusy(true);
    setTutorialsError('');
    try {
      await api.post(enabled ? '/tutorial/reset' : '/tutorial/disable', {});
      setTutorialsEnabled(enabled);
    } catch (error: unknown) {
      setTutorialsError(
        getErrorMessage(error, 'Tutorial-Einstellungen konnten nicht gespeichert werden.'),
      );
    } finally {
      setTutorialsBusy(false);
    }
  };

  if (!loaded) return <p className="text-swu-muted text-sm">Laden...</p>;
  if (error) return <p className="text-red-300 text-sm">{error}</p>;

  return (
    <div className="space-y-3 max-w-lg">
      <Section title="RPG-Verhalten">
        <label className="block text-xs text-swu-muted" htmlFor="rpg-behavior">
          Wie gern betreibst du Rollenspiel?
        </label>
        <select
          id="rpg-behavior"
          aria-label="RPG-Verhalten"
          value={settings.rpg_behavior || '0'}
          onChange={(event) => {
            const value = event.target.value;
            setSettings((current) => ({ ...current, rpg_behavior: value }));
            void api.patch('/user/settings', { rpg_behavior: value });
          }}
          className="bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary w-full"
        >
          <option value="0">Nicht gesetzt</option>
          <option value="1">Betreibt gerne Rollenspiel</option>
          <option value="2">Betreibt gelegentlich Rollenspiel</option>
          <option value="3">Betreibt ungern Rollenspiel</option>
        </select>
      </Section>
      <Section title="Startseite">
        <select
          value={settings.default_view || 'maindesk'}
          onChange={(e) => setDefault(e.target.value)}
          className="bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary w-full"
        >
          <option value="maindesk">Maindesk (Dashboard)</option>
          <option value="colonies">Kolonien</option>
          <option value="spacecraft">Schiffe</option>
          <option value="starmap">Sternenkarte</option>
          <option value="messages">Nachrichten</option>
          <option value="research">Forschung</option>
          <option value="holonet">HoloNet</option>
        </select>
      </Section>
      <Section title="Neue Flotten und Schiffe">
        <Toggle label="Neue Flotten standardmäßig fixieren" checked={settings.fleet_fixed_default === '1'}
          onChange={() => void setCreationDefault('fleet_fixed_default')} />
        <Toggle label="Reaktor-Übertrag für neue Schiffe aktivieren" checked={settings.reactor_auto_carryover_default === '1'}
          onChange={() => void setCreationDefault('reactor_auto_carryover_default')} />
        <p className="text-xs text-swu-muted">Gilt nur für neu erzeugte Flotten und Schiffe.</p>
      </Section>
      <Section title="Farbschema">
        <label htmlFor="interface-color-scheme" className="text-xs text-swu-muted">Oberfläche</label>
        <select id="interface-color-scheme" value={settings.css_color_sheet ?? 'default'}
          onChange={event => void setColorScheme(event.target.value)}
          className="bg-swu-bg border border-swu-border rounded p-2 text-sm text-swu-primary w-full">
          <option value="default">Standard</option>
          <option value="contrast">Kontrast (hell)</option>
          <option value="faction">Fraktionsakzent</option>
        </select>
      </Section>
      <Section title="Territorialfarbe">
        <div className="flex items-center gap-3 text-sm text-swu-primary">
          <input
            type="color"
            aria-label="Territorialfarbe"
            value={settings.rgb_code || '#000000'}
            disabled={colorBusy}
            onChange={(event) => void setTerritorialColor(event.target.value)}
          />
          <span>{settings.rgb_code || 'Keine Territorialfarbe'}</span>
          <button
            type="button"
            aria-label="Territorialfarbe zurücksetzen"
            disabled={colorBusy || !settings.rgb_code}
            onClick={() => void setTerritorialColor('')}
            className="border border-swu-border bg-swu-bg px-3 py-2 text-xs hover:border-swu-accent disabled:opacity-40"
          >
            Zurücksetzen
          </button>
        </div>
        {colorError && <p role="alert" className="mt-2 text-xs text-red-300">{colorError}</p>}
      </Section>
      <Section title="Datenschutz">
        <Toggle label="Online-Status öffentlich anzeigen"
          description="In deiner Allianz bleibt der Online-Status sichtbar."
          checked={settings.show_online_status !== '0'}
          onChange={() => void setOnlineStatus(settings.show_online_status === '0')} />
        <label className="flex items-center gap-2 text-sm text-swu-primary">
          <input
            type="checkbox"
            checked={settings.profile_visit_optout === '1'}
            onChange={(event) =>
              void setProfileVisitOptOut(event.target.checked)
            }
          />
          Meine Profilbesuche nicht erfassen
        </label>
      </Section>
      <Section title="Nachrichten">
        <Toggle
          label="Persönliche Nachrichten als Messenger anzeigen"
          description="Gespräche nach Siedlern gruppieren"
          checked={settings.inbox_messenger_style === '1'}
          onChange={() =>
            void setInboxMessengerStyle(settings.inbox_messenger_style !== '1')
          }
        />
      </Section>
      <Section title="Tutorial">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span>Tutorials anzeigen</span>
          <button
            type="button"
            role="switch"
            aria-label="Tutorials anzeigen"
            aria-checked={tutorialsEnabled}
            disabled={tutorialsBusy}
            onClick={() => void setTutorials(!tutorialsEnabled)}
            className={`h-5 w-9 border disabled:cursor-not-allowed disabled:opacity-40 ${tutorialsEnabled ? 'border-swu-accent bg-swu-accent/20' : 'border-swu-border bg-swu-bg'}`}
          >
            <span className={`block h-3 w-3 bg-swu-primary transition-transform ${tutorialsEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
        <button
          type="button"
          disabled={tutorialsBusy}
          className="mt-3 border border-swu-border bg-swu-bg px-3 py-2 text-xs text-swu-primary hover:border-swu-accent disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => void setTutorials(true)}
        >
          Tutorials neu starten
        </button>
        {tutorialsError && (
          <p role="alert" className="mt-2 text-xs text-red-300">
            {tutorialsError}
          </p>
        )}
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
  const [features, setFeatures] = useState<AuthFeaturesDto | null>(null);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/me').then(setProfile);
    api.get<AuthFeaturesDto>('/auth/features').then(setFeatures);
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
        logout();
        navigate('/login?vacation=activated');
        return;
      }
      const updated = await api.get('/auth/me');
      setProfile(updated);
    } catch (error: unknown) {
      setVacationMsg(getErrorMessage(error, 'Fehler'));
    }
    setVacationLoading(false);
  };

  const requestDeletion = async () => {
    setDeleteMsg('');
    try {
      await api.post('/user/delete', { password: deletePw });
      setDeleteMsg(
        features?.accountDeletion
          ? 'Löschung beantragt. Bitte bestätige den Link in der E-Mail.'
          : 'Löschung beantragt.',
      );
      setProfile((current: any) => ({
        ...current,
        deletionMark: AccountDeletionMark.Requested,
      }));
    } catch (error: unknown) {
      setDeleteMsg(getErrorMessage(error, 'Fehler'));
    }
  };

  const revokeDeletion = async () => {
    await api.post('/user/delete/revoke', {});
    setProfile((current: any) => ({
      ...current,
      deletionMark: AccountDeletionMark.None,
    }));
    setDeleteMsg('Löschantrag zurückgezogen.');
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Section title="Kryoschlaf (Urlaubsmodus)">
        <p className="text-xs text-swu-muted mb-2">
          Der Urlaubsmodus wird 48 Stunden nach der Aktivierung wirksam. Ab dann
          pausiert die Tick-Verarbeitung; ein Login beendet den Urlaub. Nach
          Deaktivierung gilt eine 7-Tage-Abklingzeit.
        </p>
        {profile?.vacationMode && (
          <p className="text-sm text-swu-warning mb-2">
            Wirksam ab{' '}
            {profile.vacationStartedAt
              ? new Date(
                  new Date(profile.vacationStartedAt).getTime() + VACATION_DELAY_MS,
                ).toLocaleString('de-DE')
              : '—'}
          </p>
        )}
        <button
          onClick={toggleVacation}
          disabled={vacationLoading}
          className="px-4 py-2 bg-swu-warning/20 border border-swu-warning text-swu-warning text-sm font-semibold rounded hover:bg-swu-warning/30 transition-colors disabled:opacity-50"
        >
          {profile?.vacationMode
            ? 'Kryoschlaf beenden'
            : 'Kryoschlaf aktivieren'}
        </button>
        {vacationMsg && (
          <p className="text-xs text-swu-muted mt-1">{vacationMsg}</p>
        )}
      </Section>

      <Section title="Konto löschen" danger>
        <p className="text-xs text-swu-muted mb-2">
          Diese Aktion kann nicht rueckgaengig gemacht werden. Alle Daten werden
          dauerhaft geloescht.
        </p>
        {profile?.deletionMark === AccountDeletionMark.Requested ? (
          <button
            onClick={() => void revokeDeletion()}
            className="px-4 py-2 border border-swu-border text-swu-primary text-sm rounded"
          >
            Löschantrag zurückziehen
          </button>
        ) : !confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-400 text-sm font-semibold rounded hover:bg-red-500/30 transition-colors"
          >
            Konto löschen...
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
                Endgültig löschen
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
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm text-swu-primary">{label}</span>
        {description && (
          <span className="block text-xs text-swu-muted">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
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
      </button>
    </div>
  );
}
