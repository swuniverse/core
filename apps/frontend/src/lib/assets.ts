const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL || '/assets';

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

export function planetImage(classId: number): string {
  return `${ASSET_BASE}/planets/${classId}.${planetAssetExtension(classId)}`;
}

export function planetThumbnail(classId: number): string {
  return `${ASSET_BASE}/planets/${classId}s.${planetAssetExtension(classId, true)}`;
}

export function shipImage(shipClassId: number): string {
  return `${ASSET_BASE}/ships/${shipClassId}.png`;
}

const GENERATED_COMMODITY_FILES: Record<number, string> = {
  2: '2-baumaterial.png',
  4: '4-transparentes-aluminium.png',
  8: '8-dilithium.png',
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
  11010100: '11010100-rebel-hauser.png',
  11010300: '11010300-imperiale-hauser.png',
  21010100: '21010100-rebel-farm.png',
  21010300: '21010300-imperiale-targfarm.png',
  21020100: '21020100-algenfarm.png',
  21020200: '21020100-algenfarm.png',
  21910300: '21910300-anti-grav-trainingszentrum.png',
  22010500: '22010500-bar.png',
  22020200: '22020200-ale-brauerei.png',
  22020300: '22020300-blutwein-kelterei.png',
  24010100: '24010100-campingplatz.png',
  24010200: '24010200-bibliothek.png',
  24010400: '24010400-brunnenplatz.png',
  24020400: '24020400-denkmal.png',
  24030300: '24030300-arena.png',
  24030500: '24030500-borse.png',
  25030500: '25030500-ausbildungsstatte-physiotherapie.png',
  45010200: '45010200-athenaeum.png',
  45010500: '45010500-borsenzentrum.png',
  51010100: '51010100-akademie.png',
  31010100: '31010100-rebel-solarzellen.png',
  31010300: '31010300-imperiale-solarzellen.png',
  61010100: '61010100-rebel-baumaterialfabrik.png',
  61010300: '61010300-imperiale-baumaterialfabrik.png',
  61020100: '61020100-deuteriumsynthesizer.png',
  61020200: '61020100-deuteriumsynthesizer.png',
  61020300: '61020100-deuteriumsynthesizer.png',
  61020400: '61020100-deuteriumsynthesizer.png',
  61020500: '61020100-deuteriumsynthesizer.png',
  61040100: '61040100-deuterium-pumpe.png',
  61040200: '61040100-deuterium-pumpe.png',
  61040300: '61040100-deuterium-pumpe.png',
  61040400: '61040100-deuterium-pumpe.png',
  61040500: '61040100-deuterium-pumpe.png',
  61210100: '61210100-dilithium-mine.png',
  61210200: '61210100-dilithium-mine.png',
  61210300: '61210100-dilithium-mine.png',
  61210400: '61210100-dilithium-mine.png',
  61210500: '61210100-dilithium-mine.png',
  62020100: '62020100-aluminiumwerk.png',
  62020200: '62020100-aluminiumwerk.png',
  62020300: '62020100-aluminiumwerk.png',
  62020400: '62020100-aluminiumwerk.png',
  62020500: '62020100-aluminiumwerk.png',
  81210100: '81210100-rebel-lager.png',
  81210300: '81210300-imperiale-lager.png',
  82010100: '82010100-rebel-koloniezentrale.png',
  82010300: '82010300-imperiale-koloniezentrale.png',
};

export function commodityImage(commodityId: number, commodityName?: string): string {
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

export function colonyFieldTileImage(tileId: number): string {
  return `${ASSET_BASE}/generated/fields/${tileId}.png`;
}

export function researchImage(techId: number): string {
  return `${ASSET_BASE}/research/${techId}.png`;
}

export function spaceBackgroundTile(cx: number, cy: number): string {
  const row = String((Math.abs(cy) % 40) + 1).padStart(2, '0');
  const col = String((Math.abs(cx) % 40) + 1).padStart(2, '0');
  return `${ASSET_BASE}/map/starmap/${row}${col}.png`;
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
