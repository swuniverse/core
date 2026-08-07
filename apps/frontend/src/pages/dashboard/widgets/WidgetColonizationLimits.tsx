import { InfoCard, LimitRow } from './shared';
import type { DashboardData } from '../types';

export function WidgetColonizationLimits({ data }: { data: DashboardData }) {
  if (!data.colonizationLimits) {
    return <div className="text-[10px] text-swu-muted px-2 py-1">Keine Daten.</div>;
  }
  return (
    <InfoCard title="Kolonielimitierung">
      <div className="space-y-1">
        <LimitRow
          label="Planeten"
          count={data.colonizationLimits.limits.planet.count}
          limit={data.colonizationLimits.limits.planet.limit}
        />
        <LimitRow
          label="Monde"
          count={data.colonizationLimits.limits.moon.count}
          limit={data.colonizationLimits.limits.moon.limit}
        />
        <LimitRow
          label="Asteroiden"
          count={data.colonizationLimits.limits.asteroid.count}
          limit={data.colonizationLimits.limits.asteroid.limit}
        />
      </div>
    </InfoCard>
  );
}
