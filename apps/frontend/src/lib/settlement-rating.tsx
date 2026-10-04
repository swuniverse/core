export type SwuSettlementAssessment = {
  rating: 'PERFECT' | 'GOOD' | 'DIFFICULT' | 'CHALLENGING';
  label: string;
  score: number;
  factors: {
    resources: {
      points: number;
      oreSources: number;
      mining: { x: number; y: number; z: number };
      ratio: number;
    };
    atmosphere: { points: number; present: boolean };
    solar: { points: number; outputTJ: number | null };
    deuterium: { points: number; sources: number };
  };
};

const RATING_CLASS: Record<SwuSettlementAssessment['rating'], string> = {
  PERFECT: 'text-emerald-400 border-emerald-400/60',
  GOOD: 'text-swu-accent border-swu-accent/60',
  DIFFICULT: 'text-amber-400 border-amber-400/60',
  CHALLENGING: 'text-red-400 border-red-400/60',
};

export function settlementTooltip(s: SwuSettlementAssessment): string {
  const { resources, atmosphere, solar, deuterium } = s.factors;
  return [
    `Ressourcen-Zugang ${resources.points}/2: Bergbaufelder ${resources.mining.x}/${resources.mining.y}/${resources.mining.z} (Oberfläche/geoengineerbar/Wasser+Untergrund) für ${resources.oreSources} Erzquellen`,
    `Atmosphäre ${atmosphere.points}/2: ${atmosphere.present ? 'vorhanden' : 'keine nutzbare'}`,
    `Solareintrag ${solar.points}/2: ${(solar.outputTJ ?? 0).toLocaleString('de-DE')} TJ`,
    `Deuterium ${deuterium.points}/2: ${deuterium.sources} ${deuterium.sources === 1 ? 'Quelle' : 'Quellen'}`,
  ].join('\n');
}

export function SettlementBadge({ settlement }: { settlement: SwuSettlementAssessment }) {
  return (
    <span
      title={settlementTooltip(settlement)}
      className={`border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${RATING_CLASS[settlement.rating]}`}
    >
      {settlement.label}
    </span>
  );
}
