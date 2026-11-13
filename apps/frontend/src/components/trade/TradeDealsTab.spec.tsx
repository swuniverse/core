import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeDealsTab } from './TradeDealsTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: (id: number) => `/commodity-${id}.png` }));

const deals = {
  hasLicense: true,
  notice: null,
  tradePostId: 5,
  tradePostName: 'Hutten-Handelsposten',
  prestige: 120,
  account: [{ commodityId: 50, amount: 7 }],
  deals: [
    {
      id: 1, kind: 'COMMODITY', amount: 4,
      give: { commodityId: 2, commodityName: 'Doonium', amount: 1000 }, buildplan: null,
      want: { commodityId: 50, commodityName: 'Aurodium', amount: 2 }, wantPrestige: null,
      factionName: null, endsAt: '2026-11-20T12:00:00.000Z',
    },
    {
      id: 2, kind: 'SHIP', amount: null, give: null,
      buildplan: { id: 9, name: 'Kartellfrachter', shipClassName: 'Hutten-Frachter' },
      want: null, wantPrestige: 50, factionName: 'Rebellenallianz', endsAt: '2026-11-21T12:00:00.000Z',
    },
  ],
};

describe('TradeDealsTab', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue(deals);
  });

  it('lists the deals with gift, price, remaining amount and own holdings', async () => {
    render(<TradeDealsTab />);

    const list = await screen.findByRole('region', { name: 'Deals des Hutten-Kartells' });
    expect(list.textContent).toContain('Aurodium am Posten: 7');
    expect(list.textContent).toContain('Prestige: 120');
    const commodity = within(list).getByText('1.000 Doonium').closest('tr') as HTMLElement;
    expect(commodity.textContent).toContain('2 Aurodium');
    expect(commodity.textContent).toContain('noch 4');
    const ship = within(list).getByText('Schiff: Kartellfrachter (Hutten-Frachter)').closest('tr') as HTMLElement;
    expect(ship.textContent).toContain('50 Prestige');
    expect(ship.textContent).toContain('unbegrenzt');
    expect(ship.textContent).toContain('nur Rebellenallianz');
  });

  it('takes a deal n times from the dialog and reloads', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Der Deal wurde 3 mal angenommen', amount: 3 });
    render(<TradeDealsTab />);

    fireEvent.click(await screen.findByRole('button', { name: 'Doonium annehmen' }));
    const dialog = screen.getByRole('dialog', { name: 'Deal annehmen' });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Anzahl' }), { target: { value: '3' } });
    expect(dialog.textContent).toContain('Du gibst 6 Aurodium und erhältst 3.000 Doonium.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deal annehmen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/deals/1/take', { amount: 3 }));
    expect((await screen.findByRole('status')).textContent).toBe('Der Deal wurde 3 mal angenommen');
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('takes ship and buildplan deals once without an amount field', async () => {
    apiMocks.post.mockRejectedValue(new Error('Du hast nicht genügend Prestige'));
    render(<TradeDealsTab />);

    fireEvent.click(await screen.findByRole('button', { name: 'Kartellfrachter annehmen' }));
    const dialog = screen.getByRole('dialog', { name: 'Deal annehmen' });
    expect(within(dialog).queryByRole('spinbutton')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deal annehmen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/deals/2/take', { amount: 1 }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('Du hast nicht genügend Prestige');
  });

  it('explains that a Hutt Cartel license is required', async () => {
    apiMocks.get.mockResolvedValue({ ...deals, hasLicense: false, notice: 'Handelslizenz beim Hutten-Kartell erforderlich', deals: [] });
    render(<TradeDealsTab />);

    expect(await screen.findByText('Handelslizenz beim Hutten-Kartell erforderlich')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Deals des Hutten-Kartells' })).toBeNull();
  });
});
