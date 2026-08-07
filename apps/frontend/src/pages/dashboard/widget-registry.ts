import type { ComponentType } from 'react';
import type { DashboardData } from './types';
import { WidgetCommanderGreeting } from './widgets/WidgetCommanderGreeting';
import { WidgetStatColonies } from './widgets/WidgetStatColonies';
import { WidgetStatFleet } from './widgets/WidgetStatFleet';
import { WidgetStatResearch } from './widgets/WidgetStatResearch';
import { WidgetStatPrestige } from './widgets/WidgetStatPrestige';
import { WidgetActiveJobs } from './widgets/WidgetActiveJobs';
import { WidgetHoloNet } from './widgets/WidgetHoloNet';
import { WidgetColonizationLimits } from './widgets/WidgetColonizationLimits';
import { WidgetCrewLimit } from './widgets/WidgetCrewLimit';
import { WidgetOnlinePlayers } from './widgets/WidgetOnlinePlayers';
import { WidgetAdminTick } from './widgets/WidgetAdminTick';
import { WidgetTickCountdown } from './widgets/WidgetTickCountdown';
import { WidgetColonyEvents } from './widgets/WidgetColonyEvents';
import { WidgetMessages } from './widgets/WidgetMessages';
import { WidgetServerStats } from './widgets/WidgetServerStats';
import { WidgetBaustellen } from './widgets/WidgetBaustellen';

export interface WidgetDefinition {
  id: string;
  title: string;
  adminOnly?: boolean;
  defaultLayout: { w: number; h: number; minW?: number; minH?: number };
  component: ComponentType<{ data: DashboardData }>;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'commander-greeting',
    title: 'Commander',
    defaultLayout: { w: 12, h: 2, minW: 4, minH: 2 },
    component: WidgetCommanderGreeting,
  },
  {
    id: 'stat-colonies',
    title: 'Kolonien',
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    component: WidgetStatColonies,
  },
  {
    id: 'stat-fleet',
    title: 'Schiffe',
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    component: WidgetStatFleet,
  },
  {
    id: 'stat-research',
    title: 'Forschung',
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    component: WidgetStatResearch,
  },
  {
    id: 'stat-prestige',
    title: 'Prestige',
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    component: WidgetStatPrestige,
  },
  {
    id: 'baustellen',
    title: 'Handlungsbedarf',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
    component: WidgetBaustellen,
  },
  {
    id: 'active-jobs',
    title: 'Laufende Aufträge',
    defaultLayout: { w: 8, h: 8, minW: 4, minH: 4 },
    component: WidgetActiveJobs,
  },
  {
    id: 'holonet',
    title: 'HoloNet',
    defaultLayout: { w: 4, h: 8, minW: 3, minH: 4 },
    component: WidgetHoloNet,
  },
  {
    id: 'colonization-limits',
    title: 'Kolonielimitierung',
    defaultLayout: { w: 4, h: 4, minW: 2, minH: 3 },
    component: WidgetColonizationLimits,
  },
  {
    id: 'crew-limit',
    title: 'Crew',
    defaultLayout: { w: 4, h: 4, minW: 2, minH: 2 },
    component: WidgetCrewLimit,
  },
  {
    id: 'online-players',
    title: 'Spieler Online',
    defaultLayout: { w: 4, h: 4, minW: 2, minH: 3 },
    component: WidgetOnlinePlayers,
  },
  {
    id: 'tick-countdown',
    title: 'Tick-Countdown',
    defaultLayout: { w: 4, h: 3, minW: 2, minH: 2 },
    component: WidgetTickCountdown,
  },
  {
    id: 'colony-events',
    title: 'Kolonie-Ereignisse',
    defaultLayout: { w: 4, h: 6, minW: 3, minH: 4 },
    component: WidgetColonyEvents,
  },
  {
    id: 'messages',
    title: 'Nachrichten',
    defaultLayout: { w: 6, h: 6, minW: 3, minH: 3 },
    component: WidgetMessages,
  },
  {
    id: 'server-stats',
    title: 'Universum',
    defaultLayout: { w: 4, h: 3, minW: 2, minH: 2 },
    component: WidgetServerStats,
  },
  {
    id: 'admin-tick',
    title: 'Admin: Tick',
    adminOnly: true,
    defaultLayout: { w: 4, h: 2, minW: 2, minH: 1 },
    component: WidgetAdminTick,
  },
];

export const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]));
