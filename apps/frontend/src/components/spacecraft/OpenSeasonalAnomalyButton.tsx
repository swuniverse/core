import { useState } from 'react';
import type { AnomalyViewDto } from '@swuniverse/shared';
import { api } from '../../services/api';
export function OpenSeasonalAnomalyButton({
  shipId,
  anomaly,
  onUpdate,
}: {
  shipId: number;
  anomaly: AnomalyViewDto;
  onUpdate: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  if (!anomaly.canOpen || !anomaly.id) return null;
  const open = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await api.post<{ message: string }>(
        `/spacecraft/${shipId}/anomaly/${anomaly.id}/open`,
        {},
      );
      setMessage(result.message);
      await onUpdate();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Anomalie konnte nicht geöffnet werden.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="ml-2 rounded border border-swu-border px-2 py-1 text-swu-accent"
        disabled={busy}
        aria-label={`${anomaly.name} öffnen`}
        onClick={() => void open()}
      >
        {busy ? 'Öffnen…' : 'Öffnen'}
      </button>
      {message && (
        <span role="status" className="block text-swu-text">
          {message}
        </span>
      )}
      {error && (
        <span role="alert" className="block text-swu-negative">
          {error}
        </span>
      )}
    </>
  );
}
