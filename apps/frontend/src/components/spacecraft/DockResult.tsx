import type { SpacecraftDockResultDto } from '@swuniverse/shared';

const STATUS_LABEL = {
  docked: 'angedockt',
  undocked: 'abgedockt',
  skipped: 'übersprungen',
  aborted: 'abgebrochen',
} as const;

/** Dock/undock outcome with STU's per-ship lines for fleet actions. */
export function DockResult({ result }: { result: SpacecraftDockResultDto }) {
  return (
    <div role="status" className="px-3 py-2 text-swu-muted">
      <p>{result.message}</p>
      {result.ships && result.ships.length > 0 && (
        <ul aria-label="Ergebnis je Schiff">
          {result.ships.map((entry) => (
            <li
              key={entry.shipId}
              className={
                entry.status === 'aborted' ? 'text-red-300' : undefined
              }
            >
              {entry.name}: {STATUS_LABEL[entry.status]}
              {entry.reason && ` – ${entry.reason}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
