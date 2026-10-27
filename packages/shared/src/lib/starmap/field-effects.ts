export enum FieldEffect {
  WARPDRIVE_LEAK = 'WARPDRIVE_LEAK',
  REACTOR_LEAK = 'REACTOR_LEAK',
  EPS_LEAK = 'EPS_LEAK',
  CLOAK_UNUSEABLE = 'CLOAK_UNUSEABLE',
  NFS_MALFUNCTION_COOLDOWN = 'NFS_MALFUNCTION_COOLDOWN',
  LSS_MALFUNCTION = 'LSS_MALFUNCTION',
  SHIELD_MALFUNCTION = 'SHIELD_MALFUNCTION',
  NO_SPACECRAFT_COUNT = 'NO_SPACECRAFT_COUNT',
  DUBIOUS_SPACECRAFT_COUNT = 'DUBIOUS_SPACECRAFT_COUNT',
  NO_SUBSPACE_LINES = 'NO_SUBSPACE_LINES',
  ENERGY_WEAPON_BUFF = 'ENERGY_WEAPON_BUFF',
  REGENERATION_CHANCE = 'REGENERATION_CHANCE',
  ENERGY_WEAPON_NERF = 'ENERGY_WEAPON_NERF',
  HIT_CHANCE_INTERFERENCE = 'HIT_CHANCE_INTERFERENCE',
  EVADE_CHANCE_INTERFERENCE = 'EVADE_CHANCE_INTERFERENCE',
  NO_PIRATES = 'NO_PIRATES',
  NO_ANOMALIES = 'NO_ANOMALIES',
  NO_MEASUREPOINT = 'NO_MEASUREPOINT',
  NO_STATION_CONSTRUCTION = 'NO_STATION_CONSTRUCTION',
  LSS_BLOCKADE = 'LSS_BLOCKADE',
}

export interface FieldEffectDefinition {
  effect: FieldEffect;
  description: string;
  destinationInfo: string;
  active: boolean;
}

const definition = (
  effect: FieldEffect,
  description: string,
  destinationInfo: string,
  active: boolean,
): FieldEffectDefinition => ({ effect, description, destinationInfo, active });

export const FIELD_EFFECT_CATALOG: Record<FieldEffect, FieldEffectDefinition> = {
  [FieldEffect.WARPDRIVE_LEAK]: definition(FieldEffect.WARPDRIVE_LEAK, 'Leck am Hyperantrieb', 'Fluktuationen können den Hyperantrieb entladen.', true),
  [FieldEffect.REACTOR_LEAK]: definition(FieldEffect.REACTOR_LEAK, 'Leck am Reaktor', 'Partikelanomalien können Reaktorladung abziehen.', true),
  [FieldEffect.EPS_LEAK]: definition(FieldEffect.EPS_LEAK, 'Leck am EPS', 'Energetische Disruption kann EPS-Energie ableiten.', true),
  [FieldEffect.CLOAK_UNUSEABLE]: definition(FieldEffect.CLOAK_UNUSEABLE, 'Ausfall der Tarnung', 'Ionische Dispersion verhindert den Einsatz der Tarnvorrichtung.', true),
  [FieldEffect.NFS_MALFUNCTION_COOLDOWN]: definition(FieldEffect.NFS_MALFUNCTION_COOLDOWN, 'Kurzzeitiger Ausfall der Nahbereichssensoren', 'Subraumverzerrungen können die Nahbereichssensoren ausfallen lassen.', true),
  [FieldEffect.LSS_MALFUNCTION]: definition(FieldEffect.LSS_MALFUNCTION, 'Störung der Langstreckensensoren', 'Langstreckensensoren liefern keine verwertbaren Daten.', false),
  [FieldEffect.SHIELD_MALFUNCTION]: definition(FieldEffect.SHIELD_MALFUNCTION, 'Störung der Schildemitter', 'Partikelinterferenz destabilisiert das Schildgitter.', true),
  [FieldEffect.NO_SPACECRAFT_COUNT]: definition(FieldEffect.NO_SPACECRAFT_COUNT, 'Versteckte Signaturen', 'Signaturanzeige ist nicht verfügbar.', false),
  [FieldEffect.DUBIOUS_SPACECRAFT_COUNT]: definition(FieldEffect.DUBIOUS_SPACECRAFT_COUNT, 'Verschleierung der Signaturen', 'Signaturanzeige wird verzerrt.', false),
  [FieldEffect.NO_SUBSPACE_LINES]: definition(FieldEffect.NO_SUBSPACE_LINES, 'Versteckte Subraumspuren', 'Subraumspuren bleiben verborgen.', false),
  [FieldEffect.ENERGY_WEAPON_BUFF]: definition(FieldEffect.ENERGY_WEAPON_BUFF, 'Steigerung des Energiewaffenschadens', 'Kohärenzverstärkung erhöht den Energiewaffenoutput.', false),
  [FieldEffect.REGENERATION_CHANCE]: definition(FieldEffect.REGENERATION_CHANCE, 'Geringe Chance auf energetischen Bonus', 'Partikelresonanz kann Energie auf Schiffssysteme übertragen.', true),
  [FieldEffect.ENERGY_WEAPON_NERF]: definition(FieldEffect.ENERGY_WEAPON_NERF, 'Minderung des Energiewaffenschadens', 'Dekohärenz verringert den Energiewaffenoutput.', false),
  [FieldEffect.HIT_CHANCE_INTERFERENCE]: definition(FieldEffect.HIT_CHANCE_INTERFERENCE, 'Beeinträchtigung der Zielerfassung', 'Trefferchance verringert sich.', false),
  [FieldEffect.EVADE_CHANCE_INTERFERENCE]: definition(FieldEffect.EVADE_CHANCE_INTERFERENCE, 'Beeinträchtigung der Manövrierbarkeit', 'Manövrierbarkeit verringert sich.', false),
  [FieldEffect.NO_PIRATES]: definition(FieldEffect.NO_PIRATES, 'Keine Piratenaktivität', 'Piratenaktivität ist in diesem Feld ausgeschlossen.', false),
  [FieldEffect.NO_ANOMALIES]: definition(FieldEffect.NO_ANOMALIES, 'Keine Anomalien', 'Anomalien können in diesem Feld nicht entstehen.', false),
  [FieldEffect.NO_MEASUREPOINT]: definition(FieldEffect.NO_MEASUREPOINT, 'Kein Messpunkt', 'Dieses Feld kann kein Kartographie-Messpunkt sein.', false),
  [FieldEffect.NO_STATION_CONSTRUCTION]: definition(FieldEffect.NO_STATION_CONSTRUCTION, 'Kein Stationsbau', 'Auf diesem Feld können keine Stationen errichtet werden.', false),
  [FieldEffect.LSS_BLOCKADE]: definition(FieldEffect.LSS_BLOCKADE, 'Blockade der Langstreckensensoren', 'Langstreckensensoren erfassen keine externen Kontakte.', false),
};

export const FIELD_EFFECT_KEYS = Object.values(FieldEffect);

export function isFieldEffect(value: string): value is FieldEffect {
  return Object.hasOwn(FIELD_EFFECT_CATALOG, value);
}

export function knownFieldEffects(values: readonly string[] | null | undefined): FieldEffect[] {
  return (values ?? []).filter(isFieldEffect);
}

export function fieldEffectDefinition(effect: FieldEffect): FieldEffectDefinition {
  return FIELD_EFFECT_CATALOG[effect];
}
