import { fireEvent, render, screen } from '@testing-library/react';
import { Faction } from '@swuniverse/shared';
import { PlayerAvatar } from './PlayerAvatar';

describe('PlayerAvatar', () => {
  it('prefers a personal avatar over the faction default', () => {
    render(
      <PlayerAvatar
        name="Leia Organa"
        avatar="https://example.test/leia.png"
        faction={Faction.REBEL_ALLIANCE}
      />,
    );

    expect(screen.getByRole('img').getAttribute('src')).toBe(
      'https://example.test/leia.png',
    );
  });

  it.each([
    [Faction.REBEL_ALLIANCE, '/assets/avatars/alliance-rebel-default.png'],
    [Faction.GALACTIC_EMPIRE, '/assets/avatars/alliance-imperial-default.png'],
  ])('uses the faction default when no personal avatar exists', (faction, src) => {
    render(<PlayerAvatar name="Leia Organa" avatar={null} faction={faction} />);

    expect(screen.getByRole('img').getAttribute('src')).toBe(src);
  });

  it('uses the name initial when no avatar source exists', () => {
    render(<PlayerAvatar name="  Leia Organa" avatar={null} faction={null} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('L')).not.toBeNull();
  });

  it('falls back from a failed personal avatar to the faction default and then the initial', () => {
    render(
      <PlayerAvatar
        name="Leia Organa"
        avatar="https://example.test/leia.png"
        faction={Faction.REBEL_ALLIANCE}
      />,
    );

    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      '/assets/avatars/alliance-rebel-default.png',
    );

    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('L')).not.toBeNull();
  });

  it('resets to the new player avatar when its inputs change', () => {
    const { rerender } = render(
      <PlayerAvatar
        name="Leia Organa"
        avatar="https://example.test/leia.png"
        faction={Faction.REBEL_ALLIANCE}
      />,
    );

    fireEvent.error(screen.getByRole('img'));
    rerender(
      <PlayerAvatar
        name="Vader"
        avatar="https://example.test/vader.png"
        faction={Faction.GALACTIC_EMPIRE}
      />,
    );

    expect(screen.getByRole('img').getAttribute('src')).toBe(
      'https://example.test/vader.png',
    );
  });
});
