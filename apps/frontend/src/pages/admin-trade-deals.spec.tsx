import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AdminTradeDealsPage } from './admin-trade-deals';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

const deal = {
  id: 3, amount: 5, giveCommodityId: 2, giveCommodityAmount: 1000, buildplanId: null, ship: false,
  wantCommodityId: 50, wantCommodityAmount: 2, wantPrestige: null, factionId: 1,
  startsAt: '2026-11-13T10:00:00.000Z', endsAt: '2099-11-20T10:00:00.000Z', notifiedAt: null, createdAt: '2026-11-13T09:00:00.000Z',
};

function renderPage() {
  return render(<MemoryRouter><AdminTradeDealsPage /></MemoryRouter>);
}

describe('AdminTradeDealsPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset().mockResolvedValue({});
    apiMocks.put.mockReset().mockResolvedValue({});
    apiMocks.delete.mockReset().mockResolvedValue(undefined);
    apiMocks.get.mockImplementation(async (url: string) => {
      if (url === '/admin/trade/deals') return [deal];
      if (url === '/database/commodities') return [{ id: 2, name: 'Doonium' }, { id: 50, name: 'Aurodium' }];
      if (url === '/spacecraft/admin/buildplans') return [{ id: 9, name: 'Kartellfrachter' }];
      if (url === '/factions') return [{ id: 1, name: 'Rebellenallianz' }];
      if (url === '/admin/trade/lottery-buildplans') return [{ id: 4, factionId: 1, buildplanId: 9, chance: 30 }];
      throw new Error(`unexpected ${url}`);
    });
  });

  it('lists deals with gift, price and faction', async () => {
    renderPage();

    const row = (await within(await screen.findByRole('region', { name: 'Deals' })).findByText('1000 Doonium')).closest('tr') as HTMLElement;
    expect(row.textContent).toContain('2 Aurodium');
    expect(row.textContent).toContain('Rebellenallianz');
  });

  it('creates a ship deal for prestige', async () => {
    renderPage();
    const form = await screen.findByRole('region', { name: 'Neuer Deal' });
    await screen.findByText('1000 Doonium');

    fireEvent.change(within(form).getByRole('combobox', { name: 'Angebot' }), { target: { value: 'SHIP' } });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Bauplan' }), { target: { value: '9' } });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Preis' }), { target: { value: 'PRESTIGE' } });
    fireEvent.change(within(form).getByRole('spinbutton', { name: 'Prestigepreis' }), { target: { value: '250' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Deal anlegen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/admin/trade/deals', expect.objectContaining({
      giveCommodityId: null, giveCommodityAmount: null, buildplanId: 9, ship: true,
      wantCommodityId: null, wantCommodityAmount: null, wantPrestige: 250, amount: null, factionId: null,
    })));
    expect((await screen.findByRole('status')).textContent).toBe('Deal angelegt');
  });

  it('edits and ends an existing deal', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Deal 3 bearbeiten' }));
    const form = screen.getByRole('region', { name: 'Deal bearbeiten' });
    fireEvent.change(within(form).getByRole('spinbutton', { name: 'Anzahl' }), { target: { value: '8' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Deal speichern' }));
    await waitFor(() => expect(apiMocks.put).toHaveBeenCalledWith('/admin/trade/deals/3', expect.objectContaining({ amount: 8, giveCommodityId: 2, factionId: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'Deal 3 beenden' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/admin/trade/deals/3/end', {}));
  });

  it('maintains the lottery prize buildplans per faction', async () => {
    renderPage();
    const prizes = await screen.findByRole('region', { name: 'Lotterie-Gewinnbaupläne' });
    const row = (await within(prizes).findByText('Kartellfrachter', { selector: 'td' })).closest('tr') as HTMLElement;
    expect(row.textContent).toContain('Rebellenallianz');
    expect(row.textContent).toContain('30');

    fireEvent.change(within(prizes).getByRole('combobox', { name: 'Gewinn-Fraktion' }), { target: { value: '1' } });
    fireEvent.change(within(prizes).getByRole('combobox', { name: 'Gewinn-Bauplan' }), { target: { value: '9' } });
    fireEvent.change(within(prizes).getByRole('spinbutton', { name: 'Chance' }), { target: { value: '70' } });
    fireEvent.click(within(prizes).getByRole('button', { name: 'Gewinnbauplan hinzufügen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/admin/trade/lottery-buildplans', { factionId: 1, buildplanId: 9, chance: 70 }));

    fireEvent.click(within(prizes).getByRole('button', { name: 'Gewinnbauplan 4 entfernen' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/admin/trade/lottery-buildplans/4'));
  });
});
