import { useEffect, useState } from 'react';
import { formatSignedAmount } from '../utils';
import type { BuildingDef, ColonyField } from '../types';
import { FieldCell } from './FieldCell';
import { surfaceTimeState } from '../../../lib/daylight';
import type { SwuColonyEcosystem } from '../useSwuColonyEcosystem';

const DEFAULT_COLUMNS = 10;
const DAYLIGHT_REFRESH_MS = 60_000;

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
  energy: { current: number; max: number; delta?: number };
  /** Nur SWU-Kolonien: steuert die Tag/Nacht-Kacheln der Oberflaeche. */
  ecosystem?: SwuColonyEcosystem | null;
  /** Breite von Oberflaeche und Untergrund (Monde sind schmaler als 10). */
  surfaceWidth?: number;
};

function ColonyMapSection({
  title,
  tone,
  fields,
  columns,
  children,
}: {
  title: string;
  tone: string;
  fields: ColonyField[];
  columns: number;
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
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </section>
  );
}

export function ColonyMap({
  orbitFields,
  surfaceFields,
  undergroundFields,
  energy,
  selectedField,
  highlightedFields,
  isBuildMode,
  buildingMap,
  getBuildPreviewTitle,
  onFieldClick,
  onFieldMouseEnter,
  onFieldMouseLeave,
  ecosystem,
  surfaceWidth: surfaceWidthProp,
}: ColonyMapProps) {
  // Orbit besteht aus zwei Reihen (Planeten 10 Spalten, Monde 6).
  const orbitColumns = orbitFields.length >= 2 ? Math.round(orbitFields.length / 2) : DEFAULT_COLUMNS;
  const surfaceWidth = surfaceWidthProp && surfaceWidthProp > 0 ? surfaceWidthProp : DEFAULT_COLUMNS;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ecosystem) return;
    const timer = window.setInterval(() => setNow(Date.now()), DAYLIGHT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [ecosystem]);

  // Orbit und Oberflaeche wechseln spaltenweise zwischen Tag und Nacht; der
  // Untergrund liegt in ewiger Nacht (relevant fuer Codes mit t/n-Variante,
  // z.B. der vulkanische Untergrund von Gasplaneten).
  const columnIndex = new Map<string, number>();
  orbitFields.forEach((f, i) => columnIndex.set(`ORBIT-${f.fieldIndex}`, i));
  surfaceFields.forEach((f, i) => columnIndex.set(`SURFACE-${f.fieldIndex}`, i));
  const timeStateOf = (field: ColonyField) => {
    if (!ecosystem) return undefined;
    if (field.layer === 'UNDERGROUND') return 'night' as const;
    const i = columnIndex.get(`${field.layer}-${field.fieldIndex}`);
    if (i === undefined) return undefined;
    const width = field.layer === 'ORBIT' ? orbitColumns : surfaceWidth;
    return surfaceTimeState(ecosystem, i % width, width, now);
  };

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
      timeState={timeStateOf(field)}
      onMouseEnter={() => onFieldMouseEnter(field)}
      onMouseLeave={onFieldMouseLeave}
      onClick={() => onFieldClick(field)}
    />
  );

  return (
    <div className="rounded border border-swu-border bg-swu-surface p-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="mb-2 border-b border-swu-border/60 pb-2">
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
          <span className="font-bold uppercase tracking-wide text-swu-muted">
            Energie
          </span>
          <span className="font-mono text-swu-warning">
            {energy.current}/{energy.max}
            {energy.delta != null && (
              <span
                className={
                  energy.delta >= 0
                    ? 'ml-1 text-green-400'
                    : 'ml-1 text-red-400'
                }
              >
                {formatSignedAmount(energy.delta)}
              </span>
            )}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded border border-swu-border/60 bg-swu-bg">
          <div
            className="h-full bg-swu-warning transition-[width]"
            style={{
              width: `${energy.max > 0 ? Math.min(100, Math.max(0, (energy.current / energy.max) * 100)) : 0}%`,
            }}
          />
        </div>
      </div>
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
          columns={orbitColumns}
        >
          {orbitFields.map(renderField)}
        </ColonyMapSection>
        <ColonyMapSection
          title="Oberfläche"
          tone="text-swu-success"
          fields={surfaceFields}
          columns={surfaceWidth}
        >
          {surfaceFields.map(renderField)}
        </ColonyMapSection>
        <ColonyMapSection
          title="Untergrund"
          tone="text-swu-underground"
          fields={undergroundFields}
          columns={surfaceWidth}
        >
          {undergroundFields.map(renderField)}
        </ColonyMapSection>
      </div>
    </div>
  );
}
