import { WsEventType } from '@swuniverse/shared';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpacecraftPage } from './spacecraft';

const handlers = vi.hoisted(() => new Map<string, (payload: unknown) => void>());
vi.mock('../hooks/use-socket', () => ({ useSocket: (event: string, handler: (payload: unknown) => void) => handlers.set(event, handler) }));

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: apiMocks }));
vi.mock('../lib/assets', () => ({
  shipImage: () => '/ship.png',
  alertStateImage: (state: string) => `/alert-${state}.png`,
  commodityImage: (id: number) => `/assets/commodities/${id}.png`,
}));

const ship = {
  id: 2,
  name: 'Falke',
  shipClassId: 7,
  status: 'IDLE',
  specialStatus: 'STANDBY',
  alertState: 'GREEN',
  layer: { id: 3, name: 'Normalraum' },
  hull: 90,
  hullMax: 100,
  shields: 40,
  shieldsMax: 50,
  shieldActive: true,
  shieldRegeneration: 4,
  energy: 70,
  energyMax: 100,
  energyGain: 8,
  energyConsumption: 3,
  reactorUsage: 11,
  warpdrive: 2,
  warpdriveMax: 20,
  warpdriveGain: 4,
  reactorFuel: 17,
  reactorFuelMax: 30,
  battery: 3,
  batteryMax: 5,
  crew: 4,
  crewRequired: 5,
  crewMax: 8,
  systems: {
    SHORT_RANGE_SENSORS: { present: true, active: true, damaged: false },
    LONG_RANGE_SENSORS: { present: true, active: false, damaged: false },
    WEAPONS: { present: true, active: false, damaged: true },
    TORPEDO_BANK: { present: false, active: false, damaged: false },
  },
  location: { scope: 'GALAXY' as const, layerId: 3, x: 5, y: 6 },
};

describe('SpacecraftPage', () => {
  it('discards an older list response that arrives after scene removal', async () => {
    let finish!: (ships: typeof ship[]) => void;
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    apiMocks.get.mockResolvedValueOnce([]);
    render(<MemoryRouter><SpacecraftPage /></MemoryRouter>);
    apiMocks.get.mockResolvedValue([]);
    await act(async () => { handlers.get(WsEventType.SPACECRAFT_VISIBILITY_CHANGED)?.({ type: 'REMOVED', shipId: ship.id }); });
    await act(async () => { finish([ship]); });
    expect(screen.queryAllByText('Falke')).toHaveLength(0);
  });
  it('reloads the ship list only for shield-regeneration events', async () => {
    apiMocks.get.mockReset();
    apiMocks.get.mockResolvedValue([ship]);
    render(<MemoryRouter><SpacecraftPage /></MemoryRouter>);
    await screen.findAllByText('Falke');
    apiMocks.get.mockClear();

    await act(async () => {
      handlers.get(WsEventType.SPACECRAFT_EVENT)?.({
        type: 'SYSTEM_TOGGLED',
        shipId: ship.id,
      });
    });
    expect(apiMocks.get).not.toHaveBeenCalled();

    await act(async () => {
      handlers.get(WsEventType.SPACECRAFT_EVENT)?.({
        type: 'SHIELDS_REGENERATED',
        shipId: ship.id,
      });
    });
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft'),
    );
    expect(apiMocks.get.mock.calls.filter(([path]) => path === '/spacecraft')).toHaveLength(1);
  });
  it('removes a hidden scene from an already open player list and reloads after revelation', async () => {
    apiMocks.get.mockReset(); apiMocks.get.mockResolvedValue([ship]);
    render(<MemoryRouter><SpacecraftPage /></MemoryRouter>);
    await screen.findAllByText('Falke');
    apiMocks.get.mockResolvedValue([]);
    await act(async () => { handlers.get(WsEventType.SPACECRAFT_VISIBILITY_CHANGED)?.({ type: 'REMOVED', shipId: ship.id }); });
    expect(screen.queryAllByText('Falke')).toHaveLength(0);
    apiMocks.get.mockResolvedValue([ship]);
    await act(async () => { handlers.get(WsEventType.SPACECRAFT_VISIBILITY_CHANGED)?.({ type: 'STATE', shipId: ship.id }); });
    expect(await screen.findAllByText('Falke')).toHaveLength(1);
  });
  it('lists own buoys with their position below the ship list', async () => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((path: string) => Promise.resolve(path === '/spacecraft/buoys'
      ? [{ id: 1, text: 'Treffpunkt', ownerId: 1, ownerName: 'Ich', createdAt: '2026-11-20T10:00:00Z', sector: '3|4 (Yavin-System)' }]
      : [ship]));
    render(<MemoryRouter><SpacecraftPage /></MemoryRouter>);

    const table = (await screen.findByRole('heading', { name: 'Bojen' })).closest('section')!;
    expect(within(table).getByText('Treffpunkt')).toBeTruthy();
    expect(within(table).getByText('3|4 (Yavin-System)')).toBeTruthy();
  });
  it('loads each ship cargo on first hover and reuses the cached hold', async () => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft') {
        return Promise.resolve([
          { ...ship, id: 251, name: 'Falke', cargoMax: 20 },
          { ...ship, id: 252, name: 'Adler', cargoMax: 30 },
        ]);
      }
      if (path === '/spacecraft/251/cargo') {
        return Promise.resolve([
          { id: 1, commodityId: 42424242, commodityName: 'Tibanna', amount: 4 },
        ]);
      }
      if (path === '/spacecraft/252/cargo') {
        return Promise.resolve([
          { id: 2, commodityId: 42424243, commodityName: 'Duranium', amount: 7 },
        ]);
      }
      if (path === '/spacecraft/buoys') return Promise.resolve([]);
      throw new Error(`Unexpected API request: ${path}`);
    });

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    const falke = await screen.findByRole('button', { name: 'Lager von Falke' });
    const adler = screen.getByRole('button', { name: 'Lager von Adler' });
    expect(apiMocks.get).toHaveBeenCalledTimes(2);

    fireEvent.mouseEnter(falke, { clientX: 40, clientY: 30 });
    const falkeTooltip = await screen.findByRole('tooltip');
    expect(await screen.findByText('Tibanna')).toBeTruthy();
    expect(falkeTooltip.textContent).toContain('Lagerraum 4/20');
    expect(falkeTooltip.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/commodities/42424242.png',
    );
    expect(apiMocks.get).toHaveBeenNthCalledWith(3, '/spacecraft/251/cargo');

    fireEvent.mouseLeave(falke);
    fireEvent.mouseEnter(falke, { clientX: 40, clientY: 30 });
    expect(apiMocks.get).toHaveBeenCalledTimes(3);

    fireEvent.mouseEnter(adler, { clientX: 60, clientY: 30 });
    const adlerTooltip = await screen.findByRole('tooltip');
    expect(await screen.findByText('Duranium')).toBeTruthy();
    expect(adlerTooltip.textContent).toContain('7/30');
    expect(adlerTooltip.textContent).not.toContain('Tibanna');
    expect(apiMocks.get).toHaveBeenNthCalledWith(4, '/spacecraft/252/cargo');
  });

  it('formats cargo amounts and capacity with German thousands separators', async () => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft') {
        return Promise.resolve([
          { ...ship, id: 261, name: 'Frachtfalke', cargoMax: 10_000 },
        ]);
      }
      if (path === '/spacecraft/261/cargo') {
        return Promise.resolve([
          { id: 3, commodityId: 42424244, commodityName: 'Duranium', amount: 1_234 },
        ]);
      }
      if (path === '/spacecraft/buoys') return Promise.resolve([]);
      throw new Error(`Unexpected API request: ${path}`);
    });

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    fireEvent.mouseEnter(
      await screen.findByRole('button', { name: 'Lager von Frachtfalke' }),
      { clientX: 40, clientY: 30 },
    );

    const tooltip = await screen.findByRole('tooltip');
    expect(await screen.findByRole('cell', { name: '1.234' })).toBeTruthy();
    expect(tooltip.textContent).toContain('Lagerraum 1.234/10.000');
  });

  it('shows an empty hold when touched without loading cargo before the tap', async () => {
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/spacecraft') {
        return Promise.resolve([
          { ...ship, id: 260, name: 'Leerer Falke', cargoMax: 20 },
        ]);
      }
      if (path === '/spacecraft/260/cargo') return Promise.resolve([]);
      if (path === '/spacecraft/buoys') return Promise.resolve([]);
      throw new Error(`Unexpected API request: ${path}`);
    });

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    const image = await screen.findByRole('button', { name: 'Lager von Leerer Falke' });
    expect(apiMocks.get).toHaveBeenCalledTimes(2);

    fireEvent.touchStart(image, { touches: [{ clientX: 40, clientY: 30 }] });
    fireEvent.click(image);

    const tooltip = await screen.findByRole('tooltip');
    expect(await screen.findByRole('cell', { name: 'Leer' })).toBeTruthy();
    expect(tooltip.textContent).toContain('Lagerraum 0/20');
    expect(apiMocks.get).toHaveBeenNthCalledWith(3, '/spacecraft/260/cargo');
  });

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
        location: {
          scope: 'SYSTEM',
          systemId: 8,
          layerId: 3,
          galaxyX: 4,
          galaxyY: 7,
          x: 11,
          y: 12,
        },
      },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    // STU: system position first, galaxy field in brackets.
    expect(await screen.findByText('(8|9)')).toBeTruthy();
    expect(screen.getByText('11|12 (4|7)')).toBeTruthy();
  });

  it('groups fleets and singles and manages fleets from the last cell like STU', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...ship,
        id: 2,
        name: 'Falke',
        fleetId: 4,
        fleetName: 'Rote Staffel',
        fleetLeaderId: 3,
      },
      {
        ...ship,
        id: 3,
        name: 'Adler',
        fleetId: 4,
        fleetName: 'Rote Staffel',
        fleetLeaderId: 3,
      },
      {
        ...ship,
        id: 5,
        name: 'Speer',
        fleetId: 8,
        fleetName: 'Blaue Staffel',
        fleetLeaderId: 5,
      },
      { ...ship, id: 7, name: 'Solo', fleetId: null },
    ]);
    apiMocks.post.mockResolvedValue({ id: 9 });

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Rote Staffel' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Blaue Staffel' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Einzelschiffe' })).toBeTruthy();
    expect(screen.getByLabelText('Flottenführer Adler')).toBeTruthy();
    // STU shiplistFleetform: crew sum of the members against the fleet limit.
    expect(screen.getByText('(10/100 Crew)')).toBeTruthy();

    // STU shiplist: the last cell creates, leaves or dissolves a fleet.
    fireEvent.click(screen.getByRole('button', { name: 'Flotte erstellen: Solo' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/fleets/create', {
        name: 'Flotte',
        leaderId: 7,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Flotte verlassen: Falke' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/leave-fleet', {}),
    );
    apiMocks.delete.mockResolvedValue({});
    fireEvent.click(await screen.findByRole('button', { name: 'Flotte auflösen: Adler' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/fleets/4'));
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft');
  });

  it('adds idle single ships on the leader field to a fleet like STU', async () => {
    const away = { ...ship.location, x: ship.location.x + 1 };
    apiMocks.get.mockResolvedValue([
      { ...ship, id: 3, name: 'Adler', fleetId: 4, fleetName: 'Rote Staffel', fleetLeaderId: 3 },
      { ...ship, id: 7, name: 'Solo', fleetId: null },
      { ...ship, id: 8, name: 'Fern', fleetId: null, location: away },
      { ...ship, id: 9, name: 'Werft', fleetId: null, status: 'UNDER_CONSTRUCTION' },
    ]);
    apiMocks.post.mockReset();
    apiMocks.post.mockResolvedValue({});
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Schiff zu Rote Staffel hinzufügen' }));
    const dialog = screen.getByRole('dialog', { name: 'Schiff(e) hinzufügen' });
    expect(within(dialog).queryByText('Fern')).toBeNull();
    expect(within(dialog).queryByText('Werft')).toBeNull();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Solo' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schiffe hinzufügen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/fleets/4/join', { shipId: 7 }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renames a fleet from the header field like STU', async () => {
    apiMocks.get.mockResolvedValue([
      { ...ship, id: 2, fleetId: 4, fleetName: 'Rote Staffel', fleetLeaderId: 2 },
    ]);
    apiMocks.patch.mockResolvedValue({});
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    const field = await screen.findByLabelText('Flottenname Rote Staffel');
    fireEvent.change(field, { target: { value: ' Gold-Staffel ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Name von Rote Staffel ändern' }));

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/spacecraft/fleets/4', { name: 'Gold-Staffel' }),
    );
    expect(screen.queryByRole('button', { name: /^Alarmstufe .* für Rote Staffel$/ })).toBeNull();
  });

  it('lists no stations; they have their own page like STU', async () => {
    apiMocks.get.mockResolvedValue([
      ship,
      { ...ship, id: 9, name: 'Hoth-Phalanx', kind: 'STATION', stationRole: 'SENSOR', fleetId: null },
    ]);
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    await screen.findAllByText('Falke');
    expect(screen.queryByRole('heading', { name: 'Stationen' })).toBeNull();
    expect(screen.queryByText('Hoth-Phalanx')).toBeNull();
  });

  it('shows the dock icon for docked ships only', async () => {
    apiMocks.get.mockResolvedValue([
      { ...ship, dockedAtId: 9, dockedAtName: 'Hoth-Depot' },
      { ...ship, id: 3, name: 'Adler', dockedAtId: null, dockedAtName: null },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    const icons = await screen.findAllByAltText('Angedockt an Hoth-Depot');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('src')).toBe('/assets/buttons/dock2.png');
  });

  it('shows the cloak icon only for ships with a cloak generator', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...ship,
        systems: {
          ...ship.systems,
          CLOAK: { present: true, active: true, damaged: false },
        },
      },
      { ...ship, id: 3, name: 'Adler' },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    const icons = await screen.findAllByAltText('Tarnung aktiviert');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('src')).toBe('/assets/buttons/tarn1.png');
  });

  it('renders the STU columns with combined energy, supply and system icons', async () => {
    apiMocks.get.mockResolvedValue([ship]);
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    for (const heading of ['Hülle', 'Schilde', 'Energie', 'Versorgung', 'Crew', 'Systeme']) {
      expect((await screen.findAllByRole('columnheader', { name: heading })).length).toBeGreaterThan(0);
    }
    for (const gone of ['Ebene', 'EPS', 'Hyperantrieb', 'Reaktor', 'Batterie', 'Status']) {
      expect(screen.queryByRole('columnheader', { name: gone })).toBeNull();
    }
    const row = screen.getAllByRole('row').find((item) => item.textContent?.includes('Falke'))!;
    expect(row.textContent).toContain('70/100 +8 (3/11) 2/20 +4');
    expect(within(row).getByAltText('Reaktorladung')).toBeTruthy();
    expect(row.textContent).toContain('17');
    expect(within(row).getByAltText('Ersatzbatterie')).toBeTruthy();
    const crew = screen.getByLabelText('Crew 4/5/8: zu wenig');
    expect(crew.className).toContain('text-red-500');
    expect(crew.textContent).toBe('4');
    expect(within(row).getByAltText('Nahbereichssensoren aktiviert').getAttribute('src')).toBe('/assets/buttons/kss1.png');
    expect(within(row).getByAltText('Langstreckensensoren deaktiviert').getAttribute('src')).toBe('/assets/buttons/lss2.png');
    expect(within(row).getByAltText('Strahlenwaffe deaktiviert')).toBeTruthy();
    expect(within(row).queryByAltText(/Torpedobänke/)).toBeNull();
  });

  it('uses the list regeneration rate from the server and omits a zero rate', async () => {
    // STU shows the regeneration only while the shields are down.
    apiMocks.get.mockResolvedValue([
      { ...ship, shieldActive: false },
      { ...ship, id: 3, name: 'Adler', shieldActive: false, shieldRegeneration: 0 },
      { ...ship, id: 4, name: 'Speer', shieldActive: true },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    await screen.findAllByText('Falke');
    const rows = screen.getAllByRole('row');
    const falke = rows.find((row) => row.textContent?.includes('Falke'));
    const adler = rows.find((row) => row.textContent?.includes('Adler'));
    expect(falke?.textContent).toContain('40/50 (+4)');
    expect(falke?.textContent).not.toContain('40/50 (+5)');
    expect(falke?.querySelectorAll('td')[5]?.getAttribute('title')).toContain(
      'Kostenlose Schildregeneration alle 15 Minuten',
    );
    expect(adler?.textContent).toContain('40/50');
    expect(adler?.textContent).not.toContain('40/50 (+');
    const speer = rows.find((row) => row.textContent?.includes('Speer'));
    expect(speer?.textContent).not.toContain('40/50 (+');
  });
});

describe('SpacecraftPage fleet list preferences', () => {
  beforeEach(() => vi.resetAllMocks());

  const members = () => [
    {
      ...ship,
      id: 2,
      name: 'Falke',
      fleetId: 4,
      fleetName: 'Rote Staffel',
      fleetLeaderId: 2,
      fleetSort: 0,
      fleetIsHidden: false,
    },
    {
      ...ship,
      id: 3,
      name: 'Adler',
      fleetId: 4,
      fleetName: 'Rote Staffel',
      fleetLeaderId: 2,
      fleetSort: 0,
      fleetIsHidden: false,
    },
    {
      ...ship,
      id: 5,
      name: 'Speer',
      fleetId: 8,
      fleetName: 'Blaue Staffel',
      fleetLeaderId: 5,
      fleetSort: 1,
      fleetIsHidden: false,
    },
  ];

  it('persists collapsing across page mounts and shows the header with a way to expand', async () => {
    const ships = members();
    apiMocks.get.mockImplementation(() =>
      Promise.resolve(ships.map((item) => ({ ...item }))),
    );
    apiMocks.patch.mockImplementation(
      (_path: string, { isHidden }: { isHidden: boolean }) => {
        for (const item of ships.filter((item) => item.fleetId === 4))
          item.fleetIsHidden = isHidden;
        return Promise.resolve({});
      },
    );
    const page = () => (
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>
    );
    const { unmount } = render(page());
    const hide = await screen.findByRole('button', {
      name: 'Rote Staffel zuklappen',
    });
    fireEvent.click(hide);
    await screen.findByRole('button', { name: 'Rote Staffel aufklappen' });
    expect(apiMocks.patch).toHaveBeenCalledWith(
      '/spacecraft/fleets/4/visibility',
      { isHidden: true },
    );
    expect(
      screen
        .getByRole('heading', { name: 'Rote Staffel' })
        .closest('section')
        ?.querySelector('table'),
    ).toBeNull();
    expect(
      screen
        .getByRole('heading', { name: 'Blaue Staffel' })
        .closest('section')
        ?.querySelector('table'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Rote Staffel aufklappen' })
        .getAttribute('aria-expanded'),
    ).toBe('false');
    unmount();
    render(page());
    const show = await screen.findByRole('button', {
      name: 'Rote Staffel aufklappen',
    });
    expect(
      screen
        .getByRole('heading', { name: 'Rote Staffel' })
        .closest('section')
        ?.querySelector('table'),
    ).toBeNull();
    fireEvent.click(show);
    await screen.findByRole('button', { name: 'Rote Staffel zuklappen' });
    expect(apiMocks.patch).toHaveBeenLastCalledWith(
      '/spacecraft/fleets/4/visibility',
      { isHidden: false },
    );
    expect(screen.getByLabelText('Flottenführer Falke')).toBeTruthy();
    expect(screen.getByText('Adler')).toBeTruthy();
  });

  it('orders fleets by saved priority', async () => {
    const ships = members();
    apiMocks.get.mockImplementation(() =>
      Promise.resolve(ships.map((item) => ({ ...item }))),
    );
    apiMocks.post.mockImplementation(() => {
      for (const item of ships) item.fleetSort = item.fleetId === 4 ? 1 : 0;
      return Promise.resolve({});
    });
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Rote Staffel' });
    const names = () =>
      screen
        .getAllByRole('heading', { level: 2 })
        .slice(0, 2)
        .map((item) => item.textContent);
    expect(names()).toEqual(['Blaue Staffel', 'Rote Staffel']);
    // STU-like header: no "nach oben" control any more.
    expect(screen.queryByRole('button', { name: 'Rote Staffel nach oben' })).toBeNull();
  });

  it('keeps the fleet expanded on failure and reports the error', async () => {
    apiMocks.get.mockResolvedValue(members());
    apiMocks.patch.mockRejectedValue(new Error('Flotte nicht gefunden'));
    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Rote Staffel zuklappen' }),
    );
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Flotte nicht gefunden',
    );
    expect(
      screen
        .getByRole('button', { name: 'Rote Staffel zuklappen' })
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(screen.getByLabelText('Flottenführer Falke')).toBeTruthy();
  });
});
