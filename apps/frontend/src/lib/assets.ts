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

export function commodityImage(commodityId: number): string {
  return `${ASSET_BASE}/commodities/${commodityId}.png`;
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
