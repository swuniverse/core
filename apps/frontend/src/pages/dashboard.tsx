import { useCallback, useEffect, useRef, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout } from 'react-grid-layout/legacy';
import { useAuthStore } from '../stores/auth.store';
import { useDashboardLayoutStore } from '../stores/dashboard-layout.store';
import type { Breakpoint } from '../stores/dashboard-layout.store';
import { api } from '../services/api';
import { useSocket } from '../hooks/use-socket';
import type { DashboardData, ActiveResearch, ActiveBuildJob, BaustelleAlert } from './dashboard/types';
import { WIDGET_MAP } from './dashboard/widget-registry';
import { WidgetShell } from './dashboard/WidgetShell';
import { DashboardCustomizer } from './dashboard/DashboardCustomizer';

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { layouts, editMode, setLayout, toggleWidget, loadFromServer, setActiveBreakpoint } =
    useDashboardLayoutStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const activeBreakpointRef = useRef<Breakpoint>('lg');

  const loadDashboard = useCallback(async () => {
    const [
      colonies,
      researchData,
      holonetData,
      colonizationData,
      onlineData,
      spacecraftData,
      unreadData,
      tickData,
      serverStatsData,
    ] = await Promise.all([
      api.get<Array<{
        id: number; name: string; energy: number; energyMax: number;
        population: number; populationMax: number; storageUsed: number;
        storageMax: number; locationLabel?: string;
      }>>('/colonies'),
      api.get<Array<{
        status: string; name: string; progress: number; pointsRequired: number;
        ticksRemaining?: number | null;
        commodity?: { id: number; name: string } | null;
        blockedReason?: string | null;
      }>>('/research'),
      api.get<{ data: Array<{
        id: number; title: string; createdAt: string; category: string;
        commentCount: number; isUnread?: boolean;
        author?: { username: string }; authorName?: string;
      }> }>('/holonet?page=1').catch(() => ({ data: [] })),
      api.get<{
        limits: {
          planet: { type: string; count: number; limit: number; max: number };
          moon: { type: string; count: number; limit: number; max: number };
          asteroid: { type: string; count: number; limit: number; max: number };
        };
      }>('/colonization/status').catch(() => null),
      api.get<Array<{ id: number; username: string; faction: string; avatar?: string | null }>>('/database/online').catch(() => []),
      api.get<Array<{
        id: number; name: string; status: string; alertState?: string; arrivalAt: string | null;
        hull?: number; hullMax?: number; crew?: number; crewMax?: number;
        warpdrive?: number; warpdriveMax?: number;
      }>>('/spacecraft').catch(() => []),
      api.get<number>('/messages/unread').catch(() => 0),
      api.get<{ nextTickAt: string; currentTickIndex: number; totalTicks: number }>('/tick/status').catch(() => null),
      api.get<{ settlers: number; colonies: number; ships: number }>('/database/overview').catch(() => null),
    ]);

    const activeResearch =
      (researchData.find((r) => r.status === 'IN_PROGRESS') as ActiveResearch) ?? null;
    const queuedResearch =
      (researchData.find((r) => r.status === 'QUEUED') as ActiveResearch) ?? null;
    const researchCompleted = researchData.filter((r) => r.status === 'COMPLETED').length;

    const shipsInFlight = spacecraftData.filter((s) => s.status === 'IN_FLIGHT');

    const buildJobs: Array<ActiveBuildJob & { colonyName: string }> = [];
    let crewInfo: { assigned: number; globalLimit: number } | null = null;
    const warnings: DashboardData['warnings'] = [];
    const colonyEvents: DashboardData['colonyEvents'] = [];

    if (colonies.length > 0) {
      const details = await Promise.all(
        colonies.map((c) =>
          api.get<{
            detailV2?: {
              activeBuildJobs: ActiveBuildJob[];
              energy: { current: number; max: number; delta: number | null };
              crew?: { globalLimit: number; remainingGlobal: number };
            };
            deactivatedBuildings?: number;
            storageFull?: boolean;
          }>(`/colonies/${c.id}`).catch(() => null),
        ),
      );

      // fetch events for colonies with enabled colony-events widget
      const colonyEventsWidget = layouts.lg.find((w) => w.id === 'colony-events' && w.enabled);
      if (colonyEventsWidget) {
        const eventResults = await Promise.all(
          colonies.map((c) =>
            api.get<Array<{
              id: number; type: string; severity: string; title: string; message: string; createdAt: string;
            }>>(`/colonies/${c.id}/events?limit=10&unreadOnly=false`).catch(() => []),
          ),
        );
        for (let i = 0; i < eventResults.length; i++) {
          for (const ev of eventResults[i]) {
            if (ev.severity === 'CRITICAL' || ev.severity === 'WARNING') {
              colonyEvents.push({
                ...ev,
                severity: ev.severity as 'INFO' | 'WARNING' | 'CRITICAL',
                colonyName: colonies[i].name,
                colonyId: colonies[i].id,
              });
            }
          }
        }
        colonyEvents.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }

      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        if (!detail) continue;
        const jobs = detail.detailV2?.activeBuildJobs ?? [];
        buildJobs.push(...jobs.map((j) => ({ ...j, colonyName: colonies[i].name })));
        if (!crewInfo && detail.detailV2?.crew) {
          crewInfo = {
            assigned: detail.detailV2.crew.globalLimit - detail.detailV2.crew.remainingGlobal,
            globalLimit: detail.detailV2.crew.globalLimit,
          };
        }
        if (
          detail.detailV2?.energy.delta != null &&
          detail.detailV2.energy.delta < 0 &&
          detail.detailV2.energy.current < 10
        ) {
          warnings.push({
            colonyId: colonies[i].id,
            colonyName: colonies[i].name,
            type: 'energy',
            message: `Energiedefizit (${detail.detailV2.energy.delta}/Tick)`,
          });
        }
        if (colonies[i].storageUsed >= colonies[i].storageMax) {
          warnings.push({
            colonyId: colonies[i].id,
            colonyName: colonies[i].name,
            type: 'storage',
            message: 'Lager voll',
          });
        }
      }
    }

    // Handlungsbedarf: individual alerts per entity with direct links
    const baustelleAlerts: BaustelleAlert[] = [];
    for (const s of spacecraftData) {
      if (s.warpdriveMax && s.warpdriveMax > 0 && (s.warpdrive ?? 0) < s.warpdriveMax * 0.1) {
        baustelleAlerts.push({
          id: `warp-${s.id}`,
          severity: 'critical',
          icon: '⚡',
          label: s.name,
          detail: `Kritische WK-Ladung (${Math.round(((s.warpdrive ?? 0) / s.warpdriveMax) * 100)}%)`,
          linkTo: `/spacecraft/${s.id}`,
        });
      }
      if (s.crewMax && s.crewMax > 0 && (s.crew ?? 0) === 0) {
        baustelleAlerts.push({
          id: `crew-${s.id}`,
          severity: 'critical',
          icon: '👤',
          label: s.name,
          detail: 'Ohne Crew',
          linkTo: `/spacecraft/${s.id}`,
        });
      }
      if (s.hullMax && s.hullMax > 0 && (s.hull ?? s.hullMax) < s.hullMax * 0.25) {
        baustelleAlerts.push({
          id: `hull-${s.id}`,
          severity: 'warning',
          icon: '🛡',
          label: s.name,
          detail: `Niedriger Rumpf (${Math.round(((s.hull ?? 0) / s.hullMax) * 100)}%)`,
          linkTo: `/spacecraft/${s.id}`,
        });
      }
    }
    for (const c of colonies) {
      if (c.storageMax > 0 && c.storageUsed / c.storageMax > 0.95 && c.storageUsed < c.storageMax) {
        baustelleAlerts.push({
          id: `storage-${c.id}`,
          severity: 'warning',
          icon: '📦',
          label: c.name,
          detail: `Lager ${Math.round((c.storageUsed / c.storageMax) * 100)}% voll`,
          linkTo: `/colonies?selected=${c.id}`,
        });
      }
    }
    for (const w of warnings) {
      if (w.type === 'energy') {
        baustelleAlerts.push({
          id: `energy-${w.colonyId}`,
          severity: 'critical',
          icon: '⚡',
          label: w.colonyName,
          detail: w.message,
          linkTo: `/colonies?selected=${w.colonyId}`,
        });
      }
      if (w.type === 'storage') {
        baustelleAlerts.push({
          id: `storage-full-${w.colonyId}`,
          severity: 'critical',
          icon: '📦',
          label: w.colonyName,
          detail: 'Lager voll',
          linkTo: `/colonies?selected=${w.colonyId}`,
        });
      }
    }
    baustelleAlerts.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1));

    // fetch unread inbox messages if widget enabled
    let inboxMessages: DashboardData['inboxMessages'] = [];
    const messagesWidget = layouts.lg.find((w) => w.id === 'messages' && w.enabled);
    if (messagesWidget) {
      const inboxRes = await api
        .get<{ data: Array<{
          id: number; subject: string; isRead: boolean; isSystem: boolean;
          sender?: { username: string }; createdAt: string;
        }>; total: number }>('/messages/inbox')
        .catch(() => ({ data: [], total: 0 }));
      inboxMessages = inboxRes.data;
    }

    // fetch current objective if widget enabled
    let currentObjective: DashboardData['currentObjective'] = null;
    const objectiveWidget = layouts.lg.find((w) => w.id === 'current-objective' && w.enabled);
    if (objectiveWidget) {
      currentObjective = await api
        .get<{ id: number; title: string; description?: string; progress?: number; target?: number }>(
          '/colonies/objectives/current',
        )
        .catch(() => null);
    }

    setData({
      activeResearch,
      queuedResearch,
      buildJobs,
      holonetPosts: (holonetData?.data ?? []).filter((post) => post.isUnread).slice(0, 5),
      colonizationLimits: colonizationData,
      crewInfo,
      onlinePlayers: onlineData,
      colonyCount: colonies.length,
      fleetTotal: spacecraftData.length,
      fleetInFlight: shipsInFlight.length,
      shipsInFlight,
      allShips: spacecraftData,
      researchCompleted,
      unreadMessages: unreadData,
      warnings,
      colonyEvents,
      serverStats: serverStatsData,
      inboxMessages,
      tickStatus: tickData,
      currentObjective,
      baustelleAlerts,
    });
    setLoading(false);
  }, [layouts]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useSocket('TICK', () => {
    void loadDashboard();
  });

  if (loading) return <div className="p-4 text-swu-muted text-xs">Laden...</div>;
  if (!data) return null;

  const enabledWidgetIds = new Set(
    layouts.lg
      .filter((slot) => {
        const def = WIDGET_MAP.get(slot.id);
        if (!def) return false;
        if (def.adminOnly && !user?.isAdmin) return false;
        return slot.enabled;
      })
      .map((s) => s.id),
  );

  const toGridItems = (slots: typeof layouts.lg, bp: Breakpoint) =>
    slots
      .filter((slot) => enabledWidgetIds.has(slot.id))
      .map((slot) => ({
        i: slot.id,
        x: bp === 'sm' ? 0 : slot.x,
        y: slot.y,
        w: bp === 'sm' ? 1 : slot.w,
        h: slot.h,
        minW: bp === 'sm' ? 1 : (WIDGET_MAP.get(slot.id)?.defaultLayout.minW ?? 1),
        maxW: bp === 'sm' ? 1 : undefined,
        minH: WIDGET_MAP.get(slot.id)?.defaultLayout.minH ?? 2,
      }));

  const gridLayouts = {
    lg: toGridItems(layouts.lg, 'lg'),
    sm: toGridItems(layouts.sm, 'sm'),
  };

  const handleLayoutChange = (_layout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
    const bp = activeBreakpointRef.current;
    const bpLayout = allLayouts[bp];
    if (!bpLayout) return;
    const source = layouts[bp];
    const updated = source.map((slot) => {
      const item = bpLayout.find((l) => l.i === slot.id);
      if (!item) return slot;
      return { ...slot, x: item.x, y: item.y, w: item.w, h: item.h };
    });
    setLayout(bp, updated);
  };

  const handleBreakpointChange = (newBp: string) => {
    const bp = (newBp === 'sm' ? 'sm' : 'lg') as Breakpoint;
    activeBreakpointRef.current = bp;
    setActiveBreakpoint(bp);
  };

  return (
    <div className="space-y-2">
      {/* Header: title + customizer button */}
      <div className="flex items-center justify-between">
        <h1
          className="text-base font-bold text-swu-primary hidden md:block"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          Maindesk
        </h1>
        <div className="ml-auto">
          <DashboardCustomizer />
        </div>
      </div>

      {/* Responsive widget grid — renders on all viewports */}
      <ResponsiveGridLayout
        className="layout"
        layouts={gridLayouts}
        breakpoints={{ lg: 1200, sm: 0 }}
        cols={{ lg: 12, sm: 1 }}
        rowHeight={30}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        draggableHandle=".widget-drag-handle"
        margin={[8, 8]}
      >
        {[...enabledWidgetIds].map((id) => {
          const def = WIDGET_MAP.get(id);
          if (!def) return null;
          const Component = def.component;
          return (
            <div key={id}>
              <WidgetShell
                title={def.title}
                editMode={editMode}
                onClose={() => toggleWidget(id)}
              >
                <Component data={data} />
              </WidgetShell>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
