import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
      shields: 0,
      shieldsActive: false,
      hyperdriveActive: false,
      isOwn: false,
      inHyperspace: false,
      actions: {
        attack: true,
        scan: true,
        intercept: false,
        contact: true,
        transfer: true,
        energyTransfer: false,
        tractor: false,
        boarding: false,
      },
    },
  ],
  escapePods: [],
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
  it('lists escape pods as passive targets without ship actions', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [],
      escapePods: [
        {
          id: 5,
          targetType: 'ESCAPE_POD',
          originShipName: 'Falcon',
          occupantCount: 4,
          presentationKey: 'REBEL_ESCAPE_PODS',
          displayName: 'Rettungskapseln der Rebellenallianz',
          icon: 'ships/buoy/1.png',
        },
      ],
    });
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/Rettungskapseln der Rebellenallianz von Falcon/),
    ).toBeTruthy();
    expect(screen.getByText('4 Insassen')).toBeTruthy();
    expect(screen.queryByTitle(/angreifen|übergeben|transferieren/)).toBeNull();
  });

  it('opens the EPS transfer dialog and posts the amount', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          actions: { ...nearby.ships[0].actions, energyTransfer: true },
        },
      ],
    });
    apiMocks.post.mockResolvedValue({
      transferred: 2,
      requested: 5,
      energy: 10,
      message: 'Es wurden 2 von 5 Energie zur Ziel transferiert',
    });
    const onUpdate = vi.fn();
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(await screen.findByTitle('Energie zur Ziel transferieren'));
    fireEvent.change(await screen.findByLabelText('Energiemenge'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByText('Transferieren'));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/nearby/3/eps-transfer',
        { amount: 5 },
      ),
    );
    expect(await screen.findByText(/2 von 5 Energie/)).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('renders a multi-ship combat report', async () => {
    apiMocks.get.mockResolvedValue(nearby);
    apiMocks.post.mockResolvedValue({
      parties: {
        attacker: [
          { id: 2, name: 'Falcon', destroyed: false },
          { id: 4, name: 'Wing', destroyed: true },
        ],
        defender: [{ id: 3, name: 'Ziel', destroyed: false }],
      },
      rounds: [
        {
          number: 1,
          lines: [
            {
              kind: 'ENERGY_HIT',
              text: 'Falcon feuert mit Turbolaser auf Ziel (12 Schaden).',
              emphasis: 'neutral',
              sourceId: 2,
              targetId: 3,
              weapon: 'Turbolaser',
              damage: 12,
            },
          ],
        },
      ],
      outcome: { winner: 'attacker', destroyedShipIds: [4] },
    });
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByTitle('Ziel angreifen'));

    expect(await screen.findByText('Angreifer (2)')).toBeTruthy();
    expect(screen.getByText('Verteidiger (1)')).toBeTruthy();
    expect(screen.getByText(/Wing.*zerstört/)).toBeTruthy();
    expect(screen.getByText(/Turbolaser.*12 Schaden/)).toBeTruthy();
  });

  it('joins a nearby own fleet leader', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          isOwn: true,
          fleetId: 7,
          isFleetLeader: true,
        },
      ],
    });
    apiMocks.post.mockResolvedValue({});
    const onUpdate = vi.fn();
    render(
      <MemoryRouter>
        <NearbySensorPanel
          shipId={2}
          locationKey="system:1:5:5"
          systems={{ SHORT_RANGE_SENSORS: { active: true } }}
          onUpdate={onUpdate}
        />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTitle('Flotte beitreten'));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/fleets/7/join', {
        shipId: 2,
      }),
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it('opens cargo and module salvage from an NBS wreck', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      wrecks: [
        {
          id: 8,
          hull: 22,
          cargo: [{ commodityId: 4, amount: 2 }],
          modules: [{ commodityId: 10_101, amount: 1 }],
        },
      ],
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
    expect(screen.getByText('Modul #10101: 1')).toBeTruthy();
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
          ? {
              ...nearby,
              actionsAvailable: false,
              hyperdriveActive: true,
              ships: nearby.ships.map((target) => ({
                ...target,
                actions: {
                  ...target.actions,
                  attack: false,
                  contact: false,
                  transfer: false,
                },
              })),
            }
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
  it('salvages own crew from an escape pod with the NBS action', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [],
      escapePods: [
        {
          id: 5,
          targetType: 'ESCAPE_POD',
          originShipName: 'Falcon',
          occupantCount: 2,
          presentationKey: 'REBEL_ESCAPE_PODS',
          displayName: 'Rettungskapseln',
          icon: null,
          canSalvage: true,
        },
      ],
    });
    apiMocks.post.mockResolvedValue({
      salvaged: 2,
      remaining: 0,
      foreign: 0,
      energy: 4,
      message: '2 Crewmitglieder wurden von den Rettungskapseln geborgen',
    });
    const onUpdate = vi.fn();
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(await screen.findByTitle('Rettungskapseln bergen'));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/nearby/escape-pods/5/salvage',
        {},
      ),
    );
    expect(await screen.findByText(/2 Crewmitglieder wurden/)).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('offers no salvage for pods without own crew', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [],
      escapePods: [
        {
          id: 6,
          targetType: 'ESCAPE_POD',
          originShipName: 'Fremd',
          occupantCount: 1,
          presentationKey: 'REBEL_ESCAPE_PODS',
          displayName: 'Rettungskapseln',
          icon: null,
          canSalvage: false,
        },
      ],
    });
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{ SHORT_RANGE_SENSORS: { active: true } }}
        onUpdate={vi.fn()}
      />,
    );
    await screen.findByText(/von Fremd/);
    expect(screen.queryByTitle('Rettungskapseln bergen')).toBeNull();
  });
});
