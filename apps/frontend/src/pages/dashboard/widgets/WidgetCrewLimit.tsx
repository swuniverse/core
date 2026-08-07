import { InfoCard, SegmentedBar } from './shared';
import type { DashboardData } from '../types';

export function WidgetCrewLimit({ data }: { data: DashboardData }) {
  if (!data.crewInfo) {
    return <div className="text-[10px] text-swu-muted px-2 py-1">Keine Daten.</div>;
  }
  return (
    <InfoCard title="Crewlimitierung">
      <div className="flex items-center gap-2">
        <SegmentedBar
          value={data.crewInfo.assigned}
          max={data.crewInfo.globalLimit}
          color="bg-swu-accent"
          label="Crew-Auslastung"
        />
        <span className="text-xs font-mono text-swu-primary">
          {data.crewInfo.assigned}
          <span className="text-swu-muted">/{data.crewInfo.globalLimit}</span>
        </span>
      </div>
    </InfoCard>
  );
}
