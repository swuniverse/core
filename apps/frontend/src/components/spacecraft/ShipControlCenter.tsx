import { api } from '../../services/api';
import type { LocalMapResponse } from './LssMap';

interface RuntimeSystem {
  active: boolean;
  cooldown: number;
  integrity: number;
  current?: number;
  max?: number;
}

interface ShipControlCenterProps {
  shipId: number;
  status: string;
  alertState: string;
  shields: number;
  shieldsMax: number;
  systems: Record<string, RuntimeSystem> | undefined;
  localMap: LocalMapResponse | null;
  onUpdate: () => void;
}

const ALERT_LABELS: Record<string, string> = {
  GREEN: 'Grün',
  YELLOW: 'Gelb',
  RED: 'Rot',
};

const STATUS_LABELS: Record<string, string> = {
  DOCKED: 'Angedockt',
  IN_FLIGHT: 'Im Flug',
  IN_COMBAT: 'Im Kampf',
  DESTROYED: 'Zerstört',
};

const SYSTEM_LABELS: Record<string, string> = {
  REACTOR: 'Reaktor',
  EPS: 'EPS',
  SHIELDS: 'Schilde',
  WEAPONS: 'Waffen',
  TORPEDO_BANK: 'Torpedo',
  WARPDRIVE: 'Warp',
  SUBLIGHT_DRIVE: 'Impuls',
  SENSORS: 'Sensoren',
  COMPUTER: 'Computer',
  SPECIAL: 'Spezial',
};

const DISPLAY_ORDER = [
  'REACTOR',
  'EPS',
  'SHIELDS',
  'WEAPONS',
  'TORPEDO_BANK',
  'WARPDRIVE',
  'SUBLIGHT_DRIVE',
  'SENSORS',
  'COMPUTER',
  'SPECIAL',
];

const FACTION_ZONE_LABELS: Record<string, string> = {
  REBEL: 'Rebellen',
  EMPIRE: 'Imperium',
  NEUTRAL: 'Neutral',
  CONTESTED: 'Umkämpft',
  UNKNOWN: 'Unbekannt',
};

export function ShipControlCenter({
  shipId,
  status,
  alertState,
  shields,
  shieldsMax,
  systems,
  localMap,
  onUpdate,
}: ShipControlCenterProps) {
  async function toggle(key: string, active: boolean) {
    await api.patch(`/spacecraft/${shipId}/systems/${key}`, { active });
    onUpdate();
  }

  const context = localMap?.context;

  return (
    <section className="space-y-3">
      {/* Schiffskontrolle */}
      <div className="rounded-lg border border-swu-border bg-swu-surface p-3">
        <h3 className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary">
          Schiffskontrolle
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-swu-muted">Status</span>
            <span className="text-swu-primary">
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-swu-muted">Alarm</span>
            <span className="text-swu-primary">
              {ALERT_LABELS[alertState] ?? alertState}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-swu-muted">Schilde</span>
            <span className="font-mono text-swu-primary">
              {shields}/{shieldsMax}
            </span>
          </div>
        </div>
      </div>

      {/* Systeme */}
      {systems && (
        <div className="rounded-lg border border-swu-border bg-swu-surface p-3">
          <h3 className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary">
            Systeme
          </h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {DISPLAY_ORDER.map((key) => {
              const sys = systems[key];
              if (!sys) return null;
              return (
                <button
                  key={key}
                  onClick={() => toggle(key, !sys.active)}
                  disabled={sys.cooldown > 0}
                  className={`flex items-center justify-between rounded border px-2 py-1 ${
                    sys.active
                      ? 'border-swu-accent/40 bg-swu-accent/10 text-swu-primary'
                      : 'border-swu-border bg-black/30 text-swu-muted'
                  } ${sys.cooldown > 0 ? 'cursor-not-allowed opacity-50' : 'hover:border-swu-accent'}`}
                >
                  <span>{SYSTEM_LABELS[key] ?? key}</span>
                  <span className="ml-1 text-[10px]">
                    {sys.cooldown > 0
                      ? `CD:${sys.cooldown}`
                      : sys.active
                        ? 'ON'
                        : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Informationen */}
      <div className="rounded-lg border border-swu-border bg-swu-surface p-3">
        <h3 className="mb-2 border-b border-swu-border/60 pb-1 text-center text-xs font-bold text-swu-primary">
          Informationen
        </h3>
        <div className="space-y-1 text-[11px]">
          {context?.sectorNumber != null && (
            <InfoRow label="Sektor" value={`${context.sectorNumber}`} />
          )}
          {localMap?.mode === 'system' && context?.systemName && (
            <InfoRow label="System" value={context.systemName} />
          )}
          {context?.sensorRange != null && (
            <InfoRow label="LSS-Reichweite" value={`${context.sensorRange}`} />
          )}
          {context?.factionZone && (
            <InfoRow
              label="Kontrollzone"
              value={FACTION_ZONE_LABELS[context.factionZone] ?? context.factionZone}
            />
          )}
          {context?.nearestSystem?.name && (
            <InfoRow label="Nächstes System" value={context.nearestSystem.name} />
          )}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-swu-border/30 pb-0.5 last:border-b-0">
      <span className="text-swu-muted">{label}</span>
      <span className="text-swu-primary">{value}</span>
    </div>
  );
}
