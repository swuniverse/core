import { useStarmapAdminStore } from '../../stores/starmap-admin.store';
import { getFieldTypeClasses } from './utils';

export function FieldTypeLegend() {
  const fieldTypes = useStarmapAdminStore((s) => s.fieldTypes);

  return (
    <div className="rounded-lg border border-swu-border bg-swu-surface p-4 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-swu-muted">
        FieldType Legende
      </h2>
      <div className="space-y-2 max-h-80 overflow-auto pr-1">
        {fieldTypes.map((ft) => (
          <div
            key={ft.id}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={[
                  'inline-block h-4 w-4 shrink-0 rounded border',
                  getFieldTypeClasses(ft),
                ].join(' ')}
              />
              <span className="truncate text-swu-text">{ft.name}</span>
            </div>
            <span className="shrink-0 text-swu-muted">#{ft.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
