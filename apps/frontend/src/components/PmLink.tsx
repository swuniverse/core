import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../stores/auth.store';

interface PmLinkProps {
  playerId: number;
  playerName: string;
  className?: string;
  children?: React.ReactNode;
}

export function PmLink({
  playerId,
  playerName,
  className,
  children,
}: PmLinkProps) {
  const ownUserId = useAuthStore((state) => state.user?.id);
  const [hovered, setHovered] = useState(false);

  if (playerId === ownUserId) return null;

  const label = `Nachricht an ${playerName} schreiben`;
  const params = new URLSearchParams({
    tab: 'compose',
    to: String(playerId),
    name: playerName,
  });

  return (
    <Link
      to={`/messages?${params.toString()}`}
      className={className}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {children ?? (
        <img
          src={`/assets/buttons/msg${hovered ? '2' : '1'}.png`}
          alt=""
          className="size-4"
        />
      )}
    </Link>
  );
}
