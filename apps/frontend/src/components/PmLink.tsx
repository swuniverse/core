import { useState } from 'react';

import { useAuthStore } from '../stores/auth.store';
import { QuickPmDialog } from './messaging/QuickPmDialog';

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
  const [open, setOpen] = useState(false);

  if (playerId === ownUserId) return null;

  const label = `Nachricht an ${playerName} schreiben`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
      </button>
      {open && (
        <QuickPmDialog
          recipient={{ id: playerId, name: playerName }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
