import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipHeaderTable } from './ShipHeaderTable';
import { ApiError } from '../../services/api';
import type * as ApiModule from '../../services/api';

const apiMocks = vi.hoisted(() => ({ put: vi.fn(), patch: vi.fn() }));
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
  crewMax: 8,
  posX: 12,
  posY: 13,
};

describe('ShipHeaderTable', () => {
  beforeEach(() => {
    apiMocks.put.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.put.mockResolvedValue({});
    apiMocks.patch.mockResolvedValue({});
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
    expect(screen.getAllByText('40/50')[0].className).toContain(
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
