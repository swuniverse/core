import type { BuildingDef, ColonyField } from '../types';
import { FieldCell } from './FieldCell';

type ColonyMapProps = {
  orbitFields: ColonyField[];
  surfaceFields: ColonyField[];
  undergroundFields: ColonyField[];
  selectedField: ColonyField | null;
  highlightedFields: Set<number>;
  isBuildMode: boolean;
  buildingMap: Record<number, BuildingDef>;
  getBuildPreviewTitle: (field: ColonyField) => string | undefined;
  onFieldClick: (field: ColonyField) => void;
  onFieldMouseEnter: (field: ColonyField) => void;
  onFieldMouseLeave: () => void;
};

function ColonyMapSection({
  title,
  tone,
  fields,
  children,
}: {
  title: string;
  tone: string;
  fields: ColonyField[];
  children: React.ReactNode;
}) {
  if (fields.length === 0) return null;
  const built = fields.filter((field) => field.buildingId).length;
  return (
    <section className="rounded border border-swu-border/60 bg-swu-bg/25 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          className={`text-[10px] font-bold uppercase tracking-wide ${tone}`}
        >
          {title}
        </div>
        <div className="text-[9px] text-swu-muted">
          {fields.length} Felder · {built} bebaut
        </div>
      </div>
      <div className="grid grid-cols-10 gap-px">{children}</div>
    </section>
  );
}

export function ColonyMap({
  orbitFields,
  surfaceFields,
  undergroundFields,
  selectedField,
  highlightedFields,
  isBuildMode,
  buildingMap,
  getBuildPreviewTitle,
  onFieldClick,
  onFieldMouseEnter,
  onFieldMouseLeave,
}: ColonyMapProps) {
  const renderField = (field: ColonyField) => (
    <FieldCell
      key={field.fieldIndex}
      field={field}
      buildingId={field.buildingId ?? undefined}
      buildingName={
        field.buildingId
          ? buildingMap[field.buildingId]?.nameShort ||
            buildingMap[field.buildingId]?.name
          : undefined
      }
      isSelected={selectedField?.fieldIndex === field.fieldIndex}
      isHighlighted={highlightedFields.has(field.fieldIndex)}
      isBuildMode={isBuildMode}
      isFieldActive={field.isActive}
      buildPreviewTitle={getBuildPreviewTitle(field)}
      onMouseEnter={() => onFieldMouseEnter(field)}
      onMouseLeave={onFieldMouseLeave}
      onClick={() => onFieldClick(field)}
    />
  );

  return (
    <div className="rounded border border-swu-border bg-swu-surface p-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      {isBuildMode && (
        <div className="mb-2 flex justify-end border-b border-swu-border/40 pb-2">
          <div className="rounded border border-swu-accent/40 bg-swu-accent/10 px-2 py-1 text-[10px] font-bold text-swu-accent">
            Baumodus
          </div>
        </div>
      )}
      <div className="space-y-2 overflow-x-auto">
        <ColonyMapSection
          title="Orbit"
          tone="text-swu-orbit"
          fields={orbitFields}
        >
          {orbitFields.map(renderField)}
        </ColonyMapSection>
        <ColonyMapSection
          title="Oberfläche"
          tone="text-swu-success"
          fields={surfaceFields}
        >
          {surfaceFields.map(renderField)}
        </ColonyMapSection>
        <ColonyMapSection
          title="Untergrund"
          tone="text-swu-underground"
          fields={undergroundFields}
        >
          {undergroundFields.map(renderField)}
        </ColonyMapSection>
      </div>
    </div>
  );
}
