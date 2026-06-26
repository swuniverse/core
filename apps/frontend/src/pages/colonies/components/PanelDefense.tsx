import { useState } from 'react';
import type { ColonyDetailV2 } from '../types';

// ─── Panel: Verteidigung ─────────────────────────────────────

export function PanelDefense({
  defense,
  inventory: _inventory,
  onLoadColonyShields,
  onSetShieldFrequency,
  onSetDefenseTorpedoType,
}: {
  defense: NonNullable<ColonyDetailV2['defense']>;
  inventory: ColonyDetailV2['inventory'];
  onLoadColonyShields: (amount: number) => Promise<void> | void;
  onSetShieldFrequency: (frequency: number) => Promise<void> | void;
  onSetDefenseTorpedoType: (
    torpedoTypeId: number | null,
  ) => Promise<void> | void;
}) {
  const [shieldAmount, setShieldAmount] = useState(100);
  const [frequency, setFrequency] = useState(defense.shields.frequency ?? 1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const torpedoItems = defense.availableTorpedoTypes ?? [];

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Verteidigungsaktion fehlgeschlagen',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Kolonieschilde
        </div>
        <div>
          Schilde:{' '}
          <span className="text-swu-primary font-mono">
            {defense.shields.current}/{defense.shields.max}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={shieldAmount}
            onChange={(e) =>
              setShieldAmount(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-24 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
          />
          <button
            onClick={() => run('load', () => onLoadColonyShields(shieldAmount))}
            disabled={busy === 'load' || defense.shields.max <= 0}
            className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs rounded disabled:opacity-40"
          >
            Laden
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value) || 1)}
            className="w-24 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
          />
          <button
            onClick={() =>
              run('frequency', () => onSetShieldFrequency(frequency))
            }
            disabled={busy === 'frequency' || defense.shields.max <= 0}
            className="px-3 py-1 bg-swu-primary/10 border border-swu-border text-swu-primary text-xs rounded disabled:opacity-40"
          >
            Frequenz setzen
          </button>
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Phalanx
        </div>
        <div>
          Energie-Phalanx:{' '}
          <span
            className={
              defense.energyPhalanx ? 'text-green-400' : 'text-swu-muted'
            }
          >
            {defense.energyPhalanx ? 'aktiv' : 'inaktiv'}
          </span>
        </div>
        <div>
          Partikel-Phalanx:{' '}
          <span
            className={
              defense.particlePhalanx ? 'text-green-400' : 'text-swu-muted'
            }
          >
            {defense.particlePhalanx ? 'aktiv' : 'inaktiv'}
          </span>
        </div>
        <div>
          Anti-Partikel:{' '}
          <span
            className={
              defense.antiParticle ? 'text-green-400' : 'text-swu-muted'
            }
          >
            {defense.antiParticle ? 'aktiv' : 'inaktiv'}
          </span>
        </div>
        {defense.particlePhalanx && (
          <select
            value={defense.torpedoTypeId ?? ''}
            onChange={(e) =>
              run('torpedo', () =>
                onSetDefenseTorpedoType(
                  e.target.value ? Number(e.target.value) : null,
                ),
              )
            }
            className="mt-2 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
          >
            <option value="">Kein Torpedo</option>
            {torpedoItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · Schaden {item.baseDamage} · ×{item.amount ?? 0}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
