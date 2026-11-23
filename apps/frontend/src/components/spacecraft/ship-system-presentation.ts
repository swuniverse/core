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
    'TACHYON_SCANNER',
    'Gravitationswellenscanner',
    'Erfasst getarnte Schiffe durch Gravitationsanomalien',
    '⌁',
    'border-cyan-400/60 bg-cyan-500/10 text-cyan-100',
  ),
  system(
    'SUBSPACE_SCANNER',
    'Hyperraumfeldscanner',
    'Aktive Erfassung und Analyse von Subraumspuren',
    '⌁',
    'border-cyan-400/60 bg-cyan-500/10 text-cyan-100',
  ),
  system(
    'MATRIX_SCANNER',
    'Matrixsensoren',
    'Passive Matrixsensoren für gezielte Subraumanalysen',
    '⌗',
    'border-amber-400/60 bg-amber-500/10 text-amber-100',
  ),
  system(
    'LIFE_SUPPORT',
    'Lebenserhaltung',
    'Atmosphäre und Lebenserhaltung',
    '♥',
    'border-lime-400/60 bg-lime-500/10 text-lime-100',
  ),
  system(
    'DEFLECTOR',
    'Deflektor',
    'Schützt beim Flug durch Nebel und gefährliche Felder',
    '⛉',
    'border-sky-400/60 bg-sky-500/10 text-sky-100',
  ),
  system(
    'BEAM_BLOCKER',
    'Beamblocker',
    'Fest eingebautes Stationssystem ohne EPS-Verbrauch',
    '⛉',
    'border-sky-400/60 bg-sky-500/10 text-sky-100',
  ),
  system('UPLINK', 'Kooperationsuplink', 'Fremde Crew an Sensorphalanx-Stationen · 5 EPS pro Tick', '⌁', 'border-sky-400/60 bg-sky-500/10 text-sky-100'),
  // STU shows every installed system in the header (`getSystems`).
  system('ASTROMETRY_LAB', 'Astrometrie-Labor', 'Kartographie von Systemen und Regionen', '✦', 'border-violet-400/60 bg-violet-500/10 text-violet-100'),
  system('CLOAK', 'Tarnung', 'Tarnfeld-Generator', '◌', 'border-slate-300/60 bg-slate-500/10 text-slate-100'),
  system('TRACTOR_BEAM', 'Traktorstrahl', 'Erfasst und schleppt Schiffe', '⊸', 'border-sky-400/60 bg-sky-500/10 text-sky-100'),
  system('REACTOR_CHARGE_TRANSFER', 'Reaktorladungstransfer', 'Überträgt Reaktorladung an andere Schiffe', '⇄', 'border-orange-400/60 bg-orange-500/10 text-orange-100'),
  system('HYPERDRIVE_BOOSTER', 'Hyperantriebs-Notladegerät', 'Lädt den Hyperantrieb kurzfristig nach', '⋇', 'border-blue-400/60 bg-blue-500/10 text-blue-100'),
  system('HYPERSPACE_COIL', 'Hyperraum-Spule', 'Navicomputer-Sprung', '⋇', 'border-blue-400/60 bg-blue-500/10 text-blue-100'),
  system('TRACKER', 'Peilsender', 'Verfolgt ein markiertes Schiff', '◎', 'border-amber-400/60 bg-amber-500/10 text-amber-100'),
  system('RESOURCE_COLLECTOR', 'Ressourcen-Kollektor', 'Sammelt Ressourcen im Feld', '⛏', 'border-lime-400/60 bg-lime-500/10 text-lime-100'),
  system('RESOURCE_CONVERTER', 'Molekular-Raffinerie', 'Wandelt Ressourcen um', '⚗', 'border-lime-400/60 bg-lime-500/10 text-lime-100'),
  system('SHUTTLE_RAMP', 'Shuttlerampe', 'Start und Landung von Shuttles', '▭', 'border-slate-300/60 bg-slate-500/10 text-slate-100'),
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
