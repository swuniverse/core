import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Faction } from '@swuniverse/shared';

import { ApiError } from '../services/api';
import { OnboardingPage } from './onboarding';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, api: apiMocks };
});

const profile = {
  id: 7,
  username: 'tester',
  email: 'tester@example.test',
  prestige: 0,
  createdAt: '2026-08-05T00:00:00.000Z',
  isAdmin: false,
  permissions: [],
  faction: Faction.REBEL_ALLIANCE,
};

const selection = {
  id: 1,
  factionId: 1,
  selectedLayerId: 1,
  selectedSectorX: 0,
  selectedSectorY: 0,
  selectedSystemId: 12,
  selectedCelestialObjectId: null,
  status: 'STARTED',
  completedAt: null,
};

const sector = {
  layerId: 1,
  sectorX: 0,
  sectorY: 0,
  minX: 1,
  minY: 1,
  maxX: 20,
  maxY: 20,
  fieldCount: 400,
  systemCount: 1,
  playableSystemCount: 1,
  totalStarterPlanets: 2,
  availableStarterPlanets: 2,
  dominantFactionZone: 'REBEL',
};

const sectors = [
  {
    layerId: 1,
    layerName: 'Core',
    sectorSize: 20,
    sectorColumns: 1,
    sectorRows: 1,
    suggestedFactionId: 1,
    sectors: [sector],
  },
];

const planet = {
  id: 1233,
  name: 'Claimed World',
  posX: 4,
  posY: 5,
  classId: 201,
  systemId: 12,
};

function renderPage() {
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve(profile);
      if (url === '/onboarding/selection') return Promise.resolve(selection);
      if (url === '/factions') return Promise.resolve([]);
      if (url === '/onboarding/sectors') return Promise.resolve(sectors);
      if (url.startsWith('/onboarding/systems?')) {
        return Promise.resolve([{ id: 12, name: 'Sol', cx: 1, cy: 1 }]);
      }
      if (url === '/onboarding/planets?systemId=12') {
        return Promise.resolve([planet]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
  });

  it('shows a failed claim beside the claim action and refreshes availability', async () => {
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Celestial object already claimed'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Sol/ }));
    const planetName = await screen.findByText('Claimed World');
    fireEvent.click(planetName.closest('button') as HTMLButtonElement);
    const planetLoadsBeforeClaim = apiMocks.get.mock.calls.filter(
      ([url]) => url === '/onboarding/planets?systemId=12',
    ).length;
    fireEvent.click(screen.getByRole('button', { name: 'Claim Homeworld' }));

    const claimSection = screen.getByRole('heading', { name: '5. Claim' })
      .parentElement?.parentElement;
    await waitFor(() => {
      expect(claimSection?.textContent).toContain(
        'Celestial object already claimed',
      );
    });
    expect(
      apiMocks.get.mock.calls.filter(
        ([url]) => url === '/onboarding/planets?systemId=12',
      ),
    ).toHaveLength(planetLoadsBeforeClaim + 1);
  });

  it('clears a failed claim message once another planet is chosen', async () => {
    const freePlanet = { ...planet, id: 1231, name: 'Free World' };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve(profile);
      if (url === '/onboarding/selection') return Promise.resolve(selection);
      if (url === '/factions') return Promise.resolve([]);
      if (url === '/onboarding/sectors') return Promise.resolve(sectors);
      if (url.startsWith('/onboarding/systems?')) {
        return Promise.resolve([{ id: 12, name: 'Sol', cx: 1, cy: 1 }]);
      }
      if (url === '/onboarding/planets?systemId=12') {
        return Promise.resolve(
          apiMocks.post.mock.calls.length > 0
            ? [freePlanet]
            : [planet, freePlanet],
        );
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Celestial object already claimed'),
    );
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Sol/ }));
    const claimedName = await screen.findByText('Claimed World');
    fireEvent.click(claimedName.closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Claim Homeworld' }));
    await screen.findByRole('alert');
    await waitFor(() => {
      expect(screen.queryAllByText('Claimed World')).toHaveLength(0);
    });

    const freeName = screen.getAllByText('Free World')[0];
    fireEvent.click(freeName.closest('button') as HTMLButtonElement);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
