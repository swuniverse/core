import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { SwuDaylightInfo } from '../../lib/daylight';
import type { SwuSettlementAssessment } from '../../lib/settlement-rating';

export type SwuColonyEcosystem = SwuDaylightInfo & {
  archetype: string;
  rotation: 'rotating' | 'tidal-locked';
  primaryBiome: string | null;
  secondaryBiome: string | null;
  temperatureRangeK: [number, number] | null;
  solarOutputTJ: number | null;
  settlement: SwuSettlementAssessment | null;
};

/** Nur fuer SWU-Kolonien gesetzt (siehe getSwuColonyEcosystem im Backend) - STU-Kolonien liefern null. */
export function useSwuColonyEcosystem(colonyId: number): SwuColonyEcosystem | null {
  const [ecosystem, setEcosystem] = useState<SwuColonyEcosystem | null>(null);
  useEffect(() => {
    let cancelled = false;
    setEcosystem(null);
    api
      .get<SwuColonyEcosystem | null>(`/colonization/colonies/${colonyId}/ecosystem`)
      .then((result) => {
        if (!cancelled) setEcosystem(result);
      })
      .catch(() => {
        if (!cancelled) setEcosystem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [colonyId]);
  return ecosystem;
}

