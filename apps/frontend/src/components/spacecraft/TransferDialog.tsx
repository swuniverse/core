import { useCallback, useEffect, useState } from 'react';
import type { SpacecraftTransferQuoteDto } from '@swuniverse/shared';
import { commodityImage } from '../../lib/assets';
import { api } from '../../services/api';

type Direction = 'TO_SHIP' | 'TO_COLONY' | 'TO_TARGET' | 'FROM_TARGET';

interface CargoItem {
  commodityId: number;
  amount: number;
  commodityName?: string | null;
}

export function TransferDialog({
  shipId,
  colonyId,
  colonyName,
  targetShipId,
  targetName,
  direction,
  onClose,
  onTransfer,
}: {
  shipId: number;
  colonyId?: number;
  colonyName?: string;
  targetShipId?: number;
  targetName?: string;
  direction: Direction;
  onClose: () => void;
  onTransfer: () => void;
}) {
  const isShipTransfer = targetShipId != null;
  const [quote, setQuote] = useState<SpacecraftTransferQuoteDto | null>(null);
  const [shipQuote, setShipQuote] = useState<{
    available: boolean;
    reason: string | null;
    sourceCargo: CargoItem[];
    targetCargo: CargoItem[];
    sourceUsed: number;
    sourceMax: number;
    targetUsed: number;
    targetMax: number;
    sourceCrew: number;
    sourceCrewMax: number;
    targetCrew: number;
    targetCrewMax: number;
    crewTransferAvailable: boolean;
    crewTransferReason: string | null;
    sourceTorpedoes: { torpedoTypeId: number; amount: number } | null;
    targetTorpedoes: { torpedoTypeId: number; amount: number } | null;
    torpedoTransferAvailable: boolean;
    torpedoTransferReason: string | null;
  } | null>(null);
  const [shipCargo, setShipCargo] = useState<CargoItem[]>([]);
  const [colonyCargo, setColonyCargo] = useState<CargoItem[]>([]);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [transferType, setTransferType] = useState<
    'CARGO' | 'CREW' | 'TORPEDO'
  >('CARGO');
  const [crewAmount, setCrewAmount] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isShipTransfer) {
      const nextQuote = await api.get<typeof shipQuote>(
        `/spacecraft/${shipId}/cargo/ship-transfer-quote?targetShipId=${targetShipId}`,
      );
      setShipQuote(nextQuote);
      setShipCargo(nextQuote?.sourceCargo ?? []);
      setColonyCargo(nextQuote?.targetCargo ?? []);
      return;
    }
    const nextQuote = await api.get<SpacecraftTransferQuoteDto>(
      `/spacecraft/${shipId}/transfer-quote?colonyId=${colonyId}`,
    );
    setQuote(nextQuote);
    setShipCargo(nextQuote.shipCargo);
    setColonyCargo(nextQuote.colonyCargo);
  }, [colonyId, isShipTransfer, shipId, targetShipId]);

  useEffect(() => {
    void refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Transferdaten fehlen'),
    );
  }, [refresh]);

  const unload = direction === 'TO_COLONY' || direction === 'TO_TARGET';
  const items = unload ? shipCargo : colonyCargo;
  const title = isShipTransfer
    ? unload
      ? `Fracht an ${targetName} übergeben`
      : `Fracht von ${targetName} übernehmen`
    : unload
      ? `Fracht zur ${colonyName} entladen`
      : `Fracht von ${colonyName} verladen`;
  const capacity = isShipTransfer
    ? unload
      ? Math.max(0, (shipQuote?.targetMax ?? 0) - (shipQuote?.targetUsed ?? 0))
      : Math.max(0, (shipQuote?.sourceMax ?? 0) - (shipQuote?.sourceUsed ?? 0))
    : direction === 'TO_SHIP'
      ? Math.max(
          0,
          (quote?.cargo?.shipMax ?? 0) - (quote?.cargo?.shipUsed ?? 0),
        )
      : (quote?.cargo?.shipUsed ?? 0);

  async function transferCrew() {
    const amount = isShipTransfer
      ? Math.min(
          crewAmount,
          unload ? (shipQuote?.sourceCrew ?? 0) : (shipQuote?.targetCrew ?? 0),
          unload
            ? Math.max(
                0,
                (shipQuote?.targetCrewMax ?? 0) - (shipQuote?.targetCrew ?? 0),
              )
            : Math.max(
                0,
                (shipQuote?.sourceCrewMax ?? 0) - (shipQuote?.sourceCrew ?? 0),
              ),
        )
      : Math.min(
          crewAmount,
          unload ? (quote?.crew.maxUnload ?? 0) : (quote?.crew.maxLoad ?? 0),
        );
    if (amount < 1) return;
    setPending(true);
    setError(null);
    try {
      await api.post(
        isShipTransfer
          ? `/spacecraft/${shipId}/crew/ship-transfer`
          : `/spacecraft/${shipId}/crew/${unload ? 'unload' : 'load'}`,
        isShipTransfer
          ? { targetShipId, amount, direction }
          : { colonyId, amount },
      );
      await refresh();
      onTransfer();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Crewtransfer fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  async function transferTorpedoes() {
    if (!isShipTransfer) return;
    const available = unload
      ? (shipQuote?.sourceTorpedoes?.amount ?? 0)
      : (shipQuote?.targetTorpedoes?.amount ?? 0);
    const amount = Math.min(crewAmount, available);
    if (amount < 1) return;
    setPending(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/torpedoes/ship-transfer`, {
        targetShipId,
        amount,
        direction,
      });
      await refresh();
      onTransfer();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Torpedotransfer fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  async function transfer(commodityId: number, available: number) {
    const amount = Math.min(
      available,
      amounts[commodityId] ?? 1,
      capacity ?? available,
    );
    if (amount < 1) return;
    setPending(true);
    setError(null);
    try {
      await api.post(
        isShipTransfer
          ? `/spacecraft/${shipId}/cargo/ship-transfer`
          : `/spacecraft/${shipId}/cargo/${direction === 'TO_SHIP' ? 'load' : 'unload'}`,
        isShipTransfer
          ? { targetShipId, commodityId, amount, direction }
          : { colonyId, commodityId, amount },
      );
      await refresh();
      onTransfer();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer fehlgeschlagen');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section className="w-full max-w-lg border border-swu-border bg-swu-bg shadow-xl">
        <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
          <h2 className="text-sm font-bold text-swu-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="text-xs text-swu-muted"
          >
            Schließen
          </button>
        </header>
        <div className="border-b border-swu-border px-3 py-2 text-xs text-swu-muted">
          {isShipTransfer
            ? `Eigenes Lager: ${shipQuote?.sourceUsed ?? '—'}/${shipQuote?.sourceMax ?? '—'} · Ziel-Lager: ${shipQuote?.targetUsed ?? '—'}/${shipQuote?.targetMax ?? '—'} · Freie Kapazität: ${capacity}`
            : `Transferkapazität pro Energie: ${quote?.energyPerCapacity ?? '—'} · Freie Kapazität: ${capacity}`}
          {shipQuote?.reason && ` · ${shipQuote.reason}`}
        </div>
        {(isShipTransfer || colonyId != null) && (
          <div className="flex border-b border-swu-border text-xs">
            <button
              type="button"
              onClick={() => setTransferType('CARGO')}
              aria-pressed={transferType === 'CARGO'}
              className="px-3 py-1 aria-pressed:text-swu-accent"
            >
              Waren
            </button>
            <button
              type="button"
              onClick={() => setTransferType('CREW')}
              aria-pressed={transferType === 'CREW'}
              className="px-3 py-1 aria-pressed:text-swu-accent"
            >
              Crew
            </button>
            {isShipTransfer && (
              <button
                type="button"
                onClick={() => setTransferType('TORPEDO')}
                aria-pressed={transferType === 'TORPEDO'}
                className="px-3 py-1 aria-pressed:text-swu-accent"
              >
                Torpedos
              </button>
            )}
          </div>
        )}
        {transferType === 'CREW' ? (
          <div className="space-y-2 p-3 text-xs">
            <p>
              {isShipTransfer ? (
                <>
                  Eigenes Schiff: {shipQuote?.sourceCrew ?? '—'}/
                  {shipQuote?.sourceCrewMax ?? '—'} · Zielschiff:{' '}
                  {shipQuote?.targetCrew ?? '—'}/
                  {shipQuote?.targetCrewMax ?? '—'}
                </>
              ) : (
                <>
                  Kolonie: {quote?.crew.colonyAvailable ?? '—'} verfügbar ·
                  Schiff: {quote?.crew.shipCurrent ?? '—'}/
                  {quote?.crew.shipMax ?? '—'} · Mindestcrew:{' '}
                  {quote?.crew.shipMinimum ?? '—'}
                </>
              )}
            </p>
            <label>
              Besatzung{' '}
              <input
                aria-label="Crewmenge"
                type="number"
                min={1}
                max={
                  isShipTransfer
                    ? unload
                      ? shipQuote?.sourceCrew
                      : shipQuote?.targetCrew
                    : unload
                      ? quote?.crew.maxUnload
                      : quote?.crew.maxLoad
                }
                value={crewAmount}
                onChange={(event) =>
                  setCrewAmount(Math.max(1, Number(event.target.value) || 1))
                }
                className="ml-2 w-16 border border-swu-border bg-black px-1"
              />
            </label>
            <button
              type="button"
              disabled={
                pending ||
                (isShipTransfer
                  ? !shipQuote?.crewTransferAvailable
                  : unload
                    ? (quote?.crew.maxUnload ?? 0) < 1
                    : (quote?.crew.maxLoad ?? 0) < 1)
              }
              onClick={() => void transferCrew()}
              className="ml-2 border border-swu-accent px-2 py-0.5 text-swu-primary disabled:opacity-40"
            >
              {unload
                ? isShipTransfer
                  ? 'Entladen'
                  : 'Ausschiffen'
                : isShipTransfer
                  ? 'Verladen'
                  : 'Einschiffen'}
            </button>
            {isShipTransfer && shipQuote?.crewTransferReason && (
              <p className="text-red-300">{shipQuote.crewTransferReason}</p>
            )}
          </div>
        ) : transferType === 'TORPEDO' && isShipTransfer ? (
          <div className="space-y-2 p-3 text-xs">
            <p>
              Quelle: Typ{' '}
              {(unload
                ? shipQuote?.sourceTorpedoes
                : shipQuote?.targetTorpedoes
              )?.torpedoTypeId ?? '—'}{' '}
              ·{' '}
              {(unload
                ? shipQuote?.sourceTorpedoes
                : shipQuote?.targetTorpedoes
              )?.amount ?? 0}{' '}
              · Ziel: Typ{' '}
              {(unload
                ? shipQuote?.targetTorpedoes
                : shipQuote?.sourceTorpedoes
              )?.torpedoTypeId ?? '—'}{' '}
              ·{' '}
              {(unload
                ? shipQuote?.targetTorpedoes
                : shipQuote?.sourceTorpedoes
              )?.amount ?? 0}
            </p>
            <label>
              Menge{' '}
              <input
                aria-label="Torpedomenge"
                type="number"
                min={1}
                max={
                  unload
                    ? shipQuote?.sourceTorpedoes?.amount
                    : shipQuote?.targetTorpedoes?.amount
                }
                value={crewAmount}
                onChange={(event) =>
                  setCrewAmount(Math.max(1, Number(event.target.value) || 1))
                }
                className="ml-2 w-16 border border-swu-border bg-black px-1"
              />
            </label>
            <button
              type="button"
              disabled={pending || !shipQuote?.torpedoTransferAvailable}
              onClick={() => void transferTorpedoes()}
              className="ml-2 border border-swu-accent px-2 py-0.5 text-swu-primary disabled:opacity-40"
            >
              {unload ? 'Entladen' : 'Verladen'}
            </button>
            {shipQuote?.torpedoTransferReason && (
              <p className="text-red-300">{shipQuote.torpedoTransferReason}</p>
            )}
          </div>
        ) : (
          <div className="min-h-28 divide-y divide-swu-border/60">
            {items.length === 0 ? (
              <p className="p-3 text-xs text-swu-muted">
                Keine Waren verfügbar.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.commodityId}
                  className="flex items-center gap-2 p-2 text-xs"
                >
                  <img
                    src={commodityImage(
                      item.commodityId,
                      item.commodityName ?? undefined,
                    )}
                    alt=""
                    className="size-6 object-contain"
                  />
                  <span className="flex-1">
                    {item.commodityName ?? `Ware #${item.commodityId}`} ·{' '}
                    {item.amount}
                  </span>
                  <input
                    aria-label={`Menge Ware ${item.commodityId}`}
                    type="number"
                    min={1}
                    max={Math.min(item.amount, capacity ?? item.amount)}
                    value={amounts[item.commodityId] ?? 1}
                    onChange={(event) =>
                      setAmounts((current) => ({
                        ...current,
                        [item.commodityId]: Math.max(
                          1,
                          Number(event.target.value) || 1,
                        ),
                      }))
                    }
                    className="w-16 border border-swu-border bg-black px-1 py-0.5 text-center"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAmounts((current) => ({
                        ...current,
                        [item.commodityId]: Math.min(
                          item.amount,
                          capacity ?? item.amount,
                        ),
                      }))
                    }
                    className="border border-swu-border px-1"
                  >
                    max
                  </button>
                  <button
                    type="button"
                    disabled={
                      pending ||
                      capacity === 0 ||
                      shipQuote?.available === false
                    }
                    onClick={() => void transfer(item.commodityId, item.amount)}
                    className="border border-swu-accent px-2 py-0.5 text-swu-primary disabled:opacity-40"
                  >
                    {unload ? 'Entladen' : 'Verladen'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="border-t border-red-500/40 p-2 text-xs text-red-300"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
