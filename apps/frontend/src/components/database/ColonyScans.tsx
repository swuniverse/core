import { Link } from 'react-router-dom';
import type { ColonyScanProjectionDto } from '@swuniverse/shared';

export type ColonyScanProjection = ColonyScanProjectionDto & {
  system?: { id: number | null; discovered: boolean; name: string | null };
};

export function ColonyScans({
  scans,
  onOpen,
  onDelete,
}: {
  scans: ColonyScanProjection[];
  onOpen: (scan: ColonyScanProjection) => void;
  onDelete: (scanId: number) => void;
}) {
  return (
    <section className="border border-swu-border bg-black/30">
      <h2 className="border-b border-swu-border px-3 py-2 font-bold text-swu-primary">
        Neueste zugängliche Kolonie-Scans
      </h2>
      {scans.length === 0 ? (
        <p className="p-3 text-sm text-swu-muted">
          Keine zugänglichen Kolonie-Scans.
        </p>
      ) : (
        <ul className="divide-y divide-swu-border/60">
          {scans.map((scan) => {
            const current = scan.current.colony;
            const ownerChanged =
              current?.owner != null &&
              !current.isAbandoned &&
              (current.owner.id !== scan.snapshot.owner.id ||
                current.owner.username !== scan.snapshot.owner.username);
            return (
              <li key={scan.id} className="space-y-1 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {scan.snapshot.colonyName ?? 'Unbenannte Kolonie'}
                  </span>
                  <span className="text-xs text-swu-muted">
                    <span>
                      {scan.provenance === 'OWN'
                        ? 'eigener Scan'
                        : 'Allianz-Scan'}
                    </span>{' '}
                    · Scanner: {scan.scanner.username ?? `#${scan.scanner.id}`}
                  </span>
                  {scan.canDelete && (
                    <button
                      type="button"
                      aria-label={`Scan ${scan.id} löschen`}
                      onClick={() => onDelete(scan.id)}
                      className="ml-auto text-xs text-red-300 hover:text-red-200"
                    >
                      Löschen
                    </button>
                  )}
                </div>
                <p className="text-xs text-swu-muted">
                  Snapshot vom{' '}
                  {new Date(scan.snapshot.scannedAt).toLocaleString('de-DE')} ·
                  damaliger Besitzer:{' '}
                  {scan.snapshot.owner.username ?? 'unbekannt'}
                </p>
                {scan.system?.discovered && scan.system.id != null && (
                  <p className="text-xs text-swu-muted">
                    System:{' '}
                    <Link
                      to={`/database/systems/${scan.system.id}`}
                      className="text-swu-accent hover:underline"
                    >
                      {scan.system.name}
                    </Link>
                  </p>
                )}
                {current ? (
                  <p className="text-xs">
                    Aktuell: <span>{current.name}</span> auf Feld {current.posX}
                    :{current.posY}
                    {current.owner
                      ? ` · Besitzer: ${current.owner.username ?? 'unbekannt'}`
                      : ' · aufgegeben'}
                    {ownerChanged && (
                      <span className="ml-2 text-amber-200">
                        Besitzerwechsel seit dem Scan
                      </span>
                    )}
                    {current.isAbandoned && (
                      <span className="ml-2 text-amber-200">
                        Kolonie aufgegeben
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-amber-200">
                    Kolonie existiert heute nicht mehr.
                  </p>
                )}
                <button
                  type="button"
                  aria-label={`Gespeicherte Oberfläche von ${scan.snapshot.colonyName ?? 'dieser Kolonie'} öffnen`}
                  onClick={() => onOpen(scan)}
                  className="text-xs text-swu-accent hover:underline"
                >
                  Gespeicherte Oberfläche untersuchen
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ColonySurfaceDialog({
  scan,
  onClose,
}: {
  scan: ColonyScanProjection;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gespeicherte Oberfläche"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[90vh] w-full max-w-2xl overflow-auto border border-swu-border bg-swu-bg p-3">
        <header className="mb-3 flex items-center justify-between border-b border-swu-border pb-2">
          <h2 className="font-bold text-swu-primary">
            Gespeicherte Oberfläche:{' '}
            {scan.snapshot.colonyName ?? 'Unbenannte Kolonie'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-swu-muted"
          >
            Schließen
          </button>
        </header>
        <p className="mb-3 text-xs text-swu-muted">
          Informationsansicht der beim Scan gespeicherten Oberfläche; keine
          taktischen Aktionen verfügbar.
        </p>
        <p className="mb-2 text-xs text-swu-muted">
          Größe: {scan.snapshot.surface.width ?? '?'} ×{' '}
          {scan.snapshot.surface.height ?? '?'} ·{' '}
          {scan.snapshot.surface.fields.length} gespeicherte Felder
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {scan.snapshot.surface.fields.map((field) => (
            <li
              key={field.fieldIndex}
              className="border border-swu-border/60 p-2 text-xs"
            >
              Feld {field.fieldIndex} · Typ {field.fieldType}
              {field.buildingName ? ` · ${field.buildingName}` : ''}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
