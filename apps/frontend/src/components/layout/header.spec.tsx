import { render, screen } from '@testing-library/react';
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
vi.mock('../../services/api', () => ({ api: apiMocks }));
vi.mock('../../hooks/use-socket', () => ({ useSocket: vi.fn() }));
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: object) => unknown) =>
    selector({ user: null, logout: vi.fn() }),
}));

describe('Global status header', () => {
  beforeEach(() => {
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

  it('shows identity, the five STU-style message folders, research and colonies', async () => {
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
    expect(screen.getByTitle('Posteingang').textContent).toContain('2');
    expect(screen.getByTitle('Schiffe').textContent).toContain('1');
    expect(screen.getByTitle('Kolonien').textContent).toContain('0');
    expect(screen.getByTitle('Handel').textContent).toContain('0');
    expect(screen.getByTitle('Systemmeldungen').textContent).toContain('1');
    expect(screen.getByTitle('Posteingang').getAttribute('href')).toBe(
      '/messages?folder=personal',
    );
    expect(screen.getByTitle('Schiffe').getAttribute('href')).toBe(
      '/messages?folder=ship',
    );
    expect(screen.getByTitle('Kolonien').getAttribute('href')).toBe(
      '/messages?folder=colony',
    );
    expect(screen.getByTitle('Handel').getAttribute('href')).toBe(
      '/messages?folder=trade',
    );
    expect(screen.getByTitle('Systemmeldungen').getAttribute('href')).toBe(
      '/messages?folder=system',
    );
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
    expect(screen.getByTitle('Posteingang').textContent?.trim()).toBe('2');
    expect(screen.getByTitle('Systemmeldungen').textContent?.trim()).toBe('1');
    expect(
      screen.getByTitle('Schiffe').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_2_0.png');
    expect(
      screen.getByTitle('Kolonien').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_3_0.png');
    expect(
      screen.getByTitle('Handel').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_4_0.png');
  });

  it('shows a direct, counted icon link for every mailbox folder', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    for (const [label, folder, unread] of [
      ['Posteingang', 'personal', '2'],
      ['Schiffe', 'ship', '1'],
      ['Kolonien', 'colony', '0'],
      ['Handel', 'trade', '0'],
      ['Systemmeldungen', 'system', '1'],
    ]) {
      const link = await screen.findByTitle(label);
      expect(link.getAttribute('href')).toBe(`/messages?folder=${folder}`);
      expect(link.textContent).toContain(unread);
    }
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
