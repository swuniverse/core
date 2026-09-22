import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpacecraftPage } from './spacecraft';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));
vi.mock('../lib/assets', () => ({ shipImage: () => '/ship.png' }));

const ship = {
  id: 2,
  name: 'Falke',
  shipClassId: 7,
  status: 'IDLE',
  alertState: 'GREEN',
  hull: 90,
  hullMax: 100,
  shields: 40,
  shieldsMax: 50,
  energy: 70,
  energyMax: 100,
  warpSpeed: 2,
  warpCooldown: 0,
  crew: 4,
  crewMax: 8,
  location: { scope: 'GALAXY' as const, layerId: 3, x: 5, y: 6 },
};

describe('SpacecraftPage', () => {
  it('renders canonical galaxy and system location coordinates', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...ship,
        location: { scope: 'GALAXY', layerId: 3, x: 8, y: 9 },
      },
      {
        ...ship,
        id: 3,
        name: 'Adler',
        location: { scope: 'SYSTEM', systemId: 8, x: 11, y: 12 },
      },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('8|9')).toBeTruthy();
    expect(screen.getByText('11|12')).toBeTruthy();
  });
});
