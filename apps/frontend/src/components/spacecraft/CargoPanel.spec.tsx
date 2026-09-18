import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CargoPanel } from './CargoPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  commodityImage: (id: number) => `/commodity/${id}.png`,
}));

function mockLoads(cargo = [{ id: 1, commodityId: 42, amount: 5 }]) {
  apiMocks.get.mockImplementation((path: string) => {
    if (path === '/spacecraft/2/cargo') return Promise.resolve(cargo);
    if (path === '/colonies')
      return Promise.resolve([{ id: 9, name: 'Alderaan' }]);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

describe('CargoPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
  });

  it('loads cargo and transfers validated quantities', async () => {
    mockLoads();
    apiMocks.post.mockResolvedValue({});
    const onTransfer = vi.fn();
    render(<CargoPanel shipId={2} cargoMax={20} onTransfer={onTransfer} />);
    expect(await screen.findByText('5/20')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Commodity ID'), {
      target: { value: '42' },
    });
    fireEvent.change(screen.getByLabelText('Menge'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Beladen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/cargo/load', {
        colonyId: 9,
        commodityId: 42,
        amount: 3,
      }),
    );
    expect(onTransfer).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('distinguishes request failures from an empty hold', async () => {
    apiMocks.get.mockRejectedValue(new Error('Cargo offline'));
    const { unmount } = render(
      <CargoPanel shipId={2} cargoMax={20} onTransfer={vi.fn()} />,
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Cargo offline',
    );
    unmount();

    mockLoads([]);
    render(<CargoPanel shipId={2} cargoMax={20} onTransfer={vi.fn()} />);
    expect(await screen.findByText('Frachtraum leer.')).toBeTruthy();
  });
});
