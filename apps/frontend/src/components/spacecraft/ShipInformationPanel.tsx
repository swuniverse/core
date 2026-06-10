import type { LocalMapResponse } from './LssMap';

interface ShipInformationPanelProps {
  localMap: LocalMapResponse | null;
}

const FACTION_ZONE_LABELS: Record<string, string> = {
  REBEL: 'Rebellen',
  EMPIRE: 'Imperium',
  NEUTRAL: 'Neutral',
  CONTESTED: 'Umkämpft',
  UNKNOWN: 'Unbekannt',
};

function formatValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function formatFactionZone(value: string | null | undefined) {
  if (!value) return '—';
  return FACTION_ZONE_LABELS[value] ?? value;
}

export function ShipInformationPanel({ localMap }: ShipInformationPanelProps) {
  const context = localMap?.context;
  const sectorLabel = context?.sectorNumber
    ? `Sektor ${context.sectorNumber}`
    : context?.sectorX != null && context?.sectorY != null
      ? `Sektor ${context.sectorX + 1}|${context.sectorY + 1}`
      : null;
  const coordinates = context?.coordinates
    ? `[${formatValue(context.coordinates.x)},${formatValue(context.coordinates.y)}]`
    : null;
  const galaxyCoordinates = context?.galaxyCoordinates
    ? `[${formatValue(context.galaxyCoordinates.x)},${formatValue(context.galaxyCoordinates.y)}]`
    : null;

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-3">
      <h3 className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary">
        Informationen
      </h3>
      <div className="space-y-1 text-xs">
        <InfoLine
          icon="⌕"
          text={sectorLabel ? `${sectorLabel} scannen` : 'Sektor unbekannt'}
        />
        <InfoLine icon="?" text={`Koordinaten ${formatValue(coordinates)}`} />
        {localMap?.mode === 'system' && (
          <InfoLine
            icon="?"
            text={`System ${formatValue(context?.systemName ?? localMap.systemName)}`}
          />
        )}
        {localMap?.mode === 'system' && (
          <InfoLine
            icon="?"
            text={`Galaxie ${formatValue(galaxyCoordinates)}`}
          />
        )}
        <InfoLine
          icon="?"
          text={`LSS-Reichweite ${formatValue(context?.sensorRange ?? localMap?.sensorRange)}`}
        />
        <InfoLine
          icon="?"
          text={`Gebiet ${formatValue(context?.adminRegionKey)}`}
        />
        <InfoLine
          icon="?"
          text={`Kontrollzone ${formatFactionZone(context?.factionZone)}`}
        />
        <InfoLine
          icon="?"
          text={`Nächstes System ${formatValue(context?.nearestSystem?.name)}`}
        />
        <InfoLine
          icon="?"
          text={`Hyperroute ${formatValue(context?.nearbyRouteNames?.join(', '))}`}
        />
      </div>
    </section>
  );
}

function InfoLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-swu-border/30 pb-1 last:border-b-0">
      <span className="flex h-5 w-5 items-center justify-center border border-swu-border bg-black text-[11px] text-swu-accent">
        {icon}
      </span>
      <span className="text-swu-muted">{text}</span>
    </div>
  );
}
