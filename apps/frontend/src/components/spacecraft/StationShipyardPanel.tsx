import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ShipBuildplanDto,
  ShipModuleSelection,
  StationShipBuildRequestDto,
  StationShipyardOverviewDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import {
  ShipHullDesigner,
  type ShipModuleOption,
} from '../../pages/colonies/components/PanelShipyard';

type Overview = StationShipyardOverviewDto;
type Option = Overview['options'][number];
type Queue = Overview['queues'][number];

export function StationShipyardPanel({
  stationId,
  onChanged,
}: {
  stationId: number;
  onChanged: () => void;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [availableModules, setAvailableModules] = useState<ShipModuleOption[]>(
    [],
  );
  const [queues, setQueues] = useState<Queue[]>([]);
  const [buildplans, setBuildplans] = useState<ShipBuildplanDto[]>([]);
  const [selectedBuildPlanId, setSelectedBuildPlanId] = useState<number | null>(
    null,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [moduleSelections, setModuleSelections] = useState<
    ShipModuleSelection[]
  >([]);
  const [name, setName] = useState('');
  const [buildPlanName, setBuildPlanName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selected),
    [options, selected],
  );
  const hasShortage =
    selectedOption?.buildCosts.some((cost) => cost.stored < cost.amount) ??
    false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Overview>(
        `/spacecraft/${stationId}/station-shipyard`,
      );
      setOptions(data.options);
      setAvailableModules(data.availableModules ?? []);
      setBuildplans(data.buildplans ?? []);
      setQueues(data.queues);
      setSelected((value) =>
        data.options.some((option) => option.id === value)
          ? value
          : (data.options[0]?.id ?? null),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Raumwerft konnte nicht geladen werden.',
      );
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectHull = (option: Option) => {
    setSelected(option.id);
    setSelectedBuildPlanId(null);
    setName(option.name);
    setModuleSelections([]);
    setMessage(null);
  };

  const selectBuildPlan = (id: number | null) => {
    const plan = buildplans.find((candidate) => candidate.id === id);
    setSelectedBuildPlanId(plan?.id ?? null);
    if (plan) {
      setSelected(plan.shipClassId);
      setModuleSelections(plan.moduleSelections);
      setName(plan.name);
    }
    setMessage(null);
  };

  const build = async () => {
    if (!selectedOption) return;
    setSubmitting(true);
    setError(null);
    try {
      const request: StationShipBuildRequestDto =
        selectedBuildPlanId !== null
          ? { buildPlanId: selectedBuildPlanId, name }
          : {
              shipClassId: selectedOption.id,
              name,
              moduleSelections,
              ...(buildPlanName.trim()
                ? { buildPlanName: buildPlanName.trim() }
                : {}),
            };
      await api.post(
        `/spacecraft/${stationId}/station-shipyard/build`,
        request,
      );
      setMessage('Schiffbau gestartet.');
      setModuleSelections([]);
      setSelectedBuildPlanId(null);
      setBuildPlanName('');
      await load();
      onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Schiffbau konnte nicht gestartet werden.',
      );
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
          Im Bau: {queue.name}
          {queue.buildPlanName && ` · Bauplan: ${queue.buildPlanName}`} ·{' '}
          {new Date(queue.finishesAt).toLocaleString('de-DE')}
        </p>
      ))}
      <label className="mb-3 block">
        Bauplan
        <select
          aria-label="Bauplan"
          className="ml-2 border border-swu-border bg-swu-bg px-2 py-1"
          value={selectedBuildPlanId ?? ''}
          onChange={(event) =>
            selectBuildPlan(
              event.target.value ? Number(event.target.value) : null,
            )
          }
        >
          <option value="">Eigener Entwurf</option>
          {buildplans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>
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
            onChange={(next) => {
              setModuleSelections(next);
              setSelectedBuildPlanId(null);
              setMessage(null);
            }}
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
      {selectedBuildPlanId === null && (
        <label className="mt-2 block">
          Bauplanname (optional)
          <input
            aria-label="Bauplanname"
            className="ml-2 border border-swu-border bg-swu-bg px-2 py-1"
            value={buildPlanName}
            onChange={(event) => setBuildPlanName(event.target.value)}
          />
          <span className="mt-1 block text-swu-muted">
            Wird beim Schiffbau als Bauplan gespeichert.
          </span>
        </label>
      )}
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
