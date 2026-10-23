import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StationExpansionPanel } from './StationExpansionPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('StationExpansionPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it('shows station costs and starts a ready expansion', async () => {
    apiMocks.get.mockResolvedValue([
      {
        classKey: 'REBEL_DEPOT_SMALL',
        name: 'Versorgungsdepot',
        role: 'DEPOT_SMALL',
        buildTimeTicks: 30,
        workbees: { docked: 15, required: 15, sufficient: true },
        location: { rule: 'INSIDE_SYSTEM', allowed: true },
        limit: { maximum: null, current: 0, reached: false },
        modules: [
          {
            commodityId: 10101,
            name: 'Stationsmodul L1',
            level: 1,
            stored: 4,
            required: 4,
            sufficient: true,
          },
        ],
        canStart: true,
      },
    ]);
    apiMocks.post.mockResolvedValue({});
    const onExpanded = vi.fn();

    render(<StationExpansionPanel stationId={100} onExpanded={onExpanded} />);

    expect(await screen.findByText('Versorgungsdepot')).toBeTruthy();
    expect(screen.getByText('Stationsmodul L1')).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === 'LI' && element.textContent === 'Stationsmodul L1: 4 / 4')).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === '15 / 15 Workbees')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Station ausbauen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/100/construction/expand',
        { classKey: 'REBEL_DEPOT_SMALL' },
      ),
    );
    expect(onExpanded).toHaveBeenCalled();
  });
});
