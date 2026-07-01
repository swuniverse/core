import { useMemo, useState } from 'react';
import type { ColonyDetailV2 } from '../types';

export function CrewSocialSection({
  social,
}: {
  social: NonNullable<ColonyDetailV2['social']>;
}) {
  const [primary, setPrimary] = useState(
    social.calculatorDefaults.primaryEffect,
  );
  const [secondary, setSecondary] = useState(
    social.calculatorDefaults.secondaryEffect,
  );
  const [workers, setWorkers] = useState(social.calculatorDefaults.workers);
  const [lifeStandardAbsolute, setLifeStandardAbsolute] = useState(
    social.calculatorDefaults.lifeStandardAbsolute,
  );
  const [population, setPopulation] = useState(
    social.calculatorDefaults.population,
  );
  const calculatedCrew = useMemo(() => {
    const lifePercent =
      population <= 0
        ? lifeStandardAbsolute > 0
          ? 100
          : 0
        : lifeStandardAbsolute >= population
          ? 100
          : Math.floor((lifeStandardAbsolute * 100) / population);
    const negative = Math.ceil(Math.max(0, population) / 70);
    const effectivePositive = Math.min(
      Math.max(primary - 4 * Math.max(0, negative - secondary), 0),
      workers,
    );
    return Math.floor(10 + (effectivePositive / 5) * (lifePercent / 100));
  }, [primary, secondary, workers, lifeStandardAbsolute, population]);

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-swu-surface border border-swu-border rounded overflow-hidden">
        <div className="px-3 py-1.5 text-center text-[10px] font-bold text-swu-muted uppercase border-b border-swu-border">
          Crewberechnung dieser Kolonie
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-swu-border/30">
          <SocialRow
            label={social.local.primaryEffect.name}
            value={social.local.primaryEffect.value}
          />
          <SocialRow
            label={social.local.secondaryEffect.name}
            value={social.local.secondaryEffect.value}
          />
          <SocialRow
            label={`${social.local.lifeStandard.name} (in Prozent)`}
            value={`${social.local.lifeStandard.percent}%`}
          />
          <SocialRow label="Erzeugte Crew" value={social.local.generatedCrew} />
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded overflow-hidden">
        <div className="px-3 py-1.5 text-center text-[10px] font-bold text-swu-muted uppercase border-b border-swu-border">
          Globale Crewübersicht
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-swu-border/30">
          <SocialRow
            label="Globales Crewlimit"
            value={social.global.globalCrewLimit}
          />
          <SocialRow
            label="Crew auf Schiffen"
            value={social.global.crewOnShips}
          />
          <SocialRow
            label="Verfügbare Crew auf Kolonie"
            value={social.global.availableCrewOnColony}
          />
          <SocialRow
            label="Crew in Ausbildung"
            value={social.global.inTraining}
          />
          <SocialRow
            label="Noch ausbildbar"
            value={social.global.trainableRemaining}
          />
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded overflow-hidden">
        <div className="px-3 py-1.5 text-center text-[10px] font-bold text-swu-muted uppercase border-b border-swu-border">
          Lokaler Crewrechner
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3">
          <NumberInput
            label={social.local.primaryEffect.name}
            value={primary}
            onChange={setPrimary}
          />
          <NumberInput
            label={social.local.secondaryEffect.name}
            value={secondary}
            onChange={setSecondary}
          />
          <NumberInput
            label="Bevölkerung"
            value={population}
            onChange={setPopulation}
          />
          <NumberInput label="Arbeiter" value={workers} onChange={setWorkers} />
          <NumberInput
            label="Lebensstandard (absolut)"
            value={lifeStandardAbsolute}
            onChange={setLifeStandardAbsolute}
          />
          <div className="md:col-span-3 rounded border border-swu-border bg-swu-bg px-3 py-2">
            Errechnete Crew:{' '}
            <span className="text-swu-primary font-mono font-bold">
              {calculatedCrew}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="px-3 py-2 flex justify-between gap-2">
      <span className="font-bold text-swu-primary">{label}</span>
      <span className="font-mono text-swu-muted">{value}</span>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold text-swu-muted uppercase">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
      />
    </label>
  );
}
