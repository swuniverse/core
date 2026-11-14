import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  arrivalAt: null,
  location: { scope: 'GALAXY' as const, layerId: 1, x: 5, y: 5 },
  runtimeSystems: { LONG_RANGE_SENSORS: { active: true } },
};

describe('NavigationPanel', () => {
  it('shows destination effects, energy, and damage before flight', async () => {
    apiMocks.get.mockResolvedValueOnce({
      ...map,
      fields: map.fields.map((field) =>
        field.cx === 6 && field.cy === 5
          ? {
              ...field,
              effects: ['EPS_LEAK'],
              energyCost: 3,
              damage: 7,
            }
          : field,
      ),
    });
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5/ }));

    expect(screen.getByText(/Gefährliches Feld \[6\|5\]/)).toBeTruthy();
    expect(screen.getByText('Energie: 3 · Schaden: 7')).toBeTruthy();
    expect(screen.getByText(/EPS-Energie ableiten/)).toBeTruthy();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
  });

  it('warns when the destination lies in an ion storm', async () => {
    apiMocks.get.mockResolvedValueOnce({
      ...map,
      fields: map.fields.map((field) =>
        field.cx === 6 && field.cy === 5
          ? {
              ...field,
              anomalies: [
                { type: 'ION_STORM', name: 'Ionensturm', remainingTicks: 40, intensity: 130 },
              ],
            }
          : field,
      ),
    });
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5/ }));

    expect(
      screen.getByText(
        'Das Ziel liegt in einem gefährlichen Ionensturm: Ionensturm (Intensität 130, noch 40 Ticks)',
      ),
    ).toBeTruthy();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('confirms an accessible field before flying', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockResolvedValue({});
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);
    const field = await screen.findByRole('button', { name: /Feld 6,5/ });
    fireEvent.click(field);
    fireEvent.click(screen.getByRole('button', { name: 'Flug starten' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', {
        targetX: 6,
        targetY: 5,
      }),
    );
  });

  it('opens the combat report and refreshes the reached state after an alert stop', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockResolvedValue({
      ship: { id: 2 },
      movement: {
        plannedSteps: 3,
        completedSteps: 1,
        stopReason: 'ALERT_COMBAT',
        movedShipIds: [2],
        destroyedShipIds: [],
        combatReport: {
          parties: {
            attacker: [{ id: 9, name: 'Wache', destroyed: false }],
            defender: [{ id: 2, name: 'X-Wing', destroyed: false }],
          },
          rounds: [
            { number: 1, lines: [{ kind: 'ENERGY_HIT', text: 'Wache feuert auf X-Wing', emphasis: 'warning' }] },
          ],
          outcome: { winner: 'ATTACKER', destroyedShipIds: [] },
        },
      },
    });
    const onShipUpdate = vi.fn();
    render(<NavigationPanel ship={ship} onShipUpdate={onShipUpdate} />);
    fireEvent.click(await screen.findByRole('button', { name: /Feld 6,5/ }));
    const mapLoads = apiMocks.get.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Flug starten' }));

    const dialog = await screen.findByRole('dialog', { name: 'Kampfbericht' });
    expect(within(dialog).getByText(/Wache feuert auf X-Wing/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Flug durch Alarmreaktion gestoppt');
    await waitFor(() => expect(onShipUpdate).toHaveBeenCalled());
    expect(apiMocks.get.mock.calls.length).toBeGreaterThan(mapLoads);
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
      starSystemId: 8,
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

    const field = screen.getByRole('button', { name: /Feld 2,1/ });
    expect(field.getAttribute('aria-label')).not.toContain('Messpunkt');
  });

  it('uses blind navigation until long-range sensors are activated', async () => {
    apiMocks.post.mockResolvedValue({});
    apiMocks.patch.mockResolvedValue({});
    render(
      <NavigationPanel
        ship={{
          ...ship,
          runtimeSystems: { LONG_RANGE_SENSORS: { active: false } },
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
          runtimeSystems: { LONG_RANGE_SENSORS: { active: false } },
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
});
