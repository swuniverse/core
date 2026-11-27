import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TradePage } from './trade';
import { useAuthStore } from '../stores/auth.store';
import { formatDateTime } from '../lib/format';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
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
    owner: null,
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
  transferCapacities: [{ tradePostId: 1, free: 60, capacity: 200 }],
  accountBoxes: [
    {
      tradePostId: 1, name: 'Nar Shaddaa Markt', isNpcPost: true,
      location: { scope: 'GALAXY', layerId: 1, x: 4, y: 5 }, networkId: 2, networkName: 'Hutten-Netz',
      stock: [{ commodityId: 10101, amount: 1200 }], offerStock: [{ commodityId: 10101, amount: 50 }],
      storage: { occupied: 1200, limit: 5000, isOverStorage: false },
      issuedLicenseCount: 3, licenseCondition: null, isOwner: false,
      transferCapacity: { free: 60, capacity: 200 },
    },
    {
      tradePostId: 3, name: 'Eigener Posten', isNpcPost: false, location: null, networkId: 2, networkName: 'Hutten-Netz',
      stock: [{ commodityId: 10101, amount: 900 }], offerStock: [],
      storage: { occupied: 900, limit: 500, isOverStorage: true },
      issuedLicenseCount: 2, licenseCondition: null, isOwner: true, transferCapacity: null,
    },
  ],
};

const baseMenu = {
  tradePostId: 1,
  tradePostName: 'Nar Shaddaa Markt',
  networkId: 2,
  isOwner: false,
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
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
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

    expect(await screen.findByRole('button', { name: 'Nar Shaddaa Markt' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' })).getByRole('button', { name: 'Waren lagernd Durastahl' }).textContent).toBe('1.200');
    expect(screen.queryByText('Verborgener Posten')).toBeNull();
  });

  it('shows the transfer capacity and transfers goods to a licensed post of the network', async () => {
    serveMenu({}, {
      '/trade/posts/1/transfer-targets': {
        tradePostId: 1, free: 60, capacity: 200,
        targets: [{ tradePostId: 4, tradePostName: 'Kessel', freeStorage: 300 }],
      },
    });
    apiMocks.post.mockResolvedValue({ message: 'Es wurde 25 Durastahl zum Kessel transferiert', amount: 25 });
    renderPage();

    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    expect(npc.textContent).toContain('60 frei (200 pro Tag)');
    fireEvent.click(within(npc).getByRole('button', { name: 'Waren lagernd Durastahl' }));
    fireEvent.click(within(npc).getByRole('button', { name: 'Transferieren' }));
    const dialog = await screen.findByRole('dialog', { name: 'Waren transferieren' });
    const target = await within(dialog).findByRole('combobox', { name: 'Zielposten' });
    expect(Array.from(target.querySelectorAll('option')).map((option) => option.textContent)).toEqual(['Kessel (300 frei)']);
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Menge' }), { target: { value: '25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Transferieren' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/transfer', { targetPostId: 4, commodityId: 10101, amount: 25 }),
    );
    expect((await screen.findByRole('status')).textContent).toBe('Es wurde 25 Durastahl zum Kessel transferiert');
    expect(apiMocks.get.mock.calls.filter(([url]) => url === '/trade/overview')).toHaveLength(2);
  });

  it('explains when no licensed target post exists in the network', async () => {
    serveMenu({}, { '/trade/posts/1/transfer-targets': { tradePostId: 1, free: 60, capacity: 200, targets: [] } });
    renderPage();

    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    fireEvent.click(within(npc).getByRole('button', { name: 'Waren lagernd Durastahl' }));
    fireEvent.click(within(npc).getByRole('button', { name: 'Transferieren' }));

    expect(await screen.findByText('Du besitzt an keinem anderen Posten dieses Handelsnetzes eine gültige Lizenz.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Transferieren' })).toBeNull();
  });

  it('offers Transferieren only at NPC posts and colors the storage by over-storage', async () => {
    renderPage();
    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    const own = screen.getByRole('region', { name: 'Warenkonto Eigener Posten' });

    fireEvent.click(within(own).getByRole('button', { name: 'Waren lagernd Durastahl' }));
    expect(within(own).getByRole('button', { name: 'Angebot erstellen' })).toBeTruthy();
    expect(within(own).queryByRole('button', { name: 'Transferieren' })).toBeNull();
    expect(within(own).queryByText(/pro Tag/)).toBeNull();
    fireEvent.click(within(npc).getByRole('button', { name: 'Waren lagernd Durastahl' }));
    expect(within(npc).getByRole('button', { name: 'Transferieren' })).toBeTruthy();

    expect(within(own).getByText('900 / 500').className).toContain('text-red-400');
    expect(within(npc).getByText('1.200 / 5.000').className).toContain('text-emerald-400');
    // Network 2 is the rebel NPC supply network; player posts show no faction icon.
    expect(npc.querySelector('img[src$="avatars/Avatar_Rebellen.png"]')).not.toBeNull();
    expect(own.querySelector('img[src*="avatars/"]')).toBeNull();
  });

  it('opens the offer dialog preset with post and commodity', async () => {
    serveMenu({}, {
      '/trade/licenses': [{ id: 1, tradePostId: 1, tradePostName: 'Nar Shaddaa Markt', networkId: 2, startsAt: '', expiresAt: '' }, { id: 2, tradePostId: 3, tradePostName: 'Eigener Posten', networkId: 2, startsAt: '', expiresAt: '' }],
      '/trade/posts/3/offer-options': {
        tradePostId: 3, tradePostName: 'Eigener Posten', hasLicense: true, accountFree: 10,
        accountGoods: [{ commodityId: 5, commodityName: 'Tibanna', amount: 1 }, { commodityId: 10101, commodityName: 'Durastahl', amount: 900 }],
        tradeableCommodities: [{ id: 5, name: 'Tibanna' }, { id: 10101, name: 'Durastahl' }],
      },
    });
    renderPage();
    const own = await screen.findByRole('region', { name: 'Warenkonto Eigener Posten' });
    fireEvent.click(within(own).getByRole('button', { name: 'Waren lagernd Durastahl' }));
    fireEvent.click(within(own).getByRole('button', { name: 'Angebot erstellen' }));

    const dialog = await screen.findByRole('dialog', { name: 'Neues Angebot' });
    await waitFor(() => expect((within(dialog).getByRole('combobox', { name: 'Angebotene Ware' }) as HTMLSelectElement).value).toBe('10101'));
    expect((within(dialog).getByRole('combobox', { name: 'Handelsposten' }) as HTMLSelectElement).value).toBe('3');
  });

  it('shows own offers of a commodity at the post and withdraws them', async () => {
    const offer = {
      id: 8, tradePostId: 1, tradePostName: 'Nar Shaddaa Markt', offeredCommodityId: 10101, offeredCommodityName: 'Durastahl',
      offeredAmount: 10, wantedCommodityId: 5, wantedCommodityName: 'Tibanna', wantedAmount: 2, offerCount: 5, reservedAmount: 50, createdAt: '',
    };
    serveMenu({}, { '/trade/offers/mine': [offer, { ...offer, id: 9, tradePostId: 3 }] });
    apiMocks.delete.mockResolvedValue({ message: 'Angebot zurückgezogen' });
    renderPage();
    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    fireEvent.click(within(npc).getByRole('button', { name: 'Waren in Angeboten Durastahl' }));

    expect(await within(npc).findByText(/10 Durastahl gegen 2 Tibanna/)).toBeTruthy();
    expect(within(npc).getAllByRole('button', { name: 'Zurückziehen' })).toHaveLength(1);
    fireEvent.click(within(npc).getByRole('button', { name: 'Zurückziehen' }));
    await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/trade/offers/8'));
  });

  it('shows the issued license count and the fee link by role, and renames own posts', async () => {
    apiMocks.patch.mockRejectedValue(new Error('Name zu lang'));
    renderPage();
    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    const own = screen.getByRole('region', { name: 'Warenkonto Eigener Posten' });

    expect(within(npc).queryByText('Ausgestellte Lizenzen')).toBeNull();
    expect(within(npc).getByRole('button', { name: 'Anzeigen' })).toBeTruthy();
    expect(within(npc).queryByRole('button', { name: 'Umbenennen' })).toBeNull();
    expect(within(own).getByText('Ausgestellte Lizenzen').nextElementSibling?.textContent).toContain('2');
    expect(within(own).getByRole('button', { name: 'Bearbeiten' })).toBeTruthy();

    fireEvent.click(within(own).getByRole('button', { name: 'Umbenennen' }));
    fireEvent.change(within(own).getByRole('textbox', { name: 'Name' }), { target: { value: 'Neu' } });
    fireEvent.click(within(own).getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/trade/posts/3', { name: 'Neu' }));
    expect((await within(own).findByRole('alert')).textContent).toBe('Name zu lang');
  });

  it('lists own ships at the post', async () => {
    renderPage();
    const npc = await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    fireEvent.click(within(npc).getByRole('button', { name: 'Schiffe vor Ort' }));
    expect(within(npc).getByRole('link', { name: 'Falke' }).getAttribute('href')).toBe('/spacecraft/77');
  });

  it('has no post list tab and opens post info from the account box', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' });
    expect(screen.queryByRole('button', { name: 'Handelsposten' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Nar Shaddaa Markt' }));

    expect(await screen.findByText('Posteninfo: Nar Shaddaa Markt')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Falke' }).getAttribute('href')).toBe('/spacecraft/77');
    expect(screen.getByRole('link', { name: 'Ebene 1 4:5' }).getAttribute('href')).toBe('/starmap?layer=1&x=4&y=5');
    await waitFor(() => expect(screen.getByText(/Durastahl 1\.200/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(await screen.findByRole('region', { name: 'Warenkonto Nar Shaddaa Markt' })).toBeTruthy();
  });

  it('shows an unknown location and an abandoned operator in the post info', async () => {
    renderPage('/trade?post=2');
    expect(await screen.findByText('Posteninfo: Verborgener Posten')).toBeTruthy();
    expect(screen.getByText('Unbekannt')).toBeTruthy();
    expect(screen.getByText('Verlassen')).toBeTruthy();
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
    renderPage('/trade?post=1&ship=77');

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
    renderPage('/trade?post=1&ship=77');

    fireEvent.click(await screen.findByRole('radio', { name: 'Warenkonto Kessel (25)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz kaufen' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses', { method: 'account', shipId: 77, accountPostId: 3 }),
    );
    expect((await screen.findByRole('alert')).textContent).toBe('Nicht genügend Waren auf dem Handelskonto');
  });

  it('never offers a free license and always asks for a payment source (trade agreements have no trade effect)', async () => {
    serveMenu({
      purchase: { shipId: 77, rejection: null, payShips: [{ id: 78, name: 'Barke', amount: 12 }] },
      accounts: [{ tradePostId: 1, tradePostName: 'Nar Shaddaa Markt', amount: 40 }],
    });
    renderPage('/trade?post=1&ship=77');

    expect(await screen.findByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(screen.queryByText(/kostenlos/i)).toBeNull();
    expect(screen.getByRole('radio', { name: 'Frachtraum Barke (12)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Warenkonto Nar Shaddaa Markt (40)' })).toBeTruthy();
  });

  it('opens the Hutt Cartel deals from their tab', async () => {
    serveMenu({}, { '/trade/deals': { hasLicense: false, notice: 'Handelslizenz beim Hutten-Kartell erforderlich', deals: [] } });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Hutten-Deals' }));

    expect(await screen.findByText('Handelslizenz beim Hutten-Kartell erforderlich')).toBeTruthy();
  });

  it('explains why no purchase is offered', async () => {
    renderPage('/trade?post=1');

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
    renderPage('/trade?post=1');

    expect(await screen.findByText(`Neuer Ablauf: ${formatDateTime(renewalExpiresAt)}`)).toBeTruthy();
    expect(screen.getByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lizenz kaufen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lizenz verlängern' }));

    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/trade/posts/1/licenses/renewal', { accountPostId: 3 }),
    );
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Handelslizenz wurde verlängert');
  });

  it('offers a quick PM to the post operator except for the own account', async () => {
    useAuthStore.setState({ user: { id: 9 } as never });
    const { unmount } = renderPage('/trade?post=1');
    expect(await screen.findByText('Posteninfo: Nar Shaddaa Markt')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nachricht an Hutten-Kartell schreiben' })).toBeNull();
    unmount();

    useAuthStore.setState({ user: { id: 1 } as never });
    renderPage('/trade?post=1');
    fireEvent.click(await screen.findByRole('button', { name: 'Nachricht an Hutten-Kartell schreiben' }));
    expect(screen.getByText(/Empfänger:/).textContent).toContain('(9)');
    useAuthStore.setState({ user: null });
  });

  it('offers a quick PM to license holders except for the own account', async () => {
    useAuthStore.setState({ user: { id: 5 } as never });
    serveMenu({ isOwner: true, license: { id: 1, startsAt: '2026-11-01T10:00:00.000Z', expiresAt: '9999-12-31T23:59:59.000Z' } }, {
      '/trade/posts/1/licenses': [
        { id: 9, userId: 4, username: 'Lando', startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' },
        { id: 10, userId: 5, username: 'Selbst', startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' },
      ],
    });
    renderPage('/trade?post=1');

    fireEvent.click(await screen.findByRole('button', { name: 'Nachricht an Lando schreiben' }));
    expect(screen.getByText(/Empfänger:/).textContent).toContain('(4)');
    expect(screen.getByText('Selbst')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nachricht an Selbst schreiben' })).toBeNull();
    useAuthStore.setState({ user: null });
  });

  it('lets only the post owner manage the condition and see issued licenses', async () => {
    serveMenu(
      { isOwner: true, license: { id: 1, startsAt: '2026-11-01T10:00:00.000Z', expiresAt: '9999-12-31T23:59:59.000Z' }, tradeableCommodities: [{ id: 10101, name: 'Durastahl' }, { id: 7, name: 'Tibanna' }] },
      { '/trade/posts/1/licenses': [{ id: 9, userId: 4, username: 'Lando', startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' }] },
    );
    apiMocks.put.mockResolvedValue({});
    renderPage('/trade?post=1');

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

  it('shows issued licenses with purchase and expiry dates to non-owner license holders', async () => {
    serveMenu(
      { license: { id: 2, startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' } },
      { '/trade/posts/1/licenses': [
        { id: 1, userId: 3, username: 'Eigner', startsAt: '2026-11-01T10:00:00.000Z', expiresAt: '9999-12-31T23:59:59.000Z' },
        { id: 2, userId: 4, username: 'Lando', startsAt: '2026-11-12T10:00:00.000Z', expiresAt: '2026-12-12T10:00:00.000Z' },
      ] },
    );
    renderPage('/trade?post=1');

    const list = await screen.findByRole('region', { name: 'Ausgestellte Lizenzen' });
    expect(await within(list).findByText('Eigner')).toBeTruthy();
    expect(within(list).getByText('unbefristet')).toBeTruthy();
    expect(within(list).getByRole('columnheader', { name: 'Kaufdatum' })).toBeTruthy();
    expect(within(list).getByRole('button', { name: 'Nachricht an Lando schreiben' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Lizenzverwaltung' })).toBeNull();
  });

  it('hides license management from other players', async () => {
    renderPage('/trade?post=1');

    expect(await screen.findByText('10 Durastahl für 30 Tage')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Lizenzverwaltung' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Ausgestellte Lizenzen' })).toBeNull();
    expect(apiMocks.get).not.toHaveBeenCalledWith('/trade/posts/1/licenses');
  });
});
