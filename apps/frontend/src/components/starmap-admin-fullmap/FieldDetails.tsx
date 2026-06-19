import { useFullmapEditorStore } from '../../stores/fullmap-editor.store';

export function FieldDetails() {
  const selectedField = useFullmapEditorStore((s) => s.selectedField);
  const systemTypes = useFullmapEditorStore((s) => s.systemTypes);

  if (!selectedField) {
    return (
      <section>
        <h3 className="font-bold text-xs text-swu-primary mb-1">Feld</h3>
        <div className="text-xs text-swu-muted">Feld anklicken</div>
      </section>
    );
  }

  const f = selectedField;
  return (
    <section>
      <h3 className="font-bold text-xs text-swu-primary mb-1">Feld</h3>
      <div className="text-xs text-swu-text space-y-0.5 leading-relaxed">
        <div><strong className="text-white">Feld {f.cx}|{f.cy}</strong></div>
        <div>ID {f.id}</div>
        <div>Feldtyp: {f.fieldType.name} ({f.fieldTypeId})</div>
        <div>Passierbar: {f.fieldType.passable ? 'Ja' : 'Nein'}{f.passableOverride != null ? ` (Override: ${f.passableOverride ? 'Ja' : 'Nein'})` : ''}</div>
        <div>Systemtyp: {f.systemTypeId ? (systemTypes.find((st) => st.id === f.systemTypeId)?.name ?? f.systemTypeId) : 'Keine'}</div>
        <div>System: {f.starSystem?.name ?? 'Keine'}</div>
        <div>Region: {f.regionId ?? 'Keine'}</div>
        <div>Admin-Region: {f.adminRegionKey ?? 'Keine'}</div>
        <div>Grenze: {f.borderTypeId ?? 'Keine'}</div>
        <div>Effekte: {f.effects?.length ? f.effects.join(', ') : 'Keine'}</div>
      </div>
    </section>
  );
}
