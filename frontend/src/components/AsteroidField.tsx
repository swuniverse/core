import { useState, useEffect } from 'react';

type AsteroidVariant = 'NORMAL' | 'GREEN' | 'RED' | 'ICE';

interface AsteroidFieldProps {
  asteroidVariant: AsteroidVariant;
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
  resources?: {
    durastahl?: number;
    kristallinesSilizium?: number;
  };
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swuniverse.github.io/assets/';

/**
 * Generate fallback asteroid field image (procedural SVG)
 */
const getFallbackAsteroidFieldImage = (asteroidVariant: AsteroidVariant, visualSeed: number): string => {
  const seed = visualSeed || 1;

  // Color schemes for different asteroid variants
  const getVariantColors = (): string[] => {
    switch (asteroidVariant) {
      case 'GREEN':
        return ['#22C55E', '#16A34A', '#15803D']; // Green variants
      case 'RED':
        return ['#DC2626', '#B91C1C', '#991B1B']; // Red variants
      case 'ICE':
        return ['#67E8F9', '#22D3EE', '#06B6D4']; // Ice blue variants
      case 'NORMAL':
      default:
        return ['#8B7355', '#A78B5A', '#6B5B47']; // Normal brown/gray variants
    }
  };

  const colors = getVariantColors();

  // Procedural asteroid field with multiple rocks
  const asteroids = Array.from({ length: 5 + (seed % 3) }, (_, i) => {
    const x = 10 + (seed * 7 + i * 13) % 80;
    const y = 10 + (seed * 11 + i * 17) % 80;
    const r = 3 + (seed + i * 5) % 8;
    const color = colors[i % colors.length];
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.9"/>`;
  }).join('');

  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="transparent"/>
      ${asteroids}
      <!-- Mining indicators -->
      <circle cx="20" cy="30" r="1" fill="#FFD700" opacity="0.8"/>
      <circle cx="70" cy="60" r="1" fill="#87CEEB" opacity="0.8"/>
    </svg>
  `);
};

/**
 * Get asteroid field image URL from STU asset repository (700-series)
 */
const getAsteroidFieldImageUrl = (asteroidVariant: AsteroidVariant, visualSeed: number = 1): string => {
  // Official STU 700-series assets for asteroid fields
  const asteroidAssets: Record<AsteroidVariant, number[]> = {
    'NORMAL': [701, 702, 703],  // Normal asteroids (thin/medium/dense)
    'GREEN': [704, 705, 706],   // Green asteroids (thin/medium/dense)
    'RED': [707, 708, 709],     // Red asteroids (thin/medium/dense)
    'ICE': [716, 717, 718],     // Ice asteroids (thin/medium/dense)
  };

  const availableAssets = asteroidAssets[asteroidVariant];
  const assetIndex = (visualSeed - 1) % availableAssets.length;
  const selectedAssetId = availableAssets[assetIndex];

  return `${ASSET_BASE_URL}planets/${selectedAssetId.toString().padStart(3, '0')}.png`;
};

/**
 * AsteroidField component for minable asteroid clusters
 * Uses STU 700-series assets with proper asteroid variant support
 */
export default function AsteroidField({
  asteroidVariant,
  visualSeed = 1,
  alt = 'Asteroidenfeld',
  className = '',
  size = 20,
  resources
}: AsteroidFieldProps) {
  const [imageSrc, setImageSrc] = useState<string>(getAsteroidFieldImageUrl(asteroidVariant, visualSeed));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getAsteroidFieldImageUrl(asteroidVariant, visualSeed));
  }, [asteroidVariant, visualSeed]);

  const handleImageError = () => {
    console.warn(`Failed to load asteroid field image: ${imageSrc}, using fallback`);
    setImageError(true);
    setImageSrc(getFallbackAsteroidFieldImage(asteroidVariant, visualSeed));
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded asteroid field image: ${imageSrc}`);
    }
  };

  // Add special styling based on asteroid variant
  const getVariantStyling = (): string => {
    switch (asteroidVariant) {
      case 'NORMAL':
        return 'opacity-90 hover:opacity-100';
      case 'GREEN':
        return 'opacity-90 hover:opacity-100 hue-rotate-90';
      case 'RED':
        return 'opacity-90 hover:opacity-100 hue-rotate-180';
      case 'ICE':
        return 'opacity-90 hover:opacity-100 brightness-110';
      default:
        return 'opacity-90 hover:opacity-100';
    }
  };

  return (
    <div className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${getVariantStyling()}`}
        style={{ width: size, height: size }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />

      {/* Resource indicators for minable asteroid fields */}
      {resources && (resources.durastahl || resources.kristallinesSilizium) && (
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          {resources.durastahl && resources.durastahl > 0 && (
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full opacity-80" title={`${resources.durastahl} Durastahl`}></div>
          )}
          {resources.kristallinesSilizium && resources.kristallinesSilizium > 0 && (
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-80" title={`${resources.kristallinesSilizium} Kristallines Silizium`}></div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Get asteroid field display name (German)
 */
export const getAsteroidFieldLabel = (asteroidVariant: AsteroidVariant): string => {
  const asteroidLabels: Record<AsteroidVariant, string> = {
    NORMAL: 'Asteroidenfeld',
    GREEN: 'Grünes Asteroidenfeld',
    RED: 'Rotes Asteroidenfeld',
    ICE: 'Eis-Asteroidenfeld',
  };

  return asteroidLabels[asteroidVariant];
};