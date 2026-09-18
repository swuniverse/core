import { useCallback, useEffect, useMemo, useState } from 'react';
import { commodityImage } from '../../lib/assets';
import { api } from '../../services/api';

interface CargoItemData {
  id: number;
  commodityId: number;
  amount: number;
  commodityName?: string | null;
}

interface ColonySummary {
  id: number;
  name: string;
}

interface CargoPanelProps {
  shipId: number;
  cargoMax: number;
  onTransfer: () => void;
}

export function CargoPanel({ shipId, cargoMax, onTransfer }: CargoPanelProps) {
  const [cargo, setCargo] = useState<CargoItemData[]>([]);
  const [colonies, setColonies] = useState<ColonySummary[]>([]);
  const [selectedColony, setSelectedColony] = useState<number | null>(null);
  const [transferCommodity, setTransferCommodity] = useState(1);
  const [transferAmount, setTransferAmount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cargoResult, colonyResult] = await Promise.all([
        api.get<CargoItemData[]>(`/spacecraft/${shipId}/cargo`),
        api.get<ColonySummary[]>('/colonies'),
      ]);
      setCargo(cargoResult);
      setColonies(colonyResult);
      setSelectedColony((current) => current ?? colonyResult[0]?.id ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fracht konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [shipId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cargoUsed = useMemo(
    () => cargo.reduce((sum, item) => sum + item.amount, 0),
    [cargo],
  );

  const transfer = async (direction: 'load' | 'unload') => {
    if (!selectedColony || transferAmount < 1 || transferCommodity < 1) return;
    setTransferring(true);
    setMessage(null);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/cargo/${direction}`, {
        colonyId: selectedColony,
        commodityId: transferCommodity,
        amount: transferAmount,
      });
      await loadData();
      onTransfer();
      setMessage(direction === 'load' ? 'Beladen erfolgreich' : 'Entladen erfolgreich');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <section className="rounded-lg border border-swu-border bg-swu-surface p-3" aria-labelledby="cargo-panel-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id="cargo-panel-heading" className="text-[10px] font-bold uppercase text-swu-muted">
          Frachtraum
        </h3>
        <span className="text-[10px] text-swu-muted" aria-label={`Fracht ${cargoUsed} von ${cargoMax}`}>
          {cargoUsed}/{cargoMax}
        </span>
      </div>

      {loading ? (
        <p className="text-[11px] text-swu-muted">Fracht wird geladen…</p>
      ) : cargo.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {cargo.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded border border-swu-border/30 bg-swu-bg/50 px-2 py-1 text-[10px]">
              <img src={commodityImage(item.commodityId, item.commodityName ?? undefined)} alt="" className="h-5 w-5 object-contain" />
              <span className="min-w-0 flex-1 truncate text-swu-muted">#{item.commodityId}</span>
              <span className="font-mono text-swu-primary">{item.amount}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-[11px] text-swu-muted">Frachtraum leer.</p>
      )}

      <div className="space-y-2 border-t border-swu-border/50 pt-2">
        <div className="grid gap-2 sm:grid-cols-[minmax(120px,1fr)_90px_90px]">
          <label className="text-[10px] text-swu-muted">
            Kolonie
            <select
              value={selectedColony ?? ''}
              onChange={(event) => setSelectedColony(Number(event.target.value) || null)}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-xs text-swu-primary"
            >
              {colonies.length === 0 && <option value="">Keine Kolonie</option>}
              {colonies.map((colony) => (
                <option key={colony.id} value={colony.id}>{colony.name}</option>
              ))}
            </select>
          </label>
          <label className="text-[10px] text-swu-muted">
            Commodity ID
            <input
              type="number"
              min={1}
              value={transferCommodity}
              onChange={(event) => setTransferCommodity(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-center text-xs text-swu-primary"
            />
          </label>
          <label className="text-[10px] text-swu-muted">
            Menge
            <input
              type="number"
              min={1}
              value={transferAmount}
              onChange={(event) => setTransferAmount(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-center text-xs text-swu-primary"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void transfer('load')} disabled={!selectedColony || transferring} className="flex-1 rounded border border-green-500/60 bg-green-500/10 px-2 py-1 text-xs font-bold text-green-300 hover:bg-green-500/20 disabled:opacity-40">
            Beladen
          </button>
          <button type="button" onClick={() => void transfer('unload')} disabled={!selectedColony || transferring} className="flex-1 rounded border border-swu-warning/60 bg-swu-warning/10 px-2 py-1 text-xs font-bold text-swu-warning hover:bg-swu-warning/20 disabled:opacity-40">
            Entladen
          </button>
        </div>
        {message && <p role="status" className="text-[11px] text-swu-accent">{message}</p>}
        {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
      </div>
    </section>
  );
}
