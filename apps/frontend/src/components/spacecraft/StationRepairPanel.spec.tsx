import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SpacecraftDetailDto, StationRepairDto } from '@swuniverse/shared';
import { StationRepairPanel } from './StationRepairPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const overview: StationRepairDto = {
  canRepairShips: true,
  queue: [{ shipId: 5, name: 'Adler', hull: 100, hullMax: 400, status: 'STOPPED', finishesAt: null, steps: 3 }],
  repairable: [{ shipId: 6, name: 'Falke', hull: 50, hullMax: 400, steps: 4 }],
  selfRepair: { needed: true, active: false, workbees: { docked: 1, required: 2 } },
};
const station = { id: 2, kind: 'STATION', stationRole: 'SHIPYARD' } as SpacecraftDetailDto;

const renderPanel = (ship = station) =>
  render(
    <MemoryRouter>
      <StationRepairPanel ship={ship} />
    </MemoryRouter>,
  );

describe('StationRepairPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(overview);
    apiMocks.post.mockReset().mockResolvedValue({ message: 'ok' });
    apiMocks.delete.mockReset().mockResolvedValue({ message: 'abgebrochen' });
  });

  it('renders nothing and loads nothing for ships', () => {
    const { container } = renderPanel({ ...station, kind: 'SHIP' });
    expect(container.firstChild).toBeNull();
    expect(apiMocks.get).not.toHaveBeenCalled();
  });

  it('shows the queue and queues a repairable ship', async () => {
    renderPanel();
    expect(await screen.findByText('Adler')).toBeTruthy();
    expect(screen.getByText(/Workbees 1\/2/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Falke reparieren' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/station-repair/6', {}));
  });

  it('cancels a job, reactivates a stopped queue and starts the self-repair', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Reparatur von Adler abbrechen' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/spacecraft/2/station-repair/5'));
    fireEvent.click(screen.getByRole('button', { name: 'Warteschlange reaktivieren' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/station-repair/reactivate', {}));
    fireEvent.click(screen.getByRole('button', { name: 'Station reparieren' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/station-repair/self', {}));
  });
});
