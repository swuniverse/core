import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminTradeDealDto, AdminTradeDealInput } from '@swuniverse/shared';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import { api } from '../services/api';

type Option = { id: number; name: string };
type GiveKind = 'COMMODITY' | 'SHIP' | 'BUILDPLAN';
type PriceKind = 'COMMODITY' | 'PRESTIGE';

type FormState = {
  give: GiveKind;
  giveCommodityId: string;
  giveCommodityAmount: string;
  buildplanId: string;
  price: PriceKind;
  wantCommodityId: string;
  wantCommodityAmount: string;
  wantPrestige: string;
  amount: string;
  factionId: string;
  startsAt: string;
  endsAt: string;
};

const fieldClass = 'mt-1 block w-full rounded border border-swu-border bg-swu-bg px-2 py-1 text-swu-text';
const buttonClass =
  'rounded border border-swu-accent bg-swu-accent/10 px-3 py-1 text-sm font-semibold text-swu-accent hover:bg-swu-accent/20 disabled:opacity-50';

/** `datetime-local` value in the browser's time zone. */
function localInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyForm(): FormState {
  const now = new Date();
  return {
    give: 'COMMODITY', giveCommodityId: '', giveCommodityAmount: '1', buildplanId: '',
    price: 'COMMODITY', wantCommodityId: '50', wantCommodityAmount: '1', wantPrestige: '',
    amount: '', factionId: '',
    startsAt: localInput(now), endsAt: localInput(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
  };
}

function formOf(deal: AdminTradeDealDto): FormState {
  return {
    give: deal.buildplanId === null ? 'COMMODITY' : deal.ship ? 'SHIP' : 'BUILDPLAN',
    giveCommodityId: String(deal.giveCommodityId ?? ''),
    giveCommodityAmount: String(deal.giveCommodityAmount ?? '1'),
    buildplanId: String(deal.buildplanId ?? ''),
    price: deal.wantPrestige === null ? 'COMMODITY' : 'PRESTIGE',
    wantCommodityId: String(deal.wantCommodityId ?? '50'),
    wantCommodityAmount: String(deal.wantCommodityAmount ?? '1'),
    wantPrestige: String(deal.wantPrestige ?? ''),
    amount: String(deal.amount ?? ''),
    factionId: String(deal.factionId ?? ''),
    startsAt: localInput(new Date(deal.startsAt)),
    endsAt: localInput(new Date(deal.endsAt)),
  };
}

function inputOf(form: FormState): AdminTradeDealInput {
  const number = (value: string) => (value.trim() === '' ? null : Number(value));
  const commodity = form.give === 'COMMODITY';
  const prestige = form.price === 'PRESTIGE';
  return {
    amount: number(form.amount),
    giveCommodityId: commodity ? number(form.giveCommodityId) : null,
    giveCommodityAmount: commodity ? number(form.giveCommodityAmount) : null,
    buildplanId: commodity ? null : number(form.buildplanId),
    ship: form.give === 'SHIP',
    wantCommodityId: prestige ? null : number(form.wantCommodityId),
    wantCommodityAmount: prestige ? null : number(form.wantCommodityAmount),
    wantPrestige: prestige ? number(form.wantPrestige) : null,
    factionId: number(form.factionId),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
  };
}

/** Admin tool for Hutt Cartel deals (tmw-T8a), replacing STU's NPC `CreateDeal`. */
export function AdminTradeDealsPage() {
  const [deals, setDeals] = useState<AdminTradeDealDto[]>([]);
  const [commodities, setCommodities] = useState<Option[]>([]);
  const [buildplans, setBuildplans] = useState<Option[]>([]);
  const [factions, setFactions] = useState<Option[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDeals = useCallback(async () => {
    setDeals(await api.get<AdminTradeDealDto[]>('/admin/trade/deals'));
  }, []);

  useEffect(() => {
    void Promise.all([
      loadDeals(),
      api.get<Option[]>('/database/commodities').then(setCommodities),
      api.get<Option[]>('/spacecraft/admin/buildplans').then(setBuildplans),
      api.get<Option[]>('/factions').then(setFactions),
    ]).catch((err: unknown) => setError(getErrorMessage(err, 'Deals konnten nicht geladen werden.')));
  }, [loadDeals]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const name = (options: Option[], id: number | null) => options.find((option) => option.id === id)?.name ?? `#${id}`;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await loadDeals();
      setNotice(message);
    } catch (err) {
      setError(getErrorMessage(err, 'Aktion fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (editingId === null) await api.post('/admin/trade/deals', inputOf(form));
      else await api.put(`/admin/trade/deals/${editingId}`, inputOf(form));
      setEditingId(null);
      setForm(emptyForm());
    }, editingId === null ? 'Deal angelegt' : 'Deal gespeichert');

  const gift = (deal: AdminTradeDealDto) =>
    deal.buildplanId === null
      ? `${deal.giveCommodityAmount} ${name(commodities, deal.giveCommodityId)}`
      : `${deal.ship ? 'Schiff' : 'Bauplan'}: ${name(buildplans, deal.buildplanId)}`;
  const price = (deal: AdminTradeDealDto) =>
    deal.wantPrestige !== null ? `${deal.wantPrestige} Prestige` : `${deal.wantCommodityAmount} ${name(commodities, deal.wantCommodityId)}`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link to="/admin" className="text-sm text-swu-muted hover:text-swu-accent">Admin</Link>
        <h1 className="mt-1 text-2xl font-bold text-swu-accent" style={{ fontFamily: 'var(--font-swu-display)' }}>
          Hutten-Deals
        </h1>
        <p className="mt-1 text-sm text-swu-muted">
          Sofortangebote des Hutten-Kartells anlegen, bearbeiten und beenden. Lizenzierte Spieler werden beim Start benachrichtigt.
        </p>
      </div>
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}

      <section aria-label={editingId === null ? 'Neuer Deal' : 'Deal bearbeiten'} className="grid max-w-3xl gap-3 rounded-lg border border-swu-border bg-swu-surface p-4 text-sm text-swu-primary sm:grid-cols-2">
        <label>
          Angebot
          <select aria-label="Angebot" className={fieldClass} value={form.give} onChange={(event) => set('give', event.target.value as GiveKind)}>
            <option value="COMMODITY">Ware</option>
            <option value="SHIP">Schiff nach Bauplan</option>
            <option value="BUILDPLAN">Bauplan</option>
          </select>
        </label>
        {form.give === 'COMMODITY' ? (
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <label>
              Ware
              <select aria-label="Angebotene Ware" className={fieldClass} value={form.giveCommodityId} onChange={(event) => set('giveCommodityId', event.target.value)}>
                <option value="">Ware wählen</option>
                {commodities.map((commodity) => <option key={commodity.id} value={commodity.id}>{commodity.name}</option>)}
              </select>
            </label>
            <label>
              Menge
              <input aria-label="Angebotene Menge" type="number" min={1} className={fieldClass} value={form.giveCommodityAmount} onChange={(event) => set('giveCommodityAmount', event.target.value)} />
            </label>
          </div>
        ) : (
          <label>
            Bauplan
            <select aria-label="Bauplan" className={fieldClass} value={form.buildplanId} onChange={(event) => set('buildplanId', event.target.value)}>
              <option value="">Bauplan wählen</option>
              {buildplans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
          </label>
        )}
        <label>
          Preis
          <select aria-label="Preis" className={fieldClass} value={form.price} onChange={(event) => set('price', event.target.value as PriceKind)}>
            <option value="COMMODITY">Ware</option>
            <option value="PRESTIGE">Prestige</option>
          </select>
        </label>
        {form.price === 'COMMODITY' ? (
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <label>
              Ware
              <select aria-label="Verlangte Ware" className={fieldClass} value={form.wantCommodityId} onChange={(event) => set('wantCommodityId', event.target.value)}>
                <option value="">Ware wählen</option>
                {commodities.map((commodity) => <option key={commodity.id} value={commodity.id}>{commodity.name}</option>)}
              </select>
            </label>
            <label>
              Menge
              <input aria-label="Verlangte Menge" type="number" min={1} className={fieldClass} value={form.wantCommodityAmount} onChange={(event) => set('wantCommodityAmount', event.target.value)} />
            </label>
          </div>
        ) : (
          <label>
            Prestige
            <input aria-label="Prestigepreis" type="number" min={1} className={fieldClass} value={form.wantPrestige} onChange={(event) => set('wantPrestige', event.target.value)} />
          </label>
        )}
        <label>
          Anzahl (leer = unbegrenzt)
          <input aria-label="Anzahl" type="number" min={1} className={fieldClass} value={form.amount} onChange={(event) => set('amount', event.target.value)} />
        </label>
        <label>
          Fraktion
          <select aria-label="Fraktion" className={fieldClass} value={form.factionId} onChange={(event) => set('factionId', event.target.value)}>
            <option value="">Alle Fraktionen</option>
            {factions.map((faction) => <option key={faction.id} value={faction.id}>{faction.name}</option>)}
          </select>
        </label>
        <label>
          Start
          <input aria-label="Start" type="datetime-local" className={fieldClass} value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} />
        </label>
        <label>
          Ende
          <input aria-label="Ende" type="datetime-local" className={fieldClass} value={form.endsAt} onChange={(event) => set('endsAt', event.target.value)} />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="button" disabled={busy} onClick={() => void save()} className={buttonClass}>
            {editingId === null ? 'Deal anlegen' : 'Deal speichern'}
          </button>
          {editingId !== null && (
            <button type="button" disabled={busy} onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="text-swu-muted">
              Abbrechen
            </button>
          )}
        </div>
      </section>

      <section aria-label="Deals" className="max-w-5xl overflow-x-auto rounded-lg border border-swu-border bg-swu-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-swu-muted">
            <tr>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Angebot</th>
              <th className="px-2 py-1">Preis</th>
              <th className="px-2 py-1">Anzahl</th>
              <th className="px-2 py-1">Fraktion</th>
              <th className="px-2 py-1">Zeitraum</th>
              <th className="px-2 py-1">Gemeldet</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id} className="border-t border-swu-border/60">
                <td className="px-2 py-1">{deal.id}</td>
                <td className="px-2 py-1">{gift(deal)}</td>
                <td className="px-2 py-1">{price(deal)}</td>
                <td className="px-2 py-1">{deal.amount ?? 'unbegrenzt'}</td>
                <td className="px-2 py-1">{deal.factionId === null ? 'Alle' : name(factions, deal.factionId)}</td>
                <td className="px-2 py-1">{formatDateTime(deal.startsAt)} – {formatDateTime(deal.endsAt)}</td>
                <td className="px-2 py-1">{deal.notifiedAt ? 'ja' : 'nein'}</td>
                <td className="flex gap-2 px-2 py-1">
                  <button type="button" aria-label={`Deal ${deal.id} bearbeiten`} disabled={busy} onClick={() => { setEditingId(deal.id); setForm(formOf(deal)); }} className="text-swu-accent">
                    Bearbeiten
                  </button>
                  {new Date(deal.endsAt) > new Date() && (
                    <button type="button" aria-label={`Deal ${deal.id} beenden`} disabled={busy} onClick={() => void run(() => api.post(`/admin/trade/deals/${deal.id}/end`, {}), 'Deal beendet')} className="text-red-300">
                      Beenden
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deals.length === 0 && <p className="p-2 text-swu-muted">Noch keine Deals angelegt.</p>}
      </section>
    </div>
  );
}
