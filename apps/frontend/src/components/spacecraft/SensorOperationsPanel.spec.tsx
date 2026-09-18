import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SensorOperationsPanel } from './SensorOperationsPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('SensorOperationsPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.get.mockResolvedValue({ mode: 'DISABLED', available: true });
    apiMocks.patch.mockResolvedValue({});
  });

  it('renders only the STU-style filter choices in its modal', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();
    render(
      <SensorOperationsPanel
        shipId={2}
        open
        onClose={onClose}
        onUpdate={onUpdate}
      />,
    );
    expect(
      await screen.findByRole('dialog', { name: 'LSS Filter' }),
    ).toBeTruthy();
    expect(screen.getByText('Territorialansicht')).toBeTruthy();
    expect(screen.queryByText('Sternkarte')).toBeNull();
    fireEvent.click(screen.getByText('Kartographieansicht'));
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/spacecraft/2/lss-mode', {
        mode: 'CARTOGRAPHY',
      }),
    );
    expect(onUpdate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
