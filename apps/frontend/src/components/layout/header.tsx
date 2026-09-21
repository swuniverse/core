import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  GlobalHeaderStatusDto,
  SpacecraftEventPayload,
} from '@swuniverse/shared';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';
import { useSocket } from '../../hooks/use-socket';

type ShipNotice = SpacecraftEventPayload & { id: number };

export function Header() {
  const fallbackUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [status, setStatus] = useState<GlobalHeaderStatusDto | null>(null);
  const [shipNotices, setShipNotices] = useState<ShipNotice[]>([]);
  const [unreadShipNotices, setUnreadShipNotices] = useState(0);
  const [shipOpen, setShipOpen] = useState(false);
  const noticeId = useRef(0);

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
  useSocket('TICK', refresh);
  useSocket('COLONY_UPDATED', refresh);
  useSocket('SPACECRAFT_EVENT', (payload) => {
    const event = payload as SpacecraftEventPayload;
    noticeId.current += 1;
    setUnreadShipNotices((count) => count + 1);
    setShipNotices((current) =>
      [{ ...event, id: noticeId.current }, ...current].slice(0, 5),
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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-swu-border bg-[#0d0e1b] text-[10px]">
      <div className="flex h-[58px] min-w-0 items-stretch md:h-[86px]">
        <div className="flex min-w-0 items-center border-r border-swu-border sm:w-[220px] xl:w-[255px]">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center gap-2 px-2 hover:bg-white/[0.03] md:px-3"
            title="Zum Maindesk"
          >
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-swu-border bg-black/30 md:size-12">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-base font-bold text-swu-accent">
                  {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-bold text-swu-primary">
                {user?.name ?? 'Kommandant'}
              </div>
              <div className="mt-0.5 hidden text-[9px] text-swu-muted sm:block">
                ID {user?.id ?? '-'} · Prestige{' '}
                <b className="text-swu-accent">{user?.prestige ?? 0}</b>
              </div>
            </div>
          </Link>
          <Link
            to="/notes"
            title="Notizzettel öffnen"
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

        <div className="flex shrink-0 border-r border-swu-border">
          <StatusLink
            to="/messages?tab=inbox"
            label="Nachrichten"
            count={status?.notifications.messages ?? 0}
            icon="pmnavlet_1"
          />
          <div className="relative">
            <StatusButton
              label="Schiffsnachrichten"
              count={unreadShipNotices}
              icon="pmnavlet_2"
              onClick={() => {
                setShipOpen((open) => !open);
                setUnreadShipNotices(0);
              }}
            />
            {shipOpen && (
              <div className="absolute left-0 top-full z-50 mt-px w-72 border border-swu-border bg-swu-surface shadow-xl">
                <div className="border-b border-swu-border px-2 py-1 font-bold text-swu-primary">
                  Schiffsnachrichten
                </div>
                {shipNotices.length ? (
                  shipNotices.map((notice) => (
                    <Link
                      key={notice.id}
                      to={`/spacecraft/${notice.shipId}`}
                      onClick={() => setShipOpen(false)}
                      className="block border-b border-swu-border/40 px-2 py-1.5 hover:bg-white/5"
                    >
                      <b className="text-swu-primary">{notice.type}</b>
                      <div className="text-swu-muted">{notice.detail}</div>
                    </Link>
                  ))
                ) : (
                  <p className="px-2 py-3 text-swu-muted">
                    Keine neuen Schiffsnachrichten.
                  </p>
                )}
              </div>
            )}
          </div>
          <StatusLink
            to="/messages?tab=system"
            label="System"
            count={status?.notifications.system ?? 0}
            icon="pmnavlet_5"
            critical={(status?.notifications.system ?? 0) > 0}
          />
        </div>

        <Link
          to="/research"
          className="hidden w-[230px] shrink-0 items-center border-r border-swu-border px-3 hover:bg-white/[0.03] lg:flex"
        >
          <div className="min-w-0 text-left">
            <div className="truncate font-bold text-swu-primary">
              {status?.research?.name ?? 'Keine Forschung'}
            </div>
            {status?.research && (
              <>
                <div className="mt-1 h-1.5 w-40 border border-swu-border bg-black/50">
                  <div
                    className="h-full bg-swu-accent"
                    style={{
                      width: `${Math.min(100, Math.round((status.research.progress / Math.max(1, status.research.pointsRequired)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-1 font-mono text-[9px] text-swu-muted">
                  {status.research.progress}/{status.research.pointsRequired}
                </div>
              </>
            )}
          </div>
        </Link>

        <div className="hidden max-w-[330px] shrink-0 items-center gap-1 overflow-x-auto border-r border-swu-border px-2 xl:flex">
          {(status?.colonies ?? []).slice(0, 4).map((colony) => {
            const warning =
              colony.energyMax > 0 && colony.energy / colony.energyMax < 0.15
                ? 'bg-red-500'
                : colony.storageMax > 0 &&
                    colony.storageUsed / colony.storageMax > 0.9
                  ? 'bg-swu-warning'
                  : 'bg-swu-success';
            return (
              <Link
                key={colony.id}
                to={`/colonies?selected=${colony.id}`}
                className="flex min-w-[72px] items-center gap-1 border border-swu-border bg-black/20 px-1.5 py-1 hover:border-swu-accent"
              >
                <img
                  src="/assets/planets/201s.png"
                  alt=""
                  className="size-7 object-contain"
                />
                <span className="min-w-0 truncate text-swu-primary">
                  {colony.name}
                </span>
                <span className={`size-1.5 shrink-0 rounded-full ${warning}`} />
              </Link>
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

function StatusLink(props: {
  to: string;
  label: string;
  count: number;
  icon: string;
  critical?: boolean;
}) {
  return (
    <Link
      to={props.to}
      title={props.label}
      className="relative flex w-12 items-center justify-center border-r border-swu-border text-swu-muted hover:bg-white/[0.03] hover:text-swu-accent md:w-14"
    >
      <img
        src={`/assets/buttons/${props.icon}_${props.count > 0 ? 1 : 0}.png`}
        alt=""
        className="size-6 object-contain md:size-[30px]"
      />
      <span
        className={`absolute bottom-1 right-1 min-w-3 text-center text-[8px] ${
          props.critical
            ? 'font-mono text-red-400'
            : 'font-mono text-swu-primary'
        }`}
      >
        {props.count}
      </span>
    </Link>
  );
}

function StatusButton(props: {
  label: string;
  count: number;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={props.label}
      onClick={props.onClick}
      className="relative flex h-full w-12 items-center justify-center border-r border-swu-border text-swu-muted hover:bg-white/[0.03] hover:text-swu-accent md:w-14"
    >
      <img
        src={`/assets/buttons/${props.icon}_${props.count > 0 ? 1 : 0}.png`}
        alt=""
        className="size-6 object-contain md:size-[30px]"
      />
      <span className="absolute bottom-1 right-1 min-w-3 text-center font-mono text-[8px] text-swu-primary">
        {props.count}
      </span>
    </button>
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
