export type ColonyScan = {
  colony: { name: string; owner: { username: string | null } };
  surface: {
    width: number | null;
    deposits: Array<{
      commodityId: number;
      commodityName: string;
      minAmount: number;
      maxAmount: number;
    }>;
    fields: Array<{
      fieldIndex: number;
      fieldType: number;
      buildingName: string | null;
      hasBuilding: boolean;
      isConstruction: boolean;
      isActive: boolean;
      integrityPercent: number | null;
    }>;
  };
};

const FIELD_COLORS: Record<number, string> = {
  101: '#6b7280',
  111: '#166534',
  112: '#14532d',
  201: '#2563eb',
  210: '#0ea5e9',
  221: '#bfdbfe',
  231: '#22c55e',
  232: '#0284c7',
  501: '#e0f2fe',
};

export function ColonyScanDialog({
  scan,
  onClose,
}: {
  scan: ColonyScan;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kolonie-Oberflächenscan"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-xl border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <div>
            <h3 className="font-bold text-swu-primary">
              Kolonie-Oberflächenscan: {scan.colony.name}
            </h3>
            <p className="text-swu-muted">
              Besitzer: {scan.colony.owner.username ?? 'unbekannt'}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        {scan.surface.deposits.length > 0 && (
          <div className="mb-3 border border-swu-border p-2">
            <h4 className="mb-1 font-bold text-swu-primary">Ressourcenvorkommen</h4>
            <div className="grid gap-1 sm:grid-cols-2">
              {scan.surface.deposits.map((deposit) => (
                <div key={deposit.commodityId} className="flex justify-between text-swu-muted">
                  <span>{deposit.commodityName}</span>
                  <span>min: {deposit.minAmount}, max: {deposit.maxAmount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, scan.surface.width ?? 1)}, minmax(0, 1fr))`,
          }}
        >
          {scan.surface.fields.map((field) => (
            <div
              key={field.fieldIndex}
              className="aspect-square rounded border border-swu-border/50 p-1 text-[10px]"
              style={{ backgroundColor: FIELD_COLORS[field.fieldType] ?? '#1f2937' }}
              title={field.buildingName ?? `Feld ${field.fieldIndex}`}
            >
              <div className="flex justify-between">
                <span>{field.fieldIndex}</span>
                {field.isConstruction && <span>⌛</span>}
              </div>
              {field.hasBuilding && <div className="truncate">{field.buildingName ?? 'Gebäude'}</div>}
              {field.hasBuilding && field.integrityPercent != null && (
                <div className="text-swu-muted">{field.integrityPercent}%</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
