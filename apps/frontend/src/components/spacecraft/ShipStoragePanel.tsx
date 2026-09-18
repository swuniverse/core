import { useEffect, useState } from 'react';
import { commodityImage } from '../../lib/assets';
import { api } from '../../services/api';

interface CargoItem {
  id: number;
  commodityId: number;
  amount: number;
  commodityName?: string | null;
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
