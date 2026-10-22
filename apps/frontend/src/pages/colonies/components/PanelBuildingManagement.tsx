import { useState } from 'react';
import { Tooltip } from '../../../components/Tooltip';
import {
  BuildingMassActionMode,
  type BuildingMassActionResult,
  type ColonyDetailV2,
} from '../types';

export function PanelBuildingManagement({
  management,
  onActivate,
  onDeactivate,
}: {
  management: NonNullable<ColonyDetailV2['buildingManagement']>;
  onActivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
  onDeactivate: (
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
}) {
  const [selection, setSelection] = useState<number[]>([]);
  const [busy, setBusy] = useState<'activate' | 'deactivate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingMassActionResult | null>(null);
  const [commodityId, setCommodityId] = useState(
    management.usableCommodities[0]?.id ?? 0,
  );
  const selectedSet = new Set(selection);

  const run = async (
    action: 'activate' | 'deactivate',
    fn: typeof onActivate,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => {
    if (mode === BuildingMassActionMode.SELECTION && selection.length === 0)
      return;

    setBusy(action);
    setError(null);
    setResult(null);
    try {
      setResult(await fn(mode, options));
      if (mode === BuildingMassActionMode.SELECTION) setSelection([]);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Gebäudemanagement fehlgeschlagen',
      );
    } finally {
      setBusy(null);
    }
  };

  const runGroup = (
    action: 'activate' | 'deactivate',
    mode: BuildingMassActionMode,
    commodity = false,
  ) =>
    run(action, action === 'activate' ? onActivate : onDeactivate, mode, {
      ...(commodity ? { commodityId } : {}),
    });

  const fields = [...management.fields].sort((a, b) =>
    a.buildingName.localeCompare(b.buildingName),
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Aktiv:{' '}
          <span className="font-mono text-green-400">
            {management.counts.active}
          </span>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Inaktiv:{' '}
          <span className="font-mono text-yellow-400">
            {management.counts.inactive}
          </span>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Beschädigt:{' '}
          <span className="font-mono text-red-400">
            {management.counts.damaged}
          </span>
        </div>
        <div className="border border-swu-border bg-swu-surface px-2 py-1.5">
          Im Bau:{' '}
          <span className="font-mono text-swu-accent">
            {management.counts.building}
          </span>
        </div>
      </div>

      <div className="border border-swu-border bg-swu-surface p-2 text-xs">
        <div className="mb-1 text-swu-muted">Gebäudegruppen</div>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <GroupActions
            label="Energieverbraucher"
            icon="−"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.EPS_CONSUMERS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.EPS_CONSUMERS)
            }
          />
          <GroupActions
            label="Energieerzeuger"
            icon="+"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.EPS_PRODUCERS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.EPS_PRODUCERS)
            }
          />
          <GroupActions
            label="Arbeitgeber"
            icon="A"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.INDUSTRY)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.INDUSTRY)
            }
          />
          <GroupActions
            label="Wohngebäude"
            icon="W"
            disabled={busy !== null}
            onActivate={() =>
              void runGroup('activate', BuildingMassActionMode.RESIDENTIALS)
            }
            onDeactivate={() =>
              void runGroup('deactivate', BuildingMassActionMode.RESIDENTIALS)
            }
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-swu-border/40 pt-2">
          <label htmlFor="building-group-commodity" className="text-swu-muted">
            Ware
          </label>
          <select
            id="building-group-commodity"
            value={commodityId}
            onChange={(event) => setCommodityId(Number(event.target.value))}
            className="border border-swu-border bg-swu-bg px-1.5 py-1 text-swu-text"
          >
            {management.usableCommodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name}
              </option>
            ))}
          </select>
          <GroupActions
            label="Warenverbraucher"
            icon="↓"
            disabled={busy !== null || commodityId === 0}
            onActivate={() =>
              void runGroup(
                'activate',
                BuildingMassActionMode.COMMODITY_CONSUMERS,
                true,
              )
            }
            onDeactivate={() =>
              void runGroup(
                'deactivate',
                BuildingMassActionMode.COMMODITY_CONSUMERS,
                true,
              )
            }
          />
          <GroupActions
            label="Warenerzeuger"
            icon="↑"
            disabled={busy !== null || commodityId === 0}
            onActivate={() =>
              void runGroup(
                'activate',
                BuildingMassActionMode.COMMODITY_PRODUCERS,
                true,
              )
            }
            onDeactivate={() =>
              void runGroup(
                'deactivate',
                BuildingMassActionMode.COMMODITY_PRODUCERS,
                true,
              )
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border border-swu-border bg-swu-surface px-2 py-1.5 text-xs">
        <span className="text-swu-muted">{selection.length} ausgewählt</span>
        <button
          onClick={() =>
            void run(
              'activate',
              onActivate,
              BuildingMassActionMode.SELECTION,
              { fieldIndexes: selection },
            )
          }
          disabled={selection.length === 0 || busy !== null}
          className="border border-swu-accent bg-swu-accent/20 px-2 py-1 text-swu-accent disabled:opacity-40"
        >
          Aktivieren
        </button>
        <button
          onClick={() =>
            void run(
              'deactivate',
              onDeactivate,
              BuildingMassActionMode.SELECTION,
              { fieldIndexes: selection },
            )
          }
          disabled={selection.length === 0 || busy !== null}
          className="border border-red-500/50 bg-red-900/20 px-2 py-1 text-red-300 disabled:opacity-40"
        >
          Deaktivieren
        </button>
        {result && (
          <span role="status" className="text-swu-muted">
            {result.changed.length} Gebäude geschaltet
            {result.skipped.length > 0 &&
              `, ${result.skipped.length} fehlgeschlagen`}
          </span>
        )}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      <div className="border border-swu-border bg-swu-surface text-xs">
        {fields.map((field) => (
          <label
            key={field.fieldIndex}
            className="flex items-center gap-2 border-b border-swu-border/30 px-2 py-1.5 last:border-b-0"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(field.fieldIndex)}
              onChange={() =>
                setSelection((current) =>
                  selectedSet.has(field.fieldIndex)
                    ? current.filter(
                        (fieldIndex) => fieldIndex !== field.fieldIndex,
                      )
                    : [...current, field.fieldIndex],
                )
              }
            />
            <span className="w-14 shrink-0 font-mono text-[10px] text-swu-muted">
              Feld {field.fieldIndex}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-swu-primary"
              title={field.buildingName}
            >
              {field.buildingName}
            </span>
            <span
              className={`font-mono ${
                field.isBuilding
                  ? 'text-swu-accent'
                  : field.integrity < field.maxIntegrity
                    ? 'text-red-400'
                    : field.isActive
                      ? 'text-green-400'
                      : 'text-yellow-400'
              }`}
            >
              {field.isBuilding
                ? 'im Bau'
                : field.integrity < field.maxIntegrity
                  ? 'beschädigt'
                  : field.isActive
                    ? 'aktiv'
                    : 'inaktiv'}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GroupActions({
  label,
  icon,
  disabled,
  onActivate,
  onDeactivate,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 border border-swu-border/50 px-1.5 py-1"
    >
      <span className="mr-auto flex min-w-0 items-center gap-1 truncate text-swu-primary">
        <span aria-hidden="true" className="font-mono text-swu-muted">
          {icon}
        </span>
        {label}
      </span>
      <Tooltip content={`${label} aktivieren`}>
        <button
          type="button"
          aria-label="Aktivieren"
          disabled={disabled}
          onClick={onActivate}
          className="border border-swu-accent/60 px-1.5 text-swu-accent disabled:opacity-40"
        >
          +
        </button>
      </Tooltip>
      <Tooltip content={`${label} deaktivieren`}>
        <button
          type="button"
          aria-label="Deaktivieren"
          disabled={disabled}
          onClick={onDeactivate}
          className="border border-red-500/50 px-1.5 text-red-300 disabled:opacity-40"
        >
          −
        </button>
      </Tooltip>
    </div>
  );
}
