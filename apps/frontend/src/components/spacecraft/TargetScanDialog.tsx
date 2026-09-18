import type { SpacecraftTargetScanDto } from '@swuniverse/shared';
import { SYSTEM_ASSETS } from './ShipControlCenter';
import { SHIP_SYSTEM_PRESENTATION } from './ship-system-presentation';

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

export function TargetScanDialog({
  result,
  onClose,
}: {
  result: SpacecraftTargetScanDto;
  onClose: () => void;
}) {
  const modules = result.modules ?? [];
  const shieldPercent = percent(result.shields, result.shieldsMax);
  const reactorPercent =
    result.reactorFuelMax > 0
      ? percent(result.reactorFuel, result.reactorFuelMax)
      : null;
  const alertAsset =
    result.alertState === 'GREEN'
      ? 'alert1_1.png'
      : result.alertState === 'YELLOW'
        ? 'alert2_1.png'
        : 'alert3_1.png';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-lg border border-swu-border bg-swu-bg text-xs shadow-xl">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">Scan</h3>
          <button type="button" onClick={onClose} aria-label="Scan schließen">
            Schließen
          </button>
        </header>
        <h4 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
          Details · {result.name}
        </h4>
        <div className="p-2">
          {result.discovery?.discovered && (
            <p className="mb-2 border border-emerald-400/50 bg-emerald-400/10 p-2 text-emerald-200">
              Neuer Datenbankeintrag: {result.discovery.name} (+
              {result.discovery.prestigeAwarded} Prestige)
            </p>
          )}
          <div className="grid grid-cols-[1fr_1fr] border border-swu-border">
            <ScanRow label="Lebenszeichen" value={result.crew} />
            <ScanRow
              label="Alarmstufe"
              value={
                <img
                  src={`/assets/buttons/${alertAsset}`}
                  alt={`Alarmstufe ${result.alertState}`}
                  className="size-5"
                />
              }
            />
            <ScanRow label="Schilde" value={`${shieldPercent}%`} />
            <ScanRow label="Energie" value={result.energy ?? 0} />
            <ScanRow label="Ersatzbatterie" value={result.battery ?? 0} />
            {reactorPercent != null && (
              <ScanRow label="Reaktor" value={`${reactorPercent}%`} />
            )}
          </div>
          {modules.length > 0 && (
            <div className="mt-3 grid grid-cols-[1fr_2fr] border border-swu-border">
              <span className="border-r border-swu-border p-1 font-bold text-swu-muted">
                Verbaute Module
              </span>
              <div className="flex flex-wrap gap-1 p-1">
                {modules.map((module, index) => (
                  <img
                    key={`${module.moduleType}-${index}`}
                    src={`/assets/buttons/${MODULE_ASSETS[module.category] ?? 'modul_screen_1.png'}`}
                    alt={module.moduleType}
                    title={`${module.moduleType} · ${module.integrity}%`}
                    className={`size-6 border object-contain ${module.integrity >= 75 ? 'border-emerald-400' : module.integrity >= 40 ? 'border-amber-400' : 'border-red-400'} ${module.isActive ? '' : 'opacity-40'}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <h4 className="border-y border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
          Systemzustand
        </h4>
        <div className="flex flex-wrap gap-x-2 gap-y-1 p-2">
          {Object.entries(result.runtimeSystems).map(([key, state]) => {
            const system = SHIP_SYSTEM_PRESENTATION.get(key as never);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1"
                title={system?.label ?? key}
              >
                <img
                  src={`/assets/system/${SYSTEM_ASSETS[key] ?? '1.png'}`}
                  alt={system?.label ?? key}
                  className={`size-6 border object-contain ${state.integrity >= 75 ? 'border-emerald-400' : state.integrity >= 40 ? 'border-amber-400' : 'border-red-400'} ${state.active ? '' : 'opacity-40'}`}
                />
                <span className="font-mono">{state.integrity}%</span>
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ScanRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <span className="border-b border-r border-swu-border p-1 text-swu-muted">
        {label}
      </span>
      <span className="flex items-center border-b border-swu-border p-1 font-mono text-swu-primary">
        {value}
      </span>
    </>
  );
}

function percent(value: number, max: number): number {
  return max > 0 ? Math.round((value / max) * 100) : 0;
}
