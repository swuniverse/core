import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpacecraftPage } from './spacecraft';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));
vi.mock('../lib/assets', () => ({ shipImage: () => '/ship.png' }));

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
      expect(await screen.findByRole('columnheader', { name: heading })).toBeTruthy();
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
