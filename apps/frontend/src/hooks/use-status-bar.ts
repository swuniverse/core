import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from './use-socket';

export interface TickState {
  currentTickIndex: number;
  totalTicks: number;
  previousTickAt: Date;
  nextTickAt: Date;
  msToNext: number;
  progress: number;
  loaded: boolean;
}

export interface StatusBarData {
  tick: TickState;
  unreadMessages: number;
}

interface TickStatusResponse {
  serverTime: string;
  previousTickAt: string;
  nextTickAt: string;
  currentTickIndex: number;
  totalTicks: number;
}

const EMPTY_TICK_STATE: TickState = {
  currentTickIndex: 0,
  totalTicks: 0,
  previousTickAt: new Date(0),
  nextTickAt: new Date(0),
  msToNext: 0,
  progress: 0,
  loaded: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeTickState(
  status: Omit<TickState, 'msToNext' | 'progress' | 'loaded'>,
  serverOffsetMs: number,
): TickState {
  const estimatedServerTime = Date.now() + serverOffsetMs;
  const previousTickAtMs = status.previousTickAt.getTime();
  const nextTickAtMs = status.nextTickAt.getTime();
  const intervalMs = Math.max(nextTickAtMs - previousTickAtMs, 0);
  const msToNext = Math.max(0, nextTickAtMs - estimatedServerTime);
  const progress =
    intervalMs === 0
      ? 1
      : clamp((estimatedServerTime - previousTickAtMs) / intervalMs, 0, 1);

  return {
    ...status,
    msToNext,
    progress,
    loaded: true,
  };
}

export function formatTickCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h${String(minutes).padStart(2, '0')}m`;
}

export function useStatusBar(): StatusBarData {
  const [tick, setTick] = useState<TickState>(EMPTY_TICK_STATE);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const tickStatusRef = useRef<{
    currentTickIndex: number;
    totalTicks: number;
    previousTickAt: Date;
    nextTickAt: Date;
  } | null>(null);
  const serverOffsetRef = useRef(0);
  const refetchingAtBoundaryRef = useRef(false);

  const refreshTickStatus = useCallback(async () => {
    const status = await api.get<TickStatusResponse>('/tick/status');
    const serverTime = new Date(status.serverTime);
    const previousTickAt = new Date(status.previousTickAt);
    const nextTickAt = new Date(status.nextTickAt);
    const baseState = {
      currentTickIndex: status.currentTickIndex,
      totalTicks: status.totalTicks,
      previousTickAt,
      nextTickAt,
    };

    serverOffsetRef.current = serverTime.getTime() - Date.now();
    tickStatusRef.current = baseState;
    refetchingAtBoundaryRef.current = false;
    setTick(computeTickState(baseState, serverOffsetRef.current));
  }, []);

  useEffect(() => {
    void refreshTickStatus().catch(() => undefined);
  }, [refreshTickStatus]);

  useSocket('TICK', () => {
    void refreshTickStatus().catch(() => undefined);
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      const tickStatus = tickStatusRef.current;
      if (!tickStatus) return;

      const nextTick = computeTickState(tickStatus, serverOffsetRef.current);
      setTick(nextTick);

      if (nextTick.msToNext === 0 && !refetchingAtBoundaryRef.current) {
        refetchingAtBoundaryRef.current = true;
        void refreshTickStatus().catch(() => {
          refetchingAtBoundaryRef.current = false;
        });
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [refreshTickStatus]);

  useEffect(() => {
    api
      .get<number>('/messages/unread')
      .then((count) => setUnreadMessages(count ?? 0))
      .catch(() => undefined);
  }, []);

  return { tick, unreadMessages };
}
