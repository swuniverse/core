/** Inline BB-Code tags allowed in ship names. */
export const SHIP_NAME_BB_TAGS = ['b', 'i', 'u', 's', 'color'] as const;

/** Maximum length of the visible ship name (without BB-Code). */
export const SHIP_NAME_MAX_VISIBLE_LENGTH = 40;
/** Maximum length of the stored ship name including BB-Code (column limit). */
export const SHIP_NAME_MAX_RAW_LENGTH = 255;

/** Only the allowed tags count as BB-Code; any other `[text]` stays literal. */
const ANY_TAG = new RegExp(
  `\\[(/?)(${SHIP_NAME_BB_TAGS.join('|')})(?:=([^\\]]*))?\\]`,
  'gi',
);

/** The visible name: allowed BB-Code tags removed, everything else kept. */
export function stripShipNameBbCode(name: string): string {
  return name.replace(ANY_TAG, '');
}

/**
 * Validates a ship name with inline BB-Code.
 * Returns a German error message, or `null` when the name is valid.
 */
export function validateShipName(name: unknown): string | null {
  if (typeof name !== 'string' || !name.trim())
    return 'Schiffsname darf nicht leer sein';
  const raw = name.trim();
  if (raw.length > SHIP_NAME_MAX_RAW_LENGTH)
    return `Schiffsname ist zu lang (Maximum: ${SHIP_NAME_MAX_RAW_LENGTH} Zeichen mit BB-Code)`;
  const open: string[] = [];
  for (const match of raw.matchAll(ANY_TAG)) {
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (closing) {
      if (open.pop() !== tag) return 'BB-Codes im Schiffsnamen sind nicht korrekt geschlossen';
    } else {
      if (tag === 'color' && !/^(#[0-9a-f]{3}(?:[0-9a-f]{3})?|[a-z]+)$/i.test(match[3] ?? ''))
        return 'Ungültige Farbe im Schiffsnamen';
      open.push(tag);
    }
  }
  if (open.length) return 'BB-Codes im Schiffsnamen sind nicht korrekt geschlossen';
  const visible = stripShipNameBbCode(raw).trim();
  if (!visible) return 'Schiffsname darf nicht nur aus BB-Codes bestehen';
  if (visible.length > SHIP_NAME_MAX_VISIBLE_LENGTH)
    return `Schiffsname ist zu lang (Maximum: ${SHIP_NAME_MAX_VISIBLE_LENGTH} sichtbare Zeichen)`;
  return null;
}
