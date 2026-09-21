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
    apiMocks.get.mockResolvedValue({
      user: {
        id: 4,
        name: 'Nuriud',
        faction: 'REBEL_ALLIANCE',
        prestige: 385,
        avatar: null,
      },
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

  it('shows identity, three message channels, research and colonies', async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nuriud')).toBeTruthy();
    expect(screen.getByTitle('Nachrichten').textContent).toContain('2');
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
    expect(screen.getByTitle('Nachrichten').textContent?.trim()).toBe('2');
    expect(screen.getByTitle('System').textContent?.trim()).toBe('1');
    expect(
      screen
        .getByTitle('Nachrichten')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_1_1.png');
    expect(
      screen
        .getByTitle('Schiffsnachrichten')
        .querySelector('img')
        ?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_2_0.png');
    expect(
      screen.getByTitle('System').querySelector('img')?.getAttribute('src'),
    ).toBe('/assets/buttons/pmnavlet_5_1.png');
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
});
