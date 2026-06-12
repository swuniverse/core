import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ColonySummary {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  locationLabel?: string;
  celestialObject?: { name: string | null; classId: number | null };
}

interface ResearchSummary {
  name: string;
  progress: number;
  pointsRequired: number;
  commodity?: { id: number; name: string } | null;
}

export interface StatusBarData {
  colony: ColonySummary | null;
  research: ResearchSummary | null;
  tick: TickState;
  unreadMessages: number;
}

const TICK_HOURS = [0, 12, 15, 18, 21];

export interface TickState {
  currentTickIndex: number;
  totalTicks: number;
  msToNext: number;
  nextTickDate: Date;
}

function getTickState(): TickState {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTickIndex = TICK_HOURS.reduce(
    (latest, hour, index) => (currentHour >= hour ? index : latest),
    TICK_HOURS.length - 1,
  );
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const nextTickHour = TICK_HOURS.find((hour) => hour > currentHour);
  const nextTickDate = new Date(dayStart);
  if (nextTickHour === undefined) {
    nextTickDate.setDate(nextTickDate.getDate() + 1);
    nextTickDate.setHours(TICK_HOURS[0], 0, 0, 0);
  } else {
    nextTickDate.setHours(nextTickHour, 0, 0, 0);
  }
  const msToNext = Math.max(0, nextTickDate.getTime() - now.getTime());
  return { currentTickIndex, totalTicks: TICK_HOURS.length, msToNext, nextTickDate };
}

export function formatTickCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h${String(minutes).padStart(2, '0')}m`;
}

export function useStatusBar(): StatusBarData {
  const [colony, setColony] = useState<ColonySummary | null>(null);
  const [research, setResearch] = useState<ResearchSummary | null>(null);
  const [tick, setTick] = useState<TickState>(getTickState);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(getTickState()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api
      .get<ColonySummary[]>('/colonies')
      .then((data) => setColony(data[0] ?? null))
      .catch(() => undefined);

    api
      .get<Array<{ status: string; name: string; progress: number; pointsRequired: number; commodity?: { id: number; name: string } | null }>>('/research')
      .then((data) => {
        const active = data.find((r) => r.status === 'IN_PROGRESS');
        setResearch(active ?? null);
      })
      .catch(() => undefined);

    api
      .get<number>('/messages/unread')
      .then((count) => setUnreadMessages(count ?? 0))
      .catch(() => undefined);
  }, []);

  return { colony, research, tick, unreadMessages };
}
