import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SpacecraftDetailPage } from './spacecraft-detail';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../services/api', () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/use-socket', () => ({ useSocket: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => ({ info: vi.fn() }) }));
vi.mock('../lib/assets', () => ({
  shipImage: () => '/ship.png',
  commodityImage: () => '/commodity.png',
  planetThumbnail: () => '/planet.png',
  spaceBackgroundTile: () => '/space.png',
  starTileImage: () => '/star.png',
  systemTypeImage: () => '/system.png',
}));

const ship = {
  id: 2,
  name: 'Falke',
  shipClassId: 7,
  shipClassName: 'Korvette',
  status: 'IDLE',
  alertState: 'GREEN',
  hull: 90,
  hullMax: 100,
  shields: 40,
  shieldsMax: 50,
  energy: 70,
  energyMax: 100,
  epsMax: 100,
  reactorOutput: 12,
  warpdrive: 8,
  warpdriveMax: 20,
  warpSpeed: 2,
  warpCooldown: 0,
  battery: 5,
  batteryMax: 10,
  evadeChance: 0,
  crew: 4,
  crewMax: 8,
  cargoUsed: 0,
  cargoMax: 20,
  reactorWarpSplit: 30,
  runtimeSystems: {
    SHIELDS: {
      active: true,
      cooldown: 0,
      integrity: 100,
      current: 40,
      max: 50,
    },
  },
  posX: 5,
  posY: 5,
  arrivalAt: null,
};
const map = {
  mode: 'galaxy',
  shipX: 5,
  shipY: 5,
  sensorRange: 0,
  canEnterSystem: false,
  canLeaveSystem: false,
  fields: [
    {
      id: 1,
      cx: 5,
      cy: 5,
      fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' },
      starSystemId: null,
      starSystem: null,
    },
  ],
  ships: [],
};

describe('SpacecraftDetailPage', () => {
  it('keeps the primary desktop regions in three columns and auxiliary panels below', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2') return Promise.resolve(ship);
      if (path === '/spacecraft/2/local-map') return Promise.resolve(map);
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo')
        return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/colonies') return Promise.resolve([]);
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    render(
      <MemoryRouter initialEntries={['/spacecraft/2']}>
        <Routes>
          <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Korvette')).toBeTruthy();
    expect(screen.getByLabelText('Systemstatus')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Reaktor + Hyperantrieb' }),
    ).toBeTruthy();
    expect(await screen.findByText(/Lagerraum 0\/20/)).toBeTruthy();
    expect(screen.queryByText('Fracht')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Torpedos' })).toBeNull();
    expect(screen.queryByText('STU-Parität')).toBeNull();
  });
});
