import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    apiMocks.get.mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
    });
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

  it('shows tagged characters and their details in a popup', async () => {
    const character = { id: 202, userId: 8, name: 'Han', avatar: 'data:image/png;base64,aA==', description: '[b]Pilot[/b]', user: { id: 8, username: 'rebel' } };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([{ ...postFixture, characters: [character] }]));
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      throw new Error(`Unexpected URL ${url}`);
    });
    render(<MemoryRouter initialEntries={['/holonet/1']}><Routes>
      <Route path="/holonet/:id" element={<HolonetPage />} />
    </Routes></MemoryRouter>);

    const tagged = await screen.findByRole('button', { name: 'Han' });
    expect(within(tagged).getByRole('img', { name: 'Han Avatar' }).getAttribute('src')).toBe(character.avatar);
    fireEvent.click(tagged);
    const dialog = screen.getByRole('dialog', { name: 'Han' });
    expect(within(dialog).getByText('Pilot').tagName).toBe('STRONG');
    expect(within(dialog).getByRole('link', { name: 'rebel' }).getAttribute('href')).toBe('/players/8');
    expect(within(dialog).getByRole('img', { name: 'Han Avatar' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('preserves and changes tagged characters while editing a post', async () => {
    const own = { id: 101, userId: 7, name: 'Leia', description: '', avatar: null, user: { id: 7, username: 'tester' } };
    const foreign = { id: 202, userId: 8, name: 'Han', description: '', avatar: null, user: { id: 8, username: 'rebel' } };
    const post = { ...postFixture, authorId: 7, author: { username: 'tester' }, characters: [foreign] };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([post]));
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      if (url === '/rpg/characters/player/7') return Promise.resolve([own]);
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.patch.mockResolvedValue({ ...post, characters: [own] });
    render(<MemoryRouter initialEntries={['/holonet/1']}><Routes>
      <Route path="/holonet/:id" element={<HolonetPage />} />
    </Routes></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    const han = screen.getByRole('checkbox', { name: /Han/ }) as HTMLInputElement;
    expect(han.checked).toBe(true);
    fireEvent.click(han);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Leia/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/holonet/1', {
      title: post.title, body: post.body, characterIds: [101],
    }));
    expect(await screen.findByRole('button', { name: 'Leia' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Han' })).toBeNull();
  });

  it('allows restoring a previously tagged foreign character during editing', async () => {
    const foreign = { id: 202, userId: 8, name: 'Han', description: '', avatar: null, user: { id: 8, username: 'rebel' } };
    const post = { ...postFixture, authorId: 7, author: { username: 'tester' }, characters: [foreign] };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([post]));
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      if (url === '/rpg/characters/player/7') return Promise.resolve([{ id: 101, userId: 7, name: 'Leia', description: '', avatar: null }]);
      throw new Error(`Unexpected URL ${url}`);
    });
    render(<MemoryRouter initialEntries={['/holonet/1']}><Routes>
      <Route path="/holonet/:id" element={<HolonetPage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Bearbeiten' }));
    await screen.findByRole('checkbox', { name: /Leia/ });
    fireEvent.click(screen.getByRole('checkbox', { name: /Han/ }));
    const han = screen.getByRole('checkbox', { name: /Han/ }) as HTMLInputElement;
    expect(han.checked).toBe(false);
    fireEvent.click(han);
    expect(han.checked).toBe(true);
  });

  it('offers admin deletion only to admins on foreign posts', async () => {
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse());
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      throw new Error(`Unexpected URL ${url}`);
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Route-selected body');
    expect(screen.queryByRole('button', { name: 'Löschen (Admin)' })).toBeNull();
    unmount();

    useAuthStore.setState({ user: { ...user, isAdmin: true } });
    render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Löschen (Admin)' })).toBeTruthy();
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

  it('renders a BBCode preview without creating a post', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Vorschau-Titel' })).toBeTruthy();
    expect(screen.getByText('Starke Übertragung').tagName).toBe('STRONG');
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it('selects own and other players’ characters for a new HoloNet post', async () => {
    const own = { id: 101, userId: 7, name: 'Leia', description: '', avatar: null };
    const foreign = { id: 202, userId: 8, name: 'Han', description: '', avatar: null };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [] });
      if (url === '/rpg/characters/player/7') return Promise.resolve([own]);
      if (url === '/rpg/characters/player/8') return Promise.resolve([foreign]);
      throw new Error(`Unexpected URL ${url}`);
    });
    apiMocks.post.mockResolvedValue({ ...postFixture, id: 42 });

    render(<MemoryRouter initialEntries={['/holonet/new']}><Routes>
      <Route path="/holonet/new" element={<HolonetComposePage />} />
      <Route path="/holonet/:id" element={<div>created</div>} />
    </Routes></MemoryRouter>);

    fireEvent.click(await screen.findByRole('checkbox', { name: /Leia/ }));
    fireEvent.change(screen.getByLabelText('Spieler-ID für Charaktere'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Charaktere laden' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Han/ }));
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Treffen' } });
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Nachricht' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet', {
      title: 'Treffen', body: 'Nachricht', category: 'NEWS', characterIds: [101, 202],
    }));
  });

  it('shows the server error if a selected character has been deleted before posting', async () => {
    apiMocks.get.mockImplementation((url: string) => url === '/rpg/characters/player/7'
      ? Promise.resolve([{ id: 101, userId: 7, name: 'Leia', description: '', avatar: null }])
      : Promise.resolve({ data: [] }));
    apiMocks.post.mockRejectedValue(new Error('Charakter 101 nicht gefunden'));
    render(<MemoryRouter initialEntries={['/holonet/new']}><HolonetComposePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Leia/ }));
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Treffen' } });
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Nachricht' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Charakter 101 nicht gefunden');
    expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe('Nachricht');
  });

  it('limits the character selection to ten and lets the user replace a selection', async () => {
    const characters = Array.from({ length: 11 }, (_, index) => ({ id: index + 1, userId: 7, name: `Pilot ${index + 1}`, description: '', avatar: null }));
    apiMocks.get.mockImplementation((url: string) => url === '/rpg/characters/player/7' ? Promise.resolve(characters) : Promise.resolve({ data: [] }));
    render(<MemoryRouter initialEntries={['/holonet/new']}><HolonetComposePage /></MemoryRouter>);
    await screen.findByRole('checkbox', { name: /Pilot 1 \(/ });
    for (let index = 1; index <= 10; index++) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`Pilot ${index} \\(`) }));
    const eleventh = screen.getByRole('checkbox', { name: /Pilot 11 \(/ }) as HTMLInputElement;
    expect(eleventh.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /Pilot 1 \(/ }));
    expect(eleventh.disabled).toBe(false);
    fireEvent.click(eleventh);
    expect(eleventh.checked).toBe(true);
  });

  it('directly assigns an own post to a selected plot', async () => {
    const ownPost = { ...postFixture, authorId: user.id, author: { username: user.username } };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([ownPost]));
      if (url === '/holonet/plot-post-requests') return Promise.resolve([]);
      if (url === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [{ id: 11, title: 'Echo Base Rescue', endedAt: null }] });
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      return Promise.resolve({ data: [] });
    });
    apiMocks.post.mockResolvedValue({ assigned: true });

    render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes><Route path="/holonet/:id" element={<HolonetPage />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Zu Plot hinzufügen/ }));
    fireEvent.change(await screen.findByLabelText('Plot auswählen'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zuordnen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet/1/plots', { plotId: 11 }));
  });

  it('shows plot assignment failures beside the selected post', async () => {
    const roleplayPost = { ...postFixture, category: 'ROLEPLAY' };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([roleplayPost]));
      if (url === '/holonet/plot-post-requests') return Promise.resolve([]);
      if (url === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [{ id: 11, title: 'Echo Base Rescue', endedAt: null }] });
      if (url === '/holonet/1/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/1/my-rating') return Promise.resolve(0);
      return Promise.resolve({ data: [] });
    });
    apiMocks.post.mockRejectedValue(new Error('Nur Plotmitglieder können Beiträge zuordnen.'));

    render(
      <MemoryRouter initialEntries={['/holonet/1']}>
        <Routes><Route path="/holonet/:id" element={<HolonetPage />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Zu Plot hinzufügen/ }));
    fireEvent.change(await screen.findByLabelText('Plot auswählen'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Antrag stellen' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Nur Plotmitglieder können Beiträge zuordnen.');
  });

  it('shows errors when the author cannot decide an open request', async () => {
    const request = {
      id: 9,
      postId: 42,
      plotId: 11,
      requesterId: 8,
      post: { id: 42, title: 'Fremder Roleplay-Beitrag' },
      plot: { id: 11, title: 'Echo Base Rescue' },
      requester: { username: 'rebel' },
    };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([]));
      if (url === '/holonet/plot-post-requests') return Promise.resolve([request]);
      if (url === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    apiMocks.post.mockRejectedValue(new Error('Nur der Autor kann entscheiden.'));

    render(<MemoryRouter initialEntries={['/holonet']}><Routes>
      <Route path="/holonet" element={<HolonetPage />} />
    </Routes></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Annehmen' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Nur der Autor kann entscheiden.');
  });

  it('requests plot assignment and lets the post author accept an open request', async () => {
    const foreignPost = {
      ...postFixture,
      id: 42,
      title: 'Fremder Roleplay-Beitrag',
      category: 'ROLEPLAY',
      plotId: null,
    };
    const request = {
      id: 9,
      postId: 42,
      plotId: 11,
      requesterId: 8,
      authorId: 7,
      status: 'PENDING',
      post: { id: 42, title: foreignPost.title },
      plot: { id: 11, title: 'Echo Base Rescue' },
      requester: { username: 'rebel' },
    };
    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([foreignPost]));
      if (url === '/holonet/plot-post-requests') return Promise.resolve([]);
      if (url === '/rpg/plots/mine?page=1') return Promise.resolve({ data: [{ id: 11, title: 'Echo Base Rescue', endedAt: null }] });
      if (url === '/holonet/42/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/42/my-rating') return Promise.resolve(0);
      return Promise.resolve({ data: [] });
    });
    apiMocks.post.mockResolvedValue(request);

    render(
      <MemoryRouter initialEntries={['/holonet/42']}>
        <Routes>
          <Route path="/holonet/:id" element={<HolonetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Zu Plot hinzufügen/ }));
    fireEvent.change(await screen.findByLabelText('Plot auswählen'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Antrag stellen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet/42/plots', { plotId: 11 }));

    apiMocks.get.mockImplementation((url: string) => {
      if (url === '/holonet?page=1') return Promise.resolve(listResponse([{ ...foreignPost, authorId: 7 }]));
      if (url === '/holonet/plot-post-requests') return Promise.resolve([request]);
      if (url === '/holonet/42/comments') return Promise.resolve(emptyCommentsResponse);
      if (url === '/holonet/42/my-rating') return Promise.resolve(0);
      return Promise.resolve({ data: [] });
    });
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user });

    render(
      <MemoryRouter initialEntries={['/holonet']}>
        <Routes><Route path="/holonet" element={<HolonetPage />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Annehmen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet/plot-post-requests/9/accept', {}));
  });

  it('offers active member plots and creates a ROLEPLAY plot post without a title', async () => {
    apiMocks.get.mockResolvedValue({
      data: [{ id: 11, title: 'Echo Base Rescue', endedAt: null }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    apiMocks.post.mockResolvedValue({ ...postFixture, id: 42 });

    render(
      <MemoryRouter initialEntries={['/holonet/new']}>
        <Routes>
          <Route path="/holonet/new" element={<HolonetComposePage />} />
          <Route path="/holonet/:id" element={<div>created</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Plot'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'x'.repeat(50) } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/holonet', {
      title: '',
      body: 'x'.repeat(50),
      category: 'ROLEPLAY',
      plotId: 11,
    }));
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
