import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NearbySensorPanel } from './NearbySensorPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
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
    apiMocks.delete.mockReset();
  });
  it('labels a detected cloak and attacks it through the regular combat API', async () => {
    apiMocks.get.mockResolvedValue({ ...nearby, ships: [{ ...nearby.ships[0], cloaked: true }] });
    apiMocks.post.mockResolvedValue({ rounds: [], outcome: { winner: 'draw' } });
    const onUpdate = vi.fn();
    render(<NearbySensorPanel shipId={2} locationKey="galaxy:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true }, TRACKER: { active: false } }} onUpdate={onUpdate} />);
    expect(await screen.findByText('Getarnt (aufgedeckt)')).toBeTruthy();
    expect(screen.queryByTitle('Ziel mit Peilsender markieren')).toBeNull();
    fireEvent.click(screen.getByTitle('Getarntes Ziel angreifen'));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/combat/attack', { attackerId: 2, targetId: 3 }));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('removes detected contacts when the scan expires', async () => {
    vi.useFakeTimers();
    try {
      apiMocks.get.mockResolvedValueOnce({ ...nearby, tachyonScanExpiresAt: Date.now() + 300_000, ships: [{ ...nearby.ships[0], cloaked: true }] }).mockResolvedValue({ ...nearby, ships: [] });
      const view = render(<NearbySensorPanel shipId={2} locationKey="galaxy:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true } }} onUpdate={vi.fn()} />);
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByTitle('Getarntes Ziel angreifen')).toBeTruthy();
      await act(async () => { vi.advanceTimersByTime(299_999); });
      expect(apiMocks.get).toHaveBeenCalledTimes(1);
      await act(async () => { vi.advanceTimersByTime(1); });
      expect(apiMocks.get).toHaveBeenCalledTimes(2);
      expect(screen.queryByTitle('Getarntes Ziel angreifen')).toBeNull();
      view.unmount();
    } finally {
      vi.useRealTimers();
    }
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
  it('marks a foreign nearby ship with the installed tracker', async () => {
    apiMocks.get.mockResolvedValue(nearby);
    apiMocks.post.mockResolvedValue({ targetId: 3 });
    const onUpdate = vi.fn();
    render(
      <NearbySensorPanel
        shipId={2}
        locationKey="system:1:5:5"
        systems={{
          SHORT_RANGE_SENSORS: { active: true },
          TRACKER: { active: false },
        }}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(await screen.findByTitle('Ziel mit Peilsender markieren'));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/tracker/3', {}),
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it('boards an eligible nearby ship and shows the combat result', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          actions: { ...nearby.ships[0].actions, boarding: true },
        },
      ],
    });
    apiMocks.post.mockResolvedValue({
      message: 'Die Crew der Ziel wurde getötet.',
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

    fireEvent.click(await screen.findByTitle('Ziel entern'));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/nearby/3/board',
        {},
      ),
    );
    expect(
      await screen.findByText('Die Crew der Ziel wurde getötet.'),
    ).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows takeover progress and lets the attacker cancel', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [{ ...nearby.ships[0], takeover: { attackerId: 2, targetId: 3, ticksRemaining: 6, totalTicks: 10, prestigeCost: 8, completed: false } }],
    });
    apiMocks.delete.mockResolvedValue({});
    render(<NearbySensorPanel shipId={2} locationKey="system:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true } }} onUpdate={vi.fn()} />);
    expect(await screen.findByLabelText('Übernahmefortschritt 4 von 10')).toBeTruthy();
    fireEvent.click(screen.getByTitle('Übernahme abbrechen'));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/2/takeover'));
  });

  it('starts takeover of an eligible unmanned target', async () => {
    apiMocks.get.mockResolvedValue({ ...nearby, ships: [{ ...nearby.ships[0], actions: { ...nearby.ships[0].actions, takeover: true } }] });
    apiMocks.post.mockResolvedValue({});
    render(<NearbySensorPanel shipId={2} locationKey="system:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true } }} onUpdate={vi.fn()} />);
    fireEvent.click(await screen.findByTitle('Ziel übernehmen'));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/nearby/3/takeover', {}));
  });

  it('disables attacks against vacation ships with the server reason', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          name: 'Ziel (Urlaub)',
          actions: {
            ...nearby.ships[0].actions,
            attack: false,
            attackReason:
              'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
          },
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

    expect(await screen.findByText('Ziel (Urlaub)')).toBeTruthy();
    const attack = screen.getByTitle(
      'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
    );
    expect((attack as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(attack);
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('activates a tractor beam on an eligible own ship', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          isOwn: true,
          actions: { ...nearby.ships[0].actions, tractor: true },
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

    fireEvent.click(await screen.findByTitle('Ziel mit Traktorstrahl erfassen'));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/nearby/3/tractor',
        {},
      ),
    );
    expect(onUpdate).toHaveBeenCalled();
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

  it('joins a nearby own fleet from its header', async () => {
    apiMocks.get.mockResolvedValue({
      ...nearby,
      fleets: [{ id: 7, name: 'Rotte', leadShipId: 3, username: 'Ich', isOwn: true, visibleShips: 1, defending: false, blocking: false, canJoin: true }],
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
  it('docks at an own station from the NBS list', async () => {
    const onUpdate = vi.fn();
    apiMocks.get.mockResolvedValue({
      ...nearby,
      ships: [
        {
          ...nearby.ships[0],
          id: 9,
          name: 'Hoth-Depot',
          isOwn: true,
          kind: 'STATION',
          actions: { ...nearby.ships[0].actions, dock: true },
        },
        { ...nearby.ships[0], id: 3, name: 'Fremd' },
      ],
    });
    apiMocks.post.mockResolvedValue({ message: 'Andockvorgang abgeschlossen', shipIds: [2] });
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
    expect(screen.queryByTitle('An Fremd andocken')).toBeNull();
    fireEvent.click(await screen.findByTitle('An Hoth-Depot andocken'));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/dock/9', {}),
    );
    expect(await screen.findByText('Andockvorgang abgeschlossen')).toBeTruthy();
    expect(onUpdate).toHaveBeenCalled();
  });

  it('groups stations, fleets, single ships and wrecks in STU order', async () => {
    const base = nearby.ships[0];
    apiMocks.get.mockResolvedValue({
      ...nearby,
      fleets: [{ id: 7, name: 'Schwarze Rotte', leadShipId: 4, username: 'Andere', isOwn: false, visibleShips: 2, defending: true, blocking: false, canJoin: false }],
      ships: [
        { ...base, id: 5, name: 'Einzel', hasLogBook: true, rpgActive: true },
        { ...base, id: 3, name: 'Flügel', fleetId: 7 },
        { ...base, id: 4, name: 'Führer', fleetId: 7, isFleetLeader: true },
        { ...base, id: 9, name: 'Depot', kind: 'STATION' },
      ],
      wrecks: [{ id: 1, hull: 5, cargo: [], modules: [] }],
    });
    render(
      <MemoryRouter>
        <NearbySensorPanel shipId={2} locationKey="system:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true } }} onUpdate={vi.fn()} />
      </MemoryRouter>,
    );
    await screen.findByText('Schwarze Rotte');
    const rows = screen.getAllByRole('row').map((row) => row.textContent ?? '');
    const at = (text: string) => rows.findIndex((row) => row.includes(text));
    expect(at('Stationen')).toBeLessThan(at('Depot'));
    expect(at('Depot')).toBeLessThan(at('Schwarze Rotte'));
    expect(rows[at('Schwarze Rotte')]).toContain('2 Schiffe');
    expect(at('Schwarze Rotte')).toBeLessThan(at('Führer'));
    expect(at('Führer')).toBeLessThan(at('Flügel'));
    expect(at('Flügel')).toBeLessThan(at('Einzelschiffe'));
    expect(at('Einzelschiffe')).toBeLessThan(at('Einzel') + 1);
    expect(at('Einzel')).toBeLessThan(at('Trümmerfelder'));
    expect(screen.getByTitle('verteidigt die Kolonie')).toBeTruthy();
    expect(screen.queryByTitle('Flotte beitreten')).toBeNull();
    expect(screen.getByTitle('Logbuch verfügbar')).toBeTruthy();
    expect(screen.getByTitle('RPG-Modul aktiv')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'zuklappen' }));
    expect(screen.queryByText('Führer')).toBeNull();
    expect(within(screen.getByTestId('nbs-fleet-7')).getByTitle('Nachricht an Andere verfassen')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'aufklappen' }));
    expect(screen.getByText('Führer')).toBeTruthy();
  });

  it('hints at cloaked ships instead of the empty-sector message', async () => {
    apiMocks.get.mockResolvedValue({ ...nearby, ships: [], cloakedShipsHint: true });
    render(<NearbySensorPanel shipId={2} locationKey="galaxy:1:5:5" systems={{ SHORT_RANGE_SENSORS: { active: true } }} onUpdate={vi.fn()} />);
    expect(await screen.findByText('Es befinden sich getarnte Schiffe in diesem Sektor')).toBeTruthy();
    expect(screen.queryByText('Es befinden sich keine Schiffe in diesem Sektor.')).toBeNull();
  });
});
