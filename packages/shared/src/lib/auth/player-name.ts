export interface PlayerNamePart {
  text: string;
  bold: boolean;
  italic: boolean;
  color?: string;
}
export interface ParsedPlayerName {
  plain: string;
  markup: string | null;
  parts: PlayerNamePart[];
}
export interface PublicPlayerNameDto {
  id: number;
  username: string;
  displayName: string | null;
  displayNameMarkup: string | null;
}
const COLORS = new Set([
  'aqua',
  'black',
  'blue',
  'fuchsia',
  'gray',
  'green',
  'lime',
  'maroon',
  'navy',
  'olive',
  'purple',
  'red',
  'silver',
  'teal',
  'white',
  'yellow',
]);

/** Strict name grammar, shared by validation and rendering; never produces HTML. */
export function parsePlayerName(input: string): ParsedPlayerName {
  if (
    typeof input !== 'string' ||
    input.length > 1000 ||
    Array.from(input).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    throw new Error('Ungültiger Spielername');
  const markup = input.trim();
  const stack: Array<{ tag: string; color?: string }> = [];
  const parts: PlayerNamePart[] = [];
  let plain = '',
    offset = 0,
    formatted = false;
  const append = (text: string) => {
    if (!text) return;
    plain += text;
    parts.push({
      text,
      bold: stack.some((t) => t.tag === 'b'),
      italic: stack.some((t) => t.tag === 'i'),
      color: [...stack].reverse().find((t) => t.tag === 'color')?.color,
    });
  };
  while (offset < markup.length) {
    const next = markup.indexOf('[', offset);
    if (next === -1) {
      append(markup.slice(offset));
      break;
    }
    append(markup.slice(offset, next));
    const end = markup.indexOf(']', next);
    if (end === -1) throw new Error('Ungültiger BBCode im Spielernamen');
    const match = /^\[(\/?)(b|i|color)(?:=([^\]]+))?\]$/i.exec(
      markup.slice(next, end + 1),
    );
    if (!match)
      throw new Error('Nur [color], [b] und [i] sind im Spielernamen erlaubt');
    const [, closing, rawTag, rawColor] = match;
    const tag = rawTag.toLowerCase();
    if (closing) {
      if (rawColor || stack.pop()?.tag !== tag)
        throw new Error('BBCode-Tags müssen korrekt geschlossen werden');
    } else {
      const color = rawColor?.toLowerCase();
      if (
        tag === 'color'
          ? !color ||
            (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/.test(color) &&
              !COLORS.has(color))
          : rawColor !== undefined
      )
        throw new Error('Ungültige Namensformatierung');
      if (stack.length >= 8)
        throw new Error('Namensformatierung zu tief verschachtelt');
      stack.push({ tag, color });
    }
    formatted = true;
    offset = end + 1;
  }
  if (stack.length)
    throw new Error('BBCode-Tags müssen korrekt geschlossen werden');
  const visibleLength = Array.from(plain.trim()).length;
  if (visibleLength < 3 || visibleLength > 60)
    throw new Error('Spielername muss 3–60 sichtbare Zeichen enthalten');
  return { plain: plain.trim(), markup: formatted ? markup : null, parts };
}
