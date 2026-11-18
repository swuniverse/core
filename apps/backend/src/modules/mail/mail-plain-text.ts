/** Preserve text and link destinations while removing supported presentation tags. */
export function mailPlainText(value: string): string {
  return value
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_match, url: string, label: string) => `${label} (${url})`)
    .replace(/\[\/?(?:b|i|u|s|h2|h3|quote|code|url|img|color|translate|translation)(?:=[^\]]*)?\]/gi, '')
    .trim();
}
