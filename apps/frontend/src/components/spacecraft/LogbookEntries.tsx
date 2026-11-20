import type { SpacecraftLogbookEntryDto } from '@swuniverse/shared';
import { formatGameDateTime } from '../../lib/format';
import { BbCodeText } from '../BbCodeText';

/** STU `scanlogbook` / profile logbook: read-only entries, newest first. */
export function LogbookEntries({
  entries,
}: {
  entries: SpacecraftLogbookEntryDto[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-swu-muted">
        Keine Logbucheinträge vorhanden
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="border border-swu-border bg-black/20">
          <time className="block border-b border-swu-border/60 px-2 py-1 text-center font-bold text-swu-primary">
            {formatGameDateTime(entry.createdAt)}
          </time>
          {entry.editedAt && (
            <p className="px-2 pt-1 text-[11px] italic text-swu-muted">
              Bearbeitet: {formatGameDateTime(entry.editedAt)}
            </p>
          )}
          <BbCodeText
            text={entry.body}
            className="whitespace-pre-line px-2 py-1 text-swu-primary"
          />
        </li>
      ))}
    </ul>
  );
}
