import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TradePage } from './trade';
import { formatDateTime } from '../lib/format';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('../services/api', () => ({ api: apiMocks }));

const posts = [
  {
    id: 1,
    name: 'Nar Shaddaa Markt',
    description: 'Schwarzmarkt',
    networkId: 2,
    owner: { id: 9, name: 'Hutten-Kartell' },
    licenseStatus: 'ACCOUNT',
    location: { scope: 'GALAXY', layerId: 1, x: 4, y: 5 },
    level: 2,
    storageLimit: 5000,
    transferCapacity: 300,
  },
  {
    id: 2,
    name: 'Verborgener Posten',
    description: '',
    networkId: 2,
    owner: { id: 9, name: 'Hutten-Kartell' },
    licenseStatus: 'NONE',
    location: null,
    level: 1,
    storageLimit: 1000,
    transferCapacity: 100,
  },
];

const overview = {
  accounts: [{ tradePostId: 1, commodityId: 10101, amount: 1200 }],
  spacecraft: [
    { tradePostId: 1, spacecraftId: 77, spacecraftName: 'Falke', shipClassId: 3, kind: 'SHIP' },
  ],
};

const baseMenu = {
  tradePostId: 1,
  tradePostName: 'Nar Shaddaa Markt',
  networkId: 2,
  isOwner: false,
  freeByAgreement: false,
  condition: { commodityId: 10101, commodityName: 'Durastahl', amount: 10, durationDays: 30 },
  license: null,
  renewalExpiresAt: null,
  purchase: { shipId: null, rejection: 'Lizenzen werden über das Handelsmenü eines eigenen Schiffs am Posten gekauft', payShips: [] },
  accounts: [],
  tradeableCommodities: [],
};

function renderPage(entry = '/trade') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TradePage />
    </MemoryRouter>,
  );
}

describe('TradePage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.put.mockReset();
    apiMocks.get.mockImplementation(async (url: string) => {
      if (url === '/trade/posts') return posts;
      if (url === '/trade/overview') return overview;
      if (url === '/database/commodities') return [{ id: 10101, name: 'Durastahl' }];
      if (url.startsWith('/trade/posts/1/license-menu')) return baseMenu;
      throw new Error(`unexpected ${url}`);
    });
  });

  function serveMenu(menu: Record<string, unknown>, extra: Record<string, unknown> = {}) {
    const fallback = apiMocks.get.getMockImplementation() as (url: string) => Promise<unknown>;
    apiMocks.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/trade/posts/1/license-menu')) return { ...baseMenu, ...menu };
      if (url in extra) return extra[url];
      return fallback(url);
    });
  }

  it('shows account balances on the Warenkonten tab', async () => {
    renderPage();

    expect(await screen.findByText('Durastahl')).toBeTruthy();
    expect(screen.getByText('1.200')).toBeTruthy();
    expect(screen.queryByText('Verborgener Posten')).toBeNull();
  });

  it('lists posts without a location link for unknown posts and opens post info', async () => {
    renderPage();
    await screen.findByText('Durastahl');

    fireEvent.click(screen.getByRole('button', { name: 'Handelsposten' }));

    expect(await screen.findByText('Verborgener Posten')).toBeTruthy();
    expect(screen.getByText('Unbekannt')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Ebene 1 4:5' }).getAttribute('href'),
    ).toBe('/starmap?layer=1&x=4&y=5');
    expect(screen.queryByRole('link', { name: 'Unbekannt' })).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Nar Shaddaa Markt' }));

    expect(await screen.findByText('Posteninfo: Nar Shaddaa Markt')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Falke' }).getAttribute('href')).toBe(
      '/spacecraft/77',
    );
    await waitFor(() => expect(screen.getByText(/Durastahl 1\.200/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Liste' }));
    expect(await screen.findByText('Verborgener Posten')).toBeTruthy();
  });

  it('lists own valid licenses with post, network and expiry', async () => {
    const expiresAt = '2026-12-12T10:00:00.000Z';
    serveMenu({}, {
      '/trade/licenses': [
        { id: 4, tradePostId: 1, tradePostName: 'Nar Shaddaa Markt', networkId: 2, startsAt: '2026-11-12T10:00:00.000Z', expiresAt },
      ],
    });
    renderPage('/trade?tab=licenses');

    const row = (await screen.findByRole('button', { name: 'Nar Shaddaa Markt' })).closest('tr') as HTMLElement;
    expect(row.textContent).toContain('Netz 2');
    expect(row.textContent).toContain(formatDateTime(expiresAt));
  });

  it('buys a license from the cargo of a ship offered by the server', async () => {
    serveMenu({
      purchase: { shipId: 77, rejection: null, payShips: [{ id: 78, name: 'Barke', amount: 12 }] },
      accounts: [{ tradePostId: 1, tradePostName: 'Nar Shaddaa Markt', amount: 40 }],
    });
    apiMocks.post.mockResolvedValue({});
    renderPage('/trade?tab=posts&post=1&ship=77');

    expect(await screen.findByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/trade/posts/1/license-menu?shipId=77');
    expect(screen.getByRole('radio', { name: 'Frachtraum Barke (12)' })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz kaufen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses', { method: 'ship', shipId: 77, payShipId: 78 }),
    );
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Handelslizenz wurde erteilt');
  });

  it('buys a license from a trade account and shows server errors', async () => {
    serveMenu({
      purchase: { shipId: 77, rejection: null, payShips: [] },
      accounts: [{ tradePostId: 3, tradePostName: 'Kessel', amount: 25 }],
    });
    apiMocks.post.mockRejectedValue(new Error('Nicht genügend Waren auf dem Handelskonto'));
    renderPage('/trade?tab=posts&post=1&ship=77');

    fireEvent.click(await screen.findByRole('radio', { name: 'Warenkonto Kessel (25)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz kaufen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses', { method: 'account', shipId: 77, accountPostId: 3 }),
    );
    expect((await screen.findByRole('alert')).textContent).toBe('Nicht genügend Waren auf dem Handelskonto');
  });

  it('takes the license for free under a trade agreement without a payment source', async () => {
    serveMenu({ freeByAgreement: true, purchase: { shipId: 77, rejection: null, payShips: [] } });
    apiMocks.post.mockResolvedValue({});
    renderPage('/trade?tab=posts&post=1&ship=77');

    expect(await screen.findByText('Für dich kostenlos (Handelsabkommen mit dem Eigentümer)')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz kostenlos erhalten' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses', { method: 'agreement', shipId: 77 }),
    );
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Handelslizenz wurde kostenlos erteilt (Handelsabkommen)');
  });

  it('renews for free under a trade agreement without an account', async () => {
    serveMenu({
      freeByAgreement: true,
      license: { id: 4, startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' },
      renewalExpiresAt: '2027-01-11T10:00:00.000Z',
      purchase: { shipId: null, rejection: 'Du besitzt bereits eine gültige Lizenz für diesen Handelsposten', payShips: [] },
    });
    apiMocks.post.mockResolvedValue({});
    renderPage('/trade?tab=posts&post=1');

    fireEvent.click(await screen.findByRole('button', { name: 'Lizenz kostenlos verlängern' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses/renewal', {}));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Handelslizenz wurde kostenlos verlängert (Handelsabkommen)');
  });

  it('opens the Hutt Cartel deals from their tab', async () => {
    serveMenu({}, { '/trade/deals': { hasLicense: false, notice: 'Handelslizenz beim Hutten-Kartell erforderlich', deals: [] } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Hutten-Deals' }));

    expect(await screen.findByText('Handelslizenz beim Hutten-Kartell erforderlich')).toBeTruthy();
  });

  it('explains why no purchase is offered', async () => {
    renderPage('/trade?tab=posts&post=1');

    expect(await screen.findByText('Lizenzen werden über das Handelsmenü eines eigenen Schiffs am Posten gekauft')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lizenz kaufen' })).toBeNull();
  });

  it('renews an existing license showing the current condition and resulting expiry', async () => {
    const renewalExpiresAt = '2027-01-11T10:00:00.000Z';
    serveMenu({
      license: { id: 4, startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' },
      renewalExpiresAt,
      purchase: { shipId: null, rejection: 'Du besitzt bereits eine gültige Lizenz für diesen Handelsposten', payShips: [] },
      accounts: [{ tradePostId: 3, tradePostName: 'Kessel', amount: 25 }],
    });
    apiMocks.post.mockResolvedValue({});
    renderPage('/trade?tab=posts&post=1');

    expect(await screen.findByText(`Neuer Ablauf: ${formatDateTime(renewalExpiresAt)}`)).toBeTruthy();
    expect(screen.getByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lizenz kaufen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz verlängern' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses/renewal', { accountPostId: 3 }),
    );
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Handelslizenz wurde verlängert');
  });

  it('lets only the post owner manage the condition and see issued licenses', async () => {
    serveMenu(
      { isOwner: true, tradeableCommodities: [{ id: 10101, name: 'Durastahl' }, { id: 7, name: 'Tibanna' }] },
      { '/trade/posts/1/licenses': [{ id: 9, userId: 4, username: 'Lando', startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' }] },
    );
    apiMocks.put.mockResolvedValue({});
    renderPage('/trade?tab=posts&post=1');

    const admin = await screen.findByRole('region', { name: 'Lizenzverwaltung' });
    expect(await screen.findByText('Lando')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Ware' }), { target: { value: '7' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Menge' }), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bedingung speichern' }));

    await waitFor(() =>
      expect(apiMocks.put).toHaveBeenCalledWith('/trade/posts/1/license-info', { commodityId: 7, amount: 15, durationDays: 30 }),
    );
    expect(admin.textContent).toContain('Lizenzbedingung gespeichert');
  });

  it('hides license management from other players', async () => {
    renderPage('/trade?tab=posts&post=1');

    expect(await screen.findByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Lizenzverwaltung' })).toBeNull();
    expect(apiMocks.get).not.toHaveBeenCalledWith('/trade/posts/1/licenses');
  });
});
