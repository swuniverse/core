import type {
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystemStateDto,
} from '@swuniverse/shared';

export type RuntimeSystemState = SpacecraftRuntimeSystemStateDto;

export interface ShipSystemPresentation {
  key: SpacecraftRuntimeSystemKey;
  label: string;
  description: string;
  icon: string;
  activeClassName: string;
  inactiveClassName: string;
}

export const SHIP_SYSTEMS: ShipSystemPresentation[] = [
  system(
    'REACTOR',
    'Reaktor',
    'Reaktorleistung und Energieerzeugung',
    '⚛',
    'border-orange-400/60 bg-orange-500/10 text-orange-100',
  ),
  system(
    'EPS',
    'EPS',
    'Energiespeicher und Verteilung',
    'ϟ',
    'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
  ),
  system(
    'SHIELDS',
    'Schilde',
    'Deflektorschilde des Schiffes',
    '◉',
    'border-cyan-400/60 bg-cyan-500/10 text-cyan-100',
  ),
  system(
    'WEAPONS',
    'Waffen',
    'Energiewaffen und Zielsysteme',
    '⌁',
    'border-red-400/60 bg-red-500/10 text-red-100',
  ),
  system(
    'TORPEDO_BANK',
    'Torpedo',
    'Projektilwaffen und Torpedobank',
    '◆',
    'border-amber-400/60 bg-amber-500/10 text-amber-100',
  ),
  system(
    'WARPDRIVE',
    'Hyperantrieb',
    'Hyperantrieb für interstellare Reisen',
    '⋇',
    'border-blue-400/60 bg-blue-500/10 text-blue-100',
  ),
  system(
    'SUBLIGHT_DRIVE',
    'Impuls',
    'Impulsantrieb für lokale Bewegung',
    '▲',
    'border-indigo-400/60 bg-indigo-500/10 text-indigo-100',
  ),
  system(
    'LONG_RANGE_SENSORS',
    'Langstreckensensoren',
    'Sensorphalanx für Reichweite, Kartographie und Feldscans',
    '◎',
    'border-violet-400/60 bg-violet-500/10 text-violet-100',
  ),
  system(
    'SHORT_RANGE_SENSORS',
    'Nahbereichssensoren',
    'Lokale Sensoren für Sektor- und Nahbereichsscans',
    '◉',
    'border-purple-400/60 bg-purple-500/10 text-purple-100',
  ),
  system(
    'COMPUTER',
    'Computer',
    'Bordcomputer und Zielberechnung',
    '▣',
    'border-slate-300/60 bg-slate-500/10 text-slate-100',
  ),
  system(
    'SPECIAL',
    'Spezial',
    'Spezialsysteme und Hilfsaggregate',
    '✦',
    'border-fuchsia-400/60 bg-fuchsia-500/10 text-fuchsia-100',
  ),
  system(
    'LIFE_SUPPORT',
    'Lebenserhaltung',
    'Atmosphäre und Lebenserhaltung',
    '♥',
    'border-lime-400/60 bg-lime-500/10 text-lime-100',
  ),
];

export const SHIP_SYSTEM_PRESENTATION = new Map(
  SHIP_SYSTEMS.map((entry) => [entry.key, entry]),
);

function system(
  key: SpacecraftRuntimeSystemKey,
  label: string,
  description: string,
  icon: string,
  activeClassName: string,
): ShipSystemPresentation {
  return {
    key,
    label,
    description,
    icon,
    activeClassName,
    inactiveClassName: 'border-swu-border bg-black/30 text-swu-muted',
  };
}
