import { useEffect, useState } from 'react';
import { commodityImage } from '../../lib/assets';
import { api } from '../../services/api';
import { type RuntimeSystemState } from './ship-system-presentation';

interface ShipControlCenterProps {
  shipId: number;
  systems: Record<string, RuntimeSystemState> | undefined;
  onUpdate: () => void;
}
type Torpedo = {
  torpedoTypeId: number;
  commodityId: number;
  amount: number;
  name: string;
  isActive: boolean;
};
type TorpedoStorage = {
  capacity: number;
  fireable: Torpedo[];
  transport: Torpedo[];
};
export const SYSTEM_ASSETS: Record<string, string> = {
  EPS: '1.png',
  SUBLIGHT_DRIVE: '2.png',
  REACTOR: '3.png',
  COMPUTER: '4.png',
  WEAPONS: '5.png',
  TORPEDO_BANK: '6.png',
  SPECIAL: '7.png',
  LONG_RANGE_SENSORS: '8.png',
  SHORT_RANGE_SENSORS: '9.png',
  WARPDRIVE: '10.png',
  SHIELDS: '11.png',
  LIFE_SUPPORT: '13.png',
};

export function ShipControlCenter({
  shipId,
  systems,
  onUpdate,
}: ShipControlCenterProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torpedoes, setTorpedoes] = useState<TorpedoStorage | null>(null);
  const loadTorpedoes = () =>
    api
      .get<TorpedoStorage>(`/spacecraft/${shipId}/torpedoes`)
      .then(setTorpedoes)
      .catch(() => setTorpedoes(null));
  useEffect(() => {
    void loadTorpedoes();
  }, [shipId]);
  async function toggle(key: string, active: boolean) {
    setPending(key);
    setError(null);
    try {
      await api.patch(`/spacecraft/${shipId}/systems/${key}`, { active });
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'System konnte nicht umgeschaltet werden',
      );
    } finally {
      setPending(null);
    }
  }
  async function selectTorpedo(torpedoTypeId: number) {
    try {
      await api.patch(`/spacecraft/${shipId}/torpedoes/active`, {
        torpedoTypeId,
      });
      await loadTorpedoes();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Torpedo konnte nicht gewählt werden',
      );
    }
  }
  const systemRow = (key: 'SHIELDS' | 'WEAPONS') => {
    const state = systems?.[key];
    if (!state) return null;
    const label = key === 'SHIELDS' ? 'Schilde' : 'Strahlenwaffen';
    return (
      <button
        key={key}
        type="button"
        disabled={pending !== null}
        onClick={() => void toggle(key, !state.active)}
        className="flex w-full items-center gap-2 border-b border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
      >
        <img
          src={`/assets/system/${SYSTEM_ASSETS[key]}`}
          alt=""
          className="size-5"
        />
        {label} {state.active ? 'deaktivieren' : 'aktivieren'}
      </button>
    );
  };
  const torpedoState = systems?.TORPEDO_BANK;
  return (
    <section>
      <div className="overflow-hidden rounded-lg border border-swu-border bg-swu-surface text-xs">
        <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
          Schiffskontrolle
        </h3>
        {systemRow('SHIELDS')}
        {systemRow('WEAPONS')}{' '}
        {torpedoState && (
          <div className="grid grid-cols-2 border-b border-swu-border">
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void toggle('TORPEDO_BANK', !torpedoState.active)}
              className="flex items-center gap-2 border-r border-swu-border px-2 py-1.5 text-left text-swu-primary hover:bg-white/5 disabled:opacity-40"
            >
              <img
                src={`/assets/system/${SYSTEM_ASSETS.TORPEDO_BANK}`}
                alt=""
                className="size-5"
              />
              Projektilwaffe{' '}
              {torpedoState.active ? 'deaktivieren' : 'aktivieren'}
            </button>
            <div className="p-1 text-swu-primary">
              {torpedoes?.fireable.length ? (
                torpedoes.fireable.map((torpedo) => (
                  <label
                    key={torpedo.torpedoTypeId}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="radio"
                      checked={torpedo.isActive}
                      onChange={() => void selectTorpedo(torpedo.torpedoTypeId)}
                    />
                    <img
                      src={commodityImage(torpedo.commodityId, torpedo.name)}
                      alt=""
                      className="size-5"
                    />
                    {torpedo.name}: {torpedo.amount}
                  </label>
                ))
              ) : (
                <span className="flex items-center gap-1 text-swu-muted">
                  <img
                    src="/assets/buttons/torp.png"
                    alt=""
                    className="size-5"
                  />
                  keine Torpedos geladen
                </span>
              )}
              {torpedoes?.transport.length ? (
                <div className="mt-1 text-swu-muted">
                  Im Transport:{' '}
                  {torpedoes.transport
                    .map((torpedo) => `${torpedo.name}: ${torpedo.amount}`)
                    .join(', ')}
                </div>
              ) : null}
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="p-2 text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
