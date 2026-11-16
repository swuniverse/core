import { parsePlayerName } from '@swuniverse/shared';
import { usePlayerNamesStore } from '../stores/player-names.store';
export function PlayerName({
  name,
  playerId,
  markup,
  className,
}: {
  name: string | null | undefined;
  playerId?: number | null;
  markup?: string | null;
  className?: string;
}) {
  const player = usePlayerNamesStore((state) =>
    playerId != null
      ? state.byId.get(playerId)
      : name
        ? state.byName.get(name)
        : undefined,
  );
  const plain = player?.displayName || name || '';
  const formatted = markup ?? player?.displayNameMarkup;
  const plainName = className ? <span className={className}>{plain}</span> : <>{plain}</>;
  if (!formatted) return plainName;
  try {
    const parsed = parsePlayerName(formatted);
    // A stale/invalid representation cannot substitute a different visible name.
    if (parsed.plain !== plain)
      return plainName;
    return (
      <span className={className}>
        {parsed.parts.map((part, index) => (
          <span
            key={index}
            style={{
              color: part.color,
              fontWeight: part.bold ? 700 : undefined,
              fontStyle: part.italic ? 'italic' : undefined,
            }}
          >
            {part.text}
          </span>
        ))}
      </span>
    );
  } catch {
    return plainName;
  }
}
