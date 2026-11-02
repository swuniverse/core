import { useEffect, useState } from 'react';
import type {
  ColonyTelescopeDto,
  ColonyTelescopeScanDto,
  StarmapExploredGalaxyFieldDto,
} from '@swuniverse/shared';
import { starTileImage, systemTypeImage } from '../../../lib/assets';
import { colonyApi } from '../api';

type Center = { x: number; y: number };

export function PanelTelescope({ colonyId }: { colonyId: number }) {
  const [center, setCenter] = useState<Center | null>(null);
  const [selected, setSelected] = useState<Center | null>(null);
  const [data, setData] = useState<ColonyTelescopeDto | null>(null);
  const [result, setResult] = useState<ColonyTelescopeScanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    void colonyApi
      .fetchTelescope(colonyId, center?.x, center?.y, selected?.x, selected?.y)
      .then((result) => {
        if (!current) return;
        setData(result);
        setCenter(result.center);
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : 'Teleskop konnte nicht geladen werden');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [colonyId, center?.x, center?.y, selected?.x, selected?.y]);

  const move = (dx: number, dy: number) => {
    if (!data) return;
    setCenter({
      x: Math.max(1, Math.min(data.layer.width, data.center.x + dx)),
      y: Math.max(1, Math.min(data.layer.height, data.center.y + dy)),
    });
  };

  const scan = async () => {
    if (!selected || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const scanResult = await colonyApi.scanTelescope(
        colonyId,
        selected.x,
        selected.y,
      );
      setResult(scanResult);
      setData((current) =>
        current
          ? {
              ...current,
              energy: { ...current.energy, available: scanResult.energy.available },
            }
          : current,
      );
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Scan fehlgeschlagen');
    } finally {
      setScanning(false);
    }
  };

  if (loading && !data) return <p className="text-xs text-swu-muted">Lade Kartenausschnitt…</p>;
  if (error) return <p className="text-xs text-swu-danger">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-[2rem_2rem_2rem] justify-center gap-1" aria-label="Kartenausschnitt verschieben">
        <span />
        <NavButton label="Nach Norden" onClick={() => move(0, -data.viewport.height)}>↑</NavButton>
        <span />
        <NavButton label="Nach Westen" onClick={() => move(-data.viewport.width, 0)}>←</NavButton>
        <button type="button" className="border border-swu-border bg-black/40 text-swu-muted" onClick={() => setCenter(data.origin)} title="Zur Kolonie">●</button>
        <NavButton label="Nach Osten" onClick={() => move(data.viewport.width, 0)}>→</NavButton>
        <span />
        <NavButton label="Nach Süden" onClick={() => move(0, data.viewport.height)}>↓</NavButton>
      </div>

      <div className="overflow-auto border border-swu-border bg-black/60 p-1">
        <div className="grid min-w-max gap-px" style={{ gridTemplateColumns: `repeat(${data.viewport.width}, 2.25rem)` }}>
          {data.fields.map((field) => (
            <TelescopeField key={field.id} field={field} selected={selected?.x === field.cx && selected?.y === field.cy} onSelect={() => setSelected({ x: field.cx, y: field.cy })} />
          ))}
        </div>
      </div>

      <div className="border border-swu-border bg-swu-surface/60 p-2">
        <div>Kolonie: {data.origin.x}|{data.origin.y}</div>
        <div>Ziel: {selected ? `${selected.x}|${selected.y}` : 'kein Feld gewählt'}</div>
        <div className="mt-1 font-bold text-swu-primary">
          Energie verfügbar / benötigt: {data.energy.available} / {selected ? data.energy.required : '–'}
        </div>
      </div>

      <button
        type="button"
        disabled={!selected || data.energy.required == null || data.energy.available < data.energy.required || scanning}
        onClick={() => void scan()}
        className="w-full border border-swu-accent bg-swu-surface px-3 py-2 font-bold text-swu-primary disabled:border-swu-border disabled:text-swu-muted disabled:opacity-60"
      >
        {scanning ? 'Scan läuft…' : 'Scan starten'}
      </button>

      {result && (
        <table className="w-full border-collapse border border-swu-border text-left">
          <thead>
            <tr className="bg-swu-surface">
              <th className="border border-swu-border px-2 py-1">Rumpfkategorie</th>
              <th className="border border-swu-border px-2 py-1">Anzahl</th>
            </tr>
          </thead>
          <tbody>
            {result.categories.map((entry) => (
              <tr key={entry.category}>
                <td className="border border-swu-border px-2 py-1">{entry.category}</td>
                <td className="border border-swu-border px-2 py-1">{entry.amount}</td>
              </tr>
            ))}
            {result.categories.length === 0 && (
              <tr>
                <td colSpan={2} className="border border-swu-border px-2 py-1 text-swu-muted">
                  Keine Schiffe erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return <button type="button" aria-label={label} onClick={onClick} className="h-8 border border-swu-border bg-swu-surface text-swu-primary hover:border-swu-accent">{children}</button>;
}

function TelescopeField({ field, selected, onSelect }: { field: StarmapExploredGalaxyFieldDto; selected: boolean; onSelect: () => void }) {
  const unknown = field.explorationLevel === 'UNKNOWN';
  const image = field.systemTypeId ? systemTypeImage(field.systemTypeId) : starTileImage(field.fieldTypeId);
  return (
    <button type="button" onClick={onSelect} title={`${field.cx}|${field.cy} · ${field.fieldType.name}`} className={`relative h-9 w-9 overflow-hidden border ${selected ? 'border-swu-primary' : 'border-transparent'} bg-black`}>
      {!unknown && <img src={image} alt="" className="h-full w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] text-swu-muted">{field.cx}|{field.cy}</span>
    </button>
  );
}
