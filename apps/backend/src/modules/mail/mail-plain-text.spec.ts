import { mailPlainText } from './mail-plain-text';

describe('mail plain text', () => {
  it('preserves the entire text and link destinations without presentation tags', () => {
    expect(mailPlainText('[b]Hallo[/b]\n[url=https://example.test]Details[/url] [color=red]jetzt[/color]')).toBe('Hallo\nDetails (https://example.test) jetzt');
    expect(mailPlainText('Termin [morgen] mit [img]https://example.test/map.png[/img]')).toBe('Termin [morgen] mit https://example.test/map.png');
  });
});
