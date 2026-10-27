import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlayerProfilePage } from './player-profile';
import { ApiError } from '../services/api';
import type * as ApiModule from '../services/api';
import { useAuthStore } from '../stores/auth.store';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
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
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 7,
        username: 'tester',
        email: 'tester@example.test',
        prestige: 0,
        createdAt: '2026-08-05T00:00:00.000Z',
        isAdmin: false,
        permissions: [],
      },
    });
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
          onVacation: true,
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
    expect(screen.getByText('(Urlaub)').className).toContain('text-swu-warning');
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
    expect(
      screen.getByRole('link', { name: 'Nachricht an Vader schreiben' }).getAttribute(
        'href',
      ),
    ).toBe('/messages?tab=compose&to=1&name=Vader');
  });

  it('adds another player to contacts from their profile', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/settlers/1') {
        return Promise.resolve({
          id: 1,
          username: 'vader',
          displayName: 'Vader',
          avatar: null,
          description: null,
          faction: 'GALACTIC_EMPIRE',
          factionName: 'Galaktisches Imperium',
          prestige: 10,
          colonies: 1,
          ships: 2,
          completedResearch: 3,
          onboardingCompleted: true,
          isAdmin: false,
          createdAt: '2026-08-04T00:00:00.000Z',
          alliance: null,
          onVacation: false,
        });
      }
      if (url === '/contacts' || url === '/ignore-list') return Promise.resolve([]);
      if (url.startsWith('/alliances/settlers/1/diplomacy')) {
        return Promise.resolve({ playerId: 1, name: 'Vader', relationships: [], entries: [], nextCursor: null });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockResolvedValue({ id: 4, contactUserId: 1, mode: 'FRIEND' });

    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: 'Zu Kontakten hinzufügen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/contacts', {
        playerId: 1,
        mode: 'FRIEND',
      }),
    );
    expect(screen.getByLabelText('Kontaktmodus für Vader')).toBeTruthy();
  });

  it('ignores and unignores another player from their profile', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/settlers/1') return Promise.resolve({
        id: 1, username: 'vader', displayName: 'Vader', avatar: null,
        description: null, faction: 'GALACTIC_EMPIRE', factionName: 'Galaktisches Imperium',
        prestige: 10, colonies: 1, ships: 2, completedResearch: 3,
        onboardingCompleted: true, isAdmin: false, createdAt: '2026-08-04T00:00:00.000Z',
        alliance: null, onVacation: false,
      });
      if (url === '/contacts' || url === '/ignore-list') return Promise.resolve([]);
      if (url.startsWith('/alliances/settlers/1/diplomacy')) return Promise.resolve({ playerId: 1, name: 'Vader', relationships: [], entries: [], nextCursor: null });
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockResolvedValue({
      id: 9,
      ignoredUserId: 1,
      ignoredUsername: 'Vader',
      createdAt: '2026-10-27T12:00:00.000Z',
    });
    apiMocks.delete.mockResolvedValue({ deleted: 1 });

    renderProfile();
    fireEvent.click(await screen.findByRole('button', { name: 'Ignorieren' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/ignore-list', { playerId: 1 }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nicht mehr ignorieren' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/ignore-list', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [9] }),
    }));
  });

  it('does not offer a quick message on the own profile', async () => {
    apiMocks.get.mockResolvedValue({
      id: 7,
      username: 'tester',
      displayName: 'Tester',
      avatar: null,
      description: null,
      faction: 'REBEL_ALLIANCE',
      factionName: 'Rebellenallianz',
      prestige: 0,
      colonies: 0,
      ships: 0,
      completedResearch: 0,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt: '2026-08-04T00:00:00.000Z',
      alliance: { id: 5, name: 'Alderaan', color: null },
      onVacation: false,
    });

    renderProfile('/players/7');

    await screen.findByRole('heading', { name: 'Tester' });
    expect(
      screen.queryByRole('link', { name: 'Nachricht an Tester schreiben' }),
    ).toBeNull();
  });

  it('renders awards with descriptions and repeat counts', async () => {
    apiMocks.get.mockResolvedValue({
      id: 1,
      username: 'leia',
      displayName: null,
      avatar: null,
      description: null,
      faction: 'REBEL_ALLIANCE',
      factionName: 'Rebellenallianz',
      prestige: 0,
      colonies: 0,
      ships: 0,
      completedResearch: 0,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt: '2026-08-04T00:00:00.000Z',
      alliance: { id: 5, name: 'Alderaan', color: null },
      awards: [
        {
          key: 'LOTTERY_WINNER',
          description: 'Gewinner der Hutten-Lotterie',
          image: '/favicon.ico',
          count: 2,
        },
      ],
    });

    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Awards' })).toBeTruthy();
    const award = screen.getByRole('img', {
      name: 'Gewinner der Hutten-Lotterie',
    });
    expect(award.getAttribute('title')).toBe('Gewinner der Hutten-Lotterie');
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders an empty awards box', async () => {
    apiMocks.get.mockResolvedValue({
      id: 1,
      username: 'leia',
      displayName: null,
      avatar: null,
      description: null,
      faction: 'REBEL_ALLIANCE',
      factionName: 'Rebellenallianz',
      prestige: 0,
      colonies: 0,
      ships: 0,
      completedResearch: 0,
      onboardingCompleted: true,
      isAdmin: false,
      createdAt: '2026-08-04T00:00:00.000Z',
      alliance: { id: 5, name: 'Alderaan', color: null },
      awards: [],
    });

    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Awards' })).toBeTruthy();
    expect(screen.getByText('Keine')).toBeTruthy();
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

  it('shows public characters and owner controls', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/database/settlers/7') return Promise.resolve({ id: 7, username: 'tester', displayName: 'Tester', avatar: null, description: null, faction: 'REBEL_ALLIANCE', factionName: 'Rebellenallianz', prestige: 0, colonies: 0, ships: 0, completedResearch: 0, onboardingCompleted: true, isAdmin: false, createdAt: '2026-08-04T00:00:00.000Z', alliance: null, onVacation: false });
      if (url === '/rpg/characters/player/7') return Promise.resolve([{ id: 3, userId: 7, name: 'General Test', description: '[b]Mutig[/b]', avatar: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' }]);
      if (url.startsWith('/alliances/settlers/7/diplomacy')) return Promise.resolve({ playerId: 7, name: 'Tester', relationships: [], entries: [], nextCursor: null });
      throw new Error(`Unexpected URL ${url}`);
    });
    renderProfile('/players/7');
    expect(await screen.findByRole('heading', { name: 'Charaktere' })).toBeTruthy();
    expect(screen.getByText('General Test')).toBeTruthy();
    expect(screen.getByText('Mutig').tagName).toBe('STRONG');
    expect(screen.getByRole('button', { name: 'Charakter anlegen' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'General Test bearbeiten' }));
    expect(screen.getByLabelText('Charaktername')).toBeTruthy();
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
