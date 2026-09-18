import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SelfDestructPanel } from './SelfDestructPanel';

const apiMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('SelfDestructPanel', () => {
  beforeEach(() => apiMocks.post.mockReset());

  it('requires two steps and the exact ship name before executing', async () => {
    const onDestroyed = vi.fn();
    apiMocks.post.mockResolvedValue({
      spacecraftId: 2,
      status: 'DESTROYED',
      alreadyDestroyed: false,
    });
    render(
      <SelfDestructPanel
        shipId={2}
        shipName="Falke"
        destroyed={false}
        open
        onClose={vi.fn()}
        onDestroyed={onDestroyed}
      />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: /Risiko verstanden/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Risiko verstanden/i }));
    const execute = screen.getByRole('button', { name: /unwiderruflich/i });
    expect((execute as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Schiffsname/i), {
      target: { value: 'Falke' },
    });
    fireEvent.click(execute);
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/self-destruct',
        {},
      ),
    );
    expect(onDestroyed).toHaveBeenCalled();
  });

  it('closes via its provided callback', () => {
    const onClose = vi.fn();
    render(
      <SelfDestructPanel
        shipId={2}
        shipName="Falke"
        destroyed={false}
        open
        onClose={onClose}
        onDestroyed={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalled();
  });
});
