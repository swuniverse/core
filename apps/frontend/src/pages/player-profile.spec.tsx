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
