import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { TradePage } from './trade';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));
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
    apiMocks.get.mockImplementation(async (url: string) => {
      if (url === '/trade/posts') return posts;
      if (url === '/trade/overview') return overview;
      if (url === '/database/commodities') return [{ id: 10101, name: 'Durastahl' }];
      throw new Error(`unexpected ${url}`);
    });
  });

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
});
