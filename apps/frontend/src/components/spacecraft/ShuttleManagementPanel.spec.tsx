import { render, screen, waitFor } from '@testing-library/react';
import type { ShuttleManagementDto } from '@swuniverse/shared';
import { ShuttleManagementPanel } from './ShuttleManagementPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const base: ShuttleManagementDto = {
  isShuttle: false,
  capacity: 2,
  storedCount: 0,
  blockReason: null,
  stored: [],
  nearby: [],
  colonies: [],
};

describe('ShuttleManagementPanel', () => {
  it('shows nothing on a ramp without stored or nearby shuttles like STU', async () => {
    apiMocks.get.mockResolvedValue(base);
    const { container } = render(
      <ShuttleManagementPanel shipId={1} refreshKey="a" onUpdate={vi.fn()} />,
    );

    await waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('offers the start and the load with stored shuttles', async () => {
    apiMocks.get.mockResolvedValue({
      ...base,
      storedCount: 1,
      stored: [
        { commodityId: 7, name: 'Lambda', amount: 1, energyCost: 2, crewRequired: 1, blockReason: null },
      ],
    });
    render(<ShuttleManagementPanel shipId={1} refreshKey="a" onUpdate={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Lambda starten' })).toBeTruthy();
    expect(screen.getByText(/1 \/ 2 Shuttleplätze belegt/)).toBeTruthy();
    expect(screen.queryByText('Keine Shuttles im Lager.')).toBeNull();
  });
});
