import { PlayerName } from '../PlayerName';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Faction, type GlobalHeaderStatusDto } from '@swuniverse/shared';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';
import { PlanetImg } from '../PlanetImg';
import { PlayerAvatar } from '../PlayerAvatar';
import { Tooltip } from '../Tooltip';
import { useSocket } from '../../hooks/use-socket';
import { formatNumber } from '../../lib/format';

type MessageFolderSummary = {
  folder: MessageFolder;
  unread: number;
  total: number;
};

type MessageFolder =
  'PERSONAL' | 'SHIP' | 'COLONY' | 'TRADE' | 'SYSTEM' | 'OUTBOX' | 'STATION';

const MESSAGE_FOLDERS: Array<{
  folder: Extract<
    MessageFolder,
    'PERSONAL' | 'SHIP' | 'COLONY' | 'TRADE' | 'SYSTEM'
  >;
  label: string;
  route: string;
  asset: string;
}> = [
  {
    folder: 'PERSONAL',
    label: 'Posteingang',
    route: 'personal',
    asset: 'pmnavlet_1',
  },
  {
    folder: 'SHIP',
    label: 'Schiffe',
    route: 'ship',
    asset: 'pmnavlet_2',
  },
  {
    folder: 'COLONY',
    label: 'Kolonien',
    route: 'colony',
    asset: 'pmnavlet_3',
  },
  {
    folder: 'TRADE',
    label: 'Handel',
    route: 'trade',
    asset: 'pmnavlet_4',
  },
  {
    folder: 'SYSTEM',
    label: 'Systemmeldungen',
    route: 'system',
    asset: 'pmnavlet_5',
  },
];

export function Header() {
  const fallbackUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [status, setStatus] = useState<GlobalHeaderStatusDto | null>(null);
  const [messageFolders, setMessageFolders] = useState<MessageFolderSummary[]>(
    [],
  );
  const messageRefreshTimeout = useRef<number | undefined>(undefined);

  const refresh = useCallback(() => {
    void api
      .get<GlobalHeaderStatusDto>('/dashboard/header')
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  const refreshMessageFolders = useCallback(() => {
    void api
      .get<MessageFolderSummary[]>('/messages/folders')
      .then(setMessageFolders)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshMessageFolders();
    window.addEventListener('focus', refreshMessageFolders);
    window.addEventListener('swu:messages-read', refreshMessageFolders);
    return () => {
      window.removeEventListener('focus', refreshMessageFolders);
      window.removeEventListener('swu:messages-read', refreshMessageFolders);
    };
  }, [refreshMessageFolders]);
  useEffect(() => {
    return () => window.clearTimeout(messageRefreshTimeout.current);
  }, []);
  useSocket('TICK', refresh);
  useSocket('COLONY_UPDATED', refresh);
  useSocket('RESEARCH_COMPLETED', refresh);
  useSocket('MESSAGE_RECEIVED', () => {
    window.clearTimeout(messageRefreshTimeout.current);
    messageRefreshTimeout.current = window.setTimeout(
      refreshMessageFolders,
      500,
    );
  });

  const user =
    status?.user ??
    (fallbackUser
      ? {
          id: fallbackUser.id,
          name: fallbackUser.displayName || fallbackUser.username,
          faction: fallbackUser.faction ?? null,
          prestige: fallbackUser.prestige,
          avatar: fallbackUser.avatar ?? null,
        }
      : null);

  async function handleLogout() {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Client credentials still have to be cleared when the server is unreachable.
    } finally {
      logout();
      navigate('/login');
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-swu-border bg-swu-header text-[10px]">
      <div className="flex h-[58px] min-w-0 items-stretch md:h-[86px]">
        <div className="flex min-w-0 items-center border-r border-swu-border sm:w-[220px] xl:w-[255px]">
          {user?.id ? (
            <Link
              to={`/players/${user.id}`}
              title="Zum Spielerprofil"
              className="shrink-0 px-2 py-1 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent md:px-3"
            >
              <PlayerAvatar
                name={user.name}
                avatar={user.avatar}
                faction={
                  user.faction === 'REBEL_ALLIANCE'
                    ? Faction.REBEL_ALLIANCE
                    : user.faction === 'GALACTIC_EMPIRE'
                      ? Faction.GALACTIC_EMPIRE
                      : null
                }
                decorative
                className="size-9 border-swu-border bg-black/30 text-base text-swu-accent md:size-12"
              />
            </Link>
          ) : (
            <PlayerAvatar
              name="Kommandant"
              avatar={null}
              faction={null}
              decorative
              className="mx-2 size-9 border-swu-border bg-black/30 text-base text-swu-accent md:mx-3 md:size-12"
            />
          )}
          <Link
            to="/"
            className="min-w-0 flex-1 py-1 pr-2 hover:bg-white/[0.03] md:pr-3"
            title="Zum Maindesk"
          >
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-bold text-swu-primary">
                <PlayerName name={user?.name ?? 'Kommandant'} playerId={user?.id} />
              </div>
              <div className="mt-0.5 hidden text-[9px] text-swu-muted sm:block">
                ID {user?.id ?? '-'} · Prestige{' '}
                <b className="text-swu-accent">{user?.prestige ?? 0}</b>
              </div>
            </div>
          </Link>
          {status?.alliance && (
            <Link
              to={`/alliances/${status.alliance.id}`}
              title="Zur Allianz"
              className="max-w-[72px] shrink-0 truncate px-1 text-[9px] font-bold text-swu-primary hover:underline md:max-w-[110px] md:px-2 md:text-[10px]"
              style={{ color: status.alliance.color ?? undefined }}
            >
              {status.alliance.name}
            </Link>
          )}
          <Link
            to="/messages?tab=compose"
            title="Neue Nachricht schreiben"
            aria-label="Neue Nachricht schreiben"
            className="hidden shrink-0 px-1 sm:block"
          >
            <img
              src="/assets/buttons/msg1.png"
              alt=""
              className="size-5 object-contain"
            />
          </Link>
          <Link
            to="/notes"
            title="Notizsammlung öffnen"
            aria-label="Notizsammlung öffnen"
            className="group hidden shrink-0 px-2 sm:block"
          >
            <img
              src="/assets/buttons/notiz1.png"
              alt=""
              className="size-5 object-contain group-hover:hidden"
            />
            <img
              src="/assets/buttons/notiz2.png"
              alt=""
              className="hidden size-5 object-contain group-hover:block"
            />
          </Link>
        </div>

        <div
          className="flex min-w-0 shrink border-r border-swu-border overflow-x-auto"
          aria-label="Nachrichtenordner"
        >
          {MESSAGE_FOLDERS.map((folder) => {
            const summary = messageFolders.find(
              (entry) => entry.folder === folder.folder,
            );
            return (
              <MailboxFolderLink
                key={folder.folder}
                to={`/messages?folder=${folder.route}`}
                label={folder.label}
                asset={folder.asset}
                unread={summary?.unread ?? 0}
              />
            );
          })}
        </div>

        <Link
          to="/research"
          className="hidden w-[230px] shrink-0 items-center border-r border-swu-border px-3 hover:bg-white/[0.03] lg:flex"
        >
          {status?.research ? (
            <>
              <img
                src={`/assets/research/${status.research.imageId}.png`}
                alt=""
                title={`Forschung: ${status.research.name}`}
                className="mr-2 size-10 shrink-0 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate font-bold text-swu-primary">
                  {status.research.name}
                </div>
                <div className="mt-1 h-1.5 w-full border border-swu-border bg-black/50">
                  <div
                    className="h-full bg-swu-accent"
                    style={{
                      width: `${Math.min(100, Math.round((status.research.progress / Math.max(1, status.research.pointsRequired)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-swu-muted">
                  {status.research.commodityId != null && (
                    <img
                      src={`/assets/commodities/${status.research.commodityId}.png`}
                      alt=""
                      title="Forschungspunkte"
                      className="size-[15px] object-contain"
                    />
                  )}
                  <span>
                    {status.research.progress}/{status.research.pointsRequired}{' '}
                    (+
                    {status.research.productionPerTick})
                  </span>
                </div>
              </div>
              {status.research.queuedCount > 0 && (
                <span
                  title={`wartet: ${status.research.nextQueuedName ?? 'Forschung'}`}
                  className="ml-2 shrink-0 text-xl text-swu-accent"
                >
                  +1
                </span>
              )}
            </>
          ) : (
            <div className="flex w-full items-center gap-2 text-left">
              <img
                src="/assets/navigation/menu_forsch0.png"
                alt=""
                title="Forschung"
                className="size-10 object-contain"
              />
              <span className="font-bold text-swu-primary">
                Keine Forschung
              </span>
            </div>
          )}
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto border-r border-swu-border px-2 xl:flex">
          {(status?.colonies ?? []).map((colony) => {
            const warning =
              colony.energyMax > 0 && colony.energy / colony.energyMax < 0.15
                ? 'bg-red-500'
                : colony.storageMax > 0 &&
                    colony.storageUsed / colony.storageMax > 0.9
                  ? 'bg-swu-warning'
                  : 'bg-swu-success';
            const width =
              colony.celestialObject?.objectType === 2
                ? 'w-[30px]'
                : colony.celestialObject?.objectType === 3
                  ? 'w-[40px]'
                  : 'w-[50px]';
            return (
              <Tooltip
                key={colony.id}
                title={`Kolonieinformationen: ${colony.name}`}
                content={
                  <div className="space-y-0.5">
                    <div>
                      Koordinaten: {colony.systemPosition.x}|
                      {colony.systemPosition.y}
                    </div>
                    <div>
                      System: {colony.starSystem.name} ({colony.starSystem.x}|
                      {colony.starSystem.y})
                    </div>
                    <div>
                      EPS: {formatNumber(colony.energy)}/
                      {formatNumber(colony.energyMax)}
                    </div>
                    <div>
                      Lager: {formatNumber(colony.storageUsed)}/
                      {formatNumber(colony.storageMax)}
                    </div>
                  </div>
                }
              >
                <Link
                  to={`/colonies?selected=${colony.id}`}
                  aria-label={colony.name}
                  className="relative flex h-[64px] shrink-0 items-center justify-center px-1 hover:bg-white/[0.03]"
                >
                  <PlanetImg
                    classId={
                      colony.celestialObject?.classId ??
                      colony.colonyClassId ??
                      201
                    }
                    name={colony.celestialObject?.name}
                    objectType={colony.celestialObject?.objectType}
                    thumbnail
                    className={`h-[50px] ${width} object-contain`}
                  />
                  <span
                    className={`absolute bottom-1 right-1 size-1.5 rounded-full ${warning}`}
                  />
                </Link>
              </Tooltip>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-stretch">
          <NavigationLink
            to="/settings"
            label="Einstellungen"
            icon="menu_option"
          />
          <a
            href="https://wiki.swuniverse.net"
            target="_blank"
            rel="noreferrer"
            title="Wiki"
            className="group hidden w-12 flex-col items-center justify-center border-r border-swu-border hover:bg-white/[0.03] lg:flex md:w-14"
          >
            <img
              src="/assets/navigation/menu_doku0.png"
              alt=""
              className="size-6 object-contain group-hover:hidden md:size-8"
            />
            <img
              src="/assets/navigation/menu_doku1.png"
              alt=""
              className="hidden size-6 object-contain group-hover:block md:size-8"
            />
          </a>
          <button
            type="button"
            onClick={handleLogout}
            title="Ausloggen"
            className="group flex w-12 items-center justify-center border-l border-swu-border hover:bg-white/[0.03] md:w-14"
          >
            <img
              src="/assets/navigation/menu_logout0.png"
              alt=""
              className="size-6 object-contain group-hover:hidden md:size-8"
            />
            <img
              src="/assets/navigation/menu_logout1.png"
              alt=""
              className="hidden size-6 object-contain group-hover:block md:size-8"
            />
          </button>
        </div>
      </div>
    </header>
  );
}

function MailboxFolderLink(props: {
  to: string;
  label: string;
  asset: string;
  unread: number;
}) {
  return (
    <Link
      to={props.to}
      title={props.label}
      aria-label={`${props.label}: ${props.unread} ungelesen`}
      className="group relative flex h-full w-10 shrink-0 flex-col items-center justify-center border-r border-swu-border px-1 text-swu-muted hover:bg-white/[0.03] hover:text-swu-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-swu-accent md:w-12"
    >
      <img
        src={`/assets/buttons/${props.asset}_${props.unread > 0 ? '1' : '0'}.png`}
        alt=""
        className={`size-6 object-contain md:size-[30px] ${props.unread === 0 ? 'group-hover:hidden' : ''}`}
      />
      {props.unread === 0 && (
        <img
          src={`/assets/buttons/${props.asset}_1.png`}
          alt=""
          className="hidden size-6 object-contain group-hover:block md:size-[30px]"
        />
      )}
      <span
        className={`mt-0.5 font-mono text-[8px] ${props.unread > 0 ? 'font-bold text-swu-accent' : 'text-swu-muted'}`}
      >
        {props.unread}
      </span>
    </Link>
  );
}

function NavigationLink(props: { to: string; label: string; icon: string }) {
  return (
    <Link
      to={props.to}
      title={props.label}
      className="group hidden w-12 flex-col items-center justify-center border-r border-swu-border hover:bg-white/[0.03] lg:flex md:w-14"
    >
      <img
        src={`/assets/navigation/${props.icon}0.png`}
        alt=""
        className="size-6 object-contain group-hover:hidden md:size-8"
      />
      <img
        src={`/assets/navigation/${props.icon}1.png`}
        alt=""
        className="hidden size-6 object-contain group-hover:block md:size-8"
      />
    </Link>
  );
}
