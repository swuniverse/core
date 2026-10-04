import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from '../hooks/use-socket';
import type {
  DashboardData,
  ActiveResearch,
  ActiveBuildJob,
  BaustelleAlert,
} from './dashboard/types';
import { DashboardAttention } from './dashboard/DashboardAttention';
import { DashboardFleet } from './dashboard/DashboardFleet';
import { DashboardColonies } from './dashboard/DashboardColonies';
import { DashboardProcesses } from './dashboard/DashboardProcesses';
import {
  RecentEvents,
  DashboardMessages,
  DashboardLimits,
} from './dashboard/DashboardLowerSections';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
      distressSignals,
      recentEvents,
    ] = await Promise.all([
      api.get<
        Array<{
          id: number;
          name: string;
          energy: number;
          energyMax: number;
          population: number;
          populationMax: number;
          storageUsed: number;
          storageMax: number;
          locationLabel?: string;
        }>
      >('/colonies'),
      api.get<
        Array<{
          status: string;
          name: string;
          progress: number;
          pointsRequired: number;
          ticksRemaining?: number | null;
          commodity?: { id: number; name: string } | null;
          blockedReason?: string | null;
        }>
      >('/research'),
      api
        .get<{
          data: Array<{
            id: number;
            title: string;
            createdAt: string;
            category: string;
            commentCount: number;
            isUnread?: boolean;
            author?: { username: string };
            authorName?: string;
          }>;
        }>('/holonet?page=1')
        .catch(() => ({ data: [] })),
      api
        .get<{
          limits: {
            planet: { type: string; count: number; limit: number; max: number };
            moon: { type: string; count: number; limit: number; max: number };
            asteroid: {
              type: string;
              count: number;
              limit: number;
              max: number;
            };
          };
        }>('/colonization/status')
        .catch(() => null),
      api
        .get<
          Array<{
            id: number;
            username: string;
            faction: string;
            avatar?: string | null;
          }>
        >('/database/online')
        .catch(() => []),
      api
        .get<
          Array<{
            id: number;
            name: string;
            status: string;
            alertState?: string;
            arrivalAt: string | null;
            hull?: number;
            hullMax?: number;
            crew?: number;
            crewMax?: number;
            warpdrive?: number;
            warpdriveMax?: number;
          }>
        >('/spacecraft')
        .catch(() => []),
      api.get<number>('/messages/unread').catch(() => 0),
      api
        .get<{
          nextTickAt: string;
          currentTickIndex: number;
          totalTicks: number;
        }>('/tick/status')
        .catch(() => null),
      api
        .get<NonNullable<DashboardData['distressSignals']>>(
          '/spacecraft/distress-signals/active',
        )
        .catch(() => []),
      api.get<DashboardData['recentEvents']>('/events/recent').catch(() => []),
    ]);

    const activeResearch =
      (researchData.find(
        (r) => r.status === 'IN_PROGRESS',
      ) as ActiveResearch) ?? null;
    const queuedResearch =
      (researchData.find((r) => r.status === 'QUEUED') as ActiveResearch) ??
      null;
    const researchCompleted = researchData.filter(
      (r) => r.status === 'COMPLETED',
    ).length;

    const shipsInFlight = spacecraftData.filter(
      (s) => s.status === 'IN_FLIGHT',
    );

    const buildJobs: Array<
      ActiveBuildJob & { colonyId: number; colonyName: string }
    > = [];
    let crewInfo: { assigned: number; globalLimit: number } | null = null;
    const warnings: DashboardData['warnings'] = [];
    const colonyEvents: DashboardData['colonyEvents'] = [];

    if (colonies.length > 0) {
      const details = await Promise.all(
        colonies.map((c) =>
          api
            .get<{
              detailV2?: {
                activeBuildJobs: ActiveBuildJob[];
                energy: { current: number; max: number; delta: number | null };
                crew?: { globalLimit: number; remainingGlobal: number };
              };
              deactivatedBuildings?: number;
              storageFull?: boolean;
            }>(`/colonies/${c.id}`)
            .catch(() => null),
        ),
      );

      const eventResults = await Promise.all(
        colonies.map((c) =>
          api
            .get<
              Array<{
                id: number;
                type: string;
                severity: string;
                title: string;
                message: string;
                createdAt: string;
              }>
            >(`/colonies/${c.id}/events?limit=10&unreadOnly=false`)
            .catch(() => []),
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

      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        if (!detail) continue;
        const jobs = detail.detailV2?.activeBuildJobs ?? [];
        buildJobs.push(
          ...jobs.map((j) => ({
            ...j,
            colonyId: colonies[i].id,
            colonyName: colonies[i].name,
          })),
        );
        if (!crewInfo && detail.detailV2?.crew) {
          crewInfo = {
            assigned:
              detail.detailV2.crew.globalLimit -
              detail.detailV2.crew.remainingGlobal,
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
      if (
        s.warpdriveMax &&
        s.warpdriveMax > 0 &&
        (s.warpdrive ?? 0) < s.warpdriveMax * 0.1
      ) {
        baustelleAlerts.push({
          id: `hyperdrive-${s.id}`,
          severity: 'critical',
          icon: '⚡',
          label: s.name,
          detail: `Kritische Hyperantriebsenergie (${Math.round(((s.warpdrive ?? 0) / s.warpdriveMax) * 100)}%)`,
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
      if (
        s.hullMax &&
        s.hullMax > 0 &&
        (s.hull ?? s.hullMax) < s.hullMax * 0.25
      ) {
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
      if (
        c.storageMax > 0 &&
        c.storageUsed / c.storageMax > 0.95 &&
        c.storageUsed < c.storageMax
      ) {
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
    baustelleAlerts.sort(
      (a, b) =>
        (a.severity === 'critical' ? 0 : 1) -
        (b.severity === 'critical' ? 0 : 1),
    );

    const inboxRes = await api
      .get<{
        data: Array<{
          id: number;
          subject: string;
          isRead: boolean;
          isSystem: boolean;
          sender?: { username: string };
          createdAt: string;
        }>;
        total: number;
      }>('/messages/inbox')
      .catch(() => ({ data: [], total: 0 }));

    const currentObjective = await api
      .get<{
        id: number;
        title: string;
        description?: string;
        progress?: number;
        target?: number;
      }>('/colonies/objectives/current')
      .catch(() => null);

    const processes = [
      ...(activeResearch
        ? [
            {
              id: 'research',
              kind: 'FORSCHUNG' as const,
              label: activeResearch.name,
              detail: `${activeResearch.progress}/${activeResearch.pointsRequired}`,
              progress:
                activeResearch.pointsRequired > 0
                  ? Math.round(
                      (activeResearch.progress /
                        activeResearch.pointsRequired) *
                        100,
                    )
                  : 0,
              linkTo: '/research',
            },
          ]
        : []),
      ...buildJobs.slice(0, 8).map((job) => ({
        id: `build-${job.colonyName}-${job.fieldIndex}`,
        kind: 'BAU' as const,
        label: job.buildingName,
        detail: job.colonyName,
        progress: job.progress,
        linkTo: `/colonies?selected=${job.colonyId}`,
      })),
    ];

    setData({
      activeResearch,
      queuedResearch,
      buildJobs,
      processes,
      holonetPosts: (holonetData?.data ?? [])
        .filter((post) => post.isUnread)
        .slice(0, 5),
      colonizationLimits: colonizationData,
      crewInfo,
      onlinePlayers: onlineData,
      colonies,
      colonyCount: colonies.length,
      fleetTotal: spacecraftData.length,
      fleetInFlight: shipsInFlight.length,
      shipsInFlight,
      allShips: spacecraftData,
      researchCompleted,
      unreadMessages: unreadData,
      warnings,
      colonyEvents,
      recentEvents,
      inboxMessages: inboxRes.data,
      tickStatus: tickData,
      currentObjective,
      baustelleAlerts,
      distressSignals,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useSocket('TICK', () => {
    void loadDashboard();
  });
  useSocket('DISTRESS_CHANGED', () => {
    void loadDashboard();
  });

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;
  if (!data) return null;

  return (
    <div className="space-y-3 p-2 sm:p-4">
      <header className="border border-swu-border bg-black/30 px-3 py-1.5">
        <h1 className="text-xs font-bold text-swu-primary">/ Maindesk</h1>
      </header>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <DashboardColonies data={data} />
        <DashboardLimits data={data} />
      </div>
      <DashboardAttention data={data} />
      <div className="grid gap-3 lg:grid-cols-2">
        <DashboardFleet data={data} />
        <DashboardProcesses data={data} />
      </div>
      <DashboardMessages data={data} />
      <RecentEvents data={data} />
    </div>
  );
}
