import {
  isNebulaVisual,
  FILMIC_NEBULA_FIELD_IDS,
  type NebulaVisualDto,
} from '@swuniverse/shared';

export interface NebulaBaseline {
  fieldTypeId: number;
  isPassable: boolean;
  energyCost: number;
  damage: number;
  effects: string[] | null;
  effectFlags: string[] | null;
}
export interface NebulaGeneration {
  visual: NebulaVisualDto;
  fieldTypeId: number;
  baseline: NebulaBaseline;
}
export function nebulaVisualForField(field: {
  fieldTypeId: number;
  nebulaGeneration?: NebulaGeneration | null;
}) {
  const generation = field.nebulaGeneration;
  return generation &&
    generation.fieldTypeId === field.fieldTypeId &&
    FILMIC_NEBULA_FIELD_IDS.includes(field.fieldTypeId) &&
    isNebulaVisual(generation.visual)
    ? generation.visual
    : undefined;
}
export function isNebulaBaseline(value: unknown): value is NebulaBaseline {
  if (!value || typeof value !== 'object') return false;
  const b = value as NebulaBaseline;
  const effects = (v: unknown) =>
    v === null || (Array.isArray(v) && v.every((s) => typeof s === 'string'));
  return (
    Number.isSafeInteger(b.fieldTypeId) &&
    b.fieldTypeId > 0 &&
    typeof b.isPassable === 'boolean' &&
    Number.isSafeInteger(b.energyCost) &&
    b.energyCost >= 0 &&
    Number.isSafeInteger(b.damage) &&
    b.damage >= 0 &&
    effects(b.effects) &&
    effects(b.effectFlags)
  );
}
