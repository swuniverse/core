import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
  crewRequired: 2,
  crewMax: 8,
  cargoUsed: 0,
  cargoMax: 20,
  reactorWarpSplit: 30,
  reactorAutoCarryOver: false,
  runtimeSystems: {
    SHIELDS: {
      active: true,
      cooldown: 0,
      integrity: 100,
      current: 40,
      max: 50,
    },
  },
  location: { scope: 'GALAXY' as const, layerId: 3, x: 5, y: 5 },
  arrivalAt: null,
  tractor: {
    heldBy: { id: 9, name: 'Imperialer Schlepper' },
    canEscape: true,
  },
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

const locationProbe = vi.hoisted(() => ({ current: '' }));
function CurrentLocation() {
  const location = useLocation();
  locationProbe.current = `${location.pathname}${location.search}`;
  return <output data-testid="current-location">{locationProbe.current}</output>;
}

describe('SpacecraftDetailPage', () => {
  it('lets a tractored ship attempt to escape', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2') return Promise.resolve(ship);
      if (path === '/spacecraft/2/local-map') return Promise.resolve(map);
      if (path === '/spacecraft/2/field-context') {
        return Promise.resolve({
          coordinates: { x: 5, y: 5 },
          region: null,
          adminRegion: null,
          information: {},
          colony: null,
          actions: {},
        });
      }
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo')
        return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/colonies') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    apiMocks.post.mockResolvedValue({
      outcome: 'ESCAPED',
      message: 'Der Fluchtversuch ist gelungen',
    });
    render(
      <MemoryRouter initialEntries={['/spacecraft/2']}>
        <Routes>
          <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Entkommen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/tractor/escape', {}),
    );
    expect(await screen.findByText('Der Fluchtversuch ist gelungen')).toBeTruthy();
  });

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
      screen.getByRole('heading', { name: /Reaktor \+ Antrieb/ }),
    ).toBeTruthy();
    expect(await screen.findByText(/Lagerraum 0\/20/)).toBeTruthy();
    expect(screen.queryByText('Fracht')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Torpedos' })).toBeNull();
    expect(screen.queryByText('STU-Parität')).toBeNull();
  });

  it('renders station systems, storage and wormhole rules but hides flight controls', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2/wormhole-restrictions') return Promise.resolve({ wormholes: [{ id: 3, name: 'Passage', restrictions: [{ id: 5, targetType: 'ALLIANCE', targetId: 1234, mode: 'DENY' }] }] });
      if (path === '/spacecraft/2') {
        return Promise.resolve({
          ...ship,
          kind: 'STATION',
          stationRole: 'SENSOR',
          shipClassName: 'Sensorphalanx',
          dockCapacity: 2,
          dockedShips: [],
        });
      }
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

    expect(await screen.findByText('Sensorphalanx')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Angedockte Schiffe/ })).toBeTruthy();
    expect(screen.getByText('Keine Schiffe angedockt')).toBeTruthy();
    expect(screen.getByText(/Lagerraum 0\/20/)).toBeTruthy();
    expect(screen.queryByText('Navigation')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Wurmloch-Zugangsregeln' })).toBeTruthy();
    expect(await screen.findByText('Verboten')).toBeTruthy();
    expect(screen.getByText(/Allianz-ID 1.234/)).toBeTruthy();
  });

  it('refreshes the ship and opens its confirmed cross-layer arrival on the map', async () => {
    apiMocks.get.mockClear();
    apiMocks.post.mockClear();
    locationProbe.current = '';
    const arrivedShip = {
      ...ship,
      location: { scope: 'GALAXY' as const, layerId: 8, x: 12, y: 14 },
    };
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2')
        return Promise.resolve(
          apiMocks.get.mock.calls.filter(([requested]) => requested === '/spacecraft/2').length > 1
            ? arrivedShip
            : ship,
        );
      if (path === '/spacecraft/2/local-map') return Promise.resolve(map);
      if (path === '/spacecraft/2/field-context') {
        return Promise.resolve({
          coordinates: { x: 5, y: 5 },
          region: null,
          adminRegion: null,
          information: {},
          colony: null,
          actions: {},
          wormholePassages: [
            { id: 21, name: 'Tor', targetLayer: { id: 8, name: 'Outer Rim' } },
          ],
        });
      }
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo')
        return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/colonies') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    apiMocks.post.mockResolvedValue({
      wormholeId: 21,
      direction: 'EXIT',
      shipIds: [2],
      locationId: 900,
    });
    render(
      <MemoryRouter initialEntries={['/spacecraft/2']}>
        <CurrentLocation />
        <Routes>
          <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
          <Route path="/starmap" element={<p>Karte geöffnet</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const enterButton = await screen.findByRole('button', {
      name: 'Wurmloch betreten',
    });
    await waitFor(() => expect(enterButton.hasAttribute('disabled')).toBe(false));
    fireEvent.click(enterButton);

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/wormhole/enter',
        { wormholeId: 21 },
      ),
    );
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/2', {
        cache: 'no-store',
      }),
    );
    await waitFor(() =>
      expect(locationProbe.current).toBe('/starmap?layer=8&x=12&y=14'),
    );
  });

  it('keeps post-passage position feedback visible when destination context cannot load', async () => {
    apiMocks.get.mockClear();
    apiMocks.post.mockClear();
    locationProbe.current = '';
    let shipReads = 0;
    let destinationContextReads = 0;
    apiMocks.get.mockImplementation((path: string, options?: { cache?: string }) => {
      if (path === '/spacecraft/2') {
        shipReads += 1;
        if (options?.cache === 'no-store') {
          return Promise.reject(new Error('canonical ship read unavailable'));
        }
        return Promise.resolve(
          shipReads === 1
            ? { ...ship, tractor: null }
            : {
                ...ship,
                tractor: null,
                location: { scope: 'GALAXY', layerId: 8, x: 12, y: 14 },
              },
        );
      }
      if (path === '/spacecraft/2/field-context') {
        destinationContextReads += 1;
        if (shipReads <= 1) {
          return Promise.resolve({
            coordinates: { x: 5, y: 5 },
            region: null,
            adminRegion: null,
            information: {},
            colony: null,
            actions: {},
            wormholePassages: [
              { id: 21, name: 'Tor', targetLayer: { id: 8, name: 'Outer Rim' } },
            ],
          });
        }
        return Promise.reject(new Error('destination context unavailable'));
      }
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo')
        return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/colonies') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    apiMocks.post.mockResolvedValue({
      wormholeId: 21,
      direction: 'EXIT',
      shipIds: [2],
      locationId: 900,
    });
    render(
      <MemoryRouter initialEntries={['/spacecraft/2']}>
        <CurrentLocation />
        <Routes>
          <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
          <Route path="/starmap" element={<p>Karte geöffnet</p>} />
        </Routes>
      </MemoryRouter>,
    );

    const enterButton = await screen.findByRole('button', {
      name: 'Wurmloch betreten',
    });
    await waitFor(() => expect(enterButton.hasAttribute('disabled')).toBe(false));
    fireEvent.click(enterButton);
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith(
      '/spacecraft/2/wormhole/enter',
      { wormholeId: 21 },
    ));
    await waitFor(() => expect(shipReads).toBeGreaterThanOrEqual(3));
    await waitFor(() => expect(destinationContextReads).toBeGreaterThanOrEqual(2));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'Passage abgeschlossen, aber die bestätigte Schiffsposition konnte nicht geladen werden',
    );
    expect(alert.textContent).not.toContain('Passage fehlgeschlagen');
    await waitFor(() => expect(shipReads).toBeGreaterThanOrEqual(3));
    expect(destinationContextReads).toBeGreaterThanOrEqual(2);
    expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/wormhole/enter', {
      wormholeId: 21,
    });
    expect(locationProbe.current).toBe('/spacecraft/2');
  });

  it('uses canonical galaxy location coordinates in the ship header', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2') {
        return Promise.resolve({
          ...ship,
          location: { scope: 'GALAXY', layerId: 3, x: 8, y: 9 },
        });
      }
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

    expect((await screen.findAllByText('8|9')).length).toBeGreaterThan(0);
  });
});
