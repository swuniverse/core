import { fireEvent, render, screen } from '@testing-library/react';

import { BbCodeText } from './BbCodeText';


describe('BbCodeText', () => {
  it('renders basic formatting tags without visible tags', () => {
    const { container } = render(<BbCodeText text="[b]Fett[/b] [i]kursiv[/i] [quote]Zitat[/quote]" />);

    expect(container.querySelector('strong')?.textContent).toBe('Fett');
    expect(container.querySelector('em')?.textContent).toBe('kursiv');
    expect(container.querySelector('blockquote')?.textContent).toBe('Zitat');
    expect(container.textContent).not.toContain('[b]');
    expect(container.textContent).not.toContain('[quote]');
  });

  it('renders STU heading and underline tags', () => {
    const { container } = render(<BbCodeText text="[h2]Titel[/h2][h3]Untertitel[/h3][u]Wichtig[/u]" />);

    expect(container.querySelector('h2')?.textContent).toBe('Titel');
    expect(container.querySelector('h3')?.textContent).toBe('Untertitel');
    expect(container.querySelector('.underline')?.textContent).toBe('Wichtig');
  });

  it('toggles translate text on click', () => {
    render(
      <BbCodeText text="[translate]yab'QI[translation]psychischen Schäden[/translate]" />,
    );

    const translation = screen.getByRole('button', { name: "yab'QI" });
    fireEvent.click(translation);
    expect(screen.getByRole('button', { name: 'psychischen Schäden' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'psychischen Schäden' }));
    expect(screen.getByRole('button', { name: "yab'QI" })).toBeTruthy();
  });

  it('renders nested allowed tags', () => {
    const { container } = render(<BbCodeText text="[b]fett [i]kursiv[/i][/b]" />);

    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('fett kursiv');
    expect(strong?.querySelector('em')?.textContent).toBe('kursiv');
  });

  it('renders allowlisted hex and named colors as inline color styles', () => {
    const { container } = render(
      <BbCodeText text="[color=#ff0000]long[/color] [color=#f00]short[/color] [color=red]named[/color]" />,
    );

    const colored = container.querySelectorAll('span[style]');
    expect(Array.from(colored, (span) => span.textContent)).toEqual(['long', 'short', 'named']);
    expect(Array.from(colored, (span) => (span as HTMLSpanElement).style.color)).toEqual([
      'rgb(255, 0, 0)',
      'rgb(255, 0, 0)',
      'red',
    ]);
  });

  it('keeps invalid, empty, and injection-shaped color options literal', () => {
    const input =
      '[color=expression(alert(1))]expression[/color] [color=url(javascript:alert(1))]url[/color] [color=red;background:blue]css[/color] [color=rgb(1, 2, 3)]rgb[/color] [color=#abcd]short-invalid[/color] [color=#fff\n]newline[/color] [color=transparent]transparent[/color] [color=currentColor]currentColor[/color] [color=]empty[/color] [b=]bold[/b]';
    const { container } = render(<BbCodeText text={input} />);

    expect(container.querySelector('span[style]')).toBeNull();
    expect(container.textContent).toBe(input);
  });

  it('preserves color nesting and translated color content', () => {
    const { container } = render(
      <BbCodeText text="[b][color=#f00]Bold red[/color][/b] [translate][color=blue]Primary[/color][translation][color=green]Translated[/color][/translate]" />,
    );

    const bold = container.querySelector('strong');
    expect(bold?.textContent).toBe('Bold red');
    expect(bold?.querySelector('span')?.style.color).toBe('rgb(255, 0, 0)');

    const translation = screen.getByRole('button', { name: 'Primary' });
    expect(translation.querySelector('span')?.style.color).toBe('blue');
    fireEvent.click(translation);
    expect(screen.getByRole('button', { name: 'Translated' }).querySelector('span')?.style.color).toBe(
      'green',
    );
  });

  it('renders safe urls as external links', () => {
    render(<BbCodeText text="[url=https://example.test]Link[/url]" />);

    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.getAttribute('href')).toBe('https://example.test');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('keeps unsafe urls literal and does not create a link', () => {
    const { container } = render(<BbCodeText text="[url=javascript:alert(1)]x[/url]" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toBe('[url=javascript:alert(1)]x[/url]');
  });

  it('keeps invalid or broken tags visible', () => {
    const { container } = render(
      <BbCodeText text="[color=red;background:blue]Rot[/color] [b]offen" />,
    );

    expect(container.textContent).toBe('[color=red;background:blue]Rot[/color] [b]offen');
  });

  it('does not parse tags inside code blocks', () => {
    const { container } = render(
      <BbCodeText text="[code][color=#f00][b]nicht fett[/b][/color][/code]" />,
    );

    const code = container.querySelector('code');
    expect(code?.textContent).toBe('[color=#f00][b]nicht fett[/b][/color]');
    expect(code?.querySelector('strong')).toBeNull();
    expect(code?.querySelector('span')).toBeNull();
  });

  describe('external images', () => {
    it('renders allowed HTTPS image URLs with privacy and size protections when enabled', () => {
      const urls = [
        'https://example.test/image.png',
        'https://example.test/image.jpg',
        'https://example.test/image.jpeg',
        'https://example.test/image.webp?size=large',
      ];
      const { container } = render(
        <BbCodeText
          allowExternalImages
          text={urls.map((url) => `[img]${url}[/img]`).join(' ')}
        />,
      );

      const images = Array.from(container.querySelectorAll('img'));
      expect(images.map((image) => image.src)).toEqual(urls);
      expect(
        images.map((image) => image.getAttribute('referrerpolicy')),
      ).toEqual(urls.map(() => 'no-referrer'));
      expect(images.map((image) => image.getAttribute('loading'))).toEqual(
        urls.map(() => 'lazy'),
      );
      expect(
        images.every((image) => image.className.includes('max-w-full')),
      ).toBe(true);
      expect(
        images.every((image) => image.className.includes('max-h-96')),
      ).toBe(true);
    });

    it('keeps disallowed image URLs literal and never renders them as images', () => {
      const urls = [
        'http://example.test/image.png',
        'ftp://example.test/image.jpg',
        'data:image/png;base64,AAAA',
        'javascript:alert(1)',
        'https://example.test/image.svg',
        'https://example.test/image',
      ];
      const text = urls.map((url) => `[img]${url}[/img]`).join(' ');
      const { container } = render(
        <BbCodeText allowExternalImages text={text} />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toBe(text);
    });
  });

  describe('banner images', () => {
    const text = '[img]/api/alliances/1/banner?v=1700000000000[/img]';

    it('keeps [img] literal unless banner images are enabled (forum, messages)', () => {
      const { container } = render(<BbCodeText text={text} />);

      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toBe(text);
    });

    it('renders only banner URLs as images when enabled', () => {
      const { container } = render(
        <BbCodeText
          allowBannerImages
          text={`${text} [img]https://evil.example/x.png[/img]`}
        />,
      );

      expect(container.querySelectorAll('img')).toHaveLength(1);
      expect(container.textContent).toContain('[img]https://evil.example/x.png[/img]');
    });
  });
});
