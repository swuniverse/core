import { useEffect, useState } from 'react';
import type {
  SpacecraftRepairOptionsDto,
  SpacecraftRepairPartsType,
} from '@swuniverse/shared';
import { api } from '../../services/api';

export function RepairDialog({
  shipId,
  onClose,
  onComplete,
}: {
  shipId: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [options, setOptions] = useState<SpacecraftRepairOptionsDto | null>(null);
  const [target, setTarget] = useState('');
  const [partsType, setPartsType] = useState<SpacecraftRepairPartsType>('SPARE_PARTS');
  const [instant, setInstant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<SpacecraftRepairOptionsDto>(`/spacecraft/${shipId}/repair-options`)
      .then((value) => {
        setOptions(value);
        if (value.targets[0]) setTarget(key(value.targets[0]));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Reparaturoptionen konnten nicht geladen werden'),
      );
  }, [shipId]);

  async function submit() {
    const selected = options?.targets.find((candidate) => key(candidate) === target);
    if (!selected) return;
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/self-repair`, {
        targetType: selected.type,
        moduleId: selected.moduleId,
        partsType,
        instant,
      });
      onComplete();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reparatur konnte nicht gestartet werden');
    }
  }

  const multiplier = instant ? 3 : 1;
  return (
    <div role="dialog" aria-modal="true" aria-label="Reparaturoptionen" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-xl border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-3 flex justify-between border-b border-swu-border pb-2">
          <h2 className="font-bold text-swu-primary">Reparaturoptionen</h2>
          <button type="button" onClick={onClose}>Schließen</button>
        </header>
        {!options ? <p>{error ?? 'Lade …'}</p> : options.activeRepair ? (
          <p>Eine Reparatur ist bereits aktiv.</p>
        ) : options.targets.length === 0 ? (
          <p>Keine eigenreparierbaren Schäden vorhanden.</p>
        ) : (
          <div className="space-y-3">
            <label className="block">System
              <select aria-label="Beschädigtes System" value={target} onChange={(event) => setTarget(event.target.value)} className="ml-2 border border-swu-border bg-black/40 p-1">
                {options.targets.map((item) => <option key={key(item)} value={key(item)}>{item.label} ({item.integrity} %)</option>)}
              </select>
            </label>
            <div>Techniker: {options.engineers} · Dauer: {formatDuration(options.durationSeconds)}</div>
            <fieldset className="grid gap-1"><legend>Teile</legend>
              {([['SPARE_PARTS', 'Ersatzteile (~15 %)'], ['SYSTEM_COMPONENTS', 'Systemkomponenten (~25 %)'], ['BOTH', 'Beides (~40 %)']] as const).map(([value, label]) => (
                <label key={value}><input type="radio" name="parts" value={value} checked={partsType === value} onChange={() => setPartsType(value)} /> {label}</label>
              ))}
            </fieldset>
            <label><input type="checkbox" checked={instant} onChange={(event) => setInstant(event.target.checked)} /> Sofortreparatur (dreifache Kosten)</label>
            <p>Kosten je gewählter Teileart: {options.cost * multiplier}</p>
            {error && <p className="text-red-400">{error}</p>}
            <button type="button" onClick={() => void submit()} className="border border-swu-accent px-3 py-1">Reparatur starten</button>
          </div>
        )}
      </section>
    </div>
  );
}

function key(target: { type: string; moduleId: number | null }) {
  return `${target.type}:${target.moduleId ?? ''}`;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.ceil(seconds / 60)} min`;
}
