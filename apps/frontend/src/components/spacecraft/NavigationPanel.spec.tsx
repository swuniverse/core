import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NavigationPanel } from './NavigationPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
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
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
  });

  it('flies directly to an accessible field', async () => {
    apiMocks.get.mockResolvedValue(map);
    apiMocks.post.mockResolvedValue({});
    render(<NavigationPanel ship={ship} onShipUpdate={vi.fn()} />);
    const field = await screen.findByRole('button', { name: /Feld 6,5/ });
    fireEvent.click(field);
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/fly', {
        targetX: 6,
        targetY: 5,
      }),
    );
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
