import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SpacecraftDetailDto } from '@swuniverse/shared';
import { StationShipManagementPanel } from './StationShipManagementPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const management = {
  station: { id: 2, energy: 40, energyMax: 100, storage: [] },
  ships: [
    {
      id: 5,
      name: 'Adler',
      shipClassId: 1,
      crew: { current: 2, max: 6, minimum: 1 },
      battery: { current: 0, max: 30 },
      reactor: { fuel: { current: 0, max: 0 }, profile: { label: 'Reaktor', loadUnits: 30, costs: [] } },
      torpedoes: null,
      cargo: { used: 0, max: 10 },
      shieldsActive: false,
      hyperdriveActive: false,
    },
  ],
};

const station = { id: 2, kind: 'STATION', stationRole: 'OUTPOST' } as SpacecraftDetailDto;

describe('StationShipManagementPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(management);
    apiMocks.post.mockReset();
  });

  it('renders nothing for ships and non-managing stations', () => {
    const { container } = render(
      <StationShipManagementPanel ship={{ ...station, stationRole: 'SHIPYARD' }} />,
    );
    expect(container.firstChild).toBeNull();
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('shows docked ships with the station EPS and supplies a battery', async () => {
    apiMocks.post.mockResolvedValue({ results: [{ shipId: 5, applied: ['Batterie: +10'], rejected: [] }] });
    render(<StationShipManagementPanel ship={station} />);
    expect(await screen.findByText('Adler')).toBeTruthy();
    expect(screen.getByText(/Stations-EPS 40\/100/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Adler auswählen'));
    fireEvent.change(screen.getByLabelText('Adler Batterie'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ausführen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/ship-management',
        expect.objectContaining({ ships: [expect.objectContaining({ shipId: 5, batteryCharge: 10 })] }),
      ),
    );
  });

  it('toggles the battery reload switch', async () => {
    apiMocks.post.mockResolvedValue({ reloadBattery: true, message: 'Die automatische Ladung der Ersatzbatterie ist nun aktiv' });
    render(<StationShipManagementPanel ship={station} />);
    fireEvent.click(screen.getByLabelText(/Batterie automatisch nachladen/));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/battery-reload', { enabled: true }),
    );
    expect(await screen.findByText(/nun aktiv/)).toBeTruthy();
  });
});
