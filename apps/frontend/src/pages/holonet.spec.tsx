import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { UserProfile } from '@swuniverse/shared';

import { BottomNav } from '../components/layout/bottom-nav';
import { Sidebar } from '../components/layout/sidebar';
import { useAuthStore } from '../stores/auth.store';
import { useHolonetUnreadStore } from '../stores/holonet-unread.store';
import { HolonetComposePage, HolonetPage } from './holonet';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: apiMocks,
}));

vi.mock('../hooks/use-status-bar', () => ({
  useStatusBar: () => ({
    colony: null,
    spacecraft: null,
    tick: { msToNext: 60000, currentTickIndex: 1, totalTicks: 24 },
    loading: false,
    error: null,
    refresh: vi.fn(),
    lastUpdated: null,
    lastTickAt: null,
  }),
  formatTickCountdown: () => '1m',
}));

const user = {
  id: 7,
  username: 'tester',
  email: 'tester@example.test',
  prestige: 0,
  createdAt: '2026-08-05T00:00:00.000Z',
  isAdmin: false,
  permissions: [],
} satisfies UserProfile;

const postFixture = {
  id: 1,
  title: 'Widget Report',
  body: 'Route-selected body',
  category: 'NEWS',
  isUnread: true,
  commentCount: 0,
  rating: 0,
  positiveCount: 0,
  totalCount: 0,
  createdAt: '2026-08-05T10:00:00.000Z',
  authorId: 8,
  author: { username: 'rebel' },
};

const secondPostFixture = {
  ...postFixture,
  id: 2,
  title: 'Second Transmission',
  body: 'Second body',
  category: 'ROLEPLAY',
  isUnread: false,
};

const emptyCommentsResponse = { data: [], total: 0, page: 1, limit: 20 };

const listResponse = (data = [postFixture], lastReadPostId = 0) => ({
  data,
  total: data.length,
  page: 1,
  limit: 20,
  unreadCount: data.filter((post) => post.isUnread).length,
  lastReadPostId,
});

describe('HolonetPage routing', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'refresh',
      user,
    });
    useHolonetUnreadStore.setState({ count: 0 });
  });

  it('loads the archive and opens the route-selected post without clicking', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse());
      }
      if (url === '/holonet/1/comments') {
        return Promise.resolve(emptyCommentsResponse);
      }
      if (url === '/holonet/1/my-rating') {
        return Promise.resolve(0);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Route-selected body')).toBeTruthy();
    expect(screen.getAllByText('Widget Report')).toHaveLength(2);
    expect(screen.queryByText('NEU')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Nachricht an rebel schreiben' }).getAttribute(
        'href',
      ),
    ).toBe('/messages?tab=compose&to=8&name=rebel');
    expect(
      screen.getByRole('link', { name: 'Profil von rebel öffnen' }).getAttribute(
        'href',
      ),
    ).toBe('/players/8');
  });

  it('does not offer a quick message for an own HoloNet post', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(
          listResponse([{ ...postFixture, authorId: user.id, author: { username: user.username } }]),
        );
      }
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Route-selected body');
    expect(
      screen.queryByRole('link', { name: `Nachricht an ${user.username} schreiben` }),
    ).toBeNull();
  });

  it('keeps a stale route id usable when the list is empty and direct fetch fails', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([]));
      }
      if (url === '/holonet/999') {
        return Promise.reject(new Error('Post not found'));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet/999']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Keine Beitraege.')).toBeTruthy();
    expect(screen.queryByText('Widget Report')).toBeNull();
    expect(screen.queryByText('Route-selected body')).toBeNull();
  });

  it('keeps multiple archive entries open at once', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([postFixture, secondPostFixture]));
      }
      if (url === '/holonet/1/comments' || url === '/holonet/2/comments') {
        return Promise.resolve(emptyCommentsResponse);
      }
      if (url === '/holonet/1/my-rating' || url === '/holonet/2/my-rating') {
        return Promise.resolve(0);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Widget Report'));
    fireEvent.click(await screen.findByText('Second Transmission'));

    expect(await screen.findByText('Route-selected body')).toBeTruthy();
    expect(screen.getByText('Second body')).toBeTruthy();
  });

  it('loads only the selected category when a category label is active', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([postFixture, secondPostFixture]));
      }
      if (url === '/holonet?category=ROLEPLAY&page=1') {
        return Promise.resolve(listResponse([secondPostFixture]));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Widget Report')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '> Roleplay' }));

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/holonet?category=ROLEPLAY&page=1',
      );
    });
    expect(await screen.findByText('Second Transmission')).toBeTruthy();
    expect(screen.queryByText('Widget Report')).toBeNull();
  });

  it('loads all categories from the sidebar category list', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([postFixture]));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Holo-Netzwerk')).toBeTruthy();
    expect(screen.getByRole('button', { name: '> Alle' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Alle' })).toBeNull();
  });

  it('wires HoloNet search inputs into the list request', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([postFixture]));
      }
      if (url === '/holonet?text=profit&page=1') {
        return Promise.resolve(listResponse([]));
      }
      if (url === '/holonet?text=profit&authorId=2030&page=1') {
        return Promise.resolve(listResponse([]));
      }
      if (url === '/holonet?text=profit&authorId=2030&postId=99&page=1') {
        return Promise.resolve(listResponse([]));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByPlaceholderText('nach Text suchen'), {
      target: { value: 'profit' },
    });
    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith('/holonet?text=profit&page=1');
    });

    fireEvent.change(screen.getByPlaceholderText('nach Spieler-ID suchen'), {
      target: { value: '2030' },
    });
    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/holonet?text=profit&authorId=2030&page=1',
      );
    });

    fireEvent.change(screen.getByPlaceholderText('nach Beitrag-ID suchen'), {
      target: { value: '99' },
    });
    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/holonet?text=profit&authorId=2030&postId=99&page=1',
      );
    });
  });

  it('sets the HoloNet bookmark on a specific post', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse([postFixture, secondPostFixture]));
      }
      if (url === '/holonet/1/comments') {
        return Promise.resolve(emptyCommentsResponse);
      }
      if (url === '/holonet/1/my-rating') {
        return Promise.resolve(0);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Widget Report'));
    fireEvent.click(await screen.findByRole('button', { name: 'Lesezeichen' }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/holonet/checkpoint', {
        postId: 1,
      });
    });
    expect(screen.getByText('> Lesezeichen: #1')).toBeTruthy();
  });

  it('locks voting after the first vote by the user', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(listResponse());
      }
      if (url === '/holonet/1/comments') {
        return Promise.resolve(emptyCommentsResponse);
      }
      if (url === '/holonet/1/my-rating') {
        return Promise.resolve(0);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockImplementation(
      (url: string, body: { value?: number }) => {
        if (url === '/holonet/1/rate' && body.value === 1) {
          return Promise.resolve({ rating: 1 });
        }
        throw new Error(`Unexpected POST ${url}`);
      },
    );

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Widget Report'));
    const plusButton = await screen.findByRole('button', { name: '+' });
    const minusButton = await screen.findByRole('button', { name: '-' });
    fireEvent.click(plusButton);

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/holonet/1/rate', {
        value: 1,
      });
    });
    expect(plusButton.hasAttribute('disabled')).toBe(true);
    expect(minusButton.hasAttribute('disabled')).toBe(true);
  });

  it('shows a yellow positive-over-total rating bar only when votes exist', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') {
        return Promise.resolve(
          listResponse([{ ...postFixture, positiveCount: 3, totalCount: 5 }]),
        );
      }
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('progressbar', { name: 'Bewertung 3 von 5' })).toBeNull();
    fireEvent.click(await screen.findByText('Widget Report'));
    const bar = await screen.findByRole('progressbar', { name: 'Bewertung 3 von 5' });
    expect(bar.textContent).toContain('3 / 5');
    expect(bar.className).toContain('yellow');
  });

  it('renders a BBCode preview without creating a post', () => {
    render(
      <MemoryRouter initialEntries={['/holonet/new']}>
        <HolonetComposePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Titel'), {
      target: { value: 'Vorschau-Titel' },
    });
    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: '[b]Starke Übertragung[/b]' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau' }));

    expect(screen.getByRole('heading', { name: 'Vorschau-Titel' })).toBeTruthy();
    expect(screen.getByText('Starke Übertragung').tagName).toBe('STRONG');
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('creates posts on the dedicated compose page and sets the requested bookmark', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ ...postFixture, id: 42 })
      .mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/holonet/new']}>
        <Routes>
          <Route path="/holonet/new" element={<HolonetComposePage />} />
          <Route path="/holonet/:id" element={<div>created</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Titel'), {
      target: { value: 'Neuer Archivposten' },
    });
    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'Archivtext' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Lesezeichen auf diesen Beitrag setzen',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/holonet', {
        title: 'Neuer Archivposten',
        body: 'Archivtext',
        category: 'NEWS',
      });
      expect(apiMocks.post).toHaveBeenCalledWith('/holonet/checkpoint', {
        postId: 42,
      });
    });
    expect(await screen.findByText('created')).toBeTruthy();
  });

  it('shows the HoloNet count in both navigations and clears it after a checkpoint', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/auth/me') return Promise.resolve(user);
      if (url === '/holonet/new-count') return Promise.resolve({ count: 3 });
      if (url === '/holonet?page=1') return Promise.resolve(listResponse());
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Sidebar />
        <BottomNav />
        <Routes>
          <Route path="/holonet" element={<HolonetPage />} />
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('3 neue HoloNet-Beiträge')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));
    expect(screen.getAllByLabelText('3 neue HoloNet-Beiträge')).toHaveLength(2);

    fireEvent.click(await screen.findByText('Widget Report'));
    fireEvent.click(await screen.findByRole('button', { name: 'Lesezeichen' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('3 neue HoloNet-Beiträge')).toBeNull();
    });
  });

  it('renders the sidebar HoloNet link without the old KommNet label', () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/auth/me') {
        return Promise.resolve(user);
      }
      if (url === '/messages/unread') {
        return Promise.resolve(0);
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /HoloNet/i })).toBeTruthy();
    expect(screen.queryByText('KommNet')).toBeNull();
  });
});
