import { render, screen } from '@testing-library/react';
import { PlayerName } from './PlayerName';
import { resetPlayerNames, setPlayerNames } from '../stores/player-names.store';
import { parsePlayerName } from '@swuniverse/shared';
describe('Shared player-name renderer', () => {
  afterEach(resetPlayerNames);
  it('renders stored color, bold and italic by login name or player id', () => {
    setPlayerNames([
      {
        id: 1,
        username: 'login',
        displayName: 'Leia',
        displayNameMarkup: '[color=#f00][b][i]Leia[/i][/b][/color]',
      },
    ]);
    const view = render(<PlayerName name="login" />);
    const name = screen.getByText('Leia');
    expect(name.style.color).toBe('rgb(255, 0, 0)');
    expect(name.style.fontWeight).toBe('700');
    expect(name.style.fontStyle).toBe('italic');
    expect(view.container.textContent).not.toContain('[b]');
    view.rerender(<PlayerName name="old name" playerId={1} />);
    expect(screen.getByText('Leia')).toBeTruthy();
  });
  it('escapes literal HTML and rejects unsupported markup without executing it', () => {
    const view = render(<PlayerName name="<img src=x>" markup="<img src=x>" />);
    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.textContent).toBe('<img src=x>');
    view.rerender(
      <PlayerName name="Leia" markup="[url=https://evil.test]Leia[/url]" />,
    );
    expect(view.container.querySelector('a')).toBeNull();
    expect(view.container.textContent).toBe('Leia');
  });
  it('accepts only visible names and refuses unmatched or unsafe tags', () => {
    expect(parsePlayerName('[b]Leia[/b]').plain).toBe('Leia');
    for (const bad of [
      '[u]Leia[/u]',
      '[color=var(--x)]Leia[/color]',
      '[b]Leia[/i]',
      '[b]ab[/b]',
    ])
      expect(() => parsePlayerName(bad)).toThrow();
  });
});
