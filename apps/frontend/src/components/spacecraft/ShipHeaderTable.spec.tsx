import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipHeaderTable } from './ShipHeaderTable';
import { ApiError } from '../../services/api';
import type * as ApiModule from '../../services/api';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});
vi.mock('../../lib/assets', () => ({ shipImage: () => '/ship.png' }));

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
  reactorOutput: 12,
  warpdrive: 8,
  warpdriveMax: 20,
  battery: 5,
  batteryMax: 10,
  warpSpeed: 2,
  warpCooldown: 0,
  crew: 4,
  crewRequired: 2,
  crewMax: 8,
  location: { scope: 'SYSTEM' as const, systemId: 9, x: 12, y: 13 },
};

describe('ShipHeaderTable', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.put.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockResolvedValue({ targets: [], engineers: 0, cost: 0, durationSeconds: 10800, activeRepair: null });
    apiMocks.put.mockResolvedValue({});
    apiMocks.post.mockResolvedValue({});
    apiMocks.patch.mockResolvedValue({});
    apiMocks.delete.mockResolvedValue({});
  });

  it('renders authoritative summary values and renames the ship', async () => {
    const onUpdate = vi.fn();
    const onInfo = vi.fn();
    const onEnergy = vi.fn();
    render(
      <ShipHeaderTable
        ship={ship}
        onUpdate={onUpdate}
        onSelfDestruct={vi.fn()}
        onInfo={onInfo}
        onEnergy={onEnergy}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
        systems={{ SHIELDS: { active: true, integrity: 100 } }}
      />,
    );

    expect(screen.getByText('Korvette')).toBeTruthy();
    expect(screen.getAllByText('90/100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8/20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 (2/8)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('40/50 +5')[0].className).toContain(
      'text-cyan-400',
    );
    expect(screen.queryByText('Warp')).toBeNull();
    expect(
      screen
        .getAllByAltText('')
        .some(
          (image) => image.getAttribute('src') === '/assets/buttons/crew.png',
        ),
    ).toBe(true);
    expect(
      screen.getAllByRole('button', { name: 'Aktualisieren' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Andocken/ })).toBeNull();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Schiffsinformationen' })[0],
    );
    expect(onInfo).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Energie' }));
    expect(onEnergy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Alarmstufe ändern' }));
    expect(
      screen.getByRole('dialog', { name: 'Alarmstufe ändern' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Energieverbrauch minimieren' })[0],
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/2/operating-mode',
        { operatingMode: 'STANDBY' },
      ),
    );
    const names = screen.getAllByLabelText('Schiffsname');
    fireEvent.change(names[0], { target: { value: '  Neuer Falke  ' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Ändern' })[0]);

    await waitFor(() =>
      expect(apiMocks.put).toHaveBeenCalledWith('/spacecraft/2', {
        name: 'Neuer Falke',
      }),
    );
    expect(onUpdate).toHaveBeenCalled();
  });

  it('shows shield regeneration, EPS flow, and crew readiness in the compact header', async () => {
    apiMocks.get.mockResolvedValue({
      energy: { current: 70, max: 100 },
      warpdrive: { current: 8, max: 20 },
      battery: { current: 5, max: 10 },
      reactorFuel: { current: 30, max: 50, commodityId: 5 },
      reactorOutput: 12,
      reactorWarpSplit: 100,
      reactorAutoCarryOver: false,
      flightCost: 1,
      epsProduction: 12,
      warpProduction: 0,
      effectiveEpsProduction: 9,
      effectiveWarpProduction: 0,
      reactorUsage: 12,
      totalSystemConsumption: 3,
      netEps: 9,
      systems: [],
    });
    const onEnergy = vi.fn();

    render(
      <ShipHeaderTable
        ship={ship}
        onUpdate={vi.fn()}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={onEnergy}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
        systems={{ SHIELDS: { active: false, integrity: 100 } }}
      />,
    );

    expect(await screen.findAllByText('70/100 +9 (3/12)')).toHaveLength(2);
    expect(screen.getAllByText('40/50 +5')).toHaveLength(2);
    expect(screen.getAllByText('4 (2/8)')).toHaveLength(2);
    expect(screen.getAllByText('4 (2/8)')[0].className).toContain(
      'text-green-400',
    );
    fireEvent.mouseEnter(screen.getAllByText('Schilde')[0]);
    expect(
      await screen.findByText(
        'Regeneration: 10 % der maximalen Schilde je Haupttick',
      ),
    ).toBeTruthy();
    fireEvent.mouseEnter(screen.getAllByRole('button', { name: 'Energie' })[0]);
    expect(
      await screen.findByText(
        'Aktuell/Maximum, +Zuwachs, (Systemverbrauch/Reaktorleistung)',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Energie' })[0]);
    expect(onEnergy).toHaveBeenCalledOnce();
  });

  it('marks an understaffed crew in red', async () => {
    render(
      <ShipHeaderTable
        ship={{ ...ship, crew: 1 }}
        onUpdate={vi.fn()}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );

    expect(screen.getAllByText('1 (2/8)')[0].className).toContain('text-red-400');
  });

  it('opens repair options and starts a repair', async () => {
    apiMocks.get.mockResolvedValue({
      targets: [{ type: 'MODULE', moduleId: 5, label: 'SENSOR', integrity: 10 }],
      engineers: 2,
      cost: 4,
      durationSeconds: 8640,
      activeRepair: null,
    });
    const onUpdate = vi.fn();
    render(
      <ShipHeaderTable
        ship={ship}
        onUpdate={onUpdate}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Reparaturoptionen' })[0]);
    expect(await screen.findByText('SENSOR (10 %)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reparatur starten' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/self-repair', {
      targetType: 'MODULE',
      moduleId: 5,
      partsType: 'SPARE_PARTS',
      instant: false,
    }));
    expect(onUpdate).toHaveBeenCalled();
  });

  it('lets a fleet member leave without leader actions', () => {
    render(
      <ShipHeaderTable
        ship={{ ...ship, fleetId: 7, fleetName: 'Aurek', fleetLeaderId: 3, fleetIsFixed: false, fleetMembers: [] }}
        onUpdate={vi.fn()}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Flotte verlassen' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Flotte auflösen' })).toBeNull();
  });

  it('manages a fleet from the ship header', async () => {
    const onUpdate = vi.fn();
    render(
      <ShipHeaderTable
        ship={{
          ...ship,
          fleetId: 7,
          fleetName: 'Aurek',
          fleetLeaderId: 2,
          fleetIsFixed: false,
          fleetMembers: [
            { id: 2, name: 'Falke' },
            { id: 3, name: 'Möwe' },
          ],
        }}
        onUpdate={onUpdate}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Aurek (Flottenführer)').length).toBeGreaterThan(
      0,
    );
    // STU: the leader dissolves or hands over instead of leaving.
    expect(screen.queryByRole('button', { name: 'Flotte verlassen' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Flotte auflösen' }).length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Flotte fixieren' })[0],
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/7/fixation',
        {},
      ),
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Flotte umbenennen' })[0],
    );
    fireEvent.change(screen.getByLabelText('Flottenname'), {
      target: { value: 'Besh' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/spacecraft/fleets/7', {
        name: 'Besh',
      }),
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Leader wechseln' })[0],
    );
    fireEvent.change(screen.getByLabelText('Neuer Flottenführer'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Übergeben' }));
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/7/leader',
        {
          leaderId: 3,
        },
      ),
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Flotte auflösen' })[0],
    );
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/fleets/7'),
    );
  });

  it('creates a fleet for a fleetless ship', async () => {
    render(
      <ShipHeaderTable
        ship={ship}
        onUpdate={vi.fn()}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Flotte erstellen' })[0],
    );
    fireEvent.change(screen.getByLabelText('Flottenname'), {
      target: { value: 'Aurek' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/fleets/create', {
        name: 'Aurek',
        leaderId: 2,
      }),
    );
  });

  it('uses STU unknown-capacity notation for the Icarus', () => {
    render(
      <ShipHeaderTable
        ship={{ ...ship, crew: 0, crewRequired: 0, crewMax: 0 }}
        onUpdate={vi.fn()}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );

    expect(screen.getAllByText('0 (0/kA)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Crew').length).toBeGreaterThan(0);
  });

  it('renders canonical system location coordinates', () => {
    render(
      <ShipHeaderTable
        ship={{
          ...ship,
          location: { scope: 'SYSTEM', systemId: 9, x: 21, y: 22 },
        }}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
      />,
    );

    expect(screen.getAllByText('21|22').length).toBeGreaterThan(0);
  });

  it('uses consistent framed 24px runtime-system icons', () => {
    const { container } = render(
      <ShipHeaderTable
        ship={ship}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
        systems={{ SHIELDS: { active: true, integrity: 100 } }}
      />,
    );
    const systemIcon = screen.getAllByAltText('Schilde')[0];
    expect(systemIcon.className).toContain('size-6');
    expect(systemIcon.parentElement?.className).toContain('size-8');
    expect(container.querySelector('[aria-label="Systemstatus"]')).toBeTruthy();
  });

  it('keeps the typed name and exposes an accessible request error', async () => {
    apiMocks.put.mockRejectedValueOnce(
      new ApiError(400, 'Name bereits vergeben'),
    );
    render(
      <ShipHeaderTable
        ship={ship}
        onSelfDestruct={vi.fn()}
        onInfo={vi.fn()}
        onEnergy={vi.fn()}
        standby={false}
        alertState="GREEN"
        onNavigation={vi.fn()}
        onSensors={vi.fn()}
        systems={{ SHIELDS: { active: true, integrity: 100 } }}
      />,
    );
    const input = screen.getAllByLabelText('Schiffsname')[0];
    fireEvent.change(input, { target: { value: 'Besetzt' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Ändern' })[0]);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Name bereits vergeben',
    );
    expect((input as HTMLInputElement).value).toBe('Besetzt');
  });
});
