import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BbCodeText } from '../components/BbCodeText';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { CharacterSection } from '../components/CharacterSection';
import { PmLink } from '../components/PmLink';
import {
  Faction,
  type AllianceRefDto,
  type AwardProfileDto,
  type UserCharacterDto,
  ContactMode,
  type ContactDto,
  type IgnoreListEntryDto,
  type ProfileFriendDto,
} from '@swuniverse/shared';
import { ApiError, api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { SettlerPublicDiplomacy } from './alliances';
import {
  ColonyScans,
  ColonySurfaceDialog,
  type ColonyScanProjection,
} from '../components/database/ColonyScans';


interface PlayerProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  faction: string | null;
  factionName: string;
  prestige: number;
  colonies: number;
  ships: number;
  completedResearch: number;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  createdAt: string;
  alliance: AllianceRefDto | null;
  awards?: AwardProfileDto[];
  friends: ProfileFriendDto[];
  colonyScans?: ColonyScanProjection[];
  onVacation: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<ColonyScanProjection | null>(null);
  const [characters, setCharacters] = useState<UserCharacterDto[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<UserCharacterDto | 'new' | null>(null);
  const [contact, setContact] = useState<ContactDto | null>(null);
  const [ignored, setIgnored] = useState<IgnoreListEntryDto | null>(null);
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!id) {
      setError('Spieler nicht gefunden.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setContact(null);
    setIgnored(null);
    setCharacters([]);
    setEditingCharacter(null);
    setSelectedScan(null);

    api
      .get<PlayerProfile>(`/database/settlers/${id}`)
      .then((data) => {
        if (cancelled) return;
        setPlayer(data);
        try {
          if (currentUser?.id !== data.id) {
            const requests = Promise.all([
              api.get<ContactDto[]>('/contacts'),
              api.get<IgnoreListEntryDto[]>('/ignore-list'),
            ]);
            void requests
              .then(([contacts, ignores]) => {
                if (cancelled) return;
                setContact(contacts.find((item) => item.contactUserId === data.id) ?? null);
                setIgnored(ignores.find((item) => item.ignoredUserId === data.id) ?? null);
              })
              .catch(() => {
                if (cancelled) return;
                setContact(null);
                setIgnored(null);
              });
          }
        } catch {
          setContact(null);
        }
        try {
          const request = api.get<UserCharacterDto[]>(`/rpg/characters/player/${id}`);
          Promise.resolve(request)
            .then((items) => {
              if (!cancelled) setCharacters(Array.isArray(items) ? items : []);
            })
            .catch(() => {
              if (!cancelled) setCharacters([]);
            });
        } catch {
          setCharacters([]);
        }
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlayer(null);
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Spieler nicht gefunden.'
            : 'Spielerprofil konnte nicht geladen werden.',
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-3 text-swu-muted md:p-6">
        Spielerprofil wird geladen...
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="p-3 md:p-6 space-y-4">
        <Link
          to="/database"
          className="text-xs text-swu-muted hover:text-swu-accent"
        >
          ← Datenbank
        </Link>
        <p className="text-swu-muted">{error ?? 'Spieler nicht gefunden.'}</p>
      </div>
    );
  }

  const name = player.displayName || player.username;

  async function addContact() {
    setContact(await api.post<ContactDto>('/contacts', {
      playerId: player!.id,
      mode: ContactMode.FRIEND,
    }));
  }

  async function changeContactMode(mode: ContactMode) {
    if (!contact) return;
    setContact(await api.patch<ContactDto>(`/contacts/${contact.id}/mode`, { mode }));
  }

  async function toggleIgnored() {
    if (ignored) {
      await api.delete('/ignore-list', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [ignored.id] }),
      });
      setIgnored(null);
      return;
    }
    setIgnored(await api.post<IgnoreListEntryDto>('/ignore-list', {
      playerId: player!.id,
    }));
  }

  async function deleteScan(scanId: number) {
    try {
      await api.delete(`/spacecraft/colony-scans/${scanId}`);
      if (id)
        setPlayer(await api.get<PlayerProfile>(`/database/settlers/${id}`));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Scan konnte nicht gelöscht werden',
      );
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <Link
        to="/database"
        className="text-xs text-swu-muted hover:text-swu-accent"
      >
        ← Datenbank
      </Link>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <PlayerAvatar
            name={name}
            avatar={player.avatar}
            faction={
              player.faction === 'REBEL_ALLIANCE'
                ? Faction.REBEL_ALLIANCE
                : player.faction === 'GALACTIC_EMPIRE'
                  ? Faction.GALACTIC_EMPIRE
                  : null
            }
            alt={`${name} Profilbild`}
            className="size-24 text-3xl"
          />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-2xl font-bold text-swu-accent"
                style={{ fontFamily: 'var(--font-swu-display)' }}
              >
                {name}
              </h1>
              {player.onVacation && (
                <span className="text-sm font-bold text-swu-warning">(Urlaub)</span>
              )}
              {player.isAdmin && (
                <span className="rounded border border-swu-accent/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-swu-accent">
                  ADMIN
                </span>
              )}
            </div>
            {player.displayName && player.displayName !== player.username && (
              <p className="text-xs text-swu-muted">Login: {player.username}</p>
            )}
            <p className="text-sm text-swu-primary">{player.factionName}</p>
            {currentUser?.id !== player.id && (
              contact ? (
                <label className="inline-flex items-center gap-2 text-xs text-swu-muted">
                  Kontakt
                  <select
                    aria-label={`Kontaktmodus für ${name}`}
                    value={contact.mode}
                    onChange={(event) => void changeContactMode(event.target.value as ContactMode)}
                    className="border border-swu-border bg-swu-bg px-2 py-1 text-swu-primary"
                  >
                    <option value={ContactMode.FRIEND}>Freund</option>
                    <option value={ContactMode.NEUTRAL}>Neutral</option>
                    <option value={ContactMode.ENEMY}>Feind</option>
                  </select>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => void addContact()}
                  className="border border-swu-border px-2 py-1 text-xs text-swu-primary hover:border-swu-accent hover:text-swu-accent"
                >
                  Zu Kontakten hinzufügen
                </button>
              )
            )}
            {currentUser?.id !== player.id && (
              <button
                type="button"
                onClick={() => void toggleIgnored()}
                className="border border-swu-border px-2 py-1 text-xs text-swu-primary hover:border-swu-accent hover:text-swu-accent"
              >
                {ignored ? 'Nicht mehr ignorieren' : 'Ignorieren'}
              </button>
            )}
            <PmLink
              playerId={player.id}
              playerName={name}
              className="inline-flex items-center gap-1.5 border border-swu-border px-2 py-1 text-xs text-swu-primary hover:border-swu-accent hover:text-swu-accent"
            >
              <img src="/assets/buttons/msg1.png" alt="" className="size-4" />
              Nachricht schreiben
            </PmLink>
            {player.alliance && (
              <p className="text-sm text-swu-muted">
                Allianz{' '}
                <Link
                  to={`/alliances/${player.alliance.id}`}
                  className="font-bold text-swu-primary hover:underline"
                  style={{ color: player.alliance.color ?? undefined }}
                >
                  {player.alliance.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileMetric label="Prestige" value={player.prestige} />
        <ProfileMetric label="Kolonien" value={player.colonies} />
        <ProfileMetric label="Schiffe" value={player.ships} />
        <ProfileMetric label="Forschung" value={player.completedResearch} />
      </section>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-swu-primary">
          Beschreibung
        </h2>
        {player.description ? (
          <BbCodeText
            text={player.description}
            className="text-sm text-swu-text whitespace-pre-wrap"
          />
        ) : (
          <p className="text-sm italic text-swu-muted">Keine Beschreibung</p>
        )}
      </section>

      <CharacterSection
        characters={characters ?? []}
        owner={currentUser?.id === player.id}
        editing={editingCharacter}
        onEdit={setEditingCharacter}
        onChange={setCharacters}
      />

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-swu-primary">Freunde</h2>
        {(player.friends ?? []).length === 0 ? (
          <p className="text-center text-sm text-swu-muted">Keine</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.friends.map((friend) => (
              <Link key={friend.id} to={`/players/${friend.id}`} title={friend.name}>
                <PlayerAvatar name={friend.name} avatar={friend.avatar} faction={null} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
        <h2 className="mb-3 text-sm font-bold text-swu-primary">Awards</h2>
        {(player.awards ?? []).length === 0 ? (
          <p className="text-center text-sm text-swu-muted">Keine</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(player.awards ?? []).map((award) => (
              <span key={award.key} className="relative inline-flex">
                <img
                  src={award.image}
                  alt={award.description}
                  aria-label={award.description}
                  title={award.description}
                  className="size-12 rounded border border-swu-border bg-swu-bg object-contain p-1"
                />
                {award.count >= 2 && (
                  <span className="absolute -bottom-1 -right-1 min-w-5 rounded-full bg-swu-accent px-1 text-center text-xs font-bold text-swu-bg">
                    {award.count}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ProfileMeta
          label="Siedler seit"
          value={dateFormatter.format(new Date(player.createdAt))}
        />
        <ProfileMeta
          label="Status"
          value={player.onboardingCompleted ? 'aktiv' : 'im Aufbau'}
        />
      </section>

      {player.colonyScans && (
        <ColonyScans
          scans={player.colonyScans}
          onOpen={setSelectedScan}
          onDelete={deleteScan}
        />
      )}

      {!player.alliance && <SettlerPublicDiplomacy playerId={player.id} />}
      {selectedScan && (
        <ColonySurfaceDialog
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
        />
      )}
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <p className="text-xs uppercase tracking-wider text-swu-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-swu-accent">{value}</p>
    </div>
  );
}

function ProfileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4">
      <p className="text-xs uppercase tracking-wider text-swu-muted">{label}</p>
      <p className="mt-2 text-sm text-swu-text">{value}</p>
    </div>
  );
}
