import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeOffersTab } from './TradeOffersTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const offers = [
  {
    id: 3, tradePostId: 1, tradePostName: 'Mos Eisley',
    offeredCommodityId: 5, offeredCommodityName: 'Aurodium', offeredAmount: 10,
    wantedCommodityId: 6, wantedCommodityName: 'Durastahl', wantedAmount: 5,
    offerCount: 3, reservedAmount: 30, createdAt: '2026-11-12T10:00:00.000Z',
  },
];
const options = {
  tradePostId: 1,
  tradePostName: 'Mos Eisley',
  hasLicense: true,
  isNpcPost: false,
  accountFree: 40,
  accountGoods: [{ commodityId: 5, commodityName: 'Aurodium', amount: 25 }],
  tradeableCommodities: [{ id: 5, name: 'Aurodium' }, { id: 6, name: 'Durastahl' }],
};

function serve(overrides: Record<string, unknown> = {}) {
  apiMocks.get.mockImplementation(async (url: string) => {
    if (url in overrides) return overrides[url];
    if (url === '/trade/offers/mine') return offers;
    if (url === '/trade/licenses') return [{ id: 1, tradePostId: 1, tradePostName: 'Mos Eisley', networkId: 1, startsAt: '', expiresAt: '' }];
    if (url === '/trade/posts/1/offer-options') return options;
    throw new Error(`unexpected ${url}`);
  });
}

async function openDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Neues Angebot' }));
  const dialog = await screen.findByRole('dialog', { name: 'Neues Angebot' });
  await within(dialog).findByRole('combobox', { name: 'Angebotene Ware' });
  return dialog;
}

describe('TradeOffersTab', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.delete.mockReset();
    serve();
  });

  it('lists own offers per post and withdraws one', async () => {
    apiMocks.delete.mockResolvedValue({ message: 'Das Angebot wurde gelöscht' });
    render(<TradeOffersTab />);

    const post = await screen.findByRole('region', { name: 'Mos Eisley' });
    const row = within(post).getByText('10 Aurodium').closest('tr') as HTMLElement;
    expect(row.textContent).toContain('5 Durastahl');
    expect(row.textContent).toContain('3×');
    expect(row.textContent).toContain('30');
    fireEvent.click(within(row).getByRole('button', { name: 'Zurückziehen' }));

    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/trade/offers/3'));
    expect((await screen.findByRole('status')).textContent).toBe('Das Angebot wurde gelöscht');
  });

  it('validates the new offer form before sending', async () => {
    render(<TradeOffersTab />);
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Verlangte Ware' }), { target: { value: '5' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Angebotene Menge' }), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Anzahl' }), { target: { value: '100' } });

    const problems = within(dialog).getByRole('list', { name: 'Eingabefehler' }).textContent;
    expect(problems).toContain('Es kann nicht die gleiche Ware eingetauscht werden');
    expect(problems).toContain('Die Anzahl muss zwischen 1 und 99 liegen');
    expect(problems).toContain('Nicht genügend Waren im Warenkonto');
    expect(within(dialog).getByRole('button', { name: 'Angebot erstellen' })).toHaveProperty('disabled', true);
  });

  it('fixes the wanted commodity to Aurodium at an NPC post unless Aurodium is offered', async () => {
    serve({
      '/trade/posts/1/offer-options': {
        ...options,
        isNpcPost: true,
        accountGoods: [
          { commodityId: 6, commodityName: 'Durastahl', amount: 25 },
          { commodityId: 50, commodityName: 'Aurodium', amount: 25 },
        ],
        tradeableCommodities: [{ id: 50, name: 'Aurodium' }, { id: 6, name: 'Durastahl' }, { id: 7, name: 'Tibanna' }],
      },
    });
    render(<TradeOffersTab />);
    const dialog = await openDialog();
    const wanted = within(dialog).getByRole('combobox', { name: 'Verlangte Ware' }) as HTMLSelectElement;
    const offered = within(dialog).getByRole('combobox', { name: 'Angebotene Ware' });

    expect(Array.from(wanted.options).map((option) => option.text)).toEqual(['Aurodium']);
    expect(wanted.disabled).toBe(true);

    fireEvent.change(offered, { target: { value: '50' } });
    expect(Array.from(wanted.options).map((option) => option.text)).toEqual(['Aurodium', 'Durastahl', 'Tibanna']);
    expect(wanted.disabled).toBe(false);
    expect(wanted.value).toBe('6');
  });

  it('previews the ratio and truncation and creates the offer', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Das Angebot wurde erstellt (Anzahl auf 2 gekürzt)' });
    render(<TradeOffersTab />);
    const dialog = await openDialog();

    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Angebotene Menge' }), { target: { value: '10' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Verlangte Menge' }), { target: { value: '4' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Anzahl' }), { target: { value: '5' } });

    expect(within(dialog).getByLabelText('Vorschau').textContent).toBe(
      'Verhältnis: 1 Aurodium = 0,4 Durastahl · Reserve: 20 · Anzahl wird auf 2 gekürzt',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Angebot erstellen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/offers', {
        offeredCommodityId: 5, offeredAmount: 10, wantedCommodityId: 6, wantedAmount: 4, offerCount: 5,
      }),
    );
    expect((await screen.findByRole('status')).textContent).toBe('Das Angebot wurde erstellt (Anzahl auf 2 gekürzt)');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows server errors in the dialog', async () => {
    apiMocks.post.mockRejectedValue(new Error('Du hast auf diesem Handelsposten bereits ein vergleichbares Angebot'));
    render(<TradeOffersTab />);
    const dialog = await openDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Angebot erstellen' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe('Du hast auf diesem Handelsposten bereits ein vergleichbares Angebot');
  });

  it('explains that offers need a license', async () => {
    serve({ '/trade/licenses': [] });
    render(<TradeOffersTab />);
    fireEvent.click(await screen.findByRole('button', { name: 'Neues Angebot' }));

    expect(await screen.findByText('Du besitzt keine gültige Handelslizenz.')).toBeTruthy();
  });
});
