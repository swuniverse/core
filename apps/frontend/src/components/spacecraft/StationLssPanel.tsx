import { useCallback, useEffect, useState } from 'react';
import type { StationSensorScanDto } from '@swuniverse/shared';
import { api } from '../../services/api';
import { LssMap, type LocalMapResponse } from './LssMap';

/** STU station view: LSS without flight controls; a sensor array scans the clicked field. */
export function StationLssPanel({
  stationId,
  isSensorArray,
  onUpdate,
}: {
  stationId: number;
  isSensorArray: boolean;
  onUpdate: () => Promise<void> | void;
}) {
  const [localMap, setLocalMap] = useState<LocalMapResponse | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [scan, setScan] = useState<StationSensorScanDto | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const fetchLocalMap = useCallback(async () => {
    try {
      setLocalMap(await api.get<LocalMapResponse>(`/spacecraft/${stationId}/local-map`));
      setMapError(null);
    } catch (err: unknown) {
      setLocalMap(null);
      setMapError(err instanceof Error ? err.message : 'Sensordaten konnten nicht geladen werden');
    }
  }, [stationId]);

  useEffect(() => {
    void fetchLocalMap();
  }, [fetchLocalMap]);

  async function sensorScan(x: number, y: number) {
    if (!isSensorArray || scanning) return;
    setScanning(true);
    setScan(null);
    setScanError(null);
    try {
      setScan(await api.post<StationSensorScanDto>(`/spacecraft/${stationId}/sensor-scan`, { x, y }));
      await onUpdate();
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : 'Sensorscan fehlgeschlagen');
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className="border border-swu-border bg-swu-surface p-2 text-xs" aria-label="Langstreckensensoren">
      <h3 className="mb-2 font-bold text-swu-primary">Langstreckensensoren</h3>
      {localMap ? (
        <LssMap
          localMap={localMap}
          navTarget={null}
          onScanExpired={fetchLocalMap}
          onFieldClick={(x, y) => void sensorScan(x, y)}
        />
      ) : (
        <p className="text-red-300">{mapError ?? 'Lade Sensordaten …'}</p>
      )}
      <p className="mt-2 text-swu-muted">
        {isSensorArray
          ? 'Feld anklicken für einen Sensorscan (15 EPS).'
          : 'Sensorscans sind nur mit einer Sensorphalanx möglich.'}
      </p>
      {scanError && (
        <p role="alert" className="mt-1 text-red-300">
          {scanError}
        </p>
      )}
      {scan && <SensorScanDialog scan={scan} onClose={() => setScan(null)} />}
    </section>
  );
}

const DIRECTIONS = { NORTH: 'Nord', EAST: 'Ost', SOUTH: 'Süd', WEST: 'West' } as const;

function SensorScanDialog({ scan, onClose }: { scan: StationSensorScanDto; onClose: () => void }) {
  const { field } = scan;
  return (
    <div role="dialog" aria-modal="true" aria-label="Sensorscan" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-lg border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">
            Sensorscan {field.x}|{field.y}
          </h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        <div className="grid grid-cols-2 gap-y-1">
          <span className="text-swu-muted">Feld</span>
          <span>{field.fieldType.name}</span>
          {field.celestialObject && (
            <>
              <span className="text-swu-muted">Objekt</span>
              <span>{field.celestialObject.name ?? 'Unbekannter Himmelskörper'}</span>
            </>
          )}
          {field.starSystem && (
            <>
              <span className="text-swu-muted">System</span>
              <span>{field.starSystem.name}</span>
            </>
          )}
          {field.effects.length > 0 && (
            <>
              <span className="text-swu-muted">Effekte</span>
              <span>{field.effects.join(', ')}</span>
            </>
          )}
          <span className="text-swu-muted">Energie</span>
          <span>
            {scan.energyCost} EPS verbraucht · {scan.energy} verbleibend
          </span>
        </div>
        <table className="mt-3 w-full border-collapse text-left">
          <caption className="border border-swu-border bg-black/30 px-2 py-1 text-left font-bold text-swu-primary">
            Schiffe am Feld
          </caption>
          <tbody>
            {scan.ships.length === 0 ? (
              <tr className="border border-swu-border">
                <td className="px-2 py-1 text-swu-muted">Keine Schiffe erfasst</td>
              </tr>
            ) : (
              scan.ships.map((ship) => (
                <tr key={ship.id} className="border border-swu-border">
                  <td className="px-2 py-1">{ship.name}</td>
                  <td className="px-2 py-1">{ship.kind === 'STATION' ? 'Station' : 'Schiff'}</td>
                  <td className="px-2 py-1">{ship.isOwn ? 'eigen' : (ship.ownerName ?? '?')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {scan.signatures.length > 0 && (
          <table className="mt-3 w-full border-collapse text-left">
            <caption className="border border-swu-border bg-black/30 px-2 py-1 text-left font-bold text-swu-primary">
              Signaturen
            </caption>
            <tbody>
              {scan.signatures.map((signature) => (
                <tr key={signature.id} className="border border-swu-border">
                  <td className="px-2 py-1">{signature.shipClassName ?? '?'}</td>
                  <td className="px-2 py-1">{signature.spacecraftName ?? '?'}</td>
                  <td className="px-2 py-1">
                    {signature.toDirection
                      ? `nach ${DIRECTIONS[signature.toDirection]}`
                      : signature.fromDirection
                        ? `aus ${DIRECTIONS[signature.fromDirection]}`
                        : '?'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(scan.fadedSignatures.uncloaked > 0 || scan.fadedSignatures.cloaked > 0) && (
          <p className="mt-2 text-swu-muted">
            Verblasste Signaturen: {scan.fadedSignatures.uncloaked} ungetarnt, {scan.fadedSignatures.cloaked} getarnt
          </p>
        )}
      </section>
    </div>
  );
}
