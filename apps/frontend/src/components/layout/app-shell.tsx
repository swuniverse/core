import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { useSocket } from '../../hooks/use-socket';

interface ColonyTickReportPayload {
  colonyId: number;
  tick: number;
  events: Array<{ type: string; reason?: string; fieldIndex?: number }>;
}

function formatColonyTickReport(payload: ColonyTickReportPayload): string {
  const first = payload.events[0];
  const suffix =
    payload.events.length > 1 ? ` (+${payload.events.length - 1})` : '';
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
    return `Kolonie ${payload.colonyId}: Terraforming abgeschlossen${suffix}`;
  }
  return `Kolonie ${payload.colonyId}: ${payload.events.length} Tick-Ereignis(se)`;
}

export function AppShell() {
  const [tickReports, setTickReports] = useState<string[]>([]);
  useSocket();
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
      {tickReports.length > 0 && (
        <div className="fixed right-3 top-[60px] z-50 w-[min(360px,calc(100vw-24px))] space-y-2">
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
      <main className="md:ml-[68px] mt-[52px] px-3 md:px-4 py-2 pb-[calc(56px+env(safe-area-inset-bottom,0px)+8px)] md:pb-2">
        <Outlet />
      </main>
    </div>
  );
}
