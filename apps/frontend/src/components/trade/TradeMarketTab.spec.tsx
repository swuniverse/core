import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeMarketTab } from './TradeMarketTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: (id: number) => `/commodity-${id}.png` }));

const offer = {
  id: 3, tradePostId: 1, tradePostName: 'Mos Eisley', networkId: 1, ownerName: 'Jabba', isOwn: false, maxTake: 4,
  offeredCommodityId: 5, offeredCommodityName: 'Aurodium', offeredAmount: 10,
  wantedCommodityId: 6, wantedCommodityName: 'Durastahl', wantedAmount: 4,
  offerCount: 5, reservedAmount: 50, createdAt: '2026-11-12T10:00:00.000Z',
};
const search = {
  items: [offer, { ...offer, id: 4, ownerName: 'Ich', isOwn: true, maxTake: 0 }],
  total: 30,
  page: 1,
  pageSize: 25,
  licensedPosts: [{ id: 1, name: 'Mos Eisley' }, { id: 2, name: 'Anchorhead' }],
  commodities: [{ id: 5, name: 'Aurodium' }, { id: 6, name: 'Durastahl' }],
};

describe('TradeMarketTab', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue(search);
  });

  it('filters by commodity icon, mode, post and page', async () => {
    render(<TradeMarketTab />);
    await screen.findByText('Jabba');
    expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/offers?mode=both&page=1');

    fireEvent.click(screen.getByRole('button', { name: 'Aurodium' }));
    await waitFor(() => expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/offers?mode=both&page=1&commodityId=5'));
    expect(screen.getByRole('button', { name: 'Aurodium' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.change(screen.getByRole('combobox', { name: 'Modus' }), { target: { value: 'demand' } });
    await waitFor(() => expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/offers?mode=demand&page=1&commodityId=5'));

    fireEvent.change(screen.getByRole('combobox', { name: 'Handelsposten' }), { target: { value: '2' } });
    await waitFor(() => expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/offers?mode=demand&page=1&commodityId=5&postId=2'));

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await waitFor(() => expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/offers?mode=demand&page=2&commodityId=5&postId=2'));
  });

  it('marks own offers instead of offering to take them', async () => {
    render(<TradeMarketTab />);

    const own = (await screen.findByText('Ich')).closest('tr') as HTMLElement;
    expect(within(own).getByText('Eigenes Angebot')).toBeTruthy();
    expect(within(own).queryByRole('button', { name: 'Annehmen' })).toBeNull();
  });

  it('takes an offer up to its maximum', async () => {
    apiMocks.post.mockResolvedValue({ taken: 4, message: 'Das Angebot wurde 4 mal angenommen' });
    render(<TradeMarketTab />);

    const row = (await screen.findByText('Jabba')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Annehmen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Annehmen' });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Anzahl' }), { target: { value: '5' } });
    expect(within(dialog).getByRole('button', { name: 'Angebot annehmen' })).toHaveProperty('disabled', true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'max' }));
    expect(within(dialog).getByText('Du gibst 16 Durastahl und erhältst 40 Aurodium.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Angebot annehmen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/offers/3/take', { amount: 4 }));
    expect((await screen.findByRole('status')).textContent).toBe('Das Angebot wurde 4 mal angenommen');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows server errors in the take dialog', async () => {
    apiMocks.post.mockRejectedValue(new Error('Das Angebot ist nicht mehr verfügbar'));
    render(<TradeMarketTab />);

    const row = (await screen.findByText('Jabba')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Annehmen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Annehmen' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Angebot annehmen' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe('Das Angebot ist nicht mehr verfügbar');
  });

  it('explains that searching needs a license', async () => {
    apiMocks.get.mockResolvedValue({ ...search, items: [], total: 0, licensedPosts: [] });
    render(<TradeMarketTab />);

    expect(await screen.findByText('Du besitzt keine gültige Handelslizenz.')).toBeTruthy();
  });
});
