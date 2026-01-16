import { useState, useEffect } from 'react';

interface SunImageProps {
  systemType: 'SMALL_BLUE' | 'SMALL_YELLOW' | 'MEDIUM_BLUE' | 'BLUE_GIANT' | 'RED_DWARF' | 'NEUTRON_STAR' | 'BLACK_HOLE' | 'BINARY_SYSTEM';
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swuniverse.github.io/assets/';

/**
 * Generate fallback sun image (neutral gray circle SVG)
 */
const getFallbackImage = (systemType: string): string => {
  const colors = {
    'SMALL_BLUE': { inner: '#6B7280', outer: '#4B5563' },
    'SMALL_YELLOW': { inner: '#6B7280', outer: '#4B5563' },
    'MEDIUM_BLUE': { inner: '#6B7280', outer: '#4B5563' },
    'BLUE_GIANT': { inner: '#6B7280', outer: '#4B5563' },
    'RED_DWARF': { inner: '#6B7280', outer: '#4B5563' },
    'NEUTRON_STAR': { inner: '#6B7280', outer: '#4B5563' },
    'BLACK_HOLE': { inner: '#374151', outer: '#1F2937' },
    'BINARY_SYSTEM': { inner: '#6B7280', outer: '#4B5563' },
  };

  const color = colors[systemType as keyof typeof colors] || colors['SMALL_YELLOW'];

  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="sunGradient" cx="35%" cy="35%">
          <stop offset="0%" style="stop-color:${color.inner};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color.outer};stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#sunGradient)"/>
    </svg>
  `);
};

/**
 * Get sun image URL from STU asset repository
 * @param systemType - STU system type
 */
const getSunImageUrl = (systemType: string): string => {
  // Map STU system type to asset ID
  const typeMapping: Record<string, number> = {
    'SMALL_BLUE': 1001,      // (1001) Kleiner Blauer Stern
    'SMALL_YELLOW': 1021,    // (1021) Kleiner Gelber Stern
    'MEDIUM_BLUE': 1041,     // (1041) Mittlerer Blauer Stern
    'BLUE_GIANT': 1053,      // (1053) Blauer Riese
    'RED_DWARF': 1061,       // (1061) Roter Zwerg
    'NEUTRON_STAR': 1070,    // (1070) Neutronenstern
    'BLACK_HOLE': 1072,      // (1072) Schwarzes Loch
    'BINARY_SYSTEM': 1074,   // (1074) Doppelsternsystem
  };

  const assetId = typeMapping[systemType] || 1021; // Default to small yellow

  return `${ASSET_BASE_URL}map/systemtypes/${assetId}.png`;
};

/**
 * SunImage component with automatic fallback handling
 * Loads sun/star images from the asset repository dynamically
 */
export default function SunImage({
  systemType,
  visualSeed = 1,
  alt = 'Stern',
  className = '',
  size = 24
}: SunImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getSunImageUrl(systemType));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getSunImageUrl(systemType));
  }, [systemType, visualSeed]);

  const handleImageError = () => {
    console.warn(`Failed to load sun image: ${imageSrc}, using fallback`);
    setImageError(true);
    setImageSrc(getFallbackImage(systemType));
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded sun image: ${imageSrc}`);
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${imageError ? 'opacity-70' : ''}`}
      style={{ width: size, height: size }}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  );
}

/**
 * Get STU system type display name (German)
 */
export const getSystemTypeLabel = (systemType: string): string => {
  const labels: Record<string, string> = {
    SMALL_BLUE: 'Kleiner Blauer Stern',      // (1001) - hot young stars
    SMALL_YELLOW: 'Kleiner Gelber Stern',    // (1021) - like our Sun
    MEDIUM_BLUE: 'Mittlerer Blauer Stern',   // (1041) - bright main sequence
    BLUE_GIANT: 'Blauer Riese',              // (1053) - massive luminous stars
    RED_DWARF: 'Roter Zwerg',                // (1061) - long-lived small stars
    NEUTRON_STAR: 'Neutronenstern',          // (1070) - ultra-dense stellar remnant
    BLACK_HOLE: 'Schwarzes Loch',            // (1072) - gravitational anomaly
    BINARY_SYSTEM: 'Doppelsternsystem',      // (1074) - twin star system
  };

  return labels[systemType] || systemType;
};
