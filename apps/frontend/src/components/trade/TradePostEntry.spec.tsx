import { render, screen } from '@testing-library/react';
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

  it('links the trade menu of the post at the ship', async () => {
    apiMocks.get.mockResolvedValue({ tradePostId: 1, tradePostName: 'Mos Eisley', reason: null });
    renderEntry();

    const link = await screen.findByRole('link', { name: 'Handelsmenü' });
    expect(link.getAttribute('href')).toBe('/trade?tab=posts&post=1&ship=77');
    expect(apiMocks.get).toHaveBeenCalledWith('/trade/spacecraft/77/post');
  });

  it('explains why the trade menu is unavailable', async () => {
    apiMocks.get.mockResolvedValue({ tradePostId: 1, tradePostName: 'Mos Eisley', reason: 'Die Tarnung ist aktiv' });
    renderEntry();

    expect(await screen.findByText('Handelsmenü nicht verfügbar – Die Tarnung ist aktiv')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Handelsmenü' })).toBeNull();
  });

  it('renders nothing without a trade post at the ship', async () => {
    apiMocks.get.mockResolvedValue(null);
    const { container } = renderEntry();

    await vi.waitFor(() => expect(apiMocks.get).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
