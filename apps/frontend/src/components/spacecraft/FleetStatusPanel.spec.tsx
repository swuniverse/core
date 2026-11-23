import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FleetStatusPanel } from './FleetStatusPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({ shipImage: () => '/ship.png' }));

const member = (id: number, name: string, fleetId: number | null) => ({
  id, name, fleetId, shipClassId: 1, shipClassKey: null,
  hull: 40, hullMax: 100, shields: 10, shieldsMax: 20, energy: 5, energyMax: 10, warpdrive: 0, warpdriveMax: 0,
});

const renderPanel = (props: Partial<Parameters<typeof FleetStatusPanel>[0]> = {}) =>
  render(
    <MemoryRouter>
      <FleetStatusPanel shipId={1} fleetId={4} fleetLeaderId={1} fleetIsFixed={false} refreshKey={0} onUpdate={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe('FleetStatusPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue([
      member(1, 'Defiant', 4), member(2, 'Antares', 4), member(3, 'Solo', null),
    ]);
    apiMocks.patch.mockReset().mockResolvedValue({});
  });

  it('shows nothing outside a fleet', () => {
    const { container } = renderPanel({ fleetId: null, fleetLeaderId: null });
    expect(container.innerHTML).toBe('');
  });

  it('links a member to the leader like STU', () => {
    renderPanel({ shipId: 2 });
    expect(screen.getByRole('link', { name: 'zum Führungsschiff wechseln' }).getAttribute('href')).toBe('/spacecraft/1');
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('lists the other members with status bars, fixes the fleet and hands over the lead', async () => {
    const onUpdate = vi.fn();
    renderPanel({ onUpdate });

    expect(await screen.findByText('Antares')).toBeTruthy();
    expect(screen.queryByText('Solo')).toBeNull();
    expect(screen.queryByText('Defiant')).toBeNull();
    expect(screen.getByRole('meter', { name: 'Hülle' }).getAttribute('aria-valuenow')).toBe('40');
    expect(screen.queryByRole('meter', { name: 'Hyperantrieb' })).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'fixiert' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/spacecraft/fleets/4/fixation', {}));
    fireEvent.click(screen.getByRole('button', { name: 'Flottenführung an Antares übergeben' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/spacecraft/fleets/4/leader', { leaderId: 2 }));
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('hides the status block for a fleet of one like STU', async () => {
    apiMocks.get.mockResolvedValue([member(1, 'Defiant', 4)]);
    const { container } = renderPanel();
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });
});
