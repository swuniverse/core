import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShipModuleSelection } from '@swuniverse/shared';
import { api } from '../../services/api';
import {
  ShipHullDesigner,
  type ShipLayout,
  type ShipModuleOption,
} from '../../pages/colonies/components/PanelShipyard';

type Option = {
  id: number;
  key: string;
  name: string;
  buildTimeTicks: number;
  crewMax: number;
  buildCosts: Array<{
    commodityId: number;
    amount: number;
    stored: number;
  }>;
  layout: ShipLayout;
};

type Queue = { id: number; name: string; finishesAt: string };
type Overview = {
  options: Option[];
  availableModules: ShipModuleOption[];
  queues: Queue[];
};

export function StationShipyardPanel({
  stationId,
  onChanged,
}: {
  stationId: number;
  onChanged: () => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [availableModules, setAvailableModules] = useState<ShipModuleOption[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moduleSelections, setModuleSelections] = useState<ShipModuleSelection[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selected),
    [options, selected],
  );
  const hasShortage =
    selectedOption?.buildCosts.some((cost) => cost.stored < cost.amount) ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Overview>(
        `/spacecraft/${stationId}/station-shipyard`,
      );
      setOptions(data.options);
      setAvailableModules(data.availableModules ?? []);
      setQueues(data.queues);
      setSelected((value) =>
        data.options.some((option) => option.id === value)
          ? value
          : (data.options[0]?.id ?? null),
      );
    } catch {
      setError('Raumwerft konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectHull = (option: Option) => {
    setSelected(option.id);
    setName(option.name);
    setModuleSelections([]);
    setMessage(null);
  };

  const build = async () => {
    if (!selectedOption) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${stationId}/station-shipyard/build`, {
        shipClassId: selectedOption.id,
        name,
        moduleSelections,
      });
      setMessage('Schiffbau gestartet.');
      setModuleSelections([]);
      await load();
      onChanged();
    } catch {
      setError('Schiffbau konnte nicht gestartet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border border-swu-border bg-swu-panel p-3 text-xs">
      <h3 className="mb-2 text-sm font-semibold text-swu-accent">Raumwerft</h3>
      {loading && <p className="text-swu-muted">Raumwerft wird geladen …</p>}
      {error && <p className="mb-2 text-red-400">{error}</p>}
      {message && <p className="mb-2 text-swu-primary">{message}</p>}
      {queues.map((queue) => (
        <p key={queue.id} className="mb-2 text-swu-muted">
          Im Bau: {queue.name} ·{' '}
          {new Date(queue.finishesAt).toLocaleString('de-DE')}
        </p>
      ))}
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectHull(option)}
            className={`border p-2 text-left ${selected === option.id ? 'border-swu-accent' : 'border-swu-border'}`}
          >
            <strong>{option.name}</strong>
            <span className="block text-swu-muted">
              Bauzeit {option.buildTimeTicks} Ticks
            </span>
            {option.buildCosts.map((cost) => (
              <span
                key={cost.commodityId}
                className={`mr-2 block ${cost.stored < cost.amount ? 'text-red-400' : ''}`}
              >
                Ware #{cost.commodityId}: {cost.stored}/{cost.amount}
              </span>
            ))}
          </button>
        ))}
      </div>
      {selectedOption && (
        <div className="mt-4">
          <ShipHullDesigner
            layout={selectedOption.layout}
            shipClassKey={selectedOption.key}
            availableModules={availableModules}
            moduleSelections={moduleSelections}
            maxCrew={selectedOption.crewMax}
            onChange={setModuleSelections}
          />
        </div>
      )}
      <label className="mt-3 block">
        Schiffsname
        <input
          aria-label="Schiffsname"
          className="ml-2 border border-swu-border bg-swu-bg px-2 py-1"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={
          !selectedOption ||
          queues.length > 0 ||
          hasShortage ||
          loading ||
          submitting
        }
        onClick={() => void build()}
        className="mt-2 border border-swu-accent px-3 py-1 disabled:opacity-50"
      >
        {submitting ? 'Schiffbau wird gestartet …' : 'Schiff bauen'}
      </button>
    </section>
  );
}
