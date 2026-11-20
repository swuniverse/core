import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ColonySandboxDto,
  ColonySandboxActionDto,
  ColonySandboxOptionsDto,
  ColonySandboxListDto,
} from '@swuniverse/shared';
import { api } from '../../../services/api';
import type { BuildingDef, CommodityDef, TerraformingDef } from '../types';
import { ColonyFieldDialog } from './ColonyFieldDialog';
import { ColonySandboxPreview } from './ColonySandboxPreview';
import { PanelBuild } from './PanelBuild';
import { ColonyMap } from './ColonyMap';

const none = new Set<number>();
const noop = () => undefined;
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Sandbox konnte nicht geladen werden.';

export function ColonySandboxPanel({
  colonyId,
  buildingMap,
  commodityMap = {},
  terraformingDefs = [],
}: {
  colonyId: number;
  buildingMap: Record<number, BuildingDef>;
  commodityMap?: Record<number, CommodityDef>;
  terraformingDefs?: TerraformingDef[];
}) {
  const [list, setList] = useState<ColonySandboxListDto | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ColonySandboxDto | null>(null);
  const [newName, setNewName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [options, setOptions] = useState<ColonySandboxOptionsDto | null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const [mode, setMode] = useState(2);
  const [commodityId, setCommodityId] = useState<number | undefined>();
  const [activate, setActivate] = useState(true);
  const [skipped, setSkipped] = useState<
    Array<{ fieldIndex: number; reason: string }>
  >([]);

  useEffect(() => {
    setSelectedIndex(null);
    setSelection([]);
    setSkipped([]);
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    setOptions(null);
    if (detail && selectedIndex != null) {
      void api
        .get<ColonySandboxOptionsDto>(
          `/colonies/sandboxes/${detail.id}/fields/${selectedIndex}/options`,
        )
        .then((result) => {
          if (!cancelled) setOptions(result);
        })
        .catch((cause) => {
          if (!cancelled) setError(errorText(cause));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [detail, selectedIndex]);
  const loadList = useCallback(async () => {
    const version = generation.current;
    const result = await api.get<ColonySandboxListDto>('/colonies/sandboxes');
    if (version === generation.current) setList(result);
  }, []);

  useEffect(() => {
    const version = generation.current;
    void loadList().catch((cause) => {
      if (version === generation.current) setError(errorText(cause));
    });
    return () => {
      generation.current += 1;
    };
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    if (selectedId != null) {
      api
        .get<ColonySandboxDto>(`/colonies/sandboxes/${selectedId}`)
        .then((result) => {
          if (cancelled) return;
          setDetail(result);
          setRenameName(result.name);
        })
        .catch((cause) => {
          if (!cancelled) setError(errorText(cause));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const act = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const fields = detail?.snapshot.fields ?? [];
  const selectedField = fields.find(
    (field) => field.fieldIndex === selectedIndex,
  );
  const plan = (action: ColonySandboxActionDto) =>
    act(async () => {
      if (!detail) return;
      const version = generation.current;
      const result = await api.post<
        ColonySandboxDto & {
          skipped?: Array<{ fieldIndex: number; reason: string }>;
        }
      >(`/colonies/sandboxes/${detail.id}/actions`, action);
      if (version !== generation.current) return;
      setDetail(result);
      setSkipped(result.skipped ?? []);
    });

  return (
    <section
      aria-label="Kolonie-Sandbox"
      className="space-y-3 rounded border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h2 className="font-bold text-swu-primary">Sandboxen</h2>
      <p className="text-swu-muted">
        Sofort und kostenlos planen: Bauen, Abreißen, Upgrade, Terraforming und
        Schalten. Änderungen an der echten Kolonie beeinflussen die Kopie nicht.
      </p>
      {error && !(selectedField && options) && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (list == null || busy || !newName.trim()) return;
          void act(async () => {
            const result = await api.post<ColonySandboxDto>(
              `/colonies/${colonyId}/sandboxes`,
              { name: newName.trim() },
            );
            await loadList();
            setNewName('');
            setSelectedId(result.id);
          });
        }}
      >
        <label className="space-y-1">
          Neue Sandbox
          <input
            className="block rounded border border-swu-border bg-swu-bg px-2 py-1"
            value={newName}
            maxLength={100}
            onChange={(event) => setNewName(event.target.value)}
          />
        </label>
        <button
          className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
          disabled={list == null || busy || !newName.trim()}
          type="submit"
        >
          Sandbox erstellen
        </button>
      </form>
      {list == null ? (
        <p>Laden...</p>
      ) : list.sandboxes.length === 0 ? (
        <p className="text-swu-muted">Noch keine Sandbox vorhanden.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {list.sandboxes.map((sandbox) => (
            <li key={sandbox.id}>
              <button
                className={`rounded border px-2 py-1 ${selectedId === sandbox.id ? 'border-swu-accent text-swu-accent' : 'border-swu-border'}`}
                aria-pressed={selectedId === sandbox.id}
                disabled={busy}
                onClick={() => setSelectedId(sandbox.id)}
              >
                {sandbox.name} · {sandbox.sourceColonyName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && (
        <div className="space-y-3">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || !renameName.trim()) return;
              void act(async () => {
                const result = await api.patch<ColonySandboxDto>(
                  `/colonies/sandboxes/${detail.id}`,
                  { name: renameName.trim() },
                );
                setDetail(result);
                setRenameName(result.name);
                await loadList();
              });
            }}
          >
            <label className="space-y-1">
              Sandbox-Name
              <input
                className="block rounded border border-swu-border bg-swu-bg px-2 py-1"
                value={renameName}
                maxLength={100}
                onChange={(event) => setRenameName(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded border border-swu-border px-2 py-1 disabled:opacity-40"
              disabled={busy || !renameName.trim()}
            >
              Umbenennen
            </button>
            <button
              type="button"
              className="rounded border border-red-500/50 px-2 py-1 text-red-300 disabled:opacity-40"
              disabled={busy}
              onClick={() => {
                if (
                  !window.confirm(`Sandbox „${detail.name}“ wirklich löschen?`)
                )
                  return;
                void act(async () => {
                  await api.delete(`/colonies/sandboxes/${detail.id}`);
                  setSelectedId(null);
                  setDetail(null);
                  await loadList();
                });
              }}
            >
              Sandbox löschen
            </button>
          </form>
          <ColonySandboxPreview sandboxId={detail.id} revision={detail} />
          <fieldset
            disabled={busy}
            className="flex flex-wrap items-center gap-2"
          >
            <legend>Gebäude schalten</legend>
            <label>
              Gruppe{' '}
              <select
                value={mode}
                onChange={(event) => setMode(Number(event.target.value))}
              >
                <option value={2}>Auswahl</option>
                <option value={1}>Energieverbraucher</option>
                <option value={3}>Energieproduzenten</option>
                <option value={4}>Industrie</option>
                <option value={5}>Wohngebäude</option>
                <option value={6}>Warenverbraucher</option>
                <option value={7}>Warenproduzenten</option>
              </select>
            </label>
            {(mode === 6 || mode === 7) && (
              <label>
                Ware{' '}
                <select
                  value={commodityId ?? ''}
                  onChange={(event) =>
                    setCommodityId(Number(event.target.value) || undefined)
                  }
                >
                  <option value="">Bitte wählen</option>
                  {Object.values(commodityMap).map((commodity) => (
                    <option key={commodity.id} value={commodity.id}>
                      {commodity.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={
                (mode === 2 && selection.length === 0) ||
                ((mode === 6 || mode === 7) && !commodityId)
              }
              onClick={() =>
                void plan({
                  action: 'mass-toggle',
                  mode,
                  fieldIndexes: selection,
                  ...(commodityId ? { commodityId } : {}),
                  activate: true,
                })
              }
            >
              Auswahl aktivieren
            </button>
            <button
              disabled={
                (mode === 2 && selection.length === 0) ||
                ((mode === 6 || mode === 7) && !commodityId)
              }
              onClick={() =>
                void plan({
                  action: 'mass-toggle',
                  mode,
                  fieldIndexes: selection,
                  ...(commodityId ? { commodityId } : {}),
                  activate: false,
                })
              }
            >
              Auswahl deaktivieren
            </button>
            {mode === 2 &&
              fields
                .filter((field) => field.buildingId && !field.locked)
                .map((field) => (
                  <label key={field.fieldIndex}>
                    <input
                      type="checkbox"
                      aria-label={`Feld ${field.fieldIndex} auswählen`}
                      checked={selection.includes(field.fieldIndex)}
                      onChange={(event) =>
                        setSelection((previous) =>
                          event.target.checked
                            ? [...previous, field.fieldIndex]
                            : previous.filter(
                                (index) => index !== field.fieldIndex,
                              ),
                        )
                      }
                    />
                    Feld {field.fieldIndex}
                  </label>
                ))}
          </fieldset>
          {skipped.length > 0 && (
            <ul role="status">
              {skipped.map((entry) => (
                <li key={entry.fieldIndex}>
                  Feld {entry.fieldIndex}: {entry.reason}
                </li>
              ))}
            </ul>
          )}
          <div aria-label="Sandbox-Felder">
            <ColonyMap
              readOnly={busy}
              showEnergy={false}
              surfaceWidth={detail.snapshot.surfaceWidth ?? undefined}
              orbitFields={fields.filter(
                (field) =>
                  field.layer === 'ORBIT' ||
                  (!field.layer && field.fieldType >= 900),
              )}
              surfaceFields={fields.filter(
                (field) =>
                  field.layer === 'SURFACE' ||
                  (!field.layer && field.fieldType < 800),
              )}
              undergroundFields={fields.filter(
                (field) =>
                  field.layer === 'UNDERGROUND' ||
                  (!field.layer &&
                    field.fieldType >= 800 &&
                    field.fieldType < 900),
              )}
              selectedField={selectedField ?? null}
              highlightedFields={none}
              replacementFields={none}
              isBuildMode={false}
              buildingMap={buildingMap}
              getBuildPreviewTitle={noop}
              onFieldClick={(field) => {
                if (!busy && !field.locked) setSelectedIndex(field.fieldIndex);
              }}
              onFieldMouseEnter={noop}
              onFieldMouseLeave={noop}
              energy={{ current: 0, max: 0 }}
            />
          </div>
          {selectedField && options && (
            <>
              <ColonyFieldDialog
                sandboxMode
                field={{
                  ...selectedField,
                  availableUpgrades: options.upgrades.map((upgrade) => ({
                    ...upgrade,
                    researchId: null,
                  })),
                }}
                building={
                  selectedField.buildingId
                    ? buildingMap[selectedField.buildingId]
                    : undefined
                }
                buildingMap={buildingMap}
                commodityMap={commodityMap}
                terraformingDefs={terraformingDefs.filter((option) =>
                  options.terraformingIds.includes(String(option.id)),
                )}
                onClose={() => setSelectedIndex(null)}
                onOpenContext={noop}
                onOpenBuildMenu={noop}
                onFilterBuildMenuByCommodity={noop}
                onOpenAcademy={noop}
                onBuildDome={noop}
                onRepairWreck={noop}
                onTerraform={(fieldIndex, terraformingId) =>
                  plan({ action: 'terraform', fieldIndex, terraformingId })
                }
                onUpgrade={(fieldIndex, upgradeId) =>
                  plan({ action: 'upgrade', fieldIndex, upgradeId })
                }
                onDemolish={(fieldIndex) =>
                  plan({ action: 'demolish', fieldIndex })
                }
                onToggle={(fieldIndex) =>
                  plan({ action: 'toggle', fieldIndex })
                }
              >
                {error && (
                  <p role="alert" className="text-red-400">
                    {error}
                  </p>
                )}
                <fieldset disabled={busy} className="space-y-2">
                  <label>
                    <input
                      type="checkbox"
                      checked={activate}
                      onChange={(event) => setActivate(event.target.checked)}
                    />
                    Nach Bau aktivieren
                  </label>
                  <PanelBuild
                    sandboxMode
                    buildingDefs={options.buildingIds
                      .map((id) => buildingMap[id])
                      .filter(Boolean)}
                    fields={fields}
                    storage={[]}
                    energy={0}
                    commodityMap={commodityMap}
                    selectedBuilding={null}
                    onSelectBuilding={(building) =>
                      void plan({
                        action: 'build',
                        fieldIndex: selectedField.fieldIndex,
                        buildingId: building.id,
                        activate,
                      })
                    }
                  />
                </fieldset>
              </ColonyFieldDialog>
            </>
          )}
        </div>
      )}
    </section>
  );
}
