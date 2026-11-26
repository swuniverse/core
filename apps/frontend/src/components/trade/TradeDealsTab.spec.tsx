import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TradeDealsTab } from './TradeDealsTab';

const renderTab = () => render(<MemoryRouter><TradeDealsTab /></MemoryRouter>);

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({
  commodityImage: (id: number) => `/commodity-${id}.png`,
  shipImage: (id: number) => `/ship-${id}.png`,
}));

const plan = (id: number, name: string, shipClassName: string) => ({
  id, name, shipClassId: 30 + id, shipClassKey: null, shipClassName, crew: 7,
  modules: [{ commodityId: 901, name: 'Durastahlhülle', type: 'HULL' }, { commodityId: 902, name: 'Hyperantrieb Klasse 2', type: 'HYPERDRIVE' }],
});

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
      buildplan: plan(9, 'Kartellfrachter', 'Hutten-Frachter'),
      want: null, wantPrestige: 50, factionName: 'Rebellenallianz', endsAt: '2026-11-21T12:00:00.000Z',
    },
  ],
  auctions: [
    {
      id: 5, kind: 'COMMODITY', give: { commodityId: 2, commodityName: 'Doonium', amount: 5000 }, buildplan: null,
      currency: null, currentAmount: 16, isHighestBidder: true, highestBidder: { id: 3, name: 'Lando' }, ownMaxAmount: 40, factionName: null,
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000 + 30_000).toISOString(),
    },
    {
      id: 6, kind: 'SHIP', give: null, buildplan: plan(10, 'Kartellkreuzer', 'Hutten-Kreuzer'),
      currency: { commodityId: 50, commodityName: 'Aurodium' }, currentAmount: null, isHighestBidder: false, highestBidder: null, ownMaxAmount: null, factionName: null,
      endsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  ],
  wonAuctions: [
    {
      id: 4, kind: 'BUILDPLAN', give: null, buildplan: plan(8, 'Schmugglerplan', 'Hutten-Frachter'),
      currency: null, price: 21, refund: 9, endedAt: '2026-11-12T12:00:00.000Z',
    },
  ],
  endedAuctions: [
    {
      id: 7, kind: 'COMMODITY', give: { commodityId: 2, commodityName: 'Doonium', amount: 800 }, buildplan: null,
      currency: { commodityId: 50, commodityName: 'Aurodium' }, price: 12, highestBidder: { id: 4, name: 'Han' },
      endedAt: '2026-11-18T09:30:00.000Z',
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
    renderTab();

    const list = await screen.findByRole('region', { name: 'Deals des Hutten-Kartells' });
    expect(list.textContent).toContain('Aurodium am Posten: 7');
    expect(list.textContent).toContain('Prestige: 120');
    const commodity = within(list).getByText('1.000 Doonium').closest('tr') as HTMLElement;
    expect(commodity.textContent).toContain('2 Aurodium');
    expect(commodity.textContent).toContain('noch 4');
    const ship = within(list).getByRole('img', { name: 'Hutten-Frachter' }).closest('tr') as HTMLElement;
    expect(ship.textContent).toContain('Schiff: Kartellfrachter');
    expect(ship.textContent).toContain('Crew: 7');
    expect(within(ship).getByRole('img', { name: 'Hyperantrieb Klasse 2' }).getAttribute('title')).toBe('Hyperantrieb Klasse 2');
    expect(within(list).getByRole('rowgroup', { name: 'Schiffe gegen Prestige' }).contains(ship)).toBe(true);
    expect(within(list).getByRole('rowgroup', { name: 'Waren gegen Waren' })).toBeTruthy();
    expect(ship.textContent).toContain('50 Prestige');
    expect(ship.textContent).toContain('unbegrenzt');
    expect(ship.textContent).toContain('nur Rebellenallianz');
  });

  it('takes a deal n times from the dialog and reloads', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Der Deal wurde 3 mal angenommen', amount: 3 });
    renderTab();

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
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: 'Kartellfrachter annehmen' }));
    const dialog = screen.getByRole('dialog', { name: 'Deal annehmen' });
    expect(within(dialog).queryByRole('spinbutton')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deal annehmen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/deals/2/take', { amount: 1 }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('Du hast nicht genügend Prestige');
  });

  it('shows running auctions with price, own maximum and remaining time', async () => {
    renderTab();

    const section = await screen.findByRole('region', { name: 'Auktionen' });
    const doonium = within(section).getByText('5.000 Doonium').closest('tr') as HTMLElement;
    expect(doonium.textContent).toContain('16 Prestige');
    expect(doonium.textContent).toContain('Dein Maximum: 40 (Höchstbietender)');
    expect(doonium.textContent).toContain('noch 2 h 5 min');
    expect(within(doonium).getByRole('link', { name: 'Lando' }).getAttribute('href')).toBe('/players/3');
    const ship = within(section).getByRole('img', { name: 'Hutten-Kreuzer' }).closest('tr') as HTMLElement;
    expect(ship.textContent).toContain('Noch kein Gebot');
    expect(ship.textContent).toContain('—');
    expect(ship.textContent).toContain('Aurodium');
  });

  it('places a maximum bid and reloads', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Dein Maximalgebot wurde auf 60 erhöht' });
    renderTab();
    const section = await screen.findByRole('region', { name: 'Auktionen' });
    const row = within(section).getByText('5.000 Doonium').closest('tr') as HTMLElement;

    fireEvent.change(within(row).getByRole('spinbutton', { name: 'Maximalgebot' }), { target: { value: '60' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Bieten' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/deals/5/bid', { maxAmount: 60 }));
    expect((await screen.findByRole('status')).textContent).toBe('Dein Maximalgebot wurde auf 60 erhöht');
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('claims a won auction', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Dir wurden 9 Prestige gutgeschrieben. Du hast deinen Bauplan erhalten' });
    renderTab();

    const won = await screen.findByRole('region', { name: 'Gewonnene Auktionen' });
    expect(won.textContent).toContain('Bauplan: Schmugglerplan (Hutten-Frachter)');

    expect(won.textContent).toContain('Preis: 21 Prestige, Rückerstattung: 9');
    fireEvent.click(within(won).getByRole('button', { name: 'Schmugglerplan abholen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/deals/4/claim', {}));
    expect((await screen.findByRole('status')).textContent).toBe('Dir wurden 9 Prestige gutgeschrieben. Du hast deinen Bauplan erhalten');
  });

  it('lists ended auctions with final price, highest bidder and end date', async () => {
    renderTab();

    const ended = await screen.findByRole('region', { name: 'Beendete Auktionen' });
    const row = within(ended).getByText('800 Doonium').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('12 Aurodium');
    expect(within(row).getByRole('link', { name: 'Han' }).getAttribute('href')).toBe('/players/4');
    expect(row.textContent).toMatch(/18\.11\.2026/);
    expect(within(ended).getByRole('rowgroup', { name: 'Waren gegen Waren' }).contains(row)).toBe(true);
  });

  it('explains that a Hutt Cartel license is required', async () => {
    apiMocks.get.mockResolvedValue({ ...deals, hasLicense: false, notice: 'Handelslizenz beim Hutten-Kartell erforderlich', deals: [], auctions: [], wonAuctions: [] });
    renderTab();

    expect(await screen.findByText('Handelslizenz beim Hutten-Kartell erforderlich')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Deals des Hutten-Kartells' })).toBeNull();
  });
});
