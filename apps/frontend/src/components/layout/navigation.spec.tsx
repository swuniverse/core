import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: object) => unknown) =>
    selector({ user: null, accessToken: null, setUser: vi.fn(), logout: vi.fn() }),
}));
vi.mock('../../hooks/use-status-bar', () => ({
  formatTickCountdown: () => '00:00',
  useStatusBar: () => ({
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

describe('event history navigation', () => {
  it('links to event history from the desktop sidebar and mobile more menu', () => {
    render(
      <MemoryRouter>
        <Sidebar />
        <BottomNav />
      </MemoryRouter>,
    );

    const sidebarLink = screen.getAllByRole('link', { name: 'Ereignisse' })[0];
    expect(sidebarLink.getAttribute('href')).toBe('/events');

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));
    const mobileEventLink = screen
      .getAllByText('Ereignisse')
      .find((element) => !element.closest('aside'))
      ?.closest('a');
    expect(mobileEventLink?.getAttribute('href')).toBe('/events');
  });
});
