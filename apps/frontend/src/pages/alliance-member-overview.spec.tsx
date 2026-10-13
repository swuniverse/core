import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  AllianceRole,
  Faction,
  type AllianceMemberOverviewDto,
} from '@swuniverse/shared';
import type * as ApiModule from '../services/api';
import { AllianceMemberOverviewPage } from './alliance-member-overview';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

const location = { scope: 'SYSTEM' as const, systemId: 7, x: 3, y: 4 };

const overview: AllianceMemberOverviewDto = {
  allianceId: 1,
  members: [
    {
      userId: 1,
      name: 'Leia',
      avatar: null,
      faction: Faction.REBEL_ALLIANCE,
      factionName: 'Rebellenallianz',
      role: AllianceRole.PRESIDENT,
      roleTitle: 'Großadmiral',
      lastActiveAt: '2026-10-08T10:00:00.000Z',
      crew: { assigned: 12, limit: 40 },
      colonies: [
        {
          id: 9,
          name: 'Hoth Base',
          location,
          energy: 5,
          energyMax: 50,
          storageUsed: 100,
          storageMax: 3000,
          population: 20,
          populationMax: 80,
        },
      ],
      shipGroups: [
        {
          shipClassId: 1,
          shipClassName: 'X-Wing',
          ships: [{ id: 2, name: 'Red Five', location }],
        },
      ],
    },
    {
      userId: 2,
      name: 'Han',
      avatar: null,
      faction: Faction.REBEL_ALLIANCE,
      factionName: 'Rebellenallianz',
      role: AllianceRole.NONE,
      roleTitle: null,
      lastActiveAt: null,
      crew: { assigned: 0, limit: 0 },
      colonies: [],
      shipGroups: [],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/alliances/1/member-overview']}>
      <Routes>
        <Route
          path="/alliances/:id/member-overview"
          element={<AllianceMemberOverviewPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiMocks.get.mockReset();
  apiMocks.get.mockResolvedValue(overview);
});

describe('AllianceMemberOverviewPage', () => {
  it('lists members with last activity, showing unknown without a value', async () => {
    renderPage();
    await screen.findByText('Leia');
    expect(apiMocks.get).toHaveBeenCalledWith('/alliances/1/member-overview');
    expect(screen.getByText(/Letzte Aktivität: 08\.10\.2026/)).toBeTruthy();
    expect(screen.getByText('Letzte Aktivität: unbekannt')).toBeTruthy();
    expect(screen.getByText('Crew 12/40')).toBeTruthy();
    expect(screen.queryByText('Hoth Base')).toBeNull();
  });

  it('expands a row to colonies, ship groups, crew and profile and message links', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Leia/ }));
    expect(screen.getByText('Hoth Base')).toBeTruthy();
    expect(screen.getByText('Energie 5/50')).toBeTruthy();
    expect(screen.getByText('Lager 100/3000')).toBeTruthy();
    expect(screen.getByText('Bevölkerung 20/80')).toBeTruthy();
    expect(screen.getByText('X-Wing (1)')).toBeTruthy();
    expect(screen.getByText(/Red Five/)).toBeTruthy();
    expect(screen.getByText('Crew-Auslastung: 12 von 40')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Profil' }).getAttribute('href'),
    ).toBe('/players/1');
    expect(
      screen.getByRole('link', { name: 'Nachricht' }).getAttribute('href'),
    ).toBe('/messages?tab=compose&to=1&name=Leia');

    fireEvent.click(screen.getByRole('button', { name: /Leia/ }));
    expect(screen.queryByText('Hoth Base')).toBeNull();
  });

  it('shows an error when the server denies access', async () => {
    const { ApiError } =
      await vi.importActual<typeof ApiModule>('../services/api');
    apiMocks.get.mockRejectedValue(new ApiError(403, 'Forbidden'));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'nicht verfügbar',
      ),
    );
  });

  describe('colony stock', () => {
    const stock = {
      allianceId: 1,
      colonyId: 9,
      items: [{ commodityId: 1, name: 'Deuterium', amount: 40 }],
    };

    async function openColony() {
      renderPage();
      fireEvent.click(await screen.findByRole('button', { name: /Leia/ }));
    }

    it('loads the stock only when a colony is expanded', async () => {
      apiMocks.get.mockImplementation(async (url: string) =>
        url.endsWith('/stock') ? stock : overview,
      );
      await openColony();
      expect(apiMocks.get).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Hoth Base/ }));
      expect(screen.getByText('Lagerbestand wird geladen …')).toBeTruthy();
      await screen.findByText('Deuterium');
      expect(screen.getByText('40')).toBeTruthy();
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/alliances/1/member-overview/colonies/9/stock',
      );
    });

    it('shows an error when the stock cannot be loaded', async () => {
      apiMocks.get.mockImplementation(async (url: string) => {
        if (url.endsWith('/stock')) throw new Error('boom');
        return overview;
      });
      await openColony();
      fireEvent.click(screen.getByRole('button', { name: /Hoth Base/ }));
      await screen.findByText('Der Lagerbestand konnte nicht geladen werden.');
    });
  });
});
