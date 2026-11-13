import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TradeShoutboxTab } from './TradeShoutboxTab';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const licenses = [
  { id: 1, tradePostId: 3, tradePostName: 'Mos Eisley', networkId: 1, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z' },
  { id: 2, tradePostId: 4, tradePostName: 'Anchorhead', networkId: 1, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z' },
  { id: 3, tradePostId: 9, tradePostName: 'Nar Shaddaa', networkId: 3, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: '2026-12-01T00:00:00.000Z' },
];
const shoutbox = (networkId: number, networkName: string, messages: string[]) => ({
  networkId,
  networkName,
  entries: messages.map((message, index) => ({ id: index + 1, userId: 7, username: 'Han', message, createdAt: '2026-11-13T12:00:00.000Z' })),
});

function renderTab() {
  return render(<MemoryRouter><TradeShoutboxTab /></MemoryRouter>);
}

describe('TradeShoutboxTab', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockImplementation(async (url: string) => {
      if (url === '/trade/licenses') return licenses;
      if (url === '/trade/networks/1/shoutbox') return shoutbox(1, 'Imperiales Versorgungsnetz', ['Suche Durastahl']);
      if (url === '/trade/networks/3/shoutbox') return shoutbox(3, 'Hutten-Handelsnetz', []);
      throw new Error(`unexpected ${url}`);
    });
  });

  it('shows one shoutbox per licensed network with time, player link and text', async () => {
    renderTab();

    const imperial = await screen.findByRole('region', { name: 'Shoutbox Imperiales Versorgungsnetz' });
    expect(within(imperial).getByText('Suche Durastahl')).toBeTruthy();
    expect(within(imperial).getByRole('link', { name: 'Han' }).getAttribute('href')).toBe('/players/7');
    expect(await screen.findByRole('region', { name: 'Shoutbox Hutten-Handelsnetz' })).toBeTruthy();
    expect(apiMocks.get.mock.calls.filter(([url]) => url === '/trade/networks/1/shoutbox')).toHaveLength(1);
  });

  it('sends a message and shows the refreshed list', async () => {
    apiMocks.post.mockResolvedValue(shoutbox(1, 'Imperiales Versorgungsnetz', ['Verkaufe Tibanna', 'Suche Durastahl']));
    renderTab();
    const imperial = await screen.findByRole('region', { name: 'Shoutbox Imperiales Versorgungsnetz' });

    const input = within(imperial).getByRole('textbox', { name: 'Nachricht' });
    expect(input.getAttribute('maxLength')).toBe('200');
    fireEvent.change(input, { target: { value: 'Verkaufe Tibanna' } });
    fireEvent.click(within(imperial).getByRole('button', { name: 'Senden' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/networks/1/shoutbox', { message: 'Verkaufe Tibanna' }));
    expect(await within(imperial).findByText('Verkaufe Tibanna')).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows server errors at the box', async () => {
    apiMocks.post.mockRejectedValue(new Error('Du schreibst zu schnell. Bitte warte einen Moment'));
    renderTab();
    const imperial = await screen.findByRole('region', { name: 'Shoutbox Imperiales Versorgungsnetz' });

    fireEvent.change(within(imperial).getByRole('textbox', { name: 'Nachricht' }), { target: { value: 'Noch einmal' } });
    fireEvent.click(within(imperial).getByRole('button', { name: 'Senden' }));

    expect((await within(imperial).findByRole('alert')).textContent).toBe('Du schreibst zu schnell. Bitte warte einen Moment');
  });

  it('explains that a license is needed', async () => {
    apiMocks.get.mockImplementation(async (url: string) => (url === '/trade/licenses' ? [] : Promise.reject(new Error(url))));
    renderTab();

    expect(await screen.findByText('Die Shoutbox eines Handelsnetzes steht dir mit einer gültigen Lizenz an einem seiner Posten offen.')).toBeTruthy();
  });
});
