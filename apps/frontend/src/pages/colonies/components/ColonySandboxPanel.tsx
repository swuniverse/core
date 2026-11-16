import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ColonySandboxDto,
  ColonySandboxListDto,
} from '@swuniverse/shared';
import { api } from '../../../services/api';
import type { BuildingDef } from '../types';
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
}: {
  colonyId: number;
  buildingMap: Record<number, BuildingDef>;
}) {
  const [list, setList] = useState<ColonySandboxListDto | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ColonySandboxDto | null>(null);
  const [newName, setNewName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
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
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  const fields = detail?.snapshot.fields ?? [];
  const atLimit = list == null || list.sandboxes.length >= list.limit;

  return (
    <section
      aria-label="Kolonie-Sandbox"
      className="space-y-3 rounded border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h2 className="font-bold text-swu-primary">Sandboxen</h2>
      <p className="text-swu-muted">
        Schreibgeschützte Planungskopie der Kolonie. Änderungen an der echten
        Kolonie beeinflussen die Kopie nicht.
      </p>
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (atLimit || busy || !newName.trim()) return;
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
          disabled={atLimit || busy || !newName.trim()}
          type="submit"
        >
          Sandbox erstellen
        </button>
        {list && (
          <span className="text-swu-muted">
            {list.sandboxes.length} / {list.limit} Sandboxen
          </span>
        )}
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
          <div aria-label="Sandbox-Felder">
            <ColonyMap
              readOnly
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
              selectedField={null}
              highlightedFields={none}
              replacementFields={none}
              isBuildMode={false}
              buildingMap={buildingMap}
              getBuildPreviewTitle={noop}
              onFieldClick={noop}
              onFieldMouseEnter={noop}
              onFieldMouseLeave={noop}
              energy={{ current: 0, max: 0 }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
