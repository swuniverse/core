import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from './header';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const authMocks = vi.hoisted(() => ({ logout: vi.fn() }));
const socketMocks = vi.hoisted(() => ({ useSocket: vi.fn() }));

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
vi.mock('../../hooks/use-socket', () => socketMocks);
vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: object) => unknown) =>
    selector({ user: null, logout: authMocks.logout }),
}));

describe('Global status header', () => {
  beforeEach(() => {
    vi.useRealTimers();
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    authMocks.logout.mockReset();
    socketMocks.useSocket.mockReset();
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
          imageId: 7,
          name: 'Hyperraumtheorie',
          commodityId: 4,
          progress: 40,
          pointsRequired: 100,
          productionPerTick: 6,
          queuedCount: 1,
          nextQueuedName: 'Sprungnavigation',
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
            colonyClassId: 201,
            systemPosition: { x: 1, y: 2 },
            starSystem: { name: 'Test', x: 3, y: 4 },
            celestialObject: { classId: 201, name: 'Alpha', objectType: 1 },
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
    expect(screen.getByText('40/100 (+6)')).toBeTruthy();
    expect(screen.getByTitle('wartet: Sprungnavigation').textContent).toBe(
      '+1',
    );
    expect(
      screen.getByTitle('Forschung: Hyperraumtheorie').getAttribute('src'),
    ).toBe('/assets/research/7.png');
    expect(screen.getByTitle('Forschungspunkte').getAttribute('src')).toBe(
      '/assets/commodities/4.png',
    );
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeTruthy();
    expect(screen.queryByText('Kolonien 1')).toBeNull();
    expect(screen.queryByText('HoloNet')).toBeNull();
    expect(screen.getByTitle('Notizsammlung öffnen').getAttribute('href')).toBe(
      '/notes',
    );
    expect(
      screen
        .getByTitle('Notizsammlung öffnen')
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
    ).toBe('/assets/buttons/pmnavlet_2_1.png');
    expect(
      screen.getByTitle('Kolonien').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_3_0.png');
    expect(
      screen.getByTitle('Handel').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_4_0.png');
  });

  it('shows every colony with STU-sized images and colony information tooltips', async () => {
    const status =
      await apiMocks.get.getMockImplementation()?.('/dashboard/header');
    const colonies = [
      {
        id: 1,
        name: 'Alderaan',
        energy: 1234,
        energyMax: 5000,
        storageUsed: 2345,
        storageMax: 9000,
        colonyClassId: 201,
        systemPosition: { x: 4, y: 7 },
        starSystem: { name: 'Alderaan', x: 12, y: 34 },
        celestialObject: { classId: 201, name: 'Alderaan', objectType: 1 },
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: index + 2,
        name: `Kolonie ${index + 2}`,
        energy: 10,
        energyMax: 100,
        storageUsed: 20,
        storageMax: 100,
        colonyClassId: 201,
        systemPosition: { x: index, y: index + 1 },
        starSystem: { name: 'Test', x: 1, y: 2 },
        celestialObject: {
          classId: 201,
          name: `Objekt ${index + 2}`,
          objectType: index === 0 ? 2 : index === 1 ? 3 : 1,
        },
      })),
    ];
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(messageFolders);
      return Promise.resolve({ ...status, colonies });
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Alderaan' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Kolonie 5' })).toBeTruthy();
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Alderaan' }), {
      clientX: 10,
      clientY: 10,
    });
    expect(
      await screen.findByText('Kolonieinformationen: Alderaan'),
    ).toBeTruthy();
    expect(screen.getByText('Koordinaten: 4|7')).toBeTruthy();
    expect(screen.getByText('System: Alderaan (12|34)')).toBeTruthy();
    expect(screen.getByText('EPS: 1.234/5.000')).toBeTruthy();
    expect(screen.getByText('Lager: 2.345/9.000')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Alderaan' }).querySelector('img')
        ?.className,
    ).toContain('w-[50px]');
    expect(
      screen.getByRole('link', { name: 'Kolonie 2' }).querySelector('img')
        ?.className,
    ).toContain('w-[30px]');
    expect(
      screen.getByRole('link', { name: 'Kolonie 3' }).querySelector('img')
        ?.className,
    ).toContain('w-[40px]');
  });

  it('shows research without a waiting badge when the queue is empty', async () => {
    const status =
      await apiMocks.get.getMockImplementation()?.('/dashboard/header');
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(messageFolders);
      return Promise.resolve({
        ...status,
        research: { ...status.research, queuedCount: 0, nextQueuedName: null },
      });
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Hyperraumtheorie')).toBeTruthy();
    expect(screen.queryByText('+1')).toBeNull();
  });

  it('shows the research navigation icon when no research is active', async () => {
    const status =
      await apiMocks.get.getMockImplementation()?.('/dashboard/header');
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(messageFolders);
      return Promise.resolve({ ...status, research: null });
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Keine Forschung')).toBeTruthy();
    expect(screen.getByTitle('Forschung').getAttribute('src')).toBe(
      '/assets/navigation/menu_forsch0.png',
    );
    expect(
      screen.getByText('Keine Forschung').closest('a')?.getAttribute('href'),
    ).toBe('/research');
  });

  it('highlights unread folders and links directly to message composition', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const inbox = await screen.findByTitle('Posteingang');
    const colonies = screen.getByTitle('Kolonien');
    expect(inbox.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/pmnavlet_1_1.png',
    );
    expect(inbox.querySelector('span')?.className).toContain('text-swu-accent');
    expect(inbox.querySelector('span')?.className).toContain('font-bold');
    expect(colonies.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/buttons/pmnavlet_3_0.png',
    );
    expect(colonies.querySelector('span')?.className).toContain(
      'text-swu-muted',
    );
    expect(
      screen.getByTitle('Neue Nachricht schreiben').getAttribute('href'),
    ).toBe('/messages?tab=compose');
  });

  it('reloads folder counters when a message is received', async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    await vi.waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith('/messages/folders'),
    );
    apiMocks.get.mockClear();
    const registration = socketMocks.useSocket.mock.calls.find(
      ([event]) => event === 'MESSAGE_RECEIVED',
    );

    await act(async () => {
      registration?.[1]({ folder: 'PERSONAL' });
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(apiMocks.get).toHaveBeenCalledWith('/messages/folders');
    vi.useRealTimers();
  });

  it('invalidates the server session before clearing the client session', async () => {
    apiMocks.post.mockRejectedValueOnce(new Error('offline'));
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTitle('Ausloggen'));

    expect(apiMocks.post).toHaveBeenCalledWith('/auth/logout', {});
    await waitFor(() => expect(authMocks.logout).toHaveBeenCalled());
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
    const status =
      await apiMocks.get.getMockImplementation()?.('/dashboard/header');
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
