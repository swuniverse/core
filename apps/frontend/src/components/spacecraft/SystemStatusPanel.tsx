import { api } from '../../services/api';

interface RuntimeSystem {
  active: boolean;
  cooldown: number;
  integrity: number;
  current?: number;
  max?: number;
}

interface SystemStatusPanelProps {
  shipId: number;
  systems: Record<string, RuntimeSystem> | undefined;
  onUpdate: () => void;
}

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

export function SystemStatusPanel({
  shipId,
  systems,
  onUpdate,
}: SystemStatusPanelProps) {
  if (!systems) return null;

  async function toggle(key: string, active: boolean) {
    await api.patch(`/spacecraft/${shipId}/systems/${key}`, { active });
    onUpdate();
  }

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-3">
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
    </section>
  );
}
