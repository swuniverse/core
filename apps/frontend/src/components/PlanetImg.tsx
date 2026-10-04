import { useState } from 'react';
import {
  isSwuTestClassId,
  planetImage,
  planetThumbnail,
  SWU_TEST_PLANET_EMOJI,
} from '../lib/assets';

interface PlanetImgProps {
  classId: number;
  name?: string | null;
  /** CelestialObjectType: 1 = Planet, 2 = Mond. */
  objectType?: number | null;
  /** Planetarer Schild errichtet (Kolonie mit shields > 0). */
  shielded?: boolean;
  thumbnail?: boolean;
  className?: string;
  /** Tailwind-Textgroesse des Emoji-Fallbacks, z.B. "text-2xl". */
  emojiClassName?: string;
}

/**
 * Planetenbild. SWU-Klassen laden die passende PNG aus assets/SWU_PLANETS
 * (Rotation/Ring/Mond/Schild je nach Objekt), STU-Klassen wie bisher aus
 * assets/planets. Schlaegt das Laden fehl, erscheint das Typ-Emoji.
 */
export function PlanetImg({
  classId,
  name,
  objectType,
  shielded,
  thumbnail,
  className,
  emojiClassName = 'text-2xl',
}: PlanetImgProps) {
  const [failed, setFailed] = useState(false);
  const swu = { name, objectType, shielded };
  const src = thumbnail
    ? planetThumbnail(classId, swu)
    : planetImage(classId, swu);

  if (failed && isSwuTestClassId(classId)) {
    return (
      <span
        className={`flex items-center justify-center ${emojiClassName} ${className ?? ''}`}
      >
        {SWU_TEST_PLANET_EMOJI[classId] ?? '🪐'}
      </span>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
