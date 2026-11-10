import { useEffect, useRef, useState, type ReactNode } from 'react';
import { commodityImage } from '../../lib/assets';
import { Tooltip, TooltipTable } from '../Tooltip';
import { api } from '../../services/api';

export interface CargoItem {
  id: number;
  commodityId: number;
  amount: number;
  commodityName?: string | null;
}

const cargoRequests = new Map<number, Promise<CargoItem[]>>();

function loadShipCargo(shipId: number) {
  let request = cargoRequests.get(shipId);
  if (!request) {
    request = api.get<CargoItem[]>(`/spacecraft/${shipId}/cargo`);
    cargoRequests.set(shipId, request);
    void request.catch(() => {
      if (cargoRequests.get(shipId) === request) cargoRequests.delete(shipId);
    });
  }
  return request;
}

export function ShipStorageTooltip({
  shipId,
  shipName,
  imageSrc,
  cargoMax,
}: {
  shipId: number;
  shipName: string;
  imageSrc: string;
  cargoMax: number;
}) {
  const [cargoState, setCargoState] = useState<{
    shipId: number;
    items: CargoItem[];
  } | null>(null);
  const [errorState, setErrorState] = useState<{
    shipId: number;
    message: string;
  } | null>(null);
  const loadedShip = useRef<number | null>(null);
  const mounted = useRef(false);
  const activeShip = useRef(shipId);
  activeShip.current = shipId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const cargo = cargoState?.shipId === shipId ? cargoState.items : null;
  const error = errorState?.shipId === shipId ? errorState.message : null;
  const visibleCargo = (cargo ?? []).filter((item) => item.amount > 0);
  const used = visibleCargo.reduce((sum, item) => sum + item.amount, 0);

  function loadCargo() {
    if (loadedShip.current === shipId) return;
    loadedShip.current = shipId;
    setErrorState(null);
    void loadShipCargo(shipId)
      .then((items) => {
        if (mounted.current && activeShip.current === shipId) {
          setCargoState({ shipId, items });
        }
      })
      .catch((err: unknown) => {
        loadedShip.current = null;
        if (mounted.current && activeShip.current === shipId) {
          setErrorState({
            shipId,
            message:
              err instanceof Error
                ? err.message
                : 'Lagerraum konnte nicht geladen werden',
          });
        }
      });
  }

  const rows: Array<readonly [ReactNode, ReactNode]> = visibleCargo.map((item) => [
    <span key={item.id} className="inline-flex items-center gap-1">
      <img
        src={commodityImage(item.commodityId, item.commodityName ?? undefined)}
        alt=""
        className="size-5 object-contain"
      />
      {item.commodityName ?? `Ware #${item.commodityId}`}
    </span>,
    item.amount,
  ]);

  return (
    <Tooltip
      title="Lager"
      onOpen={loadCargo}
      content={
        <div aria-live="polite">
          {cargo === null && !error && <p>Lager wird geladen...</p>}
          {error && <p role="alert">{error}</p>}
          {cargo !== null && !error && (
            <>
              {visibleCargo.length > 0 ? (
                <TooltipTable rows={rows} />
              ) : (
                <table className="w-full border-collapse bg-swu-surface text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-swu-border px-1.5 py-1">Lager</td>
                      <td className="border border-swu-border px-1.5 py-1 text-right font-mono">Leer</td>
                    </tr>
                  </tbody>
                </table>
              )}
              <p className="border-t border-swu-border pt-1 text-right font-mono">
                Lagerraum {used}/{cargoMax}
              </p>
            </>
          )}
        </div>
      }
    >
      <button
        type="button"
        aria-label={`Lager von ${shipName}`}
        className="block cursor-help"
      >
        <img src={imageSrc} alt={shipName} className="h-8 w-auto object-contain" />
      </button>
    </Tooltip>
  );
}

export function ShipStoragePanel({
  shipId,
  cargoMax,
  refreshKey = 0,
}: {
  shipId: number;
  cargoMax: number;
  refreshKey?: number;
}) {
  const [cargo, setCargo] = useState<CargoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const visibleCargo = cargo.filter((item) => item.amount > 0);
  const used = visibleCargo.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    void api
      .get<CargoItem[]>(`/spacecraft/${shipId}/cargo`)
      .then(setCargo)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Lagerraum konnte nicht geladen werden',
        ),
      );
  }, [shipId, refreshKey]);

  return (
    <section
      className="w-full max-w-sm border border-swu-border bg-swu-surface text-xs"
      aria-labelledby="ship-storage-heading"
    >
      <h3
        id="ship-storage-heading"
        className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary"
      >
        <img
          src="/assets/buttons/lager.png"
          alt=""
          className="mr-1 inline size-4 object-contain"
        />
        Lagerraum {used}/{cargoMax}
      </h3>
      <div className="flex flex-wrap gap-x-3 gap-y-1 p-2">
        {visibleCargo.map((item) => {
          const label = `${item.commodityName ?? `Ware #${item.commodityId}`}: ${item.amount}`;
          return (
            <div
              key={item.id}
              aria-label={label}
              title={label}
              className="inline-flex items-center gap-1 text-swu-primary"
            >
              <img
                src={commodityImage(
                  item.commodityId,
                  item.commodityName ?? undefined,
                )}
                alt=""
                className="size-6 object-contain"
              />
              <span className="font-mono">{item.amount}</span>
            </div>
          );
        })}
        {!error && visibleCargo.length === 0 && (
          <p className="text-swu-muted">Lagerraum leer.</p>
        )}
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
