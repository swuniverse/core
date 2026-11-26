import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { NavigationPanel } from './NavigationPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  anomalyImage: (type: string) => `/anomaly-${type.toLowerCase()}.png`,
  planetThumbnail: () => '/planet.png',
  spaceBackgroundTile: () => '/space.png',
  starTileImage: () => '/star.png',
  systemTypeImage: () => '/system.png',
  shipCursorImage: (key?: string | null) =>
    key === 'REBEL_FIGHTER_X_WING' ? '/x-wing-cursor.png' : null,
}));

const map = {
  mode: 'galaxy' as const,
  shipX: 5,
  shipY: 5,
  sensorRange: 1,
  canEnterSystem: false,
  canLeaveSystem: false,
  fields: Array.from({ length: 9 }, (_, index) => {
    const x = 4 + (index % 3);
    const y = 4 + Math.floor(index / 3);
    return {
      id: index + 1,
      cx: x,
      cy: y,
      fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Leerer Raum' },
      starSystemId: null,
      starSystem: null,
    };
  }),
  ships: [],
};
const ship = {
  id: 2,
  name: 'Falke',
  status: 'IDLE',
  energy: 20,
  energyMax: 30,
  location: { scope: 'GALAXY' as const, layerId: 1, x: 5, y: 5 },
  runtimeSystems: {
    LONG_RANGE_SENSORS: { active: true },
    WARPDRIVE: { active: true },
    SUBLIGHT_DRIVE: { active: false },
  },
};

describe('NavigationPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
  });

  it('flies to a clicked straight-line field at once like STU', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockResolvedValue({});
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5/ }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', {
        targetX: 6,
        targetY: 5,
      }),
    );
    expect(screen.queryByRole('button', { name: 'Flug starten' })).toBeNull();
  });

  it('starts only one flight on a double click', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockReturnValue(new Promise(() => undefined));
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);
    const field = await screen.findByRole('button', { name: /Feld 6,5/ });

    fireEvent.click(field);
    fireEvent.click(field);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledTimes(1));
  });

  it('rejects a diagonal field without flying', async () => {
    apiMocks.get.mockResolvedValue(map);
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,6/ }));

    expect(
      await screen.findByText('Nur geradlinige Flugrouten sind möglich'),
    ).toBeTruthy();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('shows every alert battle report in turn and refreshes the reached state', async () => {
    const report = (attacker: string) => ({
      parties: {
        attacker: [{ id: 9, name: attacker, destroyed: false }],
        defender: [{ id: 2, name: 'X-Wing', destroyed: false }],
      },
      rounds: [
        {
          number: 1,
          lines: [
            {
              kind: 'ENERGY_HIT',
              text: `${attacker} feuert auf X-Wing`,
              emphasis: 'warning',
            },
          ],
        },
      ],
      outcome: { winner: 'ATTACKER', destroyedShipIds: [] },
    });
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockResolvedValue({
      ship: { id: 2 },
      movement: {
        plannedSteps: 3,
        completedSteps: 3,
        stopReason: 'ARRIVED',
        movedShipIds: [2],
        destroyedShipIds: [],
        combatReports: [report('Wache'), report('Patrouille')],
      },
    });
    const onShipUpdate = vi.fn();
    render(<NavigationPanel ship={ship} onShipUpdate={onShipUpdate} />);
    await screen.findByRole('button', { name: /Feld 6,5/ });
    const mapLoads = apiMocks.get.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Feld 6,5/ }));

    const first = await screen.findByRole('dialog', { name: 'Kampfbericht' });
    expect(within(first).getByText(/Wache feuert auf X-Wing/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Alarmreaktion: 2 Kämpfe · Position aktualisiert',
    );
    await waitFor(() => expect(onShipUpdate).toHaveBeenCalled());
    expect(apiMocks.get.mock.calls.length).toBeGreaterThan(mapLoads);

    fireEvent.click(within(first).getByRole('button', { name: /Schlie/ }));
    const second = await screen.findByRole('dialog', { name: 'Kampfbericht' });
    expect(
      within(second).getByText(/Patrouille feuert auf X-Wing/),
    ).toBeTruthy();
  });

  it('draws the class cursor graphic on the ship field when one exists', async () => {
    apiMocks.get.mockResolvedValue(map);
    const { rerender } = render(
      <NavigationPanel ship={ship} onShipUpdate={vi.fn()} />,
    );
    await screen.findByRole('button', { name: /Feld 6,5/ });
    expect(screen.queryByTestId('ship-cursor')).toBeNull();

    rerender(
      <NavigationPanel
        ship={{ ...ship, shipClassKey: 'REBEL_FIGHTER_X_WING' }}
        onShipUpdate={vi.fn()}
      />,
    );
    const cursor = await screen.findByTestId('ship-cursor');
    expect(cursor.getAttribute('src')).toBe('/x-wing-cursor.png');
    expect(cursor.style.transform).toBe('rotate(0deg)');

    const xWing = { ...ship, shipClassKey: 'REBEL_FIGHTER_X_WING' };
    // Flying up (towards smaller y) turns the graphic 90° counter-clockwise.
    rerender(
      <NavigationPanel
        ship={{ ...xWing, location: { ...ship.location, y: 4 } }}
        onShipUpdate={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('ship-cursor').style.transform).toBe(
        'rotate(-90deg)',
      ),
    );
  });

  it('marks planned measurement points only in cartography mode', async () => {
    const systemMap = {
      mode: 'system' as const,
      shipX: 1,
      shipY: 1,
      sensorRange: 1,
      bounds: { minX: 1, maxX: 2, minY: 1, maxY: 1 },
      systemId: 8,
      systemName: 'Testsystem',
      fields: [
        {
          id: 1,
          sx: 1,
          sy: 1,
          fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' },
          celestialObjectId: null,
          celestialObject: null,
        },
        {
          id: 2,
          sx: 2,
          sy: 1,
          fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Weltraum' },
          celestialObjectId: null,
          celestialObject: null,
        },
      ],
      canEnterSystem: false,
      canLeaveSystem: false,
    };
    const cartography = {
      id: 4,
      targetType: 'SYSTEM' as const,
      starSystemId: 8,
      mapRegionId: null,
      status: 'PLANNED' as const,
      remainingFieldIds: [2],
      remainingCoordinates: [{ x: 2, y: 1 }],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      completionOutcome: null,
      actions: {
        plan: { available: false, reason: null },
        finalize: { available: false, reason: null },
      },
    };
    apiMocks.get.mockResolvedValue(systemMap);
    const { rerender } = render(
      <NavigationPanel
        ship={{
          ...ship,
          location: { scope: 'SYSTEM', systemId: 8, x: 1, y: 1 },
          lssMode: 'CARTOGRAPHY',
        }}
        cartography={cartography}
        onShipUpdate={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', {
        name: /Feld 2,1.*verbleibender Messpunkt/,
      }),
    ).toBeTruthy();

    rerender(
      <NavigationPanel
        ship={{
          ...ship,
          location: { scope: 'SYSTEM', systemId: 8, x: 1, y: 1 },
          lssMode: 'TERRITORY',
        }}
        cartography={cartography}
        onShipUpdate={vi.fn()}
      />,
    );

    // The frame no longer depends on the Kartographieansicht.
    const field = screen.getByRole('button', { name: /Feld 2,1/ });
    expect(field.getAttribute('aria-label')).toContain('verbleibender Messpunkt');
    expect(field.className).toContain('ring-amber-400');
  });

  it('marks remaining region measure points on the galaxy map (tmw-K8b3)', async () => {
    apiMocks.get.mockResolvedValue(map);
    render(
      <NavigationPanel
        ship={{ ...ship, lssMode: 'CARTOGRAPHY' }}
        cartography={{
          id: 6,
          targetType: 'REGION',
          starSystemId: null,
          mapRegionId: 3,
          status: 'PLANNED',
          remainingFieldIds: [7],
          remainingCoordinates: [{ x: 6, y: 5 }],
          finalizationStartedAt: null,
          finalizationTick: null,
          finalizingSpacecraftId: null,
          completedAt: null,
          completionOutcome: null,
          actions: {
            plan: { available: false, reason: null },
            finalize: { available: false, reason: null },
          },
        }}
        onShipUpdate={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', {
        name: /Feld 6,5.*verbleibender Messpunkt/,
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /Feld 4,4/ })
        .getAttribute('aria-label'),
    ).not.toContain('Messpunkt');
  });

  it('uses blind navigation until long-range sensors are activated', async () => {
    apiMocks.post.mockResolvedValue({});
    apiMocks.patch.mockResolvedValue({});
    render(
      <NavigationPanel
        ship={{
          ...ship,
          runtimeSystems: {
            ...ship.runtimeSystems,
            LONG_RANGE_SENSORS: { active: false },
          },
        }}
        onShipUpdate={vi.fn()}
      />,
    );
    expect(
      await screen.findByText(
        /Navigation Applet \(Langstreckensensoren aktivieren\)/,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Feld 6,5/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Blindflug nach 6|5' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', {
        targetX: 6,
        targetY: 5,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Langstreckensensoren aktivieren' }),
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/LONG_RANGE_SENSORS',
        { active: true },
      ),
    );
  });

  it('uses canonical system location coordinates for blind navigation', async () => {
    apiMocks.post.mockResolvedValue({});
    render(
      <NavigationPanel
        ship={{
          ...ship,
          location: { scope: 'SYSTEM', systemId: 8, x: 20, y: 30 },
          runtimeSystems: {
            ...ship.runtimeSystems,
            LONG_RANGE_SENSORS: { active: false },
          },
        }}
        onShipUpdate={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Blindflug nach 21|30' }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/navigate', {
        targetX: 21,
        targetY: 30,
      }),
    );
  });

  it('uses step size for directional movement and reports request errors', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockRejectedValue(new Error('Route blockiert'));
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);
    await screen.findByText(/LSS · Galaxie/);
    fireEvent.change(screen.getByLabelText('Felder pro Schritt'), {
      target: { value: '3' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Nach Norden fliegen' }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', {
        targetX: 5,
        targetY: 2,
      }),
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Route blockiert',
    );
  });

  it('shows map failures', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('Sensoren offline'));
    const { unmount } = render(
      <NavigationPanel ship={ship} onShipUpdate={vi.fn()} />,
    );
    expect(
      await screen.findByText('Keine Kartendaten verfügbar.'),
    ).toBeTruthy();
    expect(screen.getByText('Sensoren offline')).toBeTruthy();
    unmount();
  });

  it('hides the LSS toggle without long range sensors and movement without a drive like STU', () => {
    render(
      <NavigationPanel
        ship={{ ...ship, runtimeSystems: {} }}
        onShipUpdate={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Langstreckensensoren aktivieren/ }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /Blindflug nach/ })).toBeNull();
    expect(screen.getByText('Navigation')).toBeTruthy();
  });
});
