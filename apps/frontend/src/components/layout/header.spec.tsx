import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './header';

const apiMocks = vi.hoisted(() => ({ get: vi.fn() }));

const messageFolders = [
  { folder: 'PERSONAL', unread: 2, total: 4 },
  { folder: 'SHIP', unread: 1, total: 1 },
  { folder: 'COLONY', unread: 0, total: 0 },
  { folder: 'TRADE', unread: 0, total: 0 },
  { folder: 'SYSTEM', unread: 1, total: 2 },
  { folder: 'OUTBOX', unread: 0, total: 3 },
  { folder: 'STATION', unread: 0, total: 0 },
];
const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: unknown) => void>(),
);

vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../hooks/use-socket', () => ({
  useSocket: (event?: string, handler?: (payload: unknown) => void) => {
    if (event && handler) socketHandlers.set(event, handler);
  },
}));
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: object) => unknown) =>
    selector({ user: null, logout: vi.fn() }),
}));

describe('Global status header', () => {
  beforeEach(() => {
    socketHandlers.clear();
    apiMocks.get.mockReset();
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(messageFolders);
      return Promise.resolve({
      user: {
        id: 4,
        name: 'Nuriud',
        faction: 'REBEL_ALLIANCE',
        prestige: 385,
        avatar: null,
      },
      alliance: null,
      notifications: { messages: 2, system: 1 },
      research: {
        techId: 7,
        name: 'Hyperraumtheorie',
        progress: 40,
        pointsRequired: 100,
        blockedReason: null,
      },
      colonies: [
        {
          id: 9,
          name: 'Alpha',
          energy: 20,
          energyMax: 100,
          storageUsed: 10,
          storageMax: 100,
        },
      ],
    });
    });
  });

  it('shows identity, three message channels, research and colonies', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nuriud')).toBeTruthy();
    expect(screen.getByTitle('Zum Maindesk').getAttribute('href')).toBe('/');
    expect(screen.getByTitle('Zum Spielerprofil').getAttribute('href')).toBe(
      '/players/4',
    );
    expect(
      screen
        .getByTitle('Zum Spielerprofil')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/avatars/alliance-rebel-default.png');
    expect(screen.getByTitle('Persönlich').textContent).toContain('2');
    expect(screen.getByTitle('System').textContent).toContain('1');
    expect(screen.getByTitle('Schiffsnachrichten').textContent).toContain('0');
    expect(screen.getByText('Hyperraumtheorie')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Kolonien 1')).toBeNull();
    expect(screen.queryByText('HoloNet')).toBeNull();
    expect(screen.getByTitle('Notizzettel öffnen').getAttribute('href')).toBe(
      '/notes',
    );
    expect(
      screen
        .getByTitle('Notizzettel öffnen')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/notiz1.png');
    expect(screen.getByTitle('Einstellungen').getAttribute('href')).toBe(
      '/settings',
    );
    expect(
      screen
        .getByTitle('Einstellungen')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/navigation/menu_option0.png');
    expect(
      screen.getByTitle('Wiki').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/navigation/menu_doku0.png');
    expect(
      screen.getByTitle('Ausloggen').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/navigation/menu_logout0.png');
    expect(screen.getByTitle('Persönlich').textContent?.trim()).toBe('✉2/4');
    expect(screen.getByTitle('System').textContent?.trim()).toBe('◆1/2');
    expect(
      screen
        .getByTitle('Schiffsnachrichten')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_2_0.png');
  });

  it('shows a direct, counted icon link for every mailbox folder', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    for (const [label, folder, unread] of [
      ['Persönlich', 'personal', '2'],
      ['Schiffe', 'ship', '1'],
      ['Kolonien', 'colony', '0'],
      ['Handel', 'trade', '0'],
      ['System', 'system', '1'],
      ['Postausgang', 'outbox', '0'],
      ['Station', 'station', '0'],
    ]) {
      const link = await screen.findByTitle(label);
      expect(link.getAttribute('href')).toBe(`/messages?folder=${folder}`);
      expect(link.textContent).toContain(unread);
    }
  });

  it('collects spacecraft events in the ship message popover', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    await screen.findByText('Nuriud');

    act(() => {
      socketHandlers.get('SPACECRAFT_EVENT')?.({
        shipId: 7,
        type: 'BROWNOUT',
        detail: 'Reaktor ausgefallen',
      });
    });
    expect(screen.getByTitle('Schiffsnachrichten').textContent).toContain('1');
    expect(
      screen
        .getByTitle('Schiffsnachrichten')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_2_1.png');
    fireEvent.click(screen.getByTitle('Schiffsnachrichten'));

    await waitFor(() =>
      expect(screen.getByText('Reaktor ausgefallen')).toBeTruthy(),
    );
    expect(screen.getByTitle('Schiffsnachrichten').textContent).toContain('0');
  });

  it('shows no alliance for alliance-less players', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    await screen.findByText('Nuriud');

    expect(screen.queryByTitle('Zur Allianz')).toBeNull();
  });

  it('links the own alliance in its color', async () => {
    const status = await apiMocks.get.getMockImplementation()?.('/dashboard/header');
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(messageFolders);
      return Promise.resolve({
        ...status,
        alliance: { id: 3, name: 'Rogue Squadron', color: '#ff0000' },
      });
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const link = await screen.findByTitle('Zur Allianz');
    expect(link.textContent).toBe('Rogue Squadron');
    expect(link.getAttribute('href')).toBe('/alliances/3');
    expect(link.getAttribute('style')).toContain('color: rgb(255, 0, 0)');
  });
});
