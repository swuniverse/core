import { refreshPlayerNames, resetPlayerNames } from '../../stores/player-names.store';
import { useInterfaceTheme } from '../../hooks/use-interface-theme';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ColonyTickReportPayload, TutorialView } from '@swuniverse/shared';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { OrderBroadcastOverlay } from '../OrderBroadcastOverlay';
import { useSocket } from '../../hooks/use-socket';
import type { UserProfile } from '@swuniverse/shared';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { TutorialPadd } from '../tutorial/TutorialPadd';
import { LegalLinks } from '../legal/LegalLinks';

type GameStatus = {
  status: 'ONLINE' | 'TICK' | 'MAINTENANCE_ANNOUNCED' | 'MAINTENANCE';
  message: string;
};

export function tutorialViewForPath(pathname: string): TutorialView | null {
  if (pathname === '/') return 'maindesk';
  const segment = pathname.split('/').filter(Boolean)[0];
  const views: Record<string, TutorialView> = {
    colonies: 'colony',
    research: 'research',
    spacecraft: 'spacecraft',
    starmap: 'starmap',
    messages: 'messages',
    holonet: 'holonet',
  };
  return views[segment] ?? null;
}

function formatColonyTickReport(payload: ColonyTickReportPayload): string {
  const first = payload.events[0];
  const reactivatedCount = payload.events.reduce(
    (count, event) => count + (event.reactivatedCount ?? 0),
    0,
  );
  const suffix =
    (payload.events.length > 1 ? ` (+${payload.events.length - 1})` : '') +
    (reactivatedCount > 0
      ? ` – Es wurden ${reactivatedCount} Orbitalgebäude reaktiviert`
      : '');
  if (!first) return `Kolonie ${payload.colonyId}: Tickreport`;
  if (first.type === 'BUILDING_DEACTIVATED') {
    return `Kolonie ${payload.colonyId}: Gebäude auf Feld ${first.fieldIndex ?? '?'} deaktiviert (${first.reason ?? 'Mangel'})${suffix}`;
  }
  if (first.type === 'STORAGE_FULL') {
    return `Kolonie ${payload.colonyId}: Lager voll${suffix}`;
  }
  if (first.type === 'BUILDING_FINISHED') {
    return `Kolonie ${payload.colonyId}: Gebäude fertiggestellt${suffix}`;
  }
  if (first.type === 'TERRAFORMING_FINISHED') {
    return `Kolonie ${payload.colonyId}: Geoengineering abgeschlossen${suffix}`;
  }
  if (first.type === 'WRECK_REPAIRED') {
    return `Kolonie ${payload.colonyId}: Wrack repariert${suffix}`;
  }
  if (first.type === 'DOME_FINISHED') {
    return `Kolonie ${payload.colonyId}: Kuppel fertiggestellt${suffix}`;
  }
  return `Kolonie ${payload.colonyId}: ${payload.events.length} Tick-Ereignis(se)`;
}

export function AppShell() {
  const [tickReports, setTickReports] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const user = useAuthStore((state) => state.user);
  useInterfaceTheme(user?.id, user?.faction);
  const setUser = useAuthStore((state) => state.setUser);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    resetPlayerNames();
    return resetPlayerNames;
  }, [user?.id]);
  useEffect(() => {
    if (user?.id) void refreshPlayerNames().catch(() => undefined);
  }, [user?.id, location.pathname]);


  useEffect(() => {
    void api
      .get<UserProfile>('/auth/me')
      .then(setUser)
      .catch(() => undefined);
  }, [setUser]);

  useEffect(() => {
    void api
      .get<GameStatus>('/game-status')
      .then(setGameStatus)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!user.onboardingCompleted && location.pathname !== '/claim-colony') {
      navigate('/claim-colony', { replace: true });
    }
  }, [location.pathname, navigate, user]);
  useSocket();
  useSocket('TICK', () => window.location.reload());
  useSocket('COLONY_TICK_REPORT', (payload) => {
    const message = formatColonyTickReport(payload as ColonyTickReportPayload);
    setTickReports((reports) => [message, ...reports].slice(0, 3));
    window.setTimeout(() => {
      setTickReports((reports) => reports.filter((item) => item !== message));
    }, 8000);
  });

  return (
    <div className="min-h-svh bg-swu-bg">
      <Header />
      <Sidebar />
      <BottomNav />
      <TutorialPadd view={tutorialViewForPath(location.pathname)} />
      <OrderBroadcastOverlay />
      {gameStatus?.status !== 'ONLINE' && (
        <div
          className={`fixed inset-x-0 top-[58px] z-40 border-b px-3 py-2 text-center text-xs md:top-[86px] ${
            gameStatus?.status === 'MAINTENANCE'
              ? 'border-red-400/40 bg-red-950/95 text-red-100'
              : 'border-amber-400/40 bg-amber-950/95 text-amber-100'
          }`}
        >
          <strong>
            {gameStatus?.status === 'MAINTENANCE'
              ? 'Wartung läuft'
              : gameStatus?.status === 'TICK'
                ? 'Tick läuft'
                : 'Wartung angekündigt'}
          </strong>
          {gameStatus?.message && ` — ${gameStatus.message}`}
        </div>
      )}
      {tickReports.length > 0 && (
        <div className="fixed right-3 top-[66px] z-50 w-[min(360px,calc(100vw-24px))] space-y-2 md:top-[94px]">
          {tickReports.map((report) => (
            <div
              key={report}
              className="rounded border border-swu-accent/50 bg-swu-surface px-3 py-2 text-xs text-swu-primary shadow-xl"
            >
              {report}
            </div>
          ))}
        </div>
      )}
      <main className="mt-[58px] px-3 py-2 pb-[calc(56px+env(safe-area-inset-bottom,0px)+8px)] md:ml-[68px] md:mt-[86px] md:px-4 md:pb-2">
        <Outlet />
        <footer className="mt-6 border-t border-swu-border py-3 text-xs text-swu-muted">
          <LegalLinks className="flex flex-wrap justify-center gap-4" />
        </footer>
      </main>
    </div>
  );
}
