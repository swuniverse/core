import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TorpedoPanel } from './TorpedoPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

function mockLoads(storage: unknown = null) {
  apiMocks.get.mockImplementation((path: string) => {
    if (path === '/spacecraft/2/torpedoes') return Promise.resolve(storage);
    if (path === '/colonies')
      return Promise.resolve([{ id: 9, name: 'Alderaan' }]);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

describe('TorpedoPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it('shows empty storage and loads torpedoes through the existing route', async () => {
    mockLoads();
    apiMocks.post.mockResolvedValue({});
    const onTransfer = vi.fn();
    render(<TorpedoPanel shipId={2} onTransfer={onTransfer} />);
    expect(await screen.findByText('Keine Torpedos geladen.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Torpedotyp'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Menge'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Laden' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/torpedoes/load',
        { colonyId: 9, torpedoTypeId: 7, amount: 2 },
      ),
    );
    expect(onTransfer).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /feuern/i })).toBeNull();
  });

  it('shows storage load errors', async () => {
    apiMocks.get.mockRejectedValue(new Error('Torpedos offline'));
    render(<TorpedoPanel shipId={2} onTransfer={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Torpedos offline',
    );
  });
});
