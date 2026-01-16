import { useState, useEffect } from 'react';

interface MoonImageProps {
  planetClass: string;
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swuniverse.github.io/assets/';

/**
 * Generate fallback moon image (smaller, muted colors)
 */
const getFallbackMoonImage = (planetClass: string): string => {
  // Moon-specific muted color palette
  const moonColors = {
    'CLASS_M': { inner: '#8B7355', outer: '#5A4A3A' },   // Muted earth-like
    'CLASS_D': { inner: '#6B7280', outer: '#4B5563' },   // Moon-like gray
    'CLASS_P': { inner: '#9CA3AF', outer: '#6B7280' },   // Ice moon
    'CLASS_K': { inner: '#A16207', outer: '#78350F' },   // Rocky moon
    'CLASS_H': { inner: '#92400E', outer: '#78350F' },   // Desert moon
    'CLASS_O': { inner: '#1E40AF', outer: '#1E3A8A' },   // Water ice moon
    'CLASS_L': { inner: '#166534', outer: '#14532D' },   // Forest moon (Endor-style)
    'CLASS_S': { inner: '#525252', outer: '#404040' },   // Tidally locked
    'CLASS_T': { inner: '#7C2D12', outer: '#6B1A0A' },   // Fast rotating
  };

  const color = moonColors[planetClass as keyof typeof moonColors] || moonColors['CLASS_D'];

  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="moonGradient" cx="30%" cy="30%">
          <stop offset="0%" style="stop-color:${color.inner};stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:${color.outer};stop-opacity:1" />
        </radialGradient>
        <!-- Moon craters -->
        <circle id="crater1" cx="25" cy="30" r="3" fill="${color.outer}" opacity="0.6"/>
        <circle id="crater2" cx="65" cy="50" r="2" fill="${color.outer}" opacity="0.5"/>
        <circle id="crater3" cx="40" cy="70" r="1.5" fill="${color.outer}" opacity="0.7"/>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#moonGradient)"/>
      <use href="#crater1"/>
      <use href="#crater2"/>
      <use href="#crater3"/>
    </svg>
  `);
};

/**
 * Get moon image URL from STU asset repository
 * Moons use planet assets but with different selection logic
 */
const getMoonImageUrl = (planetClass: string, visualSeed: number = 1): string => {
  // Use official STU 400-series assets for moons
  const moonAssetMapping: Record<string, number[]> = {
    'CLASS_L': [403],     // Bewaldete Monde (Forest moons - Endor style)
    'CLASS_M': [401],     // Erdähnliche Monde (Earth-like moons)
    'CLASS_O': [402],     // Ozeanische Monde (Ocean/ice moons)
    'CLASS_D': [431],     // Mondähnliche Monde (Moon-like rocky bodies)
    'CLASS_G': [419],     // Tundrabedeckte Monde (Tundra moons)
    'CLASS_H': [413],     // Wüstenmonde (Desert moons)
    'CLASS_K': [411],     // Marsähnliche Monde (Mars-like rocky moons)
    'CLASS_P': [415],     // Eismonde (Ice moons)
    'CLASS_P_T': [416],   // Polare Eismonde (Polar ice moons)
    'CLASS_Q': [421],     // Extreme Atmosphäre Monde (Extreme atmosphere moons)
    'CLASS_X': [417],     // Vulkanische Monde (Volcanic moons)
    'CLASS_S': [407],     // Gezeitengebundene Monde (Tidally locked moons)
    'CLASS_T': [409],     // Schnell rotierende Monde (Fast rotating moons)
    'CLASS_N': [423],     // Gasriesen-Monde (Gas giant moons)
  };

  const availableAssets = moonAssetMapping[planetClass] || moonAssetMapping['CLASS_D'];
  const assetIndex = (visualSeed - 1) % availableAssets.length;
  const selectedAssetId = availableAssets[assetIndex];

  return `${ASSET_BASE_URL}planets/${selectedAssetId.toString().padStart(3, '0')}.png`;
};

/**
 * MoonImage component - smaller celestial bodies orbiting planets
 * Visually distinct from planets with muted colors and crater details
 */
export default function MoonImage({
  planetClass,
  visualSeed = 1,
  alt = 'Mond',
  className = '',
  size = 16  // Smaller default size than planets
}: MoonImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getMoonImageUrl(planetClass, visualSeed));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getMoonImageUrl(planetClass, visualSeed));
  }, [planetClass, visualSeed]);

  const handleImageError = () => {
    console.warn(`Failed to load moon image: ${imageSrc}, using fallback`);
    setImageError(true);
    setImageSrc(getFallbackMoonImage(planetClass));
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded moon image: ${imageSrc}`);
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${imageError ? 'opacity-80' : ''}`}
      style={{
        width: size,
        height: size,
        filter: imageError ? 'none' : 'brightness(0.9) contrast(0.9)' // Slightly dimmer than planets
      }}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  );
}

/**
 * Get planet class display name for moons (German)
 */
export const getMoonClassLabel = (planetClass: string): string => {
  const moonLabels: Record<string, string> = {
    CLASS_D: 'Gesteinsmond',           // Moon-like rocky body
    CLASS_P: 'Eismond',                // Ice moon
    CLASS_K: 'Felsmond',               // Rocky moon
    CLASS_M: 'Bewohnbarer Mond',       // Habitable moon (rare)
    CLASS_H: 'Wüstenmond',             // Desert moon
    CLASS_O: 'Wassermond',             // Ocean/ice moon
    CLASS_L: 'Waldmond',               // Forest moon (like Endor)
    CLASS_S: 'Gebundener Mond',        // Tidally locked moon
    CLASS_T: 'Schneller Mond',         // Fast rotating moon
  };

  return moonLabels[planetClass] || `${planetClass}-Mond`;
};