import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { BASIC_TRADE_LIMIT_KEY, BasicTradeTab } from './BasicTradeTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../lib/assets', () => ({ commodityImage: (id: number) => `/commodity-${id}.png` }));

const overview = {
  limit: 25,
  accounts: [
    {
      tradePostId: 7,
      tradePostName: 'Versorgungsstützpunkt Aurek',
      networkId: 2,
      aurodium: 3,
      items: [
        { commodityId: 2, commodityName: 'Doonium', rateId: 'rate-2', buyValue: 1896, sellValue: 2086, stored: 2100 },
        { commodityId: 4, commodityName: 'Transparistahl', rateId: 'rate-4', buyValue: 940, sellValue: 1034, stored: 0 },
      ],
    },
  ],
  charts: [
    {
      networkId: 2,
      commodityId: 2,
      commodityName: 'Doonium',
      totalTradeCount: 3,
      points: [
        { value: 189643, dateMs: 1_800_000_000_000 },
        { value: 189143, dateMs: 1_800_000_060_000 },
        { value: 190143, dateMs: 1_800_000_120_000 },
      ],
    },
  ],
};

describe('BasicTradeTab', () => {
  beforeEach(() => {
    localStorage.clear();
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue(overview);
  });

  it('shows buy and sell values per commodity and the Aurodium balance', async () => {
    render(<BasicTradeTab />);

    const account = await screen.findByRole('region', { name: 'Versorgungsstützpunkt Aurek' });
    expect(account.textContent).toContain('Aurodium: 3');
    const doonium = within(account).getByText('Doonium').closest('tr') as HTMLElement;
    expect(doonium.textContent).toContain('1 Aurodium → 1.896');
    expect(doonium.textContent).toContain('2.086 → 1 Aurodium');
    expect(within(account).getByRole('button', { name: 'Transparistahl verkaufen' })).toHaveProperty('disabled', true);
  });

  it('buys and sells pinned to the shown rate id', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Die Waren wurden gekauft' });
    render(<BasicTradeTab />);

    fireEvent.click(await screen.findByRole('button', { name: 'Doonium kaufen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/basic/buy', { postId: 7, rateId: 'rate-2' }));
    expect((await screen.findByRole('status')).textContent).toBe('Die Waren wurden gekauft');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Doonium verkaufen' })).toHaveProperty('disabled', false));

    fireEvent.click(screen.getByRole('button', { name: 'Doonium verkaufen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/basic/sell', { postId: 7, rateId: 'rate-2' }));
  });

  it('shows a stale rate error and reloads the current rates', async () => {
    apiMocks.post.mockRejectedValue(new Error('Kurs wurde zwischenzeitlich aktualisiert - es konnte nicht gekauft werden'));
    render(<BasicTradeTab />);

    fireEvent.click(await screen.findByRole('button', { name: 'Doonium kaufen' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Kurs wurde zwischenzeitlich aktualisiert - es konnte nicht gekauft werden');
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('changes the chart limit, reloads with it and remembers it in the browser', async () => {
    render(<BasicTradeTab />);
    await screen.findByRole('region', { name: 'Kursverlauf' });
    expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/basic?limit=25');

    fireEvent.change(screen.getByRole('combobox', { name: 'Letzte Kurse' }), { target: { value: '50' } });

    await waitFor(() => expect(apiMocks.get).toHaveBeenLastCalledWith('/trade/basic?limit=50'));
    expect(localStorage.getItem(BASIC_TRADE_LIMIT_KEY)).toBe('50');
  });

  it('starts with the remembered limit', async () => {
    localStorage.setItem(BASIC_TRADE_LIMIT_KEY, '10');
    render(<BasicTradeTab />);

    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/trade/basic?limit=10'));
  });

  it('draws one rate line per network and commodity with a hover tooltip', async () => {
    render(<BasicTradeTab />);

    const chart = await screen.findByRole('img', { name: 'Doonium · Rebellenallianz: letzter Kurswert 190.143' });
    fireEvent.mouseEnter(within(chart.closest('figure') as HTMLElement).getAllByTestId('chart-hit')[1]);

    expect((await screen.findByRole('tooltip')).textContent).toContain('189.143');
  });

  it('explains that basic trade needs an NPC post license', async () => {
    apiMocks.get.mockResolvedValue({ limit: 25, accounts: [], charts: [] });
    render(<BasicTradeTab />);

    expect(await screen.findByText(/nur mit einer gültigen Lizenz an einem NPC-Handelsposten/)).toBeTruthy();
  });
});
