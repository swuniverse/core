import { useEffect, useState } from 'react';
import type { Faction } from '@swuniverse/shared';
import { factionAvatarImage } from '../lib/assets';

type AvatarSource = 'personal' | 'faction' | 'initial';

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toLocaleUpperCase() || '?';
}

export function PlayerAvatar({
  name,
  avatar,
  faction,
  alt,
  decorative = false,
  className = 'size-10',
}: {
  name: string;
  avatar: string | null | undefined;
  faction: Faction | null | undefined;
  alt?: string;
  decorative?: boolean;
  className?: string;
}) {
  const fallback = factionAvatarImage(faction);
  const [source, setSource] = useState<AvatarSource>(
    avatar ? 'personal' : fallback ? 'faction' : 'initial',
  );

  useEffect(() => {
    setSource(avatar ? 'personal' : fallback ? 'faction' : 'initial');
  }, [avatar, fallback]);

  const src = source === 'personal' ? avatar : source === 'faction' ? fallback : null;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-swu-border bg-swu-bg ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={decorative ? '' : alt ?? `${name} Avatar`}
          className="size-full object-cover"
          onError={() => {
            if (source === 'personal' && fallback) setSource('faction');
            else setSource('initial');
          }}
        />
      ) : (
        <span
          className="font-bold text-swu-muted"
          aria-label={decorative ? undefined : alt ?? `${name} Avatar`}
          aria-hidden={decorative || undefined}
        >
          {initialOf(name)}
        </span>
      )}
    </span>
  );
}
