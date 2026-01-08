/**
 * Global configuration for the Star Wars - HoloNet backend
 */

export const config = {
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_DEV_ORIGINS: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
  ],
  
  // Asset URLs
  ASSET_BASE_URL: 'https://swholonet.github.io/assets',
  
  // Game Settings
  TICK_INTERVAL: parseInt(process.env.TICK_INTERVAL || '300000'), // 5 minutes default
  
  // Galaxy Settings
  GALAXY_SIZE_X: 120,
  GALAXY_SIZE_Y: 120,
  SECTOR_SIZE: 20,
  
  // System Settings
  SYSTEM_MIN_SIZE: 20,
  SYSTEM_MAX_SIZE: 40,
  SYSTEM_DEFAULT_SIZE: 30,
  
  // Ship Settings
  HYPERSPACE_ENERGY_COST_PER_FIELD: 1,
  SYSTEM_ENERGY_COST_PER_FIELD: 0.5,
};

/**
 * Get planet image URL from asset repository
 * @param planetType - Type of the planet (DESERT, ICE, FOREST, CITY, VOLCANO)
 * @param visualSeed - Optional seed for variations (default: 1)
 * @returns Full URL to the planet image
 */
export function getPlanetImageUrl(planetType: string, visualSeed: number = 1): string {
  const normalizedType = planetType.toLowerCase();
  return `${config.ASSET_BASE_URL}/planets/${normalizedType}_${visualSeed}.png`;
}

/**
 * Get fallback planet image (gray circle)
 * @returns Data URL for a fallback image
 */
export function getFallbackPlanetImage(): string {
  // Simple gray circle as SVG data URL
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="#6B7280" opacity="0.7"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#4B5563" stroke-width="2"/>
    </svg>
  `);
}
