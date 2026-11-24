const PREVIEW_CHARS = 200;

/** STU conversation preview: message text without BBCode, cut to 200 characters. */
export function messagePreview(body: string): string {
  const text = body
    .replace(/\[\/?[a-z0-9]+(?:=[^\]]*)?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS)}…` : text;
}
