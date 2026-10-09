import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlayerProfilePage } from './player-profile';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

const profile = {
  id: 1,
  username: 'han',
  displayName: 'Han',
  avatar: null,
  description: null,
  faction: 'REBELS',
  factionName: 'Rebellen',
  prestige: 0,
  colonies: 0,
  ships: 0,
  completedResearch: 0,
  onboardingCompleted: true,
  isAdmin: false,
  createdAt: '2026-08-04T00:00:00.000Z',
  alliance: null,
};

const entry = (id: number, name: string) => ({
  id,
  type: 'RELATIONSHIP_STARTED',
  actor: { userId: 1, name: 'Han' },
  firstAlliance: { id: 1, name: 'Han' },
  secondAlliance: { id: 2, name },
  firstPartyType: 'PLAYER',
  secondPartyType: 'PLAYER',
  endReason: null,
  relationship: { type: 'FRIENDSHIP', vassalage: null },
  occurredAt: '2026-09-01T00:00:00.000Z',
});

const diplomacy = {
  playerId: 1,
  name: 'Han',
  relationships: [
    {
      id: 7,
      counterparty: { id: 2, name: '[b]Lando[/b]', color: null },
      counterpartyType: 'PLAYER',
      type: 'FRIENDSHIP',
      startedAt: '2026-09-01T00:00:00.000Z',
      permissions: { treatAsFriend: true, shareLivePositions: false },
      vassalage: null,
      hasContract: true,
    },
  ],
};

function mockApi(overrides: Record<string, () => Promise<unknown>> = {}) {
  apiMocks.get.mockImplementation((url: string) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/database/settlers/1') return Promise.resolve(profile);
    if (url === '/alliances/settlers/1/diplomacy')
      return Promise.resolve(diplomacy);
    if (url === '/alliances/settlers/1/diplomacy/chronicle')
      return Promise.resolve({
        entries: [entry(2, 'Lando')],
        nextCursor: 'abc',
      });
    if (url === '/alliances/settlers/1/diplomacy/chronicle?cursor=abc')
      return Promise.resolve({
        entries: [entry(1, 'Chewie')],
        nextCursor: null,
      });
    if (url === '/alliances/settlers/1/relationships/7/contract')
      return Promise.resolve({ relationshipId: 7, contract: 'Offen' });
    throw new Error(`Unexpected URL ${url}`);
  });
}

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/players/1']}>
      <Routes>
        <Route path="/players/:id" element={<PlayerProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlayerProfilePage Siedler diplomacy', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
  });

  it('shows active relationships with names as plain text and loads the contract', async () => {
    mockApi();
    const { container } = renderProfile();

    expect(await screen.findByText('[b]Lando[/b]')).toBeTruthy();
    expect(container.querySelector('strong')).toBeNull();
    expect(
      screen.getByRole('link', { name: '[b]Lando[/b]' }).getAttribute('href'),
    ).toBe('/players/2');
    fireEvent.click(
      screen.getByRole('button', { name: 'Vertragswerk anzeigen' }),
    );
    expect(await screen.findByText('Offen')).toBeTruthy();
  });

  it('paginates the chronicle', async () => {
    mockApi();
    renderProfile();

    expect(await screen.findByText(/Han – Lando/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    );
    expect(await screen.findByText(/Han – Chewie/)).toBeTruthy();
    expect(screen.getByText(/Han – Lando/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Ältere Ereignisse laden' }),
    ).toBeNull();
  });

  it('shows a load-more error and keeps loaded entries', async () => {
    mockApi({
      '/alliances/settlers/1/diplomacy/chronicle?cursor=abc': () =>
        Promise.reject(new Error('boom')),
    });
    renderProfile();

    await screen.findByText(/Han – Lando/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Ältere Ereignisse laden' }),
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Han – Lando/)).toBeTruthy();
  });

  it('shows loading, then an error when the diplomacy cannot be loaded', async () => {
    mockApi({
      '/alliances/settlers/1/diplomacy': () => Promise.reject(new Error('x')),
    });
    renderProfile();

    expect(await screen.findByText('Diplomatie wird geladen...')).toBeTruthy();
    expect(
      await screen.findByText('Diplomatie konnte nicht geladen werden.'),
    ).toBeTruthy();
  });

  it('does not load Siedler diplomacy for players in an alliance', async () => {
    mockApi({
      '/database/settlers/1': () =>
        Promise.resolve({
          ...profile,
          alliance: { id: 5, name: 'Rogue', color: null },
        }),
    });
    renderProfile();

    await screen.findByRole('link', { name: 'Rogue' });
    expect(apiMocks.get).not.toHaveBeenCalledWith(
      '/alliances/settlers/1/diplomacy',
    );
  });
});
