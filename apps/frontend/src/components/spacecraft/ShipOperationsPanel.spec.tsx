import { fireEvent, render, screen } from '@testing-library/react';
import { ShipOperationsPanel } from './ShipOperationsPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const details = {
  id: 2,
  name: 'Falke',
  shipClassId: 1,
  status: 'IDLE',
  alertState: 'GREEN',
  operatingMode: 'NORMAL',
  hull: 10,
  hullMax: 20,
  shields: 5,
  shieldsMax: 10,
  energy: 8,
  energyMax: 12,
  epsMax: 12,
  reactorOutput: 4,
  warpdrive: 1,
  warpdriveMax: 3,
  warpSpeed: 1,
  warpCooldown: 0,
  battery: 2,
  batteryMax: 4,
  evadeChance: 0,
  crew: 1,
  crewMax: 2,
  reactorWarpSplit: 100,
  runtimeSystems: {
    LIFE_SUPPORT: { active: true, cooldown: 0, integrity: 100 },
  },
  posX: 1,
  posY: 1,
  arrivalAt: null,
  crewRoster: [{ id: 1, name: 'Leia', position: 'COMMAND', rank: 'CAPTAIN' }],
};

describe('ShipOperationsPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
  });

  it('loads authoritative details and energy flow in accessible dialogs', async () => {
    apiMocks.get.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('details')
          ? details
          : {
              energy: { current: 8, max: 12 },
              warpdrive: { current: 1, max: 3 },
              battery: { current: 2, max: 4 },
              reactorOutput: 4,
              reactorWarpSplit: 100,
              flightCost: 1,
              epsProduction: 4,
              warpProduction: 0,
              totalSystemConsumption: 1,
              netEps: 3,
              systems: [
                {
                  systemKey: 'LIFE_SUPPORT',
                  label: 'Lebenserhaltung',
                  active: true,
                  epsPerTick: 1,
                },
              ],
            },
      ),
    );
    render(
      <ShipOperationsPanel
        shipId={2}
        showDetails
        onCloseDetails={vi.fn()}
        showEnergy={false}
        onCloseEnergy={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole('dialog', { name: 'Schiffsinformationen' }),
    ).toBeTruthy();
    expect(screen.getByText('Leia')).toBeTruthy();
    expect(screen.getByText(/Lebenserhaltung: 100%/)).toBeTruthy();
    expect(screen.queryByText(/aktiv$/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
  });

  it('shows EPS consumption in a modal when requested', async () => {
    apiMocks.get.mockResolvedValue({
      energy: { current: 8, max: 12 },
      reactorOutput: 4,
      epsProduction: 4,
      totalSystemConsumption: 1,
      netEps: 3,
      systems: [
        { systemKey: 'LIFE_SUPPORT', label: 'Lebenserhaltung', epsPerTick: 1 },
      ],
    });
    render(
      <ShipOperationsPanel
        shipId={2}
        showDetails={false}
        onCloseDetails={vi.fn()}
        showEnergy
        onCloseEnergy={vi.fn()}
      />,
    );
    expect(
      await screen.findByRole('dialog', { name: 'EPS Verbrauch' }),
    ).toBeTruthy();
    expect(screen.getByText('Lebenserhaltung')).toBeTruthy();
    expect(screen.getByText('1 EPS')).toBeTruthy();
  });

  it('shows the crew count when no individual roster is present', async () => {
    apiMocks.get.mockResolvedValue({ ...details, crew: 4, crewRoster: [] });
    render(
      <ShipOperationsPanel
        shipId={2}
        showDetails
        onCloseDetails={vi.fn()}
        showEnergy={false}
        onCloseEnergy={vi.fn()}
      />,
    );
    expect(await screen.findByText('4 (0,2)')).toBeTruthy();
  });

  it('renders no inline alarm controls', async () => {
    render(
      <ShipOperationsPanel
        shipId={2}
        showDetails={false}
        onCloseDetails={vi.fn()}
        showEnergy={false}
        onCloseEnergy={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Gelb' })).toBeNull();
  });
});
