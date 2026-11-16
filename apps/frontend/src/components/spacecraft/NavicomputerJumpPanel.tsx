import { useEffect, useState } from 'react';
import type {
  NavicomputerJumpResultDto,
  NavicomputerLayerDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';

interface Props {
  shipId: number;
  cooldown?: number;
  disabled?: boolean;
  onJump: () => Promise<void>;
}

export function NavicomputerJumpPanel({
  shipId,
  cooldown = 0,
  disabled = false,
  onJump,
}: Props) {
  const [layers, setLayers] = useState<NavicomputerLayerDto[]>([]);
  const [layerId, setLayerId] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [localCooldown, setLocalCooldown] = useState(cooldown);
  useEffect(() => {
    setLocalCooldown(cooldown);
  }, [cooldown, shipId]);
  useEffect(() => {
    let cancelled = false;
    setLayers([]);
    setLayerId('');
    void api
      .get<NavicomputerLayerDto[]>('/spacecraft/navicomputer/layers')
      .then((result) => {
        if (cancelled) return;
        setLayers(result);
        setLayerId(String(result[0]?.id ?? ''));
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessage(
            error instanceof Error
              ? error.message
              : 'Ebenen konnten nicht geladen werden',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [shipId]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining =
    localCooldown >= 1_000_000_000_000
      ? Math.max(0, Math.ceil((localCooldown - now) / 1000))
      : localCooldown;
  const layer = layers.find((candidate) => candidate.id === Number(layerId));
  const valid =
    layer &&
    Number.isInteger(Number(x)) &&
    Number(x) > 0 &&
    Number(x) <= layer.width &&
    Number.isInteger(Number(y)) &&
    Number(y) > 0 &&
    Number(y) <= layer.height;
  const jump = async () => {
    setPending(true);
    setMessage(null);
    try {
      const result = await api.post<NavicomputerJumpResultDto>(
        `/spacecraft/${shipId}/navicomputer-jump`,
        { layerId: Number(layerId), x: Number(x), y: Number(y) },
      );
      setLocalCooldown(result.cooldownUntil);
      setMessage(
        `Navicomputer-Sprung abgeschlossen: ${result.shipIds.length} Schiff(e)`,
      );
      await onJump();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : 'Sprung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="mt-2 space-y-2 border-t border-swu-border pt-2 text-xs"
      onSubmit={(event) => {
        event.preventDefault();
        void jump();
      }}
      aria-label="Navicomputer-Sprung"
    >
      <p className="font-bold text-swu-primary">Navicomputer-Sprung</p>
      <p>
        55 EPS pro Schiff · 300 Sekunden Abkühlzeit · keine Hyperantriebspunkte
      </p>
      <p>
        Als Flottenführer springst du die gesamte Flotte. Jedes Schiff benötigt
        eine intakte Spule und einen aktiven Hyperantrieb. Feldeffekte am Ziel
        gelten weiterhin.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label>
          Ebene{' '}
          <select
            className="rounded bg-swu-bg p-1"
            value={layerId}
            onChange={(event) => setLayerId(event.target.value)}
            disabled={pending}
          >
            {layers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          X{' '}
          <input
            className="w-20 rounded bg-swu-bg p-1"
            type="number"
            min={1}
            max={layer?.width}
            required
            value={x}
            onChange={(event) => setX(event.target.value)}
            disabled={pending}
          />
        </label>
        <label>
          Y{' '}
          <input
            className="w-20 rounded bg-swu-bg p-1"
            type="number"
            min={1}
            max={layer?.height}
            required
            value={y}
            onChange={(event) => setY(event.target.value)}
            disabled={pending}
          />
        </label>
        <button
          className="rounded border border-swu-primary px-2 py-1 disabled:opacity-40"
          type="submit"
          disabled={disabled || pending || remaining > 0 || !valid}
        >
          {pending ? 'Springt …' : 'Springen'}
        </button>
      </div>
      {remaining > 0 && (
        <p role="status">Spule kühlt ab: {remaining} Sekunden</p>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
