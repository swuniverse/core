import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

let user: { isAdmin?: boolean; username?: string } | null = null;

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: object) => unknown) =>
    selector({ user, accessToken: null, setUser: vi.fn(), logout: vi.fn() }),
}));
vi.mock('../../hooks/use-status-bar', () => ({
  formatTickCountdown: () => '00:00',
  useStatusBar: () => ({
    serverTime: new Date(2026, 7, 5, 10, 5, 1),
    tick: {
      msToNext: 0,
      currentTickIndex: 0,
      totalTicks: 0,
      progress: 0,
      loaded: false,
    },
  }),
}));
vi.mock('../../services/api', () => ({ api: { get: vi.fn() } }));

describe('navigation icons', () => {
  it('shows the running server time below the tick ring', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByTitle('Serverzeit').textContent).toBe('10:05:01');
  });

  it('uses asset icon pairs and keeps the active desktop icon highlighted', () => {
    render(
      <MemoryRouter initialEntries={['/events']}>
        <Sidebar />
      </MemoryRouter>,
    );

    const eventsLink = screen.getByRole('link', { name: 'Ereignisse' });
    expect(eventsLink.getAttribute('href')).toBe('/events');
    expect(eventsLink.getAttribute('title')).toBe('Ereignisse');
    expect(eventsLink.querySelectorAll('svg')).toHaveLength(0);
    expect(
      eventsLink
        .querySelector('img[src="/assets/navigation/menu_history0.png"]')
        ?.classList.contains('hidden'),
    ).toBe(true);
    expect(
      eventsLink
        .querySelector('img[src="/assets/navigation/menu_history1.png"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
  });

  it('uses asset icons in the mobile tab bar and more menu', () => {
    render(
      <MemoryRouter initialEntries={['/colonies']}>
        <BottomNav />
      </MemoryRouter>,
    );

    const coloniesLink = screen.getByRole('link', { name: /Kolonien/ });
    expect(
      coloniesLink.querySelector('img[src="/assets/navigation/menu_planets1.png"]'),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));
    const eventsLink = screen.getByRole('link', { name: 'Ereignisse' });
    expect(
      eventsLink.querySelector('img[src="/assets/navigation/menu_history0.png"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Mehr' })
        .querySelector('img[src="/assets/navigation/menu_more1.png"]')
        ?.classList.contains('hidden'),
    ).toBe(false);
  });

  it('shows the admin icon only for admins', () => {
    const { unmount } = render(
      <MemoryRouter>
        <Sidebar />
        <BottomNav />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    unmount();

    user = { isAdmin: true, username: 'Leia' };
    render(
      <MemoryRouter>
        <Sidebar />
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link', { name: 'Admin' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));
    expect(screen.getAllByRole('link', { name: 'Admin' })).toHaveLength(2);
  });
});
