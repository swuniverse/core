import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeMenuDialog } from './TradeMenuDialog';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const menu = {
  tradePostId: 1,
  tradePostName: 'Mos Eisley',
  reason: null,
  hasLicense: true,
  cargo: [
    { commodityId: 6, commodityName: 'Durastahl', amount: 12, transferable: true },
    { commodityId: 9, commodityName: 'Gefangene', amount: 1, transferable: false },
  ],
  cargoUsed: 13,
  cargoMax: 50,
  account: [{ commodityId: 5, commodityName: 'Aurodium', amount: 7, transferable: true }],
  accountUsed: 7,
  accountCapacity: 100,
};

function renderDialog(onTransfer = vi.fn()) {
  render(<TradeMenuDialog shipId={77} tradePostId={1} onClose={vi.fn()} onTransfer={onTransfer} />);
  return onTransfer;
}

describe('TradeMenuDialog', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue(menu);
  });

  it('shows cargo and account side by side and moves the entered amount into the account', async () => {
    apiMocks.post.mockResolvedValue({
      direction: 'TO_ACCOUNT',
      transferred: [{ commodityId: 6, commodityName: 'Durastahl', amount: 4 }],
      messages: [],
    });
    const onTransfer = renderDialog();

    const cargo = await screen.findByRole('region', { name: 'Frachtraum 13/50' });
    expect(screen.getByRole('region', { name: 'Warenkonto 7/100' })).toBeTruthy();
    expect(within(cargo).getByText('nicht handelbar')).toBeTruthy();
    expect(within(cargo).queryByRole('spinbutton', { name: 'Menge Gefangene ins Konto' })).toBeNull();
    fireEvent.change(within(cargo).getByRole('spinbutton', { name: 'Menge Durastahl ins Konto' }), { target: { value: '4' } });
    fireEvent.click(within(cargo).getByRole('button', { name: 'ins Konto' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/77/trade/1/to-account', [{ commodityId: 6, amount: 4 }]),
    );
    expect((await screen.findByRole('status')).textContent).toBe('Transferiert: 4 Durastahl');
    expect(screen.getByText('Kein Energieverbrauch')).toBeTruthy();
    expect(onTransfer).toHaveBeenCalled();
    expect(apiMocks.get).toHaveBeenCalledTimes(2);
  });

  it('moves account goods onto the ship and reports truncation', async () => {
    apiMocks.post.mockResolvedValue({
      direction: 'FROM_ACCOUNT',
      transferred: [{ commodityId: 5, commodityName: 'Aurodium', amount: 5 }],
      messages: ['Aurodium: gekürzt auf 5, Frachtraum ist voll'],
    });
    renderDialog();

    const account = await screen.findByRole('region', { name: 'Warenkonto 7/100' });
    fireEvent.click(within(account).getByRole('button', { name: 'aufs Schiff' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/77/trade/1/from-account', [{ commodityId: 5, amount: 7 }]),
    );
    expect(await screen.findByText('Aurodium: gekürzt auf 5, Frachtraum ist voll')).toBeTruthy();
  });

  it('shows server errors', async () => {
    apiMocks.post.mockRejectedValue(new Error('Dein Warenkonto an diesem Posten ist voll'));
    renderDialog();

    const cargo = await screen.findByRole('region', { name: 'Frachtraum 13/50' });
    fireEvent.click(within(cargo).getByRole('button', { name: 'ins Konto' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Dein Warenkonto an diesem Posten ist voll');
  });

  it('offers only the license purchase without a license', async () => {
    apiMocks.get.mockImplementation(async (url: string) =>
      url === '/spacecraft/77/trade/1'
        ? { ...menu, hasLicense: false }
        : {
            tradePostId: 1, tradePostName: 'Mos Eisley', networkId: 1, isOwner: false, freeByAgreement: false,
            condition: { commodityId: 5, commodityName: 'Aurodium', amount: 10, durationDays: 30 },
            license: null, renewalExpiresAt: null,
            purchase: { shipId: 77, rejection: null, payShips: [{ id: 77, name: 'Barke', amount: 12 }] },
            accounts: [], tradeableCommodities: [],
          },
    );
    renderDialog();

    expect(await screen.findByRole('button', { name: 'Lizenz kaufen' })).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/trade/posts/1/license-menu?shipId=77');
    expect(screen.queryByRole('button', { name: 'ins Konto' })).toBeNull();
  });

  it('explains why the ship cannot trade', async () => {
    apiMocks.get.mockResolvedValue({ ...menu, reason: 'Der Hyperantrieb ist aktiv' });
    renderDialog();

    expect(await screen.findByText('Der Hyperantrieb ist aktiv')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ins Konto' })).toBeNull();
  });
});
