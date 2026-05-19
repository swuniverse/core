import type {
  StarmapFieldTypeDto,
  StarmapGalaxyFieldDto,
} from '@swuniverse/shared';
import { starTileImage } from '../../lib/assets';

const FIELD_TYPE_COLORS: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-900 border-slate-800 text-slate-300',
  STAR_SYSTEM: 'bg-amber-500/30 border-amber-400 text-amber-200',
  STAR_CORE: 'bg-amber-500/50 border-amber-300 text-amber-100',
  PLANET_ORBIT: 'bg-sky-800/50 border-sky-500 text-sky-200',
  MOON_ORBIT: 'bg-indigo-800/50 border-indigo-400 text-indigo-200',
  ASTEROID_CLUSTER: 'bg-stone-600/50 border-stone-400 text-stone-200',
  DEEP_SPACE: 'bg-slate-950 border-slate-800 text-slate-400',
  NEBULA: 'bg-fuchsia-800/40 border-fuchsia-500 text-fuchsia-200',
  ASTEROID_FIELD: 'bg-stone-700/60 border-stone-500 text-stone-200',
  BLOCKED: 'bg-red-950/70 border-red-700 text-red-200',
};

export function fieldTypeAsset(
  fieldType: StarmapFieldTypeDto | null | undefined,
): string | null {
  if (!fieldType) return null;
  return starTileImage(fieldType.id);
}

export function getFieldTypeClasses(
  fieldType: StarmapFieldTypeDto | null | undefined,
): string {
  if (!fieldType) return 'bg-swu-bg border-swu-border/30 text-swu-muted';
  return (
    FIELD_TYPE_COLORS[fieldType.key] ||
    'bg-swu-bg border-swu-border text-swu-primary'
  );
}

export function getGalaxyFieldClasses(
  field: StarmapGalaxyFieldDto,
  isSelected: boolean,
): string {
  const seeded = field.systemTypeId !== null && !field.starSystemId;
  const generated = Boolean(field.starSystemId);

  return [
    'h-8 w-8 rounded border text-[10px] font-medium transition relative overflow-hidden bg-center bg-cover',
    getFieldTypeClasses(field.fieldType),
    seeded ? 'ring-1 ring-cyan-400/80 border-cyan-400' : '',
    generated ? 'ring-1 ring-amber-400/80 border-amber-300' : '',
    isSelected ? 'ring-2 ring-swu-accent' : '',
  ].join(' ');
}
