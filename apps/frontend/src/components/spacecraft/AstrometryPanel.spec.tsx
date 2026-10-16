import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AstrometryPanel } from './AstrometryPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('AstrometryPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it('starts astrometry through the ship API and shows its running status', async () => {
    apiMocks.get.mockResolvedValue(null);
    apiMocks.post.mockResolvedValue({
      id: 4,
      spacecraftId: 2,
      starSystemId: 8,
      status: 'ACTIVE',
      startedAt: '2026-10-16T10:00:00.000Z',
      completesAt: '2026-10-16T10:00:00.000Z',
      completedAt: null,
      abortReason: null,
    });
    const onUpdate = vi.fn();

    render(<AstrometryPanel shipId={2} onUpdate={onUpdate} />);

    const button = await screen.findByRole('button', {
      name: 'Astrometrie starten',
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/astrometry', {}),
    );
    expect(onUpdate).toHaveBeenCalled();
    expect(await screen.findByText('Astrometrie läuft')).toBeTruthy();
  });

  it('reloads its job status when the parent signals a ship refresh', async () => {
    apiMocks.get
      .mockResolvedValueOnce({
        id: 4,
        spacecraftId: 2,
        starSystemId: 8,
        status: 'ACTIVE',
        startedAt: '2026-10-16T10:00:00.000Z',
        completesAt: '2026-10-16T10:00:00.000Z',
        completedAt: null,
        abortReason: null,
      })
      .mockResolvedValueOnce({
        id: 4,
        spacecraftId: 2,
        starSystemId: 8,
        status: 'COMPLETED',
        startedAt: '2026-10-16T10:00:00.000Z',
        completesAt: '2026-10-16T10:00:00.000Z',
        completedAt: '2026-10-16T10:01:00.000Z',
        abortReason: null,
      });

    const { rerender } = render(
      <AstrometryPanel shipId={2} refreshKey={0} onUpdate={vi.fn()} />,
    );
    expect(await screen.findByText('Astrometrie läuft')).toBeTruthy();

    rerender(<AstrometryPanel shipId={2} refreshKey={1} onUpdate={vi.fn()} />);

    expect(
      await screen.findByText('System erfolgreich kartographiert'),
    ).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('shows the server rejection when astrometry cannot start', async () => {
    apiMocks.get.mockResolvedValue(null);
    apiMocks.post.mockRejectedValue(new Error('Langstreckensensoren sind nicht aktiv'));

    render(<AstrometryPanel shipId={2} onUpdate={vi.fn()} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Astrometrie starten' }),
    );

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Langstreckensensoren sind nicht aktiv',
    );
  });
});
