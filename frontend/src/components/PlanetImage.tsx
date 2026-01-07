import { useState, useEffect } from 'react';

interface PlanetImageProps {
  planetType: string;
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swholonet.github.io/assets';

/**
 * Generate fallback planet image (gray circle SVG)
 */
const getFallbackImage = (): string => {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="planetGradient" cx="35%" cy="35%">
          <stop offset="0%" style="stop-color:#8B8B8B;stop-opacity:1" />
          <stop offset="70%" style="stop-color:#5A5A5A;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3A3A3A;stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#planetGradient)"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#4B5563" stroke-width="2"/>
      <text x="50" y="55" font-family="monospace" font-size="12" fill="#9CA3AF" text-anchor="middle">?</text>
    </svg>
  `);
};

/**
 * Get planet image URL from asset repository
 * @param planetType - Type of the planet (DESERT, ICE, FOREST, CITY, VOLCANO, etc.)
 * @param visualSeed - Visual variation seed (default: 1)
 */
const getPlanetImageUrl = (planetType: string, visualSeed: number = 1): string => {
  // Normalize planet type to lowercase
  const normalizedType = planetType.toLowerCase();
  
  // Map alternative names to standard names
  const typeMapping: Record<string, string> = {
    'volcanic': 'volcano',
    'terran': 'forest', // Fallback for terran
    'jungle': 'forest',
  };
  
  const mappedType = typeMapping[normalizedType] || normalizedType;
  
  return `${ASSET_BASE_URL}/planets/${mappedType}_${visualSeed}.png`;
};

/**
 * PlanetImage component with automatic fallback handling
 * Loads planet images from the asset repository dynamically
 */
export default function PlanetImage({ 
  planetType, 
  visualSeed = 1, 
  alt = 'Planet', 
  className = '',
  size = 100
}: PlanetImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getPlanetImageUrl(planetType, visualSeed));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getPlanetImageUrl(planetType, visualSeed));
  }, [planetType, visualSeed]);

  const handleImageError = () => {
    console.warn(`Failed to load planet image: ${imageSrc}, using fallback`);
    setImageError(true);
    setImageSrc(getFallbackImage());
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded planet image: ${imageSrc}`);
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
 * Planet type color mappings for badges/labels
 */
export const planetTypeColors: Record<string, string> = {
  DESERT: 'bg-yellow-600',
  ICE: 'bg-cyan-400',
  FOREST: 'bg-green-600',
  CITY: 'bg-gray-500',
  VOLCANO: 'bg-red-600',
  VOLCANIC: 'bg-red-600',
  JUNGLE: 'bg-green-700',
  TERRAN: 'bg-blue-500',
};

/**
 * Get planet type display name (German)
 */
export const getPlanetTypeLabel = (planetType: string): string => {
  const labels: Record<string, string> = {
    DESERT: 'Wüste',
    ICE: 'Eis',
    FOREST: 'Wald',
    CITY: 'Stadt',
    VOLCANO: 'Vulkan',
    VOLCANIC: 'Vulkan',
    JUNGLE: 'Dschungel',
    TERRAN: 'Terranisch',
  };
  
  return labels[planetType] || planetType;
};
