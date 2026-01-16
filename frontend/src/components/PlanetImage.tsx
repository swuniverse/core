import { useState, useEffect } from 'react';

interface PlanetImageProps {
  planetClass: string;
  visualSeed?: number;
  alt?: string;
  className?: string;
  size?: number;
}

const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || 'https://swuniverse.github.io/assets/';

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
 * Map STU planet classes to correct asset IDs
 * Based on STU planet classification system
 */
const planetClassToAssetId = (planetClass: string, visualSeed: number = 1): string => {
  // STU Planet Class mappings with correct asset IDs
  const classMapping: Record<string, number[]> = {
    // ===== STU PLANET CLASSES =====
    // Lebensfreundliche Klassen (kolonisierbar)
    'CLASS_M': [201],          // erdähnlich (nur bevorzugte Variante)
    'CLASS_O': [202],          // ozeanisch
    'CLASS_L': [203],          // bewaldet
    'CLASS_K': [211],          // marsähnlich
    'CLASS_H': [213],          // wüstenbedeckt
    'CLASS_P': [215],          // eisbedeckt
    'CLASS_P_T': [216],        // eisbedeckt weniger Wasser
    'CLASS_G': [219],          // tundrabedeckt
    'CLASS_D': [231],          // mondähnlich

    // Extreme Klassen (schwer kolonisierbar)
    'CLASS_Q': [221],          // dichte Atmosphäre
    'CLASS_X': [217],          // vulkanisch

    // Unbewohnbare Planeten (nicht kolonisierbar)
    'CLASS_S': [207, 309, 407], // gezeitengebunden
    'CLASS_T': [209, 409],     // extreme Rotation
    'CLASS_I_1': [261],        // Gasriese Typ 1
    'CLASS_I_2': [262],        // Gasriese Typ 2
    'CLASS_I_3': [263],        // Gasriese Typ 3
    'CLASS_N': [423],          // spezielle Eigenschaften

    // ===== LEGACY SUPPORT =====
    // Map old planet types to appropriate STU classes
    'DESERT': [213, 313, 413], // -> CLASS_H (wüstenbedeckt)
    'ICE': [215, 415],         // -> CLASS_P (eisbedeckt)
    'FOREST': [203, 403],      // -> CLASS_L (bewaldet)
    'CITY': [201, 401],        // -> CLASS_M (erdähnlich)
    'VOLCANO': [217, 417],     // -> CLASS_X (vulkanisch)
    'JUNGLE': [203, 403],      // -> CLASS_L (bewaldet)
    'VOLCANIC': [217, 417],    // -> CLASS_X (vulkanisch)
    'TERRAN': [201, 401],      // -> CLASS_M (erdähnlich)
  };

  if (!planetClass) {
    console.warn('Planet class is undefined/null, using fallback');
    return '201'; // Default fallback to Class M
  }

  const normalizedClass = planetClass.toUpperCase();
  const assetIds = classMapping[normalizedClass];

  if (!assetIds || assetIds.length === 0) {
    console.warn(`No asset mapping found for planet class: ${planetClass}`);
    return '201'; // Default fallback to Class M
  }

  // Use visualSeed to pick a variation, cycling through available options
  const assetId = assetIds[visualSeed % assetIds.length];
  return assetId.toString();
};

/**
 * Get planet image URL from asset repository
 * @param planetClass - STU planet class (CLASS_M, CLASS_O, etc.) or legacy type
 * @param visualSeed - Visual variation seed (default: 1)
 */
const getPlanetImageUrl = (planetClass: string, visualSeed: number = 1): string => {
  const assetId = planetClassToAssetId(planetClass, visualSeed);
  return `${ASSET_BASE_URL}planets/${assetId}.png`;
};

/**
 * PlanetImage component with automatic fallback handling
 * Loads planet images from the STU asset repository dynamically
 */
export default function PlanetImage({
  planetClass,
  visualSeed = 1,
  alt = 'Planet',
  className = '',
  size = 100
}: PlanetImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(getPlanetImageUrl(planetClass, visualSeed));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Reset error state when props change
    setImageError(false);
    setImageSrc(getPlanetImageUrl(planetClass, visualSeed));
  }, [planetClass, visualSeed]);

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
 * STU planet class color mappings for badges/labels
 */
export const planetClassColors: Record<string, string> = {
  // ===== STU PLANET CLASSES =====
  // Lebensfreundliche Klassen (kolonisierbar)
  CLASS_M: 'bg-blue-500',      // erdähnlich
  CLASS_O: 'bg-blue-600',      // ozeanisch
  CLASS_L: 'bg-green-600',     // bewaldet
  CLASS_K: 'bg-orange-600',    // marsähnlich
  CLASS_H: 'bg-yellow-600',    // wüstenbedeckt
  CLASS_P: 'bg-cyan-400',      // eisbedeckt
  CLASS_P_T: 'bg-cyan-300',    // eisbedeckt weniger Wasser
  CLASS_G: 'bg-slate-500',     // tundrabedeckt
  CLASS_D: 'bg-gray-400',      // mondähnlich

  // Extreme Klassen (schwer kolonisierbar)
  CLASS_Q: 'bg-purple-600',    // dichte Atmosphäre
  CLASS_X: 'bg-red-600',       // vulkanisch

  // Unbewohnbare Planeten (nicht kolonisierbar)
  CLASS_S: 'bg-amber-700',     // gezeitengebunden
  CLASS_T: 'bg-red-700',       // extreme Rotation
  CLASS_I_1: 'bg-indigo-500',  // Gasriese Typ 1
  CLASS_I_2: 'bg-indigo-600',  // Gasriese Typ 2
  CLASS_I_3: 'bg-indigo-700',  // Gasriese Typ 3
  CLASS_N: 'bg-neutral-600',   // spezielle Eigenschaften

  // ===== LEGACY SUPPORT =====
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
 * Get STU planet class display name (German) with Star Wars theming
 */
export const getPlanetClassLabel = (planetClass: string): string => {
  const labels: Record<string, string> = {
    // ===== STU PLANET CLASSES =====
    // Lebensfreundliche Klassen (kolonisierbar)
    CLASS_M: 'Klasse M (Erdähnlich)',           // like Coruscant, Naboo
    CLASS_O: 'Klasse O (Ozeanisch)',            // like Kamino, Mon Cala
    CLASS_L: 'Klasse L (Bewaldet)',             // like Endor, Kashyyyk
    CLASS_K: 'Klasse K (Marsähnlich)',          // like Jakku, Geonosis
    CLASS_H: 'Klasse H (Wüstenwelt)',           // like Tatooine
    CLASS_P: 'Klasse P (Eiswelt)',              // like Hoth
    CLASS_P_T: 'Klasse P-T (Polare Eiswelt)',   // like Orto Plutonia
    CLASS_G: 'Klasse G (Tundrawelt)',           // like Rhen Var
    CLASS_D: 'Klasse D (Mondähnlich)',          // like Yavin 4's moons

    // Extreme Klassen (schwer kolonisierbar)
    CLASS_Q: 'Klasse Q (Dichte Atmosphäre)',    // toxic atmosphere worlds
    CLASS_X: 'Klasse X (Vulkanwelt)',           // like Mustafar

    // Unbewohnbare Planeten (nicht kolonisierbar)
    CLASS_S: 'Klasse S (Gezeitengebunden)',     // tidally locked worlds
    CLASS_T: 'Klasse T (Extreme Rotation)',     // fast rotating worlds
    CLASS_I_1: 'Klasse I-1 (Gasriese Typ 1)',  // like Yavin
    CLASS_I_2: 'Klasse I-2 (Gasriese Typ 2)',  // like Bespin
    CLASS_I_3: 'Klasse I-3 (Gasriese Typ 3)',  // massive gas giants
    CLASS_N: 'Klasse N (Besondere Welt)',       // unique properties

    // ===== LEGACY SUPPORT =====
    DESERT: 'Wüstenwelt',
    ICE: 'Eiswelt',
    FOREST: 'Waldwelt',
    CITY: 'Stadtwelt',
    VOLCANO: 'Vulkanwelt',
    VOLCANIC: 'Vulkanwelt',
    JUNGLE: 'Dschungelwelt',
    TERRAN: 'Erdähnliche Welt',
  };

  if (!planetClass) {
    return 'Unbekannte Klasse';
  }
  return labels[planetClass.toUpperCase()] || planetClass;
};
