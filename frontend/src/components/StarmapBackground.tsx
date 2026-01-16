import { useState, useEffect } from 'react';

interface StarmapBackgroundProps {
  sectorX: number;
  sectorY: number;
  fieldX: number;
  fieldY: number;
  className?: string;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swuniverse.github.io/assets/';

/**
 * Generate all available starmap asset IDs
 * Pattern: 101-140, 201-240, 301-340, ..., 4001-4040 (40 assets per century, total 1600)
 */
const generateStarmapAssets = (): number[] => {
  const assets: number[] = [];
  for (let century = 1; century <= 40; century++) {
    const base = century * 100;
    for (let i = 1; i <= 40; i++) {
      assets.push(base + i);
    }
  }
  return assets;
};

const STARMAP_ASSETS = generateStarmapAssets();

/**
 * Generate deterministic random starmap asset ID based on coordinates
 * Uses prime number multipliers to ensure good distribution
 */
const getStarmapId = (sectorX: number, sectorY: number, fieldX: number, fieldY: number): string => {
  const seed = (sectorX * 13) + (sectorY * 17) + (fieldX * 19) + (fieldY * 23);
  const assetIndex = Math.abs(seed) % STARMAP_ASSETS.length;
  const starmapId = STARMAP_ASSETS[assetIndex];
  return starmapId.toString().padStart(4, '0');
};

/**
 * Get starmap image URL from STU asset repository
 */
const getStarmapImageUrl = (sectorX: number, sectorY: number, fieldX: number, fieldY: number): string => {
  const assetId = getStarmapId(sectorX, sectorY, fieldX, fieldY);
  return `${ASSET_BASE_URL}map/starmap/${assetId}.png`;
};

/**
 * StarmapBackground component for Galaxy Map empty fields
 * Displays random starmap backgrounds from STU assets with full opacity
 */
export default function StarmapBackground({
  sectorX,
  sectorY,
  fieldX,
  fieldY,
  className = ''
}: StarmapBackgroundProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state and set image URL
    setImageError(false);
    const imageUrl = getStarmapImageUrl(sectorX, sectorY, fieldX, fieldY);
    setImageSrc(imageUrl);
  }, [sectorX, sectorY, fieldX, fieldY]);

  const handleImageError = () => {
    console.warn(`Failed to load starmap image: ${imageSrc}, falling back to transparent`);
    setImageError(true);
  };

  const handleImageLoad = () => {
    if (!imageError) {
      console.debug(`Successfully loaded starmap image: ${imageSrc}`);
    }
  };

  // Return null if image failed to load (fallback to existing Galaxy.tsx styling)
  if (imageError || !imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt=""
      className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-0 ${className}`}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  );
}