import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { WsEventType } from '@swuniverse/shared';
import { SpacecraftDetailPage } from './spacecraft-detail';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: unknown) => void>(),
);
vi.mock('../services/api', () => ({
  api: apiMocks,
  ApiError: class ApiError extends Error {},
}));
vi.mock('../hooks/use-socket', () => ({
  useSocket: (event: string, handler: (payload: unknown) => void) => {
    if (!socketHandlers.has(event)) socketHandlers.set(event, handler);
  },
}));
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
  it('refreshes shield regeneration only for the selected ship', async () => {
    socketHandlers.delete(WsEventType.SPACECRAFT_EVENT);
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft/2') return Promise.resolve(ship);
      if (path === '/spacecraft/2/local-map') return Promise.resolve(map);
      if (path === '/spacecraft/2/field-context')
        return Promise.resolve({
          coordinates: { x: 5, y: 5 },
          wormholePassages: [],
          starSystem: null,
          region: null,
          colony: null,
          information: { canSectorScan: false, cartographyKnown: true },
        });
      if (path === '/spacecraft/2/modules' || path === '/spacecraft/2/cargo')
        return Promise.resolve([]);
      if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
      if (path === '/spacecraft/2/cartography') return Promise.resolve(null);
      if (path === '/colonies') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    render(
      <MemoryRouter initialEntries={['/spacecraft/2']}>
        <Routes>
          <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Korvette')).toBeTruthy();
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/2/field-context'),
    );
    await act(async () => Promise.resolve());
    apiMocks.get.mockClear();

    const eventHandler = socketHandlers.get(WsEventType.SPACECRAFT_EVENT);
    expect(eventHandler).toBeTypeOf('function');
    await act(async () => {
      eventHandler?.({ type: 'SYSTEM_TOGGLED', shipId: 2 });
      eventHandler?.({ type: 'SHIELDS_REGENERATED', shipId: 99 });
    });
    expect(apiMocks.get).not.toHaveBeenCalled();

    await act(async () => {
      eventHandler?.({ type: 'SHIELDS_REGENERATED', shipId: 2 });
    });
    await waitFor(() =>
      expect(
        apiMocks.get.mock.calls.filter(([path]) => path === '/spacecraft/2'),
      ).toHaveLength(1),
    );
  });

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

  describe('tractor box of the holding spacecraft', () => {
    const renderHolder = (holder: object) => {
      apiMocks.get.mockImplementation((path: string) => {
        if (path === '/spacecraft/2') return Promise.resolve(holder);
        if (path === '/spacecraft/2/local-map') return Promise.resolve(map);
        if (path === '/spacecraft/2/field-context') {
          return Promise.resolve({ coordinates: { x: 5, y: 5 }, information: {}, colony: null, actions: {} });
        }
        if (path === '/spacecraft/2/torpedoes') return Promise.resolve(null);
        if (['/spacecraft/2/modules', '/spacecraft/2/cargo', '/colonies'].includes(path)) return Promise.resolve([]);
        return Promise.reject(new Error(`unexpected ${path}`));
      });
      render(
        <MemoryRouter initialEntries={['/spacecraft/2']}>
          <Routes>
            <Route path="/spacecraft/:id" element={<SpacecraftDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    };
    const holding = { heldBy: null, holding: { id: 5, name: 'Beute' }, canEscape: false };

    it('shows the held ship and releases the beam', async () => {
      apiMocks.delete.mockResolvedValue({});
      renderHolder({ ...ship, tractor: holding });

      const box = await screen.findByRole('region', { name: 'Traktorstrahl' });
      expect(within(box).getByText('Traktorstrahl: hält Beute')).toBeTruthy();
      expect(within(box).queryByRole('button', { name: 'Entkommen' })).toBeNull();
      expect(within(box).queryByRole('button', { name: 'Gehaltenes Schiff andocken' })).toBeNull();
      fireEvent.click(within(box).getByRole('button', { name: 'deaktivieren' }));

      await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/2/tractor'));
      expect(await screen.findByText('Traktorstrahl deaktiviert')).toBeTruthy();
    });

    it('lets a station dock the held ship and shows rejection reasons', async () => {
      apiMocks.post
        .mockRejectedValueOnce(new Error('Aktion nicht möglich. Das Ziel ist nicht auf Alarm Grün.'))
        .mockResolvedValueOnce({ message: 'Andockvorgang abgeschlossen', shipIds: [5] });
      renderHolder({ ...ship, kind: 'STATION', stationRole: 'SENSOR', dockCapacity: 2, dockedShips: [], tractor: holding });

      const dock = await screen.findByRole('button', { name: 'Gehaltenes Schiff andocken' });
      fireEvent.click(dock);
      expect(await screen.findByText('Aktion nicht möglich. Das Ziel ist nicht auf Alarm Grün.')).toBeTruthy();
      fireEvent.click(dock);

      await waitFor(() => expect(apiMocks.post).toHaveBeenLastCalledWith('/spacecraft/2/tractor/dock', {}));
      expect(await screen.findByText('Andockvorgang abgeschlossen')).toBeTruthy();
    });
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
    expect(screen.getByRole('region', { name: 'Langstreckensensoren' })).toBeTruthy();
    expect(screen.getByText('Feld anklicken für einen Sensorscan (15 EPS).')).toBeTruthy();
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
