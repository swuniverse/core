import { useEffect, useState } from 'react';
import type { DashboardData } from '../types';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function WidgetTickCountdown({ data }: { data: DashboardData }) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!data.tickStatus) return;
    const update = () => {
      setRemaining(new Date(data.tickStatus!.nextTickAt).getTime() - Date.now());
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [data.tickStatus]);

  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider">Nächster Tick</div>
      <div className="text-lg font-bold text-swu-accent font-mono">
        {data.tickStatus ? formatCountdown(remaining) : '—'}
      </div>
      {data.tickStatus && (
        <div className="text-[10px] text-swu-muted">
          Tick #{data.tickStatus.currentTickIndex}
        </div>
      )}
    </div>
  );
}
