import { PlayerName } from '../PlayerName';
import { useCallback, useEffect, useState } from 'react';
import type {
  IssuedTradeLicenseDto,
  TradeLicenseMenuDto,
} from '@swuniverse/shared';
import { formatDateTime, formatNumber } from '../../lib/format';
import { api } from '../../services/api';

type PaymentChoice = `ship:${number}` | `account:${number}`;

interface LicenseCondition {
  commodityId: number;
  amount: number;
  durationDays: number;
}

const sectionClass = 'border-t border-swu-border p-2 space-y-2';
const headingClass = 'font-bold text-swu-primary';
const buttonClass =
  'border border-swu-accent px-2 py-0.5 text-swu-accent hover:bg-swu-accent/10 disabled:cursor-not-allowed disabled:opacity-40';

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * License purchase, renewal and owner management for one trade post. Only
 * renders options the server authorized; the actions stay validated there.
 */
export function TradeLicensePanel({
  tradePostId,
  shipId,
  onChanged,
}: {
  tradePostId: number;
  shipId: number | null;
  /** Called after a successful purchase or renewal. */
  onChanged?: () => void;
}) {
  const [menu, setMenu] = useState<TradeLicenseMenuDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMenu(
        await api.get<TradeLicenseMenuDto>(
          `/trade/posts/${tradePostId}/license-menu${shipId ? `?shipId=${shipId}` : ''}`,
        ),
      );
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Lizenzdaten konnten nicht geladen werden'));
    }
  }, [tradePostId, shipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = async (message: string) => {
    setNotice(message);
    await load();
    onChanged?.();
  };

  if (error && !menu) {
    return (
      <section className={sectionClass}>
        <h3 className={headingClass}>Handelslizenz</h3>
        <p role="alert" className="text-red-300">{error}</p>
      </section>
    );
  }
  if (!menu) {
    return (
      <section className={sectionClass}>
        <p className="text-swu-muted">Lizenzdaten werden geladen...</p>
      </section>
    );
  }

  return (
    <>
      <section className={sectionClass} aria-label="Handelslizenz">
        <h3 className={headingClass}>Handelslizenz</h3>
        <p>
          {menu.condition
            ? `${formatNumber(menu.condition.amount)} ${menu.condition.commodityName} für ${menu.condition.durationDays} Tage`
            : 'Dieser Handelsposten vergibt keine Lizenzen.'}
        </p>
        {menu.condition && menu.freeByAgreement && (
          <p className="text-emerald-300">Für dich kostenlos (Handelsabkommen mit dem Eigentümer)</p>
        )}
        {menu.license && (
          <p>Deine Lizenz ist gültig bis {formatDateTime(menu.license.expiresAt)}.</p>
        )}
        {notice && <p role="status" className="text-emerald-300">{notice}</p>}
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {menu.renewalExpiresAt && (
          <RenewalForm menu={menu} onError={setError} onDone={done} />
        )}
        {!menu.license && (
          <PurchaseForm menu={menu} onError={setError} onDone={done} />
        )}
      </section>
      {menu.isOwner && <OwnerLicenseAdmin menu={menu} />}
    </>
  );
}

function RenewalForm({
  menu,
  onError,
  onDone,
}: {
  menu: TradeLicenseMenuDto;
  onError: (message: string | null) => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [accountPostId, setAccountPostId] = useState<number | null>(
    menu.accounts[0]?.tradePostId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const free = menu.freeByAgreement;
  if (!free && !menu.accounts.length) {
    return (
      <p className="text-swu-muted">
        Verlängerung: Kein eigenes Warenkonto in Netz {menu.networkId} deckt den Preis.
      </p>
    );
  }
  const renew = async () => {
    if (!free && accountPostId == null) return;
    setBusy(true);
    onError(null);
    try {
      await api.post(`/trade/posts/${menu.tradePostId}/licenses/renewal`, free ? {} : { accountPostId });
      await onDone(free ? 'Handelslizenz wurde kostenlos verlängert (Handelsabkommen)' : 'Handelslizenz wurde verlängert');
    } catch (err) {
      onError(errorText(err, 'Verlängerung fehlgeschlagen'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      {!free && (
        <label className="flex flex-wrap items-center gap-2">
          <span>Verlängern aus</span>
          <select
            value={accountPostId ?? ''}
            onChange={(event) => setAccountPostId(Number(event.target.value))}
            className="border border-swu-border bg-swu-bg px-1 py-0.5"
          >
            {menu.accounts.map((account) => (
              <option key={account.tradePostId} value={account.tradePostId}>
                Warenkonto {account.tradePostName} ({formatNumber(account.amount)})
              </option>
            ))}
          </select>
        </label>
      )}
      <p>Neuer Ablauf: {formatDateTime(menu.renewalExpiresAt as string)}</p>
      <button type="button" disabled={busy} onClick={() => void renew()} className={buttonClass}>
        {free ? 'Lizenz kostenlos verlängern' : 'Lizenz verlängern'}
      </button>
    </div>
  );
}

function PurchaseForm({
  menu,
  onError,
  onDone,
}: {
  menu: TradeLicenseMenuDto;
  onError: (message: string | null) => void;
  onDone: (message: string) => Promise<void>;
}) {
  const choices: Array<{ value: PaymentChoice; label: string }> = [
    ...menu.purchase.payShips.map((ship) => ({
      value: `ship:${ship.id}` as const,
      label: `Frachtraum ${ship.name} (${formatNumber(ship.amount)})`,
    })),
    ...menu.accounts.map((account) => ({
      value: `account:${account.tradePostId}` as const,
      label: `Warenkonto ${account.tradePostName} (${formatNumber(account.amount)})`,
    })),
  ];
  const [choice, setChoice] = useState<PaymentChoice | null>(choices[0]?.value ?? null);
  const [busy, setBusy] = useState(false);
  const shipId = menu.purchase.shipId;
  if (menu.purchase.rejection || shipId == null) {
    return <p className="text-amber-200">{menu.purchase.rejection ?? 'Kein Kauf möglich'}</p>;
  }
  if (menu.freeByAgreement) {
    const take = async () => {
      setBusy(true);
      onError(null);
      try {
        await api.post(`/trade/posts/${menu.tradePostId}/licenses`, { method: 'agreement', shipId });
        await onDone('Handelslizenz wurde kostenlos erteilt (Handelsabkommen)');
      } catch (err) {
        onError(errorText(err, 'Lizenz konnte nicht erteilt werden'));
      } finally {
        setBusy(false);
      }
    };
    return (
      <button type="button" disabled={busy} onClick={() => void take()} className={buttonClass}>
        Lizenz kostenlos erhalten
      </button>
    );
  }
  const buy = async () => {
    if (!choice) return;
    const [method, id] = choice.split(':');
    setBusy(true);
    onError(null);
    try {
      await api.post(
        `/trade/posts/${menu.tradePostId}/licenses`,
        method === 'ship'
          ? { method: 'ship', shipId, payShipId: Number(id) }
          : { method: 'account', shipId, accountPostId: Number(id) },
      );
      await onDone('Handelslizenz wurde erteilt');
    } catch (err) {
      onError(errorText(err, 'Kauf fehlgeschlagen'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <fieldset className="space-y-1">
      <legend>Bezahlen aus</legend>
      {choices.map((entry) => (
        <label key={entry.value} className="flex items-center gap-2">
          <input
            type="radio"
            name="license-payment"
            value={entry.value}
            checked={choice === entry.value}
            onChange={() => setChoice(entry.value)}
          />
          {entry.label}
        </label>
      ))}
      <button type="button" disabled={busy || !choice} onClick={() => void buy()} className={buttonClass}>
        Lizenz kaufen
      </button>
    </fieldset>
  );
}

function OwnerLicenseAdmin({ menu }: { menu: TradeLicenseMenuDto }) {
  const [condition, setCondition] = useState<LicenseCondition>({
    commodityId: menu.condition?.commodityId ?? menu.tradeableCommodities[0]?.id ?? 0,
    amount: menu.condition?.amount ?? 10,
    durationDays: menu.condition?.durationDays ?? 30,
  });
  const [issued, setIssued] = useState<IssuedTradeLicenseDto[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<IssuedTradeLicenseDto[]>(`/trade/posts/${menu.tradePostId}/licenses`)
      .then(setIssued)
      .catch((err: unknown) =>
        setMessage({ ok: false, text: errorText(err, 'Lizenzen konnten nicht geladen werden') }),
      );
  }, [menu.tradePostId]);

  const save = async () => {
    try {
      await api.put(`/trade/posts/${menu.tradePostId}/license-info`, condition);
      setMessage({ ok: true, text: 'Lizenzbedingung gespeichert' });
    } catch (err) {
      setMessage({ ok: false, text: errorText(err, 'Speichern fehlgeschlagen') });
    }
  };
  const number = (key: 'amount' | 'durationDays') => (value: string) =>
    setCondition((current) => ({ ...current, [key]: Number(value) }));

  return (
    <section className={sectionClass} aria-label="Lizenzverwaltung">
      <h3 className={headingClass}>Lizenzverwaltung</h3>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col">
          <span className="text-swu-muted">Ware</span>
          <select
            value={condition.commodityId}
            onChange={(event) => setCondition((current) => ({ ...current, commodityId: Number(event.target.value) }))}
            className="border border-swu-border bg-swu-bg px-1 py-0.5"
          >
            {menu.tradeableCommodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>{commodity.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-swu-muted">Menge</span>
          <input
            type="number"
            min={1}
            value={condition.amount}
            onChange={(event) => number('amount')(event.target.value)}
            className="w-20 border border-swu-border bg-swu-bg px-1 py-0.5"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-swu-muted">Tage</span>
          <input
            type="number"
            min={1}
            max={365}
            value={condition.durationDays}
            onChange={(event) => number('durationDays')(event.target.value)}
            className="w-20 border border-swu-border bg-swu-bg px-1 py-0.5"
          />
        </label>
        <button type="button" onClick={() => void save()} className={buttonClass}>
          Bedingung speichern
        </button>
      </div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-emerald-300' : 'text-red-300'}>
          {message.text}
        </p>
      )}
      <h4 className="text-swu-muted">Ausgestellte Lizenzen</h4>
      {!issued ? null : issued.length === 0 ? (
        <p className="text-swu-muted">Keine gültigen Lizenzen ausgestellt.</p>
      ) : (
        <table className="w-full">
          <tbody>
            {issued.map((license) => (
              <tr key={license.id} className="border-t border-swu-border/60">
                <td className="px-2 py-1"><PlayerName name={license.username} /></td>
                <td className="px-2 py-1 text-right font-mono">bis {formatDateTime(license.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
