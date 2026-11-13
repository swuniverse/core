import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeLotteryTab } from './TradeLotteryTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const lottery = {
  hasLicense: true,
  notice: null,
  tradePostName: 'Hutten-Handelsposten',
  period: '2026.11',
  tickets: 1234,
  ownTickets: 12,
  jackpot: 988,
  aurodium: 40,
  lastDraw: { period: '2026.10', tickets: 50, jackpot: 40, ownTickets: 3, winner: { id: 7, username: 'Han' } },
};

describe('TradeLotteryTab', () => {
  beforeEach(() => {
    apiMocks.get.mockReset().mockResolvedValue(lottery);
    apiMocks.post.mockReset();
  });

  it('shows the running period and the last draw', async () => {
    render(<TradeLotteryTab />);

    const running = await screen.findByRole('region', { name: 'Lotterie 2026.11' });
    expect(running.textContent).toContain('Lose im Topf: 1.234');
    expect(running.textContent).toContain('Deine Lose: 12');
    expect(running.textContent).toContain('Möglicher Jackpot: 988 Aurodium');
    expect(running.textContent).toContain('Aurodium am Hutten-Handelsposten: 40');
    const last = screen.getByRole('region', { name: 'Letzte Ziehung 2026.10' });
    expect(last.textContent).toContain('Gewinner: Han');
    expect(last.textContent).toContain('40 Aurodium aus 50 Losen');
    expect(last.textContent).toContain('Deine Lose: 3');
  });

  it('buys tickets and reloads', async () => {
    apiMocks.post.mockResolvedValue({ message: '5 Lotterielos(e) wurde gekauft' });
    render(<TradeLotteryTab />);

    const running = await screen.findByRole('region', { name: 'Lotterie 2026.11' });
    fireEvent.change(within(running).getByRole('spinbutton', { name: 'Anzahl Lose' }), { target: { value: '5' } });
    fireEvent.click(within(running).getByRole('button', { name: 'Lose kaufen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/lottery/tickets', { amount: 5 }));
    expect((await screen.findByRole('status')).textContent).toBe('5 Lotterielos(e) wurde gekauft');
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('shows the license notice instead of the purchase form', async () => {
    apiMocks.get.mockResolvedValue({ ...lottery, hasLicense: false, notice: 'Um Lotterielose zu kaufen, wird eine Handelslizenz beim Hutten-Kartell benötigt' });
    render(<TradeLotteryTab />);

    expect(await screen.findByText('Um Lotterielose zu kaufen, wird eine Handelslizenz beim Hutten-Kartell benötigt')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lose kaufen' })).toBeNull();
  });
});
