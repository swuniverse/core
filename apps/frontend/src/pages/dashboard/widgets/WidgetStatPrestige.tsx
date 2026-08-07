import type { DashboardData } from '../types';
import { useAuthStore } from '../../../stores/auth.store';

export function WidgetStatPrestige({ data: _ }: { data: DashboardData }) {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider">Prestige</div>
      <div className="text-lg font-bold text-swu-accent font-mono">
        {user?.prestige ?? 0}
      </div>
    </div>
  );
}
