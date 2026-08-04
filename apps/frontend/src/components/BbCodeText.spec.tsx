import { render, screen } from '@testing-library/react';

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

  it('renders nested allowed tags', () => {
    const { container } = render(<BbCodeText text="[b]fett [i]kursiv[/i][/b]" />);

    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('fett kursiv');
    expect(strong?.querySelector('em')?.textContent).toBe('kursiv');
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

  it('keeps unknown or broken tags visible', () => {
    const { container } = render(<BbCodeText text="[color=red]Rot[/color] [b]offen" />);

    expect(container.textContent).toBe('[color=red]Rot[/color] [b]offen');
  });

  it('does not parse tags inside code blocks', () => {
    const { container } = render(<BbCodeText text="[code][b]nicht fett[/b][/code]" />);

    const code = container.querySelector('code');
    expect(code?.textContent).toBe('[b]nicht fett[/b]');
    expect(code?.querySelector('strong')).toBeNull();
  });
});
