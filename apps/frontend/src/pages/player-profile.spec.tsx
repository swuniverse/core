import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlayerProfilePage } from './player-profile';
import { ApiError } from '../services/api';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return {
    ...actual,
    api: apiMocks,
  };
});

function renderProfile(initialEntry = '/players/1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/players/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlayerProfilePage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
  });

  it('renders player profile data and BBCode description', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/settlers/1') {
        return Promise.resolve({
          id: 1,
          username: 'vader',
          displayName: 'Vader',
          avatar: null,
          description: '[b]Böse[/b] [quote]Drohung[/quote]',
          faction: 'IMPERIUM',
          factionName: 'Imperium',
          prestige: 10,
          colonies: 1,
          ships: 2,
          completedResearch: 3,
          onboardingCompleted: true,
          isAdmin: false,
          createdAt: '2026-08-04T00:00:00.000Z',
          alliance: null,
        });
      }
      if (url.startsWith('/alliances/settlers/1/diplomacy')) {
        return Promise.resolve({
          playerId: 1,
          name: 'Vader',
          relationships: [],
          entries: [],
          nextCursor: null,
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const { container } = renderProfile();

    expect(await screen.findByRole('heading', { name: 'Vader' })).toBeTruthy();
    expect(screen.getByText('Imperium')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    await waitFor(() => {
      expect(container.querySelector('strong')?.textContent).toBe('Böse');
      expect(container.querySelector('blockquote')?.textContent).toContain(
        'Drohung',
      );
    });
    expect(container.textContent).not.toContain('[b]');
    expect(container.textContent).not.toContain('[quote]');
    expect(screen.queryByText('Allianz')).toBeNull();
  });

  it('links the player’s alliance', async () => {
    apiMocks.get.mockResolvedValue({
      id: 1,
      username: 'vader',
      displayName: null,
      avatar: null,
      description: null,
      faction: 'GALACTIC_EMPIRE',
      factionName: 'Galaktisches Imperium',
      prestige: 0,
      colonies: 0,
      ships: 0,
      completedResearch: 0,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt: '2026-08-04T00:00:00.000Z',
      alliance: { id: 5, name: 'Black Squadron', color: '#00ff00' },
    });

    renderProfile();

    const link = await screen.findByRole('link', { name: 'Black Squadron' });
    expect(link.getAttribute('href')).toBe('/alliances/5');
    expect(link.getAttribute('style')).toContain('color: rgb(0, 255, 0)');
    expect(screen.getByText('Allianz')).toBeTruthy();
  });

  it('renders not-found error with database backlink', async () => {
    apiMocks.get.mockRejectedValue(new ApiError(404, 'Not found'));

    renderProfile();

    expect(await screen.findByText('Spieler nicht gefunden.')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '← Datenbank' }).getAttribute('href'),
    ).toBe('/database');
  });
});
