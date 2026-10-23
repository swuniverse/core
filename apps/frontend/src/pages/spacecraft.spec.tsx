import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpacecraftPage } from './spacecraft';

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
  shieldRegeneration: 5,
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

    expect(await screen.findByText('8|9')).toBeTruthy();
    expect(screen.getByText('4|7 (11|12)')).toBeTruthy();
  });

  it('groups fleets and singles and creates a fleet from a single ship', async () => {
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
    expect(screen.getByText('2 Schiffe')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Flottenname'), {
      target: { value: 'Gold-Staffel' },
    });
    fireEvent.change(screen.getByLabelText('Flottenführer'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Flotte anlegen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/fleets/create', {
        name: 'Gold-Staffel',
        leaderId: 7,
      }),
    );
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft');
  });

  it('changes the alert state for every ship from the fleet header', async () => {
    apiMocks.get.mockResolvedValue([
      {
        ...ship,
        id: 2,
        fleetId: 4,
        fleetName: 'Rote Staffel',
        fleetLeaderId: 2,
      },
      {
        ...ship,
        id: 3,
        fleetId: 4,
        fleetName: 'Rote Staffel',
        fleetLeaderId: 2,
      },
    ]);
    apiMocks.patch.mockResolvedValue({
      alertState: 'RED',
      applied: [{ shipId: 2, shipName: 'Falke' }],
      failed: [{ shipId: 3, shipName: 'Adler', reason: 'System zerstört' }],
    });

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Alarmstufe Rot für Rote Staffel',
      }),
    );

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/4/alert-state',
        { alertState: 'RED' },
      ),
    );
    expect(await screen.findByText('Adler: System zerstört')).toBeTruthy();
  });

  it('separates stations into a dense station list with role and dock occupancy', async () => {
    apiMocks.get.mockResolvedValue([
      ship,
      {
        ...ship,
        id: 9,
        name: 'Hoth-Phalanx',
        kind: 'STATION',
        stationRole: 'SENSOR',
        shipClassName: 'Sensorphalanx',
        dockCapacity: 2,
        dockedShips: 1,
        fleetId: null,
      },
    ]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Stationen' })).toBeTruthy();
    expect(screen.getAllByText('Sensorphalanx')).toHaveLength(2);
    expect(screen.getByLabelText('Andockbelegung 1 von 2')).toBeTruthy();
    expect(screen.getAllByText('Hoth-Phalanx')).toHaveLength(1);
  });

  it('renders the dense STU status columns and system availability', async () => {
    apiMocks.get.mockResolvedValue([ship]);

    render(
      <MemoryRouter>
        <SpacecraftPage />
      </MemoryRouter>,
    );

    for (const heading of [
      'Alarm',
      'Ebene',
      'Hülle',
      'Schilde',
      'EPS',
      'Hyperantrieb',
      'Reaktor',
      'Batterie',
      'Crew',
      'Systeme',
      'Status',
    ]) {
      expect((await screen.findAllByRole('columnheader', { name: heading })).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByLabelText('Crew 4/5/8: zu wenig').className,
    ).toContain('text-red-500');
    expect(
      screen.getByLabelText('Langstreckensensoren deaktiviert').className,
    ).toContain('opacity-40');
    expect(screen.getByLabelText('Waffen beschädigt').className).toContain(
      'text-red-500',
    );
    expect(
      screen.getByLabelText('Torpedos nicht vorhanden').className,
    ).toContain('opacity-20');
    expect(screen.getByLabelText('Bereitschaft')).toBeTruthy();
  });
});
