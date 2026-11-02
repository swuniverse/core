import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

type Option = { id: number; name: string; buildTimeTicks: number; buildCosts: Array<{ commodityId: number; amount: number; stored: number }> };
type Queue = { id: number; name: string; finishesAt: string };

export function StationShipyardPanel({ stationId, onChanged }: { stationId: number; onChanged: () => void }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    const data = await api.get<{ options: Option[]; queues: Queue[] }>(`/spacecraft/${stationId}/station-shipyard`);
    setOptions(data.options); setQueues(data.queues); setSelected((value) => value ?? data.options[0]?.id ?? null);
  }, [stationId]);
  useEffect(() => { void load(); }, [load]);
  const build = async () => {
    if (!selected) return;
    await api.post(`/spacecraft/${stationId}/station-shipyard/build`, { shipClassId: selected, name, moduleSelections: [] });
    setMessage('Schiffbau gestartet.'); await load(); onChanged();
  };
  return <section className="border border-swu-border bg-swu-panel p-3 text-xs">
    <h3 className="mb-2 text-sm font-semibold text-swu-accent">Raumwerft</h3>
    {queues.map((queue) => <p key={queue.id} className="mb-2 text-swu-muted">Im Bau: {queue.name} · {new Date(queue.finishesAt).toLocaleString('de-DE')}</p>)}
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((option) => <button key={option.id} type="button" onClick={() => { setSelected(option.id); setName(option.name); }} className={`border p-2 text-left ${selected === option.id ? 'border-swu-accent' : 'border-swu-border'}`}>
        <strong>{option.name}</strong><span className="block text-swu-muted">Bauzeit {option.buildTimeTicks} Ticks</span>
        {option.buildCosts.map((cost) => <span key={cost.commodityId} className="mr-2 block">Ware #{cost.commodityId}: {cost.stored}/{cost.amount}</span>)}
      </button>)}
    </div>
    <label className="mt-3 block">Schiffsname<input aria-label="Schiffsname" className="ml-2 border border-swu-border bg-swu-bg px-2 py-1" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <button type="button" disabled={!selected || queues.length > 0} onClick={() => void build()} className="mt-2 border border-swu-accent px-3 py-1 disabled:opacity-50">Schiff bauen</button>
    {message && <p className="mt-2 text-swu-success">{message}</p>}
  </section>;
}
