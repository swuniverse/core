import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ColonyScanListItem {
  id: number;
  colonyId: number;
  colonyOwnerId: number;
  colonyName: string | null;
  colonyOwnerUsername: string;
  starSystemId: number | null;
  celestialObjectId: number | null;
  colonyClassId: number | null;
  surfaceWidth: number | null;
  surfaceHeight: number | null;
  createdAt: string;
  abandoned: boolean;
  history?: ColonyScanListItem[];
}

interface ColonyScanDetail {
  id: number;
  colonyId: number;
  colonyOwnerId: number;
  colonyName: string | null;
  colonyOwnerUsername: string;
  starSystemId: number | null;
  celestialObjectId: number | null;
  colonyClassId: number | null;
  surfaceWidth: number | null;
  surfaceHeight: number | null;
  createdAt: string;
  abandoned: boolean;
  surface: Array<{
    fieldIndex: number;
    fieldType: number;
    terrainTileId: number | null;
    buildingId: number | null;
    buildingName: string | null;
    hasBuilding: boolean;
    isConstruction: boolean;
    isActive: boolean;
    integrityPercent: number | null;
  }>;
}

const FIELD_COLORS: Record<number, string> = {
  101: '#6b7280',
  111: '#166534',
  112: '#14532d',
  201: '#2563eb',
  210: '#0ea5e9',
  221: '#bfdbfe',
  231: '#22c55e',
  232: '#0284c7',
  501: '#e0f2fe',
};

const FIELD_LABELS: Record<number, string> = {
  101: 'Ebene',
  111: 'Wald',
  112: 'Dichter Wald',
  201: 'Wasser',
  210: 'Küste',
  221: 'Eis',
  231: 'Landmasse',
  232: 'Wasserfläche',
  501: 'Eisfeld',
};

export function ColonyScansPage() {
  const [scans, setScans] = useState<ColonyScanListItem[]>([]);
  const [selected, setSelected] = useState<ColonyScanDetail | null>(null);
  const [showHistory, setShowHistory] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<ColonyScanListItem[]>(
        '/spacecraft/colony-scans',
      );
      setScans(list);
      if (list.length > 0) {
        const detail = await api.get<ColonyScanDetail>(
          `/spacecraft/colony-scans/${list[0].id}`,
        );
        setSelected(detail);
      } else {
        setSelected(null);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : 'ColonyScans konnten nicht geladen werden',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openScan = async (scanId: number) => {
    try {
      const detail = await api.get<ColonyScanDetail>(
        `/spacecraft/colony-scans/${scanId}`,
      );
      setSelected(detail);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Scan konnte nicht geladen werden',
      );
    }
  };

  const removeScan = async (scanId: number) => {
    try {
      await api.delete(`/spacecraft/colony-scans/${scanId}`);
      const next = scans
        .map((scan) => {
          const history = (scan.history ?? [scan]).filter(
            (entry) => entry.id !== scanId,
          );
          return history.length > 0 ? { ...history[0], history } : null;
        })
        .filter((scan): scan is ColonyScanListItem => scan !== null);
      setScans(next);
      if (selected?.id === scanId) {
        if (next[0]) await openScan(next[0].id);
        else setSelected(null);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Scan konnte nicht gelöscht werden',
      );
    }
  };

  const buildingCount =
    selected?.surface.filter((field) => field.hasBuilding).length ?? 0;
  const activeCount =
    selected?.surface.filter((field) => field.isActive).length ?? 0;
  const constructionCount =
    selected?.surface.filter((field) => field.isConstruction).length ?? 0;

  if (loading)
    return (
      <div className="p-3 md:p-6 text-swu-muted">
        ColonyScans werden geladen...
      </div>
    );

  return (
    <div className="p-3 md:p-6 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="border border-swu-border rounded bg-swu-surface">
        <div className="px-3 py-2 border-b border-swu-border text-sm font-bold text-swu-accent">
          ColonyScans
        </div>
        {error && <div className="px-3 py-2 text-xs text-red-400">{error}</div>}
        {scans.length === 0 ? (
          <div className="px-3 py-4 text-xs text-swu-muted">
            Keine gespeicherten ColonyScans.
          </div>
        ) : (
          <div className="divide-y divide-swu-border/50">
            {scans.map((scan) => {
              const entries = showHistory[scan.colonyId]
                ? (scan.history ?? [scan])
                : [scan];
              return (
                <div
                  key={scan.colonyId}
                  className="px-3 py-2 text-xs space-y-2"
                >
                  <div className="font-semibold text-swu-text">
                    {scan.colonyName || `Kolonie #${scan.colonyId}`}
                  </div>
                  <div className="text-swu-muted">
                    Besitzer: {scan.colonyOwnerUsername}
                  </div>
                  {(scan.history?.length ?? 0) > 1 && (
                    <button
                      className="text-[11px] text-swu-accent hover:text-swu-primary"
                      onClick={() =>
                        setShowHistory((prev) => ({
                          ...prev,
                          [scan.colonyId]: !prev[scan.colonyId],
                        }))
                      }
                    >
                      {showHistory[scan.colonyId]
                        ? 'Historie einklappen'
                        : `${scan.history?.length ?? 1} Scans anzeigen`}
                    </button>
                  )}
                  <div className="space-y-1">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded border px-2 py-1 ${
                          selected?.id === entry.id
                            ? 'border-swu-accent bg-swu-accent/10'
                            : 'border-swu-border/50'
                        }`}
                      >
                        <button
                          className="text-left w-full"
                          onClick={() => void openScan(entry.id)}
                        >
                          <div className="text-swu-muted">
                            {new Date(entry.createdAt).toLocaleString('de-DE')}
                          </div>
                          {entry.abandoned && (
                            <div className="text-yellow-400">
                              Besitzstand geändert
                            </div>
                          )}
                        </button>
                        <button
                          className="mt-1 text-[11px] text-red-400 hover:text-red-300"
                          onClick={() => void removeScan(entry.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="border border-swu-border rounded bg-swu-surface p-3">
        {!selected ? (
          <div className="text-swu-muted text-xs">Kein Scan ausgewählt.</div>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-sm font-bold text-swu-accent">
                {selected.colonyName || `Kolonie #${selected.colonyId}`}
              </div>
              <div className="text-xs text-swu-muted">
                Besitzer: {selected.colonyOwnerUsername}
              </div>
              <div className="text-xs text-swu-muted">
                Scan: {new Date(selected.createdAt).toLocaleString('de-DE')}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded border border-swu-border px-2 py-1 text-swu-muted">
                  Felder: {selected.surface.length}
                </span>
                <span className="rounded border border-swu-border px-2 py-1 text-swu-muted">
                  Gebäude: {buildingCount}
                </span>
                <span className="rounded border border-swu-border px-2 py-1 text-swu-muted">
                  Aktiv: {activeCount}
                </span>
                <span className="rounded border border-swu-border px-2 py-1 text-swu-muted">
                  Bau: {constructionCount}
                </span>
              </div>
            </div>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, selected.surfaceWidth ?? 1)}, minmax(0, 1fr))`,
              }}
            >
              {selected.surface.map((field) => (
                <div
                  key={field.fieldIndex}
                  className="aspect-square border border-swu-border/50 rounded p-1 text-[10px] flex flex-col justify-between"
                  style={{
                    backgroundColor: FIELD_COLORS[field.fieldType] || '#1f2937',
                  }}
                  title={`${field.fieldIndex}: ${field.buildingName || FIELD_LABELS[field.fieldType] || 'frei'}`}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span>{field.fieldIndex}</span>
                    {field.isConstruction && (
                      <span className="text-yellow-300">⌛</span>
                    )}
                    {field.hasBuilding && !field.isActive && (
                      <span className="text-red-300">■</span>
                    )}
                  </span>
                  <span className="truncate">
                    {field.buildingName || FIELD_LABELS[field.fieldType] || '—'}
                  </span>
                  {field.integrityPercent != null && field.hasBuilding && (
                    <span className="text-[9px] text-swu-muted">
                      {field.integrityPercent}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
