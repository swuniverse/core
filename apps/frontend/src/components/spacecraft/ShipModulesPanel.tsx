import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { commodityImage } from '../../lib/assets';

const MODULE_ASSETS: Record<string, string> = {
  REACTOR: 'modul_screen_1.png',
  SHIELDS: 'modul_screen_2.png',
  WEAPONS: 'modul_screen_3.png',
  ENERGY_WEAPON: 'modul_screen_3.png',
  TORPEDO_BANK: 'modul_screen_4.png',
  SUBLIGHT_ENGINE: 'modul_screen_5.png',
  WARPDRIVE: 'modul_screen_6.png',
  SENSORS: 'modul_screen_7.png',
  SPECIAL: 'modul_screen_8.png',
};

function moduleAsset(category: string) {
  return MODULE_ASSETS[category] ?? 'modul_screen_1.png';
}

function moduleFrame(module: Pick<InstalledModule, 'integrity' | 'isActive'>) {
  if (!module.isActive)
    return 'border-swu-border bg-black/30 text-swu-muted hover:border-swu-accent';
  if (module.integrity >= 75)
    return 'border-emerald-400 bg-emerald-500/10 text-emerald-100 hover:border-emerald-200';
  if (module.integrity >= 40)
    return 'border-amber-400 bg-amber-500/10 text-amber-100 hover:border-amber-200';
  return 'border-red-400 bg-red-500/10 text-red-100 hover:border-red-200';
}

export interface InstalledModule {
  id: number;
  moduleType: string;
  category: string;
  commodityId?: number | null;
  slotId?: string | null;
  level: number;
  integrity: number;
  cooldown: number;
  isActive: boolean;
  effects?: Array<{ label: string; value: string }>;
}

interface ShipModulesPanelProps {
  shipId: number;
  compact?: boolean;
}

export function ShipModulesPanel({
  shipId,
  compact = false,
}: ShipModulesPanelProps) {
  const [modules, setModules] = useState<InstalledModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<InstalledModule | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<InstalledModule[]>(`/spacecraft/${shipId}/modules`)
      .then((result) => {
        if (active) setModules(result);
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'Module konnten nicht geladen werden',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shipId]);

  return (
    <section
      className={
        compact ? '' : 'rounded-lg border border-swu-border bg-swu-surface p-3'
      }
      aria-labelledby="ship-modules-heading"
    >
      {!compact && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3
            id="ship-modules-heading"
            className="text-[10px] font-bold uppercase text-swu-muted"
          >
            Verbaute Module
          </h3>
          <span className="text-[10px] text-swu-muted">Nur Anzeige</span>
        </div>
      )}

      {loading ? (
        <p className="text-[11px] text-swu-muted">Module werden geladen…</p>
      ) : error ? (
        <p role="alert" className="text-[11px] text-red-300">
          {error}
        </p>
      ) : modules.length > 0 ? (
        <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => setSelectedModule(module)}
              className={`${compact ? 'inline-flex size-8 items-center justify-center p-0' : 'px-2 py-1 text-left text-[11px]'} rounded border transition-colors ${moduleFrame(module)}`}
              aria-label={`${module.moduleType}, Klasse ${module.level}, ${module.integrity}% Integrität, ${module.isActive ? 'aktiv' : 'inaktiv'}`}
              title={`${module.moduleType} · ${module.integrity}%`}
            >
              <img
                src={
                  module.commodityId
                    ? commodityImage(module.commodityId)
                    : `/assets/buttons/${moduleAsset(module.category)}`
                }
                alt=""
                className={`${compact ? 'size-6' : 'size-4'} shrink-0 object-contain`}
              />
              {!compact && (
                <>
                  <span className="ml-1.5 font-medium">
                    {module.moduleType}
                  </span>
                  <span className="block text-[9px] opacity-75">
                    Klasse {module.level} · {module.integrity}%
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-swu-muted">Keine Module verbaut.</p>
      )}

      {selectedModule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Moduldetails"
          className="mt-3 rounded-lg border border-swu-accent/50 bg-swu-bg p-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-swu-primary">
                {selectedModule.moduleType}
              </h4>
              <p className="text-[11px] text-swu-muted">
                {selectedModule.category} · Klasse {selectedModule.level}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedModule(null)}
              className="text-xs text-swu-muted hover:text-swu-primary"
            >
              Schließen
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div>
              <dt className="text-swu-muted">Integrität</dt>
              <dd className="text-swu-primary">
                Integrität: {selectedModule.integrity}%
              </dd>
            </div>
            <div>
              <dt className="text-swu-muted">Status</dt>
              <dd className="text-swu-primary">
                {selectedModule.isActive ? 'Aktiv' : 'Inaktiv'}
              </dd>
            </div>
            <div>
              <dt className="text-swu-muted">Cooldown</dt>
              <dd className="text-swu-primary">{selectedModule.cooldown}</dd>
            </div>
            {selectedModule.slotId && (
              <div>
                <dt className="text-swu-muted">Slot</dt>
                <dd className="text-swu-primary">{selectedModule.slotId}</dd>
              </div>
            )}
          </dl>
          {selectedModule.effects && selectedModule.effects.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-[11px] text-swu-primary">
              {selectedModule.effects.map((effect) => (
                <li key={`${effect.label}-${effect.value}`}>
                  {effect.label}: {effect.value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-swu-muted">
              Keine abgeleiteten Effekte vom Server geliefert.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
