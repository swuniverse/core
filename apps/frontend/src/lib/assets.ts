import {
  getSwuPlanetAssetFileName,
  type SwuPlanetAssetInput,
} from '@swuniverse/shared';

const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || '/assets';

export function navigationIcon(name: string, hover = false): string {
  return `${ASSET_BASE}/navigation/menu_${name}${hover ? 1 : 0}.png`;
}

export function alertStateImage(
  state: 'GREEN' | 'YELLOW' | 'RED',
  active = false,
): string {
  const color = state === 'GREEN' ? 'g' : state === 'YELLOW' ? 'y' : 'r';
  return `${ASSET_BASE}/buttons/alert${color}.png`;
}

/** Bild für Spielleitungs-Nachrichten (Order-66-Overlay), je Fraktion. */
export function orderBroadcastImage(
  faction: 'REBEL_ALLIANCE' | 'GALACTIC_EMPIRE' | null | undefined,
): string | null {
  switch (faction) {
    case 'REBEL_ALLIANCE':
      return `${ASSET_BASE}/avatars/Avatar_Rebellen.png`;
    case 'GALACTIC_EMPIRE':
      return `${ASSET_BASE}/avatars/Avatar_Imperium.png`;
    default:
      return null;
  }
}

export function factionAvatarImage(
  faction: 'REBEL_ALLIANCE' | 'GALACTIC_EMPIRE' | null | undefined,
): string | null {
  switch (faction) {
    case 'REBEL_ALLIANCE':
      return `${ASSET_BASE}/avatars/alliance-rebel-default.png`;
    case 'GALACTIC_EMPIRE':
      return `${ASSET_BASE}/avatars/alliance-imperial-default.png`;
    default:
      return null;
  }
}

/** Faction icon of the fixed NPC trade networks (STU race icon); Hutt network has none yet. */
export function npcTradeNetworkImage(networkId: number): string | null {
  return networkId === 1
    ? `${ASSET_BASE}/avatars/Avatar_Imperium.png`
    : networkId === 2
      ? `${ASSET_BASE}/avatars/Avatar_Rebellen.png`
      : null;
}

const PNG_PLANET_IMAGES = new Set([
  701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718,
]);

const PNG_PLANET_THUMBNAILS = new Set([
  701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718,
]);

function planetAssetExtension(
  classId: number,
  thumbnail = false,
): 'gif' | 'png' {
  const pngSet = thumbnail ? PNG_PLANET_THUMBNAILS : PNG_PLANET_IMAGES;
  return pngSet.has(classId) ? 'png' : 'gif';
}

/**
 * SWU-Planeten: EINE PNG (assets/SWU_PLANETS, 150x150) fuer alle Groessen -
 * Detail- wie Karten-Ansicht skalieren sie per CSS bzw. Sprite-Groesse.
 * Rotation/Ring/Mond kommen aus Objektname + objectType, der Schild-Status
 * (nur mit errichtetem planetarem Schild) aus `shielded`.
 */
export function swuPlanetImage(input: SwuPlanetAssetInput): string | null {
  const file = getSwuPlanetAssetFileName(input);
  return file ? `${ASSET_BASE}/SWU_PLANETS/${file}` : null;
}

export function planetImage(
  classId: number,
  swu?: Omit<SwuPlanetAssetInput, 'classId'>,
): string {
  return (
    swuPlanetImage({ classId, ...swu }) ??
    `${ASSET_BASE}/planets/${classId}.${planetAssetExtension(classId)}`
  );
}

export function planetThumbnail(
  classId: number,
  swu?: Omit<SwuPlanetAssetInput, 'classId'>,
): string {
  return (
    swuPlanetImage({ classId, ...swu }) ??
    `${ASSET_BASE}/planets/${classId}s.${planetAssetExtension(classId, true)}`
  );
}

/**
 * Emoji-Fallback fuer die SYNTHETISCHEN classIds des SWU-Testsystems
 * (90000 + typeId*10 + variantIndex, siehe buildSwuTestClassId() in
 * apps/backend/.../swu-system-generator.ts). Die echten Grafiken liegen in
 * assets/SWU_PLANETS (siehe swuPlanetImage); das Emoji greift nur noch, wenn
 * das Bild nicht geladen werden kann.
 */
export const SWU_TEST_PLANET_EMOJI: Record<number, string> = {
  90010: '🌍', // Erdähnlich
  90020: '🌊', // Ozeanwelt
  90030: '🌲', // Waldplanet
  90040: '🐸', // Sumpf
  90050: '🦁', // Savanne
  90060: '🏜️', // Wüste
  90070: '⛰️', // Gebirgswelt
  90080: '❄️', // Tundraartig
  90090: '●', // Marsartig
  90100: '🧊', // Arktisch
  90110: '🏝️', // Archipel
  90120: '🌑', // Mondartig
  90130: '🌋', // Lavaplanet
  90140: '☠️', // Giftwelt
  90150: '🟠', // Gasplanet A
  90151: '●', // Gasplanet B
  90152: '●', // Gasplanet C
  90153: '🟣', // Gasplanet D
};

export function isSwuTestClassId(classId: number): boolean {
  return classId >= 90000 && classId < 91000;
}

const SHIP_CLASS_KEY_FILES: Record<string, string> = {
  REBEL_FREIGHTER_YT: 'yt-class-freighter.png',
  REBEL_FREIGHTER_GR75: 'gr75-medium-transport.png',
  EMPIRE_COLONIZER_SENTINEL: 'sentinel-class-landing-craft.png',
  EMPIRE_FREIGHTER_GOZANTI: 'gozanti-class-cruiser.png',
  REBEL_FIGHTER_X_WING: 'x-wing.png',
  REBEL_FIGHTER_A_WING: 'a-wing.png',
  REBEL_SHUTTLE_U_WING: 'u-wing.png',
  EMPIRE_FIGHTER_TIE_LN: 'tie-ln.png',
  EMPIRE_FIGHTER_TIE_INTERCEPTOR: 'tie-interceptor.png',
  SALVAGE_FIGHTER_N1: 'n1.png',
  SALVAGE_FIGHTER_ARC_170: 'arc-170.png',
  SALVAGE_FIGHTER_ETA_2: 'eta-2.png',
  SALVAGE_FIGHTER_DELTA_7: 'delta-7.png',
  SALVAGE_FIGHTER_VULTURE_DROID: 'vulture-droid.png',
};

/** Top-down graphic drawn on the overview map in place of the position marker. */
const SHIP_CLASS_KEY_CURSOR_FILES: Record<string, string> = {
  REBEL_FIGHTER_X_WING: 'x-wing-cursor.png',
  REBEL_FIGHTER_A_WING: 'a-wing-cursor.png',
  REBEL_SHUTTLE_U_WING: 'u-wing-cursor.png',
  EMPIRE_FIGHTER_TIE_LN: 'tie-ln-cursor.png',
  EMPIRE_FIGHTER_TIE_INTERCEPTOR: 'tie-interceptor-cursor.png',
  SALVAGE_FIGHTER_N1: 'n1-cursor.png',
  SALVAGE_FIGHTER_ARC_170: 'arc-170-cursor.png',
  SALVAGE_FIGHTER_ETA_2: 'eta-2-cursor.png',
  SALVAGE_FIGHTER_DELTA_7: 'delta-7-cursor.png',
  SALVAGE_FIGHTER_VULTURE_DROID: 'vulture-droid-cursor.png',
};

export function shipCursorImage(shipClassKey?: string | null): string | null {
  const file = shipClassKey
    ? SHIP_CLASS_KEY_CURSOR_FILES[shipClassKey]
    : undefined;
  return file ? `${ASSET_BASE}/ships/${file}` : null;
}

export function shipImage(
  shipClassId: number,
  shipClassKey?: string | null,
): string {
  const keyFile = shipClassKey ? SHIP_CLASS_KEY_FILES[shipClassKey] : undefined;
  if (keyFile) return `${ASSET_BASE}/ships/${keyFile}`;
  return `${ASSET_BASE}/ships/${shipClassId}.png`;
}

const GENERATED_COMMODITY_FILES: Record<number, string> = {
  2: '2-baumaterial.png',
  3: '3-tibanna-gas.png',
  4: '4-transparentes-aluminium.png',
  8: '8-dilithium.png',
  11: '11-phrik-erz.png',
  12: '12-galazit-erz.png',
  13: '13-nitrium-erz.png',
  14: '14-magnesit-erz.png',
  15: '15-kelbonit-erz.png',
  16: '16-talgonit-erz.png',
  19: '19-tritanium-erz.png',
  20: '20-iridium.png',
  21: '21-duranium.png',
  22: '22-galazit.png',
  23: '23-nitrium.png',
  24: '24-magnesit.png',
  25: '25-kelbonit.png',
  26: '26-talgonit.png',
  29: '29-tritanium.png',
  31: '31-isolineare-speicherchips.png',
  32: '32-hochenergie-plasma.png',
  33: '33-nitrium-schaltkreise.png',
  34: '34-subraum-feldspulen.png',
  35: '35-metaphasen-konverter.png',
  36: '36-mikrodyne-modulator.png',
  40: '40-chateau-picard.png',
  41: '41-bat-leth.png',
  42: '42-container.png',
  43: '43-selbstdichtende-schaftbolzen.png',
  44: '44-kontaminiertes-warpplasma.png',
  45: '45-werkzeugkoffer.png',
  46: '46-blutwein.png',
  47: '47-targ.png',
  1101: '1101-wohnhauser.png',
  1300: '1300-lebensstandard.png',
};

const GENERATED_COMMODITY_NAME_FILES: Record<string, string> = {
  Doonium: 'doonium.png',
  Hypermaterie: 'hypermaterie.png',
};

const GENERATED_BUILDING_FILES: Record<number, string> = {
  1: '1-admingebaude.png',
  11010100: '11010100-rebel-wohnkomplex-map-v1.png',
  11010103: '11010100-rebel-wohnkomplex-map-v1.png',
  11010199: '11010100-rebel-wohnkomplex-map-v1.png',
  11010300: '11010300-imperial-wohnkomplex-map-v1.png',
  11010303: '11010300-imperial-wohnkomplex-map-v1.png',
  11010399: '11010300-imperial-wohnkomplex-map-v1.png',
  11910100: '11910100-rebel-orbital-habitat-map-v2.png',
  11910199: '11910100-rebel-orbital-habitat-map-v2.png',
  11910300: '11910300-imperial-orbital-habitat-map-v2.png',
  11910399: '11910300-imperial-orbital-habitat-map-v2.png',
  12010100: '12010100-rebel-habitatkuppel-map-v1.png',
  12010104: '12010100-rebel-habitatkuppel-map-v1.png',
  12010199: '12010100-rebel-habitatkuppel-map-v1.png',
  12010300: '12010300-imperial-habitatkuppel-map-v1.png',
  12010304: '12010300-imperial-habitatkuppel-map-v1.png',
  12010399: '12010300-imperial-habitatkuppel-map-v1.png',
  12020100: '12020100-rebel-versorgungskuppel-map-v1.png',
  12020199: '12020100-rebel-versorgungskuppel-map-v1.png',
  12020300: '12020300-imperial-versorgungskuppel-map-v1.png',
  12020399: '12020300-imperial-versorgungskuppel-map-v1.png',
  13010100: '13010100-rebel-siedlung-map-v2.png',
  13010103: '13010100-rebel-siedlung-map-v2.png',
  13010199: '13010100-rebel-siedlung-map-v2.png',
  13010300: '13010300-imperial-siedlung-map-v2.png',
  13010303: '13010300-imperial-siedlung-map-v2.png',
  13010399: '13010300-imperial-siedlung-map-v2.png',
  14010100: '14010100-hauptkuppel.png',
  14010300: '14010100-hauptkuppel.png',
  15010100: '15010100-stadtkomplex.png',
  15010300: '15010100-stadtkomplex.png',
  16010100: '16010100-rebel-galazit-mine-map-v2.png',
  16010103: '16010103-imperial-galazit-mine-map-v2.png',
  16020100: '16020100-rebel-nitrium-mine-map-v2.png',
  16020103: '16020103-imperial-nitrium-mine-map-v2.png',
  16030100: '16030100-rebel-magnesit-mine-map-v2.png',
  16030103: '16030103-imperial-magnesit-mine-map-v2.png',
  16040100: '16040100-rebel-neuranium-mine-map-v2.png',
  16040103: '16040103-imperial-neuranium-mine-map-v2.png',
  16050100: '16050100-rebel-talgonit-mine-map-v2.png',
  16050103: '16050103-imperial-talgonit-mine-map-v2.png',
  21010100: '21010100-rebel-hydrokultur-map-v1.png',
  21010101: '21010100-rebel-hydrokultur-map-v1.png',
  21010199: '21010100-rebel-hydrokultur-map-v1.png',
  21010300: '21010300-imperial-bantha-farm-map-v1.png',
  21010301: '21010300-imperial-bantha-farm-map-v1.png',
  21010399: '21010300-imperial-bantha-farm-map-v1.png',
  21020100: '21020100-rebel-aqua-zuchtanlage-map-v1.png',
  21020102: '21020100-rebel-aqua-zuchtanlage-map-v1.png',
  21020199: '21020100-rebel-aqua-zuchtanlage-map-v1.png',
  21020300: '21020300-imperial-nerf-zucht-map-v1.png',
  21020302: '21020300-imperial-nerf-zucht-map-v1.png',
  21020399: '21020300-imperial-nerf-zucht-map-v1.png',
  21120100: '21120100-rebel-kryo-zuchtanlage-map-v1.png',
  21120102: '21120100-rebel-kryo-zuchtanlage-map-v1.png',
  21120199: '21120100-rebel-kryo-zuchtanlage-map-v1.png',
  21120300: '21120300-imperial-kryo-nerf-zucht-map-v1.png',
  21120302: '21120300-imperial-kryo-nerf-zucht-map-v1.png',
  21120399: '21120300-imperial-kryo-nerf-zucht-map-v1.png',
  21910100: '21910100-rebel-orbital-fallstation-map-v2.png',
  21910199: '21910100-rebel-orbital-fallstation-map-v2.png',
  21910300: '21910300-imperial-anti-grav-trainingszentrum-map-v2.png',
  21910399: '21910300-imperial-anti-grav-trainingszentrum-map-v2.png',
  22010100: '22010100-rebel-cantina-map-v1.png',
  22010199: '22010100-rebel-cantina-map-v1.png',
  22010300: '22010300-imperial-cantina-map-v1.png',
  22010399: '22010300-imperial-cantina-map-v1.png',
  22010500: '22010500-bar.png',
  22020100: '22020100-rebel-blaue-milch-brauerei-map-v1.png',
  22020199: '22020100-rebel-blaue-milch-brauerei-map-v1.png',
  22020200: '22020200-ale-brauerei.png',
  22020300: '22020300-imperial-mandalorianischer-grog-destille-map-v1.png',
  22020399: '22020300-imperial-mandalorianischer-grog-destille-map-v1.png',
  23010100: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23010101: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23010199: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23010300: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23010301: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23010399: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23020100: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23020102: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23020199: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23020300: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  23020302: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  23020399: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  23030100: '23030100-rebel-klimakontrollzentrum-map-v2.png',
  23030199: '23030100-rebel-klimakontrollzentrum-map-v2.png',
  23030300: '23030300-imperial-klimakontrollzentrum-map-v2.png',
  23030399: '23030300-imperial-klimakontrollzentrum-map-v2.png',
  23110100: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23110101: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23110199: '23010100-rebel-klimakontroll-farm-map-v2.png',
  23110300: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23110301: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23110399: '23010300-imperial-klimakontroll-bantha-farm-map-v2.png',
  23120100: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23120102: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23120199: '23020100-rebel-klimakontroll-zuchtanlage-map-v2.png',
  23120300: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  23120302: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  23120399: '23020300-imperial-klimakontroll-nerf-zucht-map-v2.png',
  24010100: '24010100-campingplatz.png',
  24010200: '24010200-bibliothek.png',
  24010300: '24010300-kampfsport-arena.png',
  24010400: '24010400-brunnenplatz.png',
  24020100: '24020100-exotarium.png',
  24020300: '24020300-vibro-klingen-halle.png',
  24020400: '24020400-denkmal.png',
  24030100: '24030100-freizeitpark.png',
  24030300: '24030300-arena.png',
  24030500: '24030500-borse.png',
  25010100: '25010100-grav-ball-arena.png',
  25010101: '25010100-grav-ball-arena.png',
  25010300: '25010300-jagdgrunde.png',
  25010301: '25010300-jagdgrunde.png',
  25020100: '25020100-sport-arena.png',
  25020102: '25020100-sport-arena.png',
  25020300: '25020300-fischgrunde.png',
  25020302: '25020300-fischgrunde.png',
  25030100: '25030100-trainingshalle.png',
  25030300: '25030300-blaster-schiessstand.png',
  25030500: '25030500-ausbildungsstatte-physiotherapie.png',
  25110100: '25010100-grav-ball-arena.png',
  25110101: '25010100-grav-ball-arena.png',
  25110300: '25010300-jagdgrunde.png',
  25110301: '25010300-jagdgrunde.png',
  25120100: '25020100-sport-arena.png',
  25120102: '25020100-sport-arena.png',
  25120300: '25020300-fischgrunde.png',
  25120302: '25020300-fischgrunde.png',
  26010100: '26010100-rebel-galazit-raffinerie-map-v2.png',
  26010103: '26010103-imperial-galazit-raffinerie-map-v2.png',
  26020100: '26020100-rebel-nitrium-raffinerie-map-v2.png',
  26020103: '26020103-imperial-nitrium-raffinerie-map-v2.png',
  26030100: '26030100-rebel-magnesit-raffinerie-map-v2.png',
  26030103: '26030103-imperial-magnesit-raffinerie-map-v2.png',
  26040100: '26040100-rebel-neuranium-raffinerie-map-v2.png',
  26040103: '26040103-imperial-neuranium-raffinerie-map-v2.png',
  26050100: '26050100-rebel-talgonit-raffinerie-map-v2.png',
  26050103: '26050103-imperial-talgonit-raffinerie-map-v2.png',
  31010100: '31010100-rebel-ionensegel-map-v1.png',
  31010131: '31010100-rebel-ionensegel-map-v1.png',
  31010199: '31010100-rebel-ionensegel-map-v1.png',
  31010300: '31010300-imperial-ionensegel-kollektor-map-v1.png',
  31010331: '31010300-imperial-ionensegel-kollektor-map-v1.png',
  31010399: '31010300-imperial-ionensegel-kollektor-map-v1.png',
  31020100: '31020100-rebel-gezeitenkraftwerk-map-v1.png',
  31020132: '31020100-rebel-gezeitenkraftwerk-map-v1.png',
  31020199: '31020100-rebel-gezeitenkraftwerk-map-v1.png',
  31020300: '31020300-imperial-gezeitenkraftwerk-map-v1.png',
  31020332: '31020300-imperial-gezeitenkraftwerk-map-v1.png',
  31020399: '31020300-imperial-gezeitenkraftwerk-map-v1.png',
  31910100: '31910100-rebel-orbital-solarkollektor-map-v1.png',
  31910199: '31910100-rebel-orbital-solarkollektor-map-v1.png',
  31910300: '31910300-imperial-orbital-solarkollektor-map-v1.png',
  31910399: '31910300-imperial-orbital-solarkollektor-map-v1.png',
  32010100: '32010100-rebel-fusionsreaktor-map-v2.png',
  32010199: '32010100-rebel-fusionsreaktor-map-v2.png',
  32010300: '32010300-imperial-fusionsreaktor-map-v2.png',
  32010399: '32010300-imperial-fusionsreaktor-map-v2.png',
  33010100: '33010100-rebel-solarspiegel-map-v1.png',
  33010131: '33010100-rebel-solarspiegel-map-v1.png',
  33010199: '33010100-rebel-solarspiegel-map-v1.png',
  33010300: '33010300-imperial-solarspiegel-map-v1.png',
  33010331: '33010300-imperial-solarspiegel-map-v1.png',
  33010399: '33010300-imperial-solarspiegel-map-v1.png',
  33020100: '33020100-rebel-solarfokus-map-v1.png',
  33020199: '33020100-rebel-solarfokus-map-v1.png',
  33020300: '33020300-imperial-solarfokus-map-v1.png',
  33020399: '33020300-imperial-solarfokus-map-v1.png',
  33030100: '33030100-rebel-stroemungsanker-map-v1.png',
  33030199: '33030100-rebel-stroemungsanker-map-v1.png',
  33030300: '33030300-imperial-stroemungsanker-map-v1.png',
  33030399: '33030300-imperial-stroemungsanker-map-v1.png',
  33040100: '33040100-rebel-stroemungsturbinen-map-v1.png',
  33040132: '33040100-rebel-stroemungsturbinen-map-v1.png',
  33040199: '33040100-rebel-stroemungsturbinen-map-v1.png',
  33040300: '33040300-imperial-stroemungsturbinen-map-v1.png',
  33040332: '33040300-imperial-stroemungsturbinen-map-v1.png',
  33040399: '33040300-imperial-stroemungsturbinen-map-v1.png',
  34010100: '34010100-plasmareaktor.png',
  34010300: '34010100-plasmareaktor.png',
  35010100: '35010100-hypermaterie-reaktor.png',
  35010300: '35010100-hypermaterie-reaktor.png',
  36010100: '36010100-rebel-thermal-extraktor-map-v2.png',
  36010300: '36010300-imperial-thermal-extraktor-map-v2.png',
  36020100: '36020100-rebel-thermalkraftwerk-map-v2.png',
  36020300: '36020300-imperial-thermalkraftwerk-map-v2.png',
  37010100: '37010100-rebel-hyperraum-spulen-fabrik-map-v2.png',
  37010103: '37010103-imperial-hyperraum-spulen-fabrik-map-v2.png',
  37020100: '37020100-rebel-laminanium-schaltkreis-fabrik-map-v2.png',
  37020103: '37020103-imperial-laminanium-schaltkreis-fabrik-map-v2.png',
  37030100: '37030100-rebel-phasenkonverter-fabrik-map-v2.png',
  37030103: '37030103-imperial-phasenkonverter-fabrik-map-v2.png',
  37040100: '37040100-rebel-speicherchip-fabrik-map-v2.png',
  37040103: '37040103-imperial-speicherchip-fabrik-map-v2.png',
  37050100: '37050100-rebel-mikrodyne-fabrik-map-v2.png',
  37050103: '37050103-imperial-mikrodyne-fabrik-map-v2.png',
  41010100: '41010100-rebel-allianz-schule-map-v2.png',
  41010199: '41010100-rebel-allianz-schule-map-v2.png',
  41010300: '41010300-imperial-kampftrainingslager-map-v2.png',
  41010399: '41010300-imperial-kampftrainingslager-map-v2.png',
  42010100: '42010100-rebel-holo-simulator-map-v2.png',
  42010199: '42010100-rebel-holo-simulator-map-v2.png',
  42010300: '42010300-imperial-holo-simulator-map-v2.png',
  42010399: '42010300-imperial-holo-simulator-map-v2.png',
  42020100: '42020100-rebel-holo-generator-map-v2.png',
  42020199: '42020100-rebel-holo-generator-map-v2.png',
  42020300: '42020300-imperial-holo-generator-map-v2.png',
  42020399: '42020300-imperial-holo-generator-map-v2.png',
  43010100: '43010100-holo-kern.png',
  43010300: '43010100-holo-kern.png',
  44010100: '44010100-holo-komplex.png',
  44010300: '44010100-holo-komplex.png',
  45010100: '45010100-freie-universitat.png',
  45010200: '45010200-athenaeum.png',
  45010300: '45010300-halle-der-krieger.png',
  45010500: '45010500-borsenzentrum.png',
  51010100: '51010100-rebel-allianz-akademie-map-v1.png',
  51010199: '51010100-rebel-allianz-akademie-map-v1.png',
  51010300: '51010300-imperial-imperiale-militaerakademie-map-v1.png',
  51010399: '51010300-imperial-imperiale-militaerakademie-map-v1.png',
  61010100: '61010100-rebel-doonium-schmelze-map-v1.png',
  61010199: '61010100-rebel-doonium-schmelze-map-v1.png',
  61010300: '61010300-imperial-doonium-schmelze-map-v1.png',
  61010399: '61010300-imperial-doonium-schmelze-map-v1.png',
  61020100: '61020100-rebel-hypermaterie-synthesizer-map-v1.png',
  61020111: '61020100-rebel-hypermaterie-synthesizer-map-v1.png',
  61020199: '61020100-rebel-hypermaterie-synthesizer-map-v1.png',
  61020200: '61020100-deuteriumsynthesizer.png',
  61020300: '61020300-imperial-hypermaterie-synthesizer-map-v1.png',
  61020311: '61020300-imperial-hypermaterie-synthesizer-map-v1.png',
  61020399: '61020300-imperial-hypermaterie-synthesizer-map-v1.png',
  61020400: '61020100-deuteriumsynthesizer.png',
  61020500: '61020100-deuteriumsynthesizer.png',
  61030100: '61030100-rebel-tibanna-extraktor-map-v1.png',
  61030199: '61030100-rebel-tibanna-extraktor-map-v1.png',
  61030300: '61030300-imperial-tibanna-extraktor-map-v1.png',
  61030399: '61030300-imperial-tibanna-extraktor-map-v1.png',
  61040100: '61040100-rebel-hypermaterie-pumpe-map-v1.png',
  61040199: '61040100-rebel-hypermaterie-pumpe-map-v1.png',
  61040200: '61040100-deuterium-pumpe.png',
  61040300: '61040300-imperial-hypermaterie-pumpe-map-v1.png',
  61040399: '61040300-imperial-hypermaterie-pumpe-map-v1.png',
  61040400: '61040100-deuterium-pumpe.png',
  61040500: '61040100-deuterium-pumpe.png',
  61110100: '61110100-rebel-phrik-mine-map-v1.png',
  61110112: '61110100-rebel-phrik-mine-map-v1.png',
  61110199: '61110100-rebel-phrik-mine-map-v1.png',
  61110300: '61110300-imperial-phrik-mine-map-v1.png',
  61110312: '61110300-imperial-phrik-mine-map-v1.png',
  61110399: '61110300-imperial-phrik-mine-map-v1.png',
  61170100: '61170100-rebel-aurodium-mine-map-v1.png',
  61170300: '61170300-imperial-aurodium-mine-map-v1.png',
  61210100: '61210100-rebel-kyber-kristallmine-map-v1.png',
  61210121: '61210100-rebel-kyber-kristallmine-map-v1.png',
  61210199: '61210100-rebel-kyber-kristallmine-map-v1.png',
  61210200: '61210100-dilithium-mine.png',
  61210300: '61210300-imperial-kyber-kristallmine-map-v1.png',
  61210321: '61210300-imperial-kyber-kristallmine-map-v1.png',
  61210399: '61210300-imperial-kyber-kristallmine-map-v1.png',
  61210400: '61210100-dilithium-mine.png',
  61210500: '61210100-dilithium-mine.png',
  62010100: '62010100-rebel-partikel-beschleuniger-map-v1.png',
  62010199: '62010100-rebel-partikel-beschleuniger-map-v1.png',
  62010300: '62010300-imperial-partikel-beschleuniger-map-v1.png',
  62010399: '62010300-imperial-partikel-beschleuniger-map-v1.png',
  62020100: '62020100-rebel-transparistahl-manufaktur-map-v1.png',
  62020199: '62020100-rebel-transparistahl-manufaktur-map-v1.png',
  62020200: '62020100-aluminiumwerk.png',
  62020300: '62020300-imperial-transparistahl-manufaktur-map-v1.png',
  62020399: '62020300-imperial-transparistahl-manufaktur-map-v1.png',
  62020400: '62020100-aluminiumwerk.png',
  62020500: '62020100-aluminiumwerk.png',
  63010100: '63010100-rebel-plasmakonverter-map-v2.png',
  63010199: '63010100-rebel-plasmakonverter-map-v2.png',
  63010300: '63010300-imperial-plasmakonverter-map-v2.png',
  63010399: '63010300-imperial-plasmakonverter-map-v2.png',
  63100100: '63100100-rebel-phrik-raffinerie-map-v1.png',
  63100199: '63100100-rebel-phrik-raffinerie-map-v1.png',
  63100300: '63100300-imperial-phrik-raffinerie-map-v1.png',
  63100399: '63100300-imperial-phrik-raffinerie-map-v1.png',
  63110100: '63110100-rebel-durastahl-schmiede-map-v1.png',
  63110199: '63110100-rebel-durastahl-schmiede-map-v1.png',
  63110300: '63110300-imperial-durastahl-schmiede-map-v1.png',
  63110399: '63110300-imperial-durastahl-schmiede-map-v1.png',
  63170100: '63170100-rebel-aurodium-presse-map-v1.png',
  63170300: '63170300-imperial-aurodium-presse-map-v1.png',
  71010100: '71010100-forschungslabor.png',
  71010300: '71010300-forschungslabor.png',
  71910100: '71910100-rebel-orbitales-forschungslabor-map-v2.png',
  71910199: '71910100-rebel-orbitales-forschungslabor-map-v2.png',
  71910300: '71910300-imperial-orbitales-forschungslabor-map-v2.png',
  71910399: '71910300-imperial-orbitales-forschungslabor-map-v2.png',
  72010100: '72010100-rebel-forschungszentrum-i-map-v1.png',
  72010199: '72010100-rebel-forschungszentrum-i-map-v1.png',
  72010300: '72010300-imperial-forschungszentrum-i-map-v1.png',
  72010399: '72010300-imperial-forschungszentrum-i-map-v1.png',
  73010100: '73010100-rebel-forschungszentrum-ii-map-v1.png',
  73010199: '73010100-rebel-forschungszentrum-ii-map-v1.png',
  73010300: '73010300-imperial-forschungszentrum-ii-map-v1.png',
  73010399: '73010300-imperial-forschungszentrum-ii-map-v1.png',
  74010100: '74010100-rebel-forschungszentrum-stufe-iii-map-v2.png',
  74010199: '74010100-rebel-forschungszentrum-stufe-iii-map-v2.png',
  74010300: '74010300-imperial-forschungszentrum-stufe-iii-map-v2.png',
  74010399: '74010300-imperial-forschungszentrum-stufe-iii-map-v2.png',
  74020100: '74020100-forschungszentrum-iii-mit-hypermaterie-labor.png',
  74020300: '74020100-forschungszentrum-iii-mit-hypermaterie-labor.png',
  75210100: '75210100-modul-forschungszentrum.png',
  75210300: '75210100-modul-forschungszentrum.png',
  75220100: '75220100-modul-fz-mit-hypermaterie-labor.png',
  75220300: '75220100-modul-fz-mit-hypermaterie-labor.png',
  75230100: '75230100-modul-fz-mit-legierungslabor.png',
  75230300: '75230100-modul-fz-mit-legierungslabor.png',
  75310100: '75310100-gebaude-forschungszentrum.png',
  75310300: '75310100-gebaude-forschungszentrum.png',
  75320100: '75320100-gebaude-fz-mit-hypermaterie-labor.png',
  75320300: '75320100-gebaude-fz-mit-hypermaterie-labor.png',
  75330100: '75330100-gebaude-fz-mit-legierungslabor.png',
  75330300: '75330100-gebaude-fz-mit-legierungslabor.png',
  75410100: '75410100-untergrund-forschungszentrum.png',
  75410300: '75410100-untergrund-forschungszentrum.png',
  75420100: '75420100-untergrund-fz-mit-hypermaterie-labor.png',
  75420300: '75420100-untergrund-fz-mit-hypermaterie-labor.png',
  75430100: '75430100-untergrund-fz-mit-legierungslabor.png',
  75430300: '75430100-untergrund-fz-mit-legierungslabor.png',
  75440100: '75440100-raumkonstrukt-forschungszentrum.png',
  75440300: '75440100-raumkonstrukt-forschungszentrum.png',
  75450100: '75450100-raumkonstrukt-fz-mit-hypermaterie-labor.png',
  75450300: '75450100-raumkonstrukt-fz-mit-hypermaterie-labor.png',
  75460100: '75460100-raumkonstrukt-fz-mit-legierungslabor.png',
  75460300: '75460100-raumkonstrukt-fz-mit-legierungslabor.png',
  81010100: '81010100-rebel-aussenposten-map-v1.png',
  81010199: '81010100-rebel-aussenposten-map-v1.png',
  81010300: '81010300-imperial-aussenposten-map-v1.png',
  81010399: '81010300-imperial-aussenposten-map-v1.png',
  81110100: '81110100-rebel-landeplattform-map-v1.png',
  81110199: '81110100-rebel-landeplattform-map-v1.png',
  81110300: '81110300-imperial-landeplattform-map-v1.png',
  81110399: '81110300-imperial-landeplattform-map-v1.png',
  81120100: '81120100-rebel-raumbahnhof-map-v1.png',
  81120199: '81120100-rebel-raumbahnhof-map-v1.png',
  81120300: '81120300-imperial-raumbahnhof-map-v1.png',
  81120399: '81120300-imperial-raumbahnhof-map-v1.png',
  81130100: '81130100-rebel-raumhafen-map-v2.png',
  81130199: '81130100-rebel-raumhafen-map-v2.png',
  81130300: '81130300-imperial-raumhafen-map-v2.png',
  81130399: '81130300-imperial-raumhafen-map-v2.png',
  81210100: '81210100-rebel-versorgungslager-map-v1.png',
  81210199: '81210100-rebel-versorgungslager-map-v1.png',
  81210300: '81210300-imperial-versorgungslager-map-v1.png',
  81210399: '81210300-imperial-versorgungslager-map-v1.png',
  81810100: '81810100-rebel-waffenmodulfertigung-map-v1.png',
  81810199: '81810100-rebel-waffenmodulfertigung-map-v1.png',
  81810300: '81810300-imperial-waffenmodulfertigung-map-v1.png',
  81810399: '81810300-imperial-waffenmodulfertigung-map-v1.png',
  81820100: '81820100-rebel-schildmodulfertigung-map-v1.png',
  81820199: '81820100-rebel-schildmodulfertigung-map-v1.png',
  81820300: '81820300-imperial-schildmodulfertigung-map-v1.png',
  81820399: '81820300-imperial-schildmodulfertigung-map-v1.png',
  81830100: '81830100-rebel-antriebsmodulfertigung-map-v1.png',
  81830199: '81830100-rebel-antriebsmodulfertigung-map-v1.png',
  81830300: '81830300-imperial-antriebsmodulfertigung-map-v1.png',
  81830399: '81830300-imperial-antriebsmodulfertigung-map-v1.png',
  81990100: '81990100-rebel-protonentorpedo-fabrik-map-v1.png',
  81990199: '81990100-rebel-protonentorpedo-fabrik-map-v1.png',
  81990300: '81990300-imperial-protonentorpedo-fabrik-map-v1.png',
  81990399: '81990300-imperial-protonentorpedo-fabrik-map-v1.png',
  82010100: '82010100-rebel-kommandozentrale-map-v1.png',
  82010199: '82010100-rebel-kommandozentrale-map-v1.png',
  82010300: '82010300-imperial-kommandozentrale-map-v1.png',
  82010399: '82010300-imperial-kommandozentrale-map-v1.png',
  82810100: '82810100-rebel-waffenmodulfabrik-map-v2.png',
  82810199: '82810100-rebel-waffenmodulfabrik-map-v2.png',
  82810300: '82810300-imperial-waffenmodulfabrik-map-v2.png',
  82810399: '82810300-imperial-waffenmodulfabrik-map-v2.png',
  82820100: '82820100-rebel-schildmodulfabrik-map-v2.png',
  82820199: '82820100-rebel-schildmodulfabrik-map-v2.png',
  82820300: '82820300-imperial-schildmodulfabrik-map-v2.png',
  82820399: '82820300-imperial-schildmodulfabrik-map-v2.png',
  82830100: '82830100-rebel-antriebsmodulfabrik-map-v2.png',
  82830199: '82830100-rebel-antriebsmodulfabrik-map-v2.png',
  82830300: '82830300-imperial-antriebsmodulfabrik-map-v2.png',
  82830399: '82830300-imperial-antriebsmodulfabrik-map-v2.png',
  83810100: '83810100-waffenmodulkomplex.png',
  83810300: '83810100-waffenmodulkomplex.png',
  83820100: '83820100-schildmodulkomplex.png',
  83820300: '83820100-schildmodulkomplex.png',
  83830100: '83830100-antriebsmodulkomplex.png',
  83830300: '83830100-antriebsmodulkomplex.png',
  84800100: '84800100-rebel-produktionshalle-map-v2.png',
  84800199: '84800100-rebel-produktionshalle-map-v2.png',
  84800300: '84800300-imperial-produktionshalle-map-v2.png',
  84800399: '84800300-imperial-produktionshalle-map-v2.png',
  85010100: '85010100-rebel-werftkomplex-map-v1.png',
  85010199: '85010100-rebel-werftkomplex-map-v1.png',
  85010300: '85010300-imperial-werftkomplex-map-v1.png',
  85010399: '85010300-imperial-werftkomplex-map-v1.png',
  85110100: '85110100-rebel-jaegerwerft-map-v1.png',
  85110199: '85110100-rebel-jaegerwerft-map-v1.png',
  85110300: '85110300-imperial-jaegerwerft-map-v1.png',
  85110399: '85110300-imperial-jaegerwerft-map-v1.png',
  85120100: '85120100-rebel-fregattenwerft-map-v1.png',
  85120199: '85120100-rebel-fregattenwerft-map-v1.png',
  85120300: '85120300-imperial-fregattenwerft-map-v1.png',
  85120399: '85120300-imperial-fregattenwerft-map-v1.png',
  85130100: '85130100-rebel-korvetten-werft-map-v2.png',
  85130199: '85130100-rebel-korvetten-werft-map-v2.png',
  85130300: '85130300-imperial-korvetten-werft-map-v2.png',
  85130399: '85130300-imperial-korvetten-werft-map-v2.png',
  85140100: '85140100-mc-kreuzer-werft.png',
  85140300: '85140100-mc-kreuzer-werft.png',
  85150100: '85150100-kreuzer-werft.png',
  85150300: '85150100-kreuzer-werft.png',
  85190100: '85190100-reparaturstation.png',
  85190300: '85190100-reparaturstation.png',
  85800100: '85800100-technologie-komplex.png',
  85800300: '85800100-technologie-komplex.png',
  85900100: '85900100-rebel-frachtkontainer-depot-map-v2.png',
  85900300: '85900300-imperial-frachtkontainer-depot-map-v2.png',
  86000100: '86000100-rebel-plasma-extraktor-map-v2.png',
  86000101: '86000100-rebel-plasma-extraktor-map-v2.png',
  86000102: '86000100-rebel-plasma-extraktor-map-v2.png',
  86000103: '86000100-rebel-plasma-extraktor-map-v2.png',
  86000300: '86000300-imperial-plasma-extraktor-map-v2.png',
  86000301: '86000300-imperial-plasma-extraktor-map-v2.png',
  86000302: '86000300-imperial-plasma-extraktor-map-v2.png',
  86000303: '86000300-imperial-plasma-extraktor-map-v2.png',
  90100100: '90100100-untergrundlift-oben.png',
  90100300: '90100100-untergrundlift-oben.png',
  90200100: '90200100-untergrundlift-unten.png',
  90200300: '90200100-untergrundlift-unten.png',
  90650100: '90650100-geothermalkraftwerk.png',
  90650300: '90650100-geothermalkraftwerk.png',
  100010100: '100010100-deflektorschild-generator.png',
  100010300: '100010100-deflektorschild-generator.png',
  100020100: '100020100-schildbatterie.png',
  100020300: '100020100-schildbatterie.png',
  100030100: '100030100-orbitale-ionenkanonen-batterie.png',
  100030300: '100030300-orbitale-turbolaser-batterie.png',
  100040100: '100040100-orbitales-torpedogeschutz.png',
  100040300: '100040100-orbitales-torpedogeschutz.png',
  100050100: '100050100-punkt-abwehrsystem.png',
  100050300: '100050100-punkt-abwehrsystem.png',
  100060100: '100060100-hyperraum-teleskop.png',
  100060300: '100060100-hyperraum-teleskop.png',
};

export function commodityImage(
  commodityId: number,
  commodityName?: string,
): string {
  const generatedFile =
    GENERATED_COMMODITY_FILES[commodityId] ||
    (commodityName ? GENERATED_COMMODITY_NAME_FILES[commodityName] : undefined);
  return generatedFile
    ? `${ASSET_BASE}/commodities/generated/${generatedFile}`
    : `${ASSET_BASE}/commodities/${commodityId}.png`;
}

export function buildingImage(buildingId: number): string {
  const generatedFile = GENERATED_BUILDING_FILES[buildingId];
  return generatedFile
    ? `${ASSET_BASE}/buildings/generated/${generatedFile}`
    : `${ASSET_BASE}/buildings/${buildingId}.png`;
}

export function colonyFieldTileImage(
  tileId: number | string,
  timeState: 'day' | 'night' = 'day',
): string {
  // Alte STU-Felder haben rein numerische IDs (generated/fields). SWU-Codes
  // (z.B. "A540", "OU1A", "U101") liegen in generated/SWUfields, dort mit
  // Praefix t (Tag) / n (Nacht); Untergrund-Codes (U...) ohne Praefix.
  const id = String(tileId);
  if (/^\d+$/.test(id)) {
    // STU-Asteroidenklassen (701-718) erzeugen 6-stellige Kachel-IDs
    // (Klasse*1000 + n*10, z.B. 718080); die Dateien heissen ohne die
    // letzte Null (71808.png).
    const file = id.length === 6 && id.endsWith('0') ? id.slice(0, -1) : id;
    return `${ASSET_BASE}/generated/fields/${file}.png`;
  }
  const prefix = id.startsWith('U') ? '' : timeState === 'night' ? 'n' : 't';
  return `${ASSET_BASE}/generated/SWUfields/${prefix}${id}.png`;
}

/** Kuppel-Overlay (150x150, transparent) fuer geraeumte Krater-Kacheln. */
export function colonyDomeImage(tileId: string): string {
  return `${ASSET_BASE}/generated/SWUdomes/${tileId}.png`;
}

export function researchImage(techId: number): string {
  return `${ASSET_BASE}/research/${techId}.png`;
}

/**
 * Map icon of an anomaly type, e.g. `map/anomalies/subspace_ellipse.png`.
 * Images are taken from STU `anomalies/<id>.png`; callers fall back when one is missing.
 */
export function anomalyImage(type: string): string {
  return `${ASSET_BASE}/map/anomalies/${type.toLowerCase()}.png`;
}

export function spaceBackgroundTile(cx: number, cy: number): string {
  const row = String((Math.abs(cy) % 40) + 1).padStart(2, '0');
  const col = String((Math.abs(cx) % 40) + 1).padStart(2, '0');
  return `${ASSET_BASE}/map/starmap/${row}${col}.png`;
}

export function galaxyMapBackground(): string {
  return `${ASSET_BASE}/map/galactic-star-map-background-stronger-spirals.png`;
}

const STAR_WARS_MARKER_CLASS_BY_KEY: Record<string, number> = {
  // Icon class IDs use STU celestial classes: M=201, L=203, O=205,
  // H desert=213, P ice=215, X volcanic=217, G swamp/tundra=219,
  // D rock/moon=231, gas giant I/J=261/361, asteroid=701.
  aargau: 201,
  'abregado-rae': 201,
  aeneid: 701,
  'ahch-to': 205,
  alderaan: 201,
  alsakan: 201,
  anaxes: 201,
  anoat: 211,
  atollon: 213,
  balmorra: 211,
  bastion: 211,
  batuu: 211,
  bespin: 261,
  bogano: 203,
  bonadan: 201,
  boonta: 213,
  bothawui: 201,
  bracca: 701,
  brentaal: 201,
  byss: 223,
  cantonica: 201,
  carida: 211,
  'cato-neimoidia': 201,
  cerea: 203,
  chandrila: 201,
  christophsis: 211,
  circumtore: 213,
  commenor: 201,
  'concord-dawn': 211,
  corellia: 201,
  coruscant: 201,
  crait: 215,
  csilla: 215,
  'd-qar': 205,
  dagobah: 219,
  daiyu: 201,
  dantooine: 203,
  dathomir: 219,
  denon: 201,
  'dromund-kaas': 217,
  duro: 201,
  dxun: 403,
  'empress-teta': 201,
  endor: 203,
  eriadu: 211,
  exegol: 223,
  felucia: 203,
  ferrix: 211,
  florrum: 213,
  fondor: 201,
  formos: 701,
  garel: 201,
  geonosis: 213,
  hoth: 215,
  'hosnian-prime': 201,
  ilum: 215,
  iridonia: 211,
  ithor: 203,
  jakku: 213,
  jedha: 213,
  kamino: 205,
  kashyyyk: 203,
  kessel: 701,
  'kef-bir': 205,
  kijimi: 215,
  korriban: 213,
  krownest: 215,
  kuat: 201,
  'lah-mu': 203,
  lannik: 211,
  lothal: 201,
  malachor: 217,
  malastare: 211,
  mandalore: 211,
  manaan: 205,
  mimban: 219,
  'mon-cala': 205,
  moraband: 213,
  muunilinst: 201,
  mustafar: 217,
  mygeeto: 215,
  naboo: 201,
  'nal-hutta': 219,
  'nar-shaddaa': 201,
  neimoidia: 201,
  nevarro: 213,
  niamos: 205,
  'obroa-skai': 201,
  onderon: 203,
  'ord-mantell': 211,
  'ord-radama': 217,
  pasaana: 213,
  peridea: 223,
  'polis-massa': 231,
  ralltiir: 201,
  raxus: 211,
  'raxus-prime': 701,
  rendili: 201,
  rishi: 205,
  rodia: 203,
  ruusan: 211,
  ryloth: 213,
  saleucami: 213,
  savareen: 213,
  scarif: 205,
  seatos: 205,
  serenno: 201,
  sleheyron: 213,
  'sluis-van': 201,
  sullust: 217,
  takodana: 203,
  taris: 201,
  tatooine: 213,
  teth: 203,
  teyr: 201,
  toydaria: 219,
  tython: 201,
  utapau: 231,
  varl: 213,
  'yag-dhul': 201,
  yavin: 203,
  zeffo: 211,
};

export function systemTypeImage(systemTypeId: number): string {
  return `${ASSET_BASE}/map/systemtypes/${systemTypeId}.png`;
}

export function starWarsMarkerImage(
  landmarkKey: string | null | undefined,
  fallbackSystemTypeId: number,
): string {
  const normalizedKey = landmarkKey?.replace(/^atlas:/, '') ?? '';
  const classId = STAR_WARS_MARKER_CLASS_BY_KEY[normalizedKey];
  return classId
    ? planetThumbnail(classId)
    : systemTypeImage(fallbackSystemTypeId);
}

export function starTileImage(fieldTypeId: number): string {
  return `${ASSET_BASE}/map/${fieldTypeId}.png`;
}
