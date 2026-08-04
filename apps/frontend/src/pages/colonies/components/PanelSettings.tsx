import { useEffect, useState } from 'react';
import type { ColonyDetailV2 } from '../types';

type PanelSettingsProps = {
  colonyName: string;
  population: ColonyDetailV2['population'];
  options?: ColonyDetailV2['options'];
  onRenameColony: (name: string) => Promise<void> | void;
  onSetPopulationLimit: (limit: number) => Promise<void> | void;
  onSetImmigration: (enabled: boolean) => Promise<void> | void;
  onSetColonyMessage: (message: string | null) => Promise<void> | void;
  onGiveUpColony?: (confirmation: string) => Promise<void> | void;
};

export function PanelSettings({
  colonyName,
  population,
  options,
  onRenameColony,
  onSetPopulationLimit,
  onSetImmigration,
  onSetColonyMessage,
  onGiveUpColony,
}: PanelSettingsProps) {
  const [name, setName] = useState(options?.name ?? colonyName);
  const [populationLimit, setPopulationLimit] = useState(
    options?.populationLimit ?? population.populationLimit ?? 0,
  );
  const [immigrationEnabled, setImmigrationEnabled] = useState(
    options?.immigrationEnabled ?? population.immigrationEnabled ?? true,
  );
  const [message, setMessage] = useState(options?.colonyMessage ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [giveUpConfirmation, setGiveUpConfirmation] = useState('');

  useEffect(() => {
    setName(options?.name ?? colonyName);
    setPopulationLimit(
      options?.populationLimit ?? population.populationLimit ?? 0,
    );
    setImmigrationEnabled(
      options?.immigrationEnabled ?? population.immigrationEnabled ?? true,
    );
    setMessage(options?.colonyMessage ?? '');
  }, [colonyName, options, population]);

  const runOptionAction = async (
    label: string,
    action: () => Promise<void> | void,
  ) => {
    setStatus(null);
    try {
      await action();
      setStatus(`${label} gespeichert`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : `${label} fehlgeschlagen`,
      );
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-swu-surface border border-swu-border rounded overflow-hidden">
        <div className="px-3 py-1.5 text-center text-[10px] font-bold text-swu-muted uppercase border-b border-swu-border">
          Kolonieoptionen
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3">
          <label className="space-y-1">
            <span className="block text-[10px] font-bold text-swu-muted uppercase">
              Koloniename
            </span>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
              />
              <button
                onClick={() =>
                  runOptionAction('Name', () => onRenameColony(name))
                }
                className="px-2 py-1 rounded border border-swu-border text-swu-primary hover:border-swu-accent"
              >
                Speichern
              </button>
            </div>
          </label>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold text-swu-muted uppercase">
              Bevölkerungslimit
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={populationLimit}
                onChange={(event) =>
                  setPopulationLimit(
                    Math.max(0, Number(event.target.value) || 0),
                  )
                }
                className="min-w-0 flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
              />
              <button
                onClick={() =>
                  runOptionAction('Bevölkerungslimit', () =>
                    onSetPopulationLimit(populationLimit),
                  )
                }
                className="px-2 py-1 rounded border border-swu-border text-swu-primary hover:border-swu-accent"
              >
                Setzen
              </button>
              <button
                onClick={() =>
                  runOptionAction('Bevölkerungslimit', () =>
                    onSetPopulationLimit(0),
                  )
                }
                className="px-2 py-1 rounded border border-swu-border text-swu-muted hover:border-swu-accent"
              >
                Aufheben
              </button>
            </div>
            <div className="text-[10px] text-swu-muted">
              0 = kein Limit · aktuell {population.current}/{population.max}
            </div>
          </label>

          <div className="lg:col-span-2 rounded border border-swu-border/60 bg-swu-bg px-3 py-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-swu-muted uppercase">
                Einwanderung
              </div>
              <div className="text-swu-muted">
                Neue Einwohner entstehen nur bei aktivierter Einwanderung,
                freiem Wohnraum und Lebensstandard.
              </div>
            </div>
            <button
              onClick={() =>
                runOptionAction('Einwanderung', async () => {
                  const next = !immigrationEnabled;
                  setImmigrationEnabled(next);
                  await onSetImmigration(next);
                })
              }
              className={`px-3 py-1 rounded border ${
                immigrationEnabled
                  ? 'border-green-500/50 text-green-400'
                  : 'border-red-500/50 text-red-400'
              }`}
            >
              {immigrationEnabled ? 'Erlaubt' : 'Gesperrt'}
            </button>
          </div>

          <label className="lg:col-span-2 space-y-1">
            <span className="block text-[10px] font-bold text-swu-muted uppercase">
              Koloniebotschaft
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="BBCode-Botschaft für diese Kolonie"
              className="w-full px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-swu-muted">
                {message.length}/2000 Zeichen
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    runOptionAction('Koloniebotschaft', () =>
                      onSetColonyMessage(message.trim() || null),
                    )
                  }
                  className="px-2 py-1 rounded border border-swu-border text-swu-primary hover:border-swu-accent"
                >
                  Speichern
                </button>
                <button
                  onClick={() =>
                    runOptionAction('Koloniebotschaft', () =>
                      onSetColonyMessage(null),
                    )
                  }
                  className="px-2 py-1 rounded border border-swu-border text-swu-muted hover:border-swu-accent"
                >
                  Leeren
                </button>
              </div>
            </div>
          </label>
        </div>
        {status && (
          <div className="px-3 py-1.5 border-t border-swu-border/40 text-[10px] text-swu-muted">
            {status}
          </div>
        )}
      </div>

      {onGiveUpColony && (
        <div className="bg-red-950/20 border border-red-500/40 rounded overflow-hidden">
          <div className="px-3 py-1.5 text-center text-[10px] font-bold text-red-300 uppercase border-b border-red-500/30">
            Danger Zone · Kolonie aufgeben
          </div>
          <div className="p-3 space-y-2">
            <p className="text-red-200">
              Diese Kolonie wird herrenlos. Gebäude und Storage bleiben zurück,
              alle Gebäude werden deaktiviert, laufende Aufträge abgebrochen und
              Crew flüchtet. Andere Spieler können die Kolonie später
              übernehmen.
            </p>
            <p className="text-swu-muted">
              Starterkolonien können nicht aufgegeben werden. Gib zur
              Bestätigung exakt den Kolonienamen ein:
              <span className="ml-1 font-mono text-swu-primary">
                {colonyName}
              </span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={giveUpConfirmation}
                onChange={(event) => setGiveUpConfirmation(event.target.value)}
                placeholder={colonyName}
                className="min-w-0 flex-1 px-2 py-1 bg-swu-bg border border-red-500/40 rounded text-xs text-red-100"
              />
              <button
                disabled={giveUpConfirmation !== colonyName}
                onClick={() =>
                  runOptionAction('Kolonie aufgeben', () =>
                    onGiveUpColony(giveUpConfirmation),
                  )
                }
                className="px-3 py-1 rounded border border-red-500/60 text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Kolonie aufgeben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
