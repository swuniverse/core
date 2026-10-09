import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type {
  ForumAuthorDto,
  ForumBoardPageDto,
  ForumOverviewDto,
  ForumPostDto,
  ForumTopicPageDto,
} from '@swuniverse/shared';

import { ApiError } from '../services/api';
import type * as ApiModule from '../services/api';
import {
  AllianceForumBoardPage,
  AllianceForumPage,
  AllianceForumTopicPage,
} from './alliance-forum';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

const author = (overrides: Partial<ForumAuthorDto> = {}): ForumAuthorDto => ({
  userId: 1,
  name: 'Leia',
  factionName: 'Rebellenallianz',
  roleTitle: 'Großadmiral',
  ...overrides,
});

const NO_CAPS = { rename: false, delete: false };

function overview(manageBoards: boolean): ForumOverviewDto {
  return {
    allianceId: 1,
    boards: [
      {
        id: 7,
        name: 'Strategie',
        topicCount: 2,
        postCount: 5,
        lastActivityAt: '2026-10-09T12:00:00.000Z',
        lastPost: {
          topicId: 9,
          topicTitle: 'Angriffsplan',
          author: author(),
          createdAt: '2026-10-09T12:00:00.000Z',
        },
        capabilities: NO_CAPS,
      },
    ],
    capabilities: { manageBoards },
  };
}

function boardPage(
  pagination = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
): ForumBoardPageDto {
  return {
    allianceId: 1,
    board: { id: 7, name: 'Strategie', capabilities: NO_CAPS },
    topics: [
      {
        id: 9,
        title: 'Angriffsplan',
        important: true,
        author: author(),
        createdAt: '2026-10-09T10:00:00.000Z',
        lastActivityAt: '2026-10-09T12:00:00.000Z',
        postCount: 3,
        capabilities: { rename: false, setImportant: false, delete: false },
      },
    ],
    pagination,
    capabilities: { manageBoards: false },
  };
}

const post = (overrides: Partial<ForumPostDto> = {}): ForumPostDto => ({
  id: 1,
  author: author(),
  text: '[b]Fett[/b] gedruckt',
  createdAt: '2026-10-09T10:00:00.000Z',
  editedAt: null,
  deleted: null,
  capabilities: { edit: false, delete: false },
  ...overrides,
});

function topicPage(
  posts: ForumPostDto[],
  pagination = {
    page: 1,
    pageSize: 20,
    totalItems: posts.length,
    totalPages: 1,
  },
): ForumTopicPageDto {
  return {
    allianceId: 1,
    board: { id: 7, name: 'Strategie' },
    topic: {
      id: 9,
      title: 'Angriffsplan',
      important: false,
      capabilities: { rename: false, setImportant: false, delete: false },
    },
    posts,
    pagination,
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">{location.pathname + location.search}</div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/alliances/:id/forum" element={<AllianceForumPage />} />
        <Route
          path="/alliances/:id/forum/boards/:boardId"
          element={<AllianceForumBoardPage />}
        />
        <Route
          path="/alliances/:id/forum/topics/:topicId"
          element={<AllianceForumTopicPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) mock.mockReset();
});

describe('AllianceForumPage', () => {
  it('lists boards with counts and the last post', async () => {
    apiMocks.get.mockResolvedValue(overview(false));
    renderAt('/alliances/1/forum');

    const link = await screen.findByRole('link', { name: 'Strategie' });
    expect(link.getAttribute('href')).toBe('/alliances/1/forum/boards/7');
    expect(screen.getByText(/2 Themen, 5 Beiträge/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Angriffsplan' })).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/alliances/1/forum/boards');
  });

  it('shows the create form only with the server capability', async () => {
    apiMocks.get.mockResolvedValue(overview(false));
    const first = renderAt('/alliances/1/forum');
    await screen.findByRole('link', { name: 'Strategie' });
    expect(screen.queryByLabelText('Neues Board')).toBeNull();
    first.unmount();

    apiMocks.get.mockResolvedValue(overview(true));
    renderAt('/alliances/1/forum');
    fireEvent.change(await screen.findByLabelText('Neues Board'), {
      target: { value: 'Taktik' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Board anlegen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/alliances/1/forum/boards', {
        name: 'Taktik',
      }),
    );
  });

  it('shows validation errors of the server', async () => {
    apiMocks.get.mockResolvedValue(overview(true));
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Der Boardname ist zu kurz'),
    );
    renderAt('/alliances/1/forum');

    fireEvent.change(await screen.findByLabelText('Neues Board'), {
      target: { value: 'ab' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Board anlegen' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Der Boardname ist zu kurz',
    );
  });

  it('shows the load error for an unknown forum', async () => {
    apiMocks.get.mockRejectedValue(
      new ApiError(404, 'Das Forum existiert nicht'),
    );
    renderAt('/alliances/1/forum');
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Das Forum existiert nicht',
    );
  });
});

describe('AllianceForumBoardPage', () => {
  it('lists topics with important marker and paginates', async () => {
    apiMocks.get.mockResolvedValue(
      boardPage({ page: 1, pageSize: 20, totalItems: 21, totalPages: 2 }),
    );
    renderAt('/alliances/1/forum/boards/7');

    expect(await screen.findByText('Wichtig')).toBeTruthy();
    expect(screen.getByText('Seite 1 von 2')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith(
      '/alliances/1/forum/boards/7/topics?page=1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/alliances/1/forum/boards/7/topics?page=2',
      ),
    );
  });

  it('creates a topic and opens it', async () => {
    apiMocks.get.mockImplementation(async (url: string) =>
      url.includes('/forum/topics/') ? topicPage([post()]) : boardPage(),
    );
    apiMocks.post.mockResolvedValue({ topicId: 12, page: 1 });
    renderAt('/alliances/1/forum/boards/7');

    fireEvent.change(await screen.findByLabelText('Titel'), {
      target: { value: 'Neu' },
    });
    fireEvent.change(screen.getByLabelText('Beitrag'), {
      target: { value: 'Inhalt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thema anlegen' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe(
        '/alliances/1/forum/topics/12?page=1',
      ),
    );
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/alliances/1/forum/boards/7/topics',
      { title: 'Neu', text: 'Inhalt' },
    );
  });

  it('shows server validation errors when creating a topic', async () => {
    apiMocks.get.mockResolvedValue(boardPage());
    apiMocks.post.mockRejectedValue(new ApiError(400, 'Der Titel ist zu lang'));
    renderAt('/alliances/1/forum/boards/7');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Thema anlegen' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Der Titel ist zu lang',
    );
  });
});

describe('AllianceForumTopicPage', () => {
  it('renders posts through the BBCode renderer, never as raw HTML', async () => {
    apiMocks.get.mockResolvedValue(
      topicPage([post({ text: '[b]Fett[/b] <img src=x onerror=alert(1)>' })]),
    );
    const { container } = renderAt('/alliances/1/forum/topics/9');

    expect(await screen.findByText('Fett')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/Rebellenallianz, Großadmiral/)).toBeTruthy();
  });

  it('shows Gelöschter Siedler without a profile link', async () => {
    apiMocks.get.mockResolvedValue(
      topicPage([
        post({
          author: author({
            userId: null,
            name: 'Gelöschter Siedler',
            factionName: null,
            roleTitle: null,
          }),
        }),
      ]),
    );
    renderAt('/alliances/1/forum/topics/9');

    expect(await screen.findByText('Gelöschter Siedler')).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Gelöschter Siedler' }),
    ).toBeNull();
  });

  it('shows deleted posts as a moderation notice without text', async () => {
    apiMocks.get.mockResolvedValue(
      topicPage([
        post({
          text: null,
          deleted: {
            deletedAt: '2026-10-09T11:00:00.000Z',
            moderatorName: 'Han',
          },
        }),
      ]),
    );
    renderAt('/alliances/1/forum/topics/9');

    expect(
      await screen.findByText(/Beitrag von der Moderation entfernt \(Han,/),
    ).toBeTruthy();
  });

  it('paginates posts', async () => {
    apiMocks.get.mockResolvedValue(
      topicPage([post()], {
        page: 1,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      }),
    );
    renderAt('/alliances/1/forum/topics/9');

    await screen.findByText('Seite 1 von 2');
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/alliances/1/forum/topics/9?page=2',
      ),
    );
  });

  it('replies and moves to the page containing the new post', async () => {
    apiMocks.get.mockImplementation(async (url: string) =>
      topicPage([post()], {
        page: url.endsWith('page=2') ? 2 : 1,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      }),
    );
    apiMocks.post.mockResolvedValue({ postId: 5, page: 2 });
    renderAt('/alliances/1/forum/topics/9');

    fireEvent.change(await screen.findByLabelText('Antworten'), {
      target: { value: 'Meine Antwort' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Antwort senden' }));

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe(
        '/alliances/1/forum/topics/9?page=2',
      ),
    );
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/alliances/1/forum/topics/9/posts',
      { text: 'Meine Antwort' },
    );
  });

  it('shows server validation errors when replying', async () => {
    apiMocks.get.mockResolvedValue(topicPage([post()]));
    apiMocks.post.mockRejectedValue(
      new ApiError(400, 'Der Beitrag ist zu lang'),
    );
    renderAt('/alliances/1/forum/topics/9');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Antwort senden' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Der Beitrag ist zu lang',
    );
  });
});
