export const GALAXY_FIELD_STYLES: Record<string, string> = {
  EMPTY_SPACE:
    'bg-[radial-gradient(circle_at_center,_rgba(120,150,255,0.14),_rgba(0,0,0,0.95)_70%)] border-slate-800',
  STAR_SYSTEM:
    'bg-[radial-gradient(circle_at_center,_rgba(255,210,90,0.45),_rgba(25,18,0,0.96)_70%)] border-amber-500/80',
  NEBULA:
    'bg-[radial-gradient(circle_at_35%_35%,_rgba(110,255,180,0.45),_rgba(15,20,35,0.95)_70%)] border-emerald-400/50',
  ASTEROID_FIELD:
    'bg-[radial-gradient(circle_at_center,_rgba(160,160,160,0.28),_rgba(0,0,0,0.95)_70%)] border-stone-500/70',
  BLOCKED: 'bg-red-950/80 border-red-700',
};

export const SYSTEM_FIELD_STYLES: Record<string, string> = {
  EMPTY_SPACE: 'bg-slate-950 border-slate-900 text-slate-500',
  DEEP_SPACE: 'bg-slate-950 border-slate-800 text-slate-400',
  STAR_CORE: 'bg-amber-500/40 border-amber-300 text-amber-100',
  PLANET_ORBIT: 'bg-sky-900/70 border-sky-500 text-sky-100',
  MOON_ORBIT: 'bg-indigo-900/70 border-indigo-400 text-indigo-100',
  ASTEROID_CLUSTER: 'bg-stone-700/70 border-stone-400 text-stone-100',
  NEBULA: 'bg-fuchsia-900/60 border-fuchsia-500 text-fuchsia-100',
};

export function getGalaxyFieldStyle(key: string | undefined): string {
  return (
    GALAXY_FIELD_STYLES[key ?? ''] ||
    'bg-[radial-gradient(circle_at_center,_rgba(80,90,140,0.12),_rgba(0,0,0,0.95)_72%)] border-slate-900'
  );
}

export function getSystemFieldStyle(key: string | undefined): string {
  return (
    SYSTEM_FIELD_STYLES[key ?? ''] ||
    'bg-swu-bg border-swu-border/40 text-swu-muted'
  );
}
