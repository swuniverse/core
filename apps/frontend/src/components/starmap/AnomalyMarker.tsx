import { useState } from 'react';
import type { AnomalyViewDto } from '@swuniverse/shared';
import { anomalyImage } from '../../lib/assets';

export function formatAnomaly(anomaly: AnomalyViewDto): string {
  return `${anomaly.name} (noch ${anomaly.remainingTicks} ${anomaly.remainingTicks === 1 ? 'Tick' : 'Ticks'})`;
}

/** Map overlay for the anomalies of one field, layered like STU's anomaly layer. */
export function AnomalyMarkers({ anomalies }: { anomalies?: AnomalyViewDto[] }) {
  if (!anomalies?.length) return null;
  return (
    <>
      {anomalies.map((anomaly, index) => (
        <AnomalyMarker key={`${anomaly.type}-${index}`} anomaly={anomaly} />
      ))}
    </>
  );
}

function AnomalyMarker({ anomaly }: { anomaly: AnomalyViewDto }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      // Fallback for anomaly types without an image in swuniverse/assets.
      <span
        data-testid="anomaly-fallback"
        title={formatAnomaly(anomaly)}
        className="pointer-events-none absolute inset-[15%] z-[15] rounded-full border-2 border-fuchsia-400/80 shadow-[0_0_6px_rgba(232,121,249,0.8)]"
      />
    );
  }
  return (
    <img
      src={anomalyImage(anomaly.type)}
      alt=""
      title={formatAnomaly(anomaly)}
      draggable={false}
      onError={() => setMissing(true)}
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full object-contain opacity-80"
    />
  );
}
