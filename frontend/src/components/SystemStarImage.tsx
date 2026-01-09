import { useState, useEffect } from 'react';

interface SystemStarImageProps {
  systemType: 'SINGLE_STAR' | 'BINARY_STAR' | 'NEUTRON_STAR' | 'BLACK_HOLE';
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swholonet.github.io/assets';

/**
 * Generate fallback star image (colored circle SVG)
 */
const getFallbackImage = (systemType: string): string => {
  const colors = {
    'SINGLE_STAR': { inner: '#FFD700', outer: '#FFA500' },
    'BINARY_STAR': { inner: '#FFA500', outer: '#FF6600' },
    'NEUTRON_STAR': { inner: '#00FFFF', outer: '#0088AA' },
    'BLACK_HOLE': { inner: '#4B0082', outer: '#1A0033' },
  };

  const color = colors[systemType as keyof typeof colors] || colors['SINGLE_STAR'];

  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="starGradient" cx="35%" cy="35%">
          <stop offset="0%" style="stop-color:${color.inner};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color.outer};stop-opacity:1" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#starGradient)"/>
    </svg>
  `);
};

/**
 * Get system star image URL from asset repository
 * Maps system types to the correct asset filenames
 */
const getSystemStarImageUrl = (systemType: string, visualSeed: number = 1): string => {
  // Map system type to asset filename
  const typeMapping: Record<string, string> = {
    'SINGLE_STAR': 'star',
    'BINARY_STAR': 'dual_star',
    'NEUTRON_STAR': 'neutron_star',
    'BLACK_HOLE': 'black_hole',
  };

  const mappedType = typeMapping[systemType] || 'star';

  return `${ASSET_BASE_URL}/systems/${mappedType}_${visualSeed}.png`;
};

/**
 * SystemStarImage component for Galaxy Map
 * Displays different star system images based on system type
 */
export default function SystemStarImage({
  systemType,
  visualSeed = 1,
  alt = 'Sternsystem',
  className = '',
  size = 14
}: SystemStarImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getSystemStarImageUrl(systemType, visualSeed));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getSystemStarImageUrl(systemType, visualSeed));
  }, [systemType, visualSeed]);

  const handleImageError = () => {
    console.warn(`Failed to load system star image: ${imageSrc}, using fallback`);
    setImageError(true);
    setImageSrc(getFallbackImage(systemType));
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded system star image: ${imageSrc}`);
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
