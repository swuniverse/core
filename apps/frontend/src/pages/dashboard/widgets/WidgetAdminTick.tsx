import { api } from '../../../services/api';
import type { DashboardData } from '../types';

export function WidgetAdminTick({ data: _ }: { data: DashboardData }) {
  const handleTick = async () => {
    await api.post('/admin/tick/trigger', {});
    window.location.reload();
  };
  return (
    <button
      onClick={handleTick}
      className="w-full px-3 py-1.5 bg-swu-primary/20 border border-swu-primary text-swu-primary text-xs font-bold rounded hover:bg-swu-primary/30 transition-colors"
    >
      Tick ausfuehren
    </button>
  );
}
