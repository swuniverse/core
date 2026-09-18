import { render, screen } from '@testing-library/react';
import { ShipStoragePanel } from './ShipStoragePanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  commodityImage: (id: number) => `/commodity/${id}.png`,
}));

describe('ShipStoragePanel', () => {
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
