import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NearbySensorPanel } from './NearbySensorPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({ shipImage: () => '/ship.png' }));

const nearby = {
  actionsAvailable: true,
  hyperdriveActive: false,
  ships: [
    {
      id: 3,
      name: 'Ziel',
      shipClassId: 1,
      username: 'Andere',
      hull: 10,
      hullMax: 10,
      shieldsActive: false,
      hyperdriveActive: false,
      canScan: true,
      canAttack: true,
    },
  ],
  wrecks: [],
};

describe('NearbySensorPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
  });
  it('uses active NBS and shows STU actions', async () => {
    apiMocks.get.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('/nearby') ? nearby : []),
    );
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );
    expect(await screen.findByText('Ziel')).toBeTruthy();
    expect(screen.getByTitle('Ziel angreifen')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Fracht an Ziel übergeben'));
    expect(
      await screen.findByRole('dialog', { name: 'Fracht an Ziel übergeben' }),
    ).toBeTruthy();
  });
  it('opens cargo salvage from an NBS wreck', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      wrecks: [{ id: 8, hull: 22, cargo: [{ commodityId: 4, amount: 2 }] }],
    });
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByTitle('Bergung'));
    expect(await screen.findByRole('dialog', { name: 'Bergung' })).toBeTruthy();
    expect(screen.getByText('Ware #4: 2')).toBeTruthy();
  });
  it('opens a real target scan', async () => {
    apiMocks.get.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('/nearby') ? nearby : []),
    );
    apiMocks.post.mockResolvedValue({
      ...nearby.ships[0],
      shields: 4,
      shieldsMax: 10,
      crew: 2,
      crewMax: 4,
      energy: 2,
      battery: 1,
      reactorFuel: 0,
      reactorFuelMax: 0,
      alertState: 'GREEN',
      modules: [],
      runtimeSystems: { SHIELDS: { active: true, cooldown: 0, integrity: 90 } },
    });
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(await screen.findByTitle('Ziel scannen'));
    expect(await screen.findByRole('dialog', { name: 'Scan' })).toBeTruthy();
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/spacecraft/2/nearby/3/scan',
      {},
    );
  });
  it('keeps only scanning while the hyperdrive is active', async () => {
    apiMocks.get.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/nearby')
          ? { ...nearby, actionsAvailable: false, hyperdriveActive: true }
          : [],
      ),
    );
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );
    expect(await screen.findByText('Hyperantrieb aktiv')).toBeTruthy();
    expect(screen.queryByTitle('Ziel angreifen')).toBeNull();
    expect(screen.getByTitle('Ziel scannen')).toBeTruthy();
  });
  it('activates inactive NBS', async () => {
    apiMocks.patch.mockResolvedValue({});
    const onUpdate = vi.fn();
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: false } }}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Nahbereichssensoren aktivieren/ }),
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/systems/SHORT_RANGE_SENSORS',
        { active: true },
      ),
    );
  });
});
