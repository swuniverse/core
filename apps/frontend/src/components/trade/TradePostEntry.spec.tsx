import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TradePostEntry } from './TradePostEntry';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

function renderEntry() {
  return render(
    <MemoryRouter>
      <TradePostEntry shipId={77} />
    </MemoryRouter>,
  );
}

describe('TradePostEntry', () => {
  beforeEach(() => apiMocks.get.mockReset());

  it('opens the trade menu of the post at the ship and links the post info', async () => {
    apiMocks.get.mockImplementation(async (url: string) =>
      url === '/trade/spacecraft/77/post'
        ? { tradePostId: 1, tradePostName: 'Mos Eisley', reason: null }
        : { tradePostId: 1, tradePostName: 'Mos Eisley', reason: 'Die Tarnung ist aktiv' },
    );
    renderEntry();

    expect((await screen.findByRole('link', { name: 'Posteninfo' })).getAttribute('href')).toBe('/trade?tab=posts&post=1&ship=77');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Handelsmenü' }));

    expect(await screen.findByRole('dialog', { name: 'Handelsmenü · Mos Eisley' })).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/spacecraft/77/trade/1');
  });

  it('explains why the trade menu is unavailable', async () => {
    apiMocks.get.mockResolvedValue({ tradePostId: 1, tradePostName: 'Mos Eisley', reason: 'Die Tarnung ist aktiv' });
    renderEntry();

    expect(await screen.findByText('Handelsmenü nicht verfügbar – Die Tarnung ist aktiv')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Handelsmenü' })).toBeNull();
  });

  it('renders nothing without a trade post at the ship', async () => {
    apiMocks.get.mockResolvedValue(null);
    const { container } = renderEntry();

    await vi.waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
