const ADMIN_REGION_NAMES: Record<string, string> = {
  CORE: 'Kernregion',
  CENTRAL: 'Zentralregion',
  PERIPHERAL: 'Peripherieregion',
};

export function adminRegionName(key: string): string {
  return ADMIN_REGION_NAMES[key] ?? key.replaceAll('_', ' ');
}
