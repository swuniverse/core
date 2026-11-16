import { useEffect, useState } from 'react';
import type {
  FieldMiningResourceDto,
  StarmapFieldTypeDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';

export function FieldMiningEditor({
  fieldType,
  onSaved,
}: {
  fieldType: StarmapFieldTypeDto;
  onSaved: (resources: FieldMiningResourceDto[]) => void;
}) {
  const [resources, setResources] = useState(fieldType.miningResources ?? []);
  const [commodities, setCommodities] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setResources(fieldType.miningResources ?? []);
    setError(null);
  }, [fieldType.id, fieldType.miningResources]);
  useEffect(() => {
    let cancelled = false;
    void api
      .get<Array<{ id: number; name: string }>>(
        '/starmap/admin/field-types/mining-commodities',
      )
      .then((result) => {
        if (!cancelled) setCommodities(result);
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Waren konnten nicht geladen werden',
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function save() {
    setPending(true);
    setError(null);
    try {
      const result = await api.patch<FieldMiningResourceDto[]>(
        `/starmap/admin/field-types/${fieldType.id}/mining`,
        { resources },
      );
      onSaved(result);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Ressourcen konnten nicht gespeichert werden',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="text-xs" open>
      <summary className="font-bold text-swu-primary">
        Abbaubare Ressourcen: {fieldType.name}
      </summary>
      <p className="my-1">
        Gilt für alle Felder dieses Typs. Rate: Einheiten je Tick.
      </p>
      {resources.map((resource, index) => (
        <div key={index} className="mb-1 flex gap-1">
          <select
            aria-label={`Ware ${index + 1}`}
            className="min-w-0 flex-1 bg-swu-surface"
            value={resource.commodityId}
            disabled={pending}
            onChange={(event) =>
              setResources((current) =>
                current.map((row, i) =>
                  i === index
                    ? { ...row, commodityId: Number(event.target.value) }
                    : row,
                ),
              )
            }
          >
            {commodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name}
              </option>
            ))}
          </select>
          <input
            aria-label={`Rate ${index + 1}`}
            className="w-16 bg-swu-surface"
            type="number"
            min={1}
            max={1000}
            value={resource.rate}
            disabled={pending}
            onChange={(event) =>
              setResources((current) =>
                current.map((row, i) =>
                  i === index
                    ? { ...row, rate: Number(event.target.value) }
                    : row,
                ),
              )
            }
          />
          <button
            type="button"
            aria-label={`Ressource ${index + 1} entfernen`}
            disabled={pending}
            onClick={() =>
              setResources((current) => current.filter((_, i) => i !== index))
            }
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !commodities.length || resources.length >= 16}
          onClick={() =>
            setResources((current) => [
              ...current,
              {
                commodityId:
                  commodities.find(
                    (commodity) =>
                      !current.some((row) => row.commodityId === commodity.id),
                  )?.id ?? commodities[0].id,
                rate: 100,
              },
            ])
          }
        >
          Hinzufügen
        </button>
        <button
          type="button"
          disabled={
            pending ||
            resources.some(
              (resource) =>
                !Number.isInteger(resource.rate) ||
                resource.rate < 1 ||
                resource.rate > 1000,
            ) ||
            new Set(resources.map((row) => row.commodityId)).size !==
              resources.length
          }
          onClick={() => void save()}
        >
          Ressourcen speichern
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
