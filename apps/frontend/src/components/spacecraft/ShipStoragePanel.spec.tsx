import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShipStoragePanel } from './ShipStoragePanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  commodityImage: (id: number) => `/commodity/${id}.png`,
}));

describe('ShipStoragePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it('renders STU-style occupied storage and nonzero commodities only', async () => {
    apiMocks.get.mockResolvedValue([
      { id: 1, commodityId: 7, commodityName: 'Tibanna', amount: 4 },
      { id: 2, commodityId: 8, commodityName: 'Leer', amount: 0 },
    ]);
    render(<ShipStoragePanel shipId={2} cargoMax={20} />);
    expect(await screen.findByText(/Lagerraum 4\/20/)).toBeTruthy();
    expect(screen.getByLabelText('Tibanna: 4')).toBeTruthy();
    expect(screen.queryByLabelText('Leer: 0')).toBeNull();
  });

  it('shows an empty hold as zero capacity', async () => {
    apiMocks.get.mockResolvedValue([]);
    render(<ShipStoragePanel shipId={2} cargoMax={20} />);
    expect(await screen.findByText(/Lagerraum 0\/20/)).toBeTruthy();
    expect(screen.getByText('Lagerraum leer.')).toBeTruthy();
  });
});

describe('ship cargo disposal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.get.mockResolvedValue([
      { id: 1, commodityId: 7, commodityName: 'Tibanna', amount: 4 },
      { id: 2, commodityId: 8, commodityName: 'Duranium', amount: 10 },
    ]);
  });

  it('disposes selected amounts and all of a commodity, then refreshes storage and ship', async () => {
    const onChanged = vi.fn();
    apiMocks.post.mockResolvedValue({
      cargo: [{ id: 2, commodityId: 8, commodityName: 'Duranium', amount: 7 }],
      cargoUsed: 7,
      messages: ['4 Tibanna entsorgt.', '3 Duranium entsorgt.'],
    });
    render(<ShipStoragePanel shipId={2} cargoMax={20} onChanged={onChanged} />);
    await screen.findByText('Lagerraum 14/20');
    fireEvent.click(screen.getByRole('button', { name: 'Waren entsorgen' }));
    expect(
      screen
        .getByRole('button', { name: 'Ausgewählte Waren entsorgen' })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Alles Tibanna' }));
    fireEvent.change(screen.getByLabelText('Menge Duranium'), {
      target: { value: '3' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Ausgewählte Waren entsorgen' }),
    );
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/2/cargo/dispose',
        {
          items: [
            { commodityId: 7, amount: 4 },
            { commodityId: 8, amount: 3 },
          ],
        },
      ),
    );
    expect(await screen.findByText('Lagerraum 7/20')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      '4 Tibanna entsorgt.',
    );
    expect(screen.getByRole('status').textContent).toContain(
      '3 Duranium entsorgt.',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('keeps quantities and cargo when disposal fails and allows cancelling', async () => {
    apiMocks.post.mockRejectedValue(new Error('Hyperantrieb ist aktiv'));
    render(<ShipStoragePanel shipId={2} cargoMax={20} />);
    await screen.findByText('Lagerraum 14/20');
    fireEvent.click(screen.getByRole('button', { name: 'Waren entsorgen' }));
    fireEvent.change(screen.getByLabelText('Menge Tibanna'), {
      target: { value: '999' },
    });
    fireEvent.change(screen.getByLabelText('Menge Duranium'), {
      target: { value: '-1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Ausgewählte Waren entsorgen' }),
    );
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Hyperantrieb ist aktiv',
    );
    expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/cargo/dispose', {
      items: [{ commodityId: 7, amount: 4 }],
    });
    expect(screen.getByText('Lagerraum 14/20')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks the dialog while the hyperdrive is active', async () => {
    render(<ShipStoragePanel shipId={2} cargoMax={20} hyperdriveActive />);
    await screen.findByText('Lagerraum 14/20');
    expect(
      screen
        .getByRole('button', { name: 'Waren entsorgen' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByText('Entsorgung im Hyperraum nicht möglich.'),
    ).toBeTruthy();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });
});
