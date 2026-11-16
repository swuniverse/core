import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SensorOperationsPanel } from './SensorOperationsPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('SensorOperationsPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
    apiMocks.post.mockResolvedValue({});
    apiMocks.get.mockResolvedValue({ mode: 'DISABLED', available: true });
    apiMocks.patch.mockResolvedValue({});
  });

  it('runs the cloak scan and refreshes the ship and map', async () => {
    apiMocks.get.mockResolvedValue({
      mode: 'DISABLED',
      available: true,
      tachyonAvailable: true,
    });
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(
      <SensorOperationsPanel
        shipId={2}
        open
        onClose={onClose}
        onUpdate={onUpdate}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Gravitationswellen-Scan (10 EPS · 5 Min.)',
      }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/tachyon-scan', {}),
    );
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
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
