import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RpgPlotDto, UserProfile } from '@swuniverse/shared';
import { useAuthStore } from '../stores/auth.store';
import {
  RpgPlotCreatePage,
  RpgPlotDetailPage,
  RpgPlotListPage,
} from './rpg-plots';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: apiMocks }));

const user = {
  id: 7,
  username: 'Leia',
  email: 'leia@example.test',
  prestige: 0,
  createdAt: '2026-10-28T00:00:00.000Z',
  isAdmin: false,
  permissions: [],
} satisfies UserProfile;

const plotPost = {
  id: 42,
  title: '',
  body: 'Rebel briefing',
  category: 'ROLEPLAY',
  commentCount: 0,
  rating: 0,
  positiveCount: 0,
  totalCount: 0,
  createdAt: '2026-10-28T12:00:00.000Z',
  authorId: 8,
  author: { username: 'Han' },
  plotId: 11,
  plot: { id: 11, title: 'Echo Base Rescue' },
};

const plot: RpgPlotDto = {
  id: 11,
  title: 'Echo Base Rescue',
  description: '[b]Briefing[/b]',
  creatorId: user.id,
  creatorName: user.username,
  startedAt: '2026-10-28T10:00:00.000Z',
  endedAt: null,
  members: [
    { userId: user.id, username: user.username, joinedAt: '2026-10-28T10:00:00.000Z' },
    { userId: 8, username: 'Han', joinedAt: '2026-10-28T11:00:00.000Z' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'token', refreshToken: 'refresh', user });
});

it('lists all plots and switches to plots the player writes on', async () => {
  apiMocks.get.mockImplementation((url: string) => {
    if (url === '/rpg/plots?page=1') {
      return Promise.resolve({ data: [plot], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    }
    if (url === '/rpg/plots/mine?page=1') {
      return Promise.resolve({ data: [{ ...plot, id: 12 }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    }
    throw new Error(`Unexpected URL ${url}`);
  });

  render(
    <MemoryRouter>
      <RpgPlotListPage />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('link', { name: 'Echo Base Rescue' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Meine Plots' }));
  await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/rpg/plots/mine?page=1'));
});

it('creates a plot from the dedicated form', async () => {
  apiMocks.post.mockResolvedValue(plot);

  render(
    <MemoryRouter initialEntries={['/holonet/plots/new']}>
      <Routes>
        <Route path="/holonet/plots/new" element={<RpgPlotCreatePage />} />
        <Route path="/holonet/plots/:id" element={<div>Plot angelegt</div>} />
      </Routes>
    </MemoryRouter>,
  );

  fireEvent.change(screen.getByLabelText('Titel'), { target: { value: plot.title } });
  fireEvent.change(screen.getByLabelText('Beschreibung'), {
    target: { value: plot.description },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Plot anlegen' }));

  await waitFor(() =>
    expect(apiMocks.post).toHaveBeenCalledWith('/rpg/plots', {
      title: plot.title,
      description: plot.description,
    }),
  );
  expect(await screen.findByText('Plot angelegt')).toBeTruthy();
});

it('shows plot details and lets the creator manage writers', async () => {
  apiMocks.get.mockImplementation((url: string) => {
    if (url === '/rpg/plots/11') return Promise.resolve(plot);
    if (url === '/holonet?plotId=11&page=1') {
      return Promise.resolve({ data: [plotPost], total: 1, page: 1, limit: 20 });
    }
    throw new Error(`Unexpected URL ${url}`);
  });
  apiMocks.post.mockResolvedValue({});
  apiMocks.delete.mockResolvedValue({});

  render(
    <MemoryRouter initialEntries={['/holonet/plots/11']}>
      <Routes>
        <Route path="/holonet/plots/:id" element={<RpgPlotDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Briefing')).toBeTruthy();
  expect(screen.getByText('Ersteller: Leia')).toBeTruthy();
  expect(await screen.findByText('Rebel briefing')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Beitrag #42 öffnen' }).getAttribute('href')).toBe(
    '/holonet/42',
  );
  fireEvent.change(screen.getByLabelText('Spieler-ID'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Schreiber hinzufügen' }));
  await waitFor(() =>
    expect(apiMocks.post).toHaveBeenCalledWith('/rpg/plots/11/members', { userId: 9 }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Han entfernen' }));
  await waitFor(() => expect(apiMocks.delete).toHaveBeenCalledWith('/rpg/plots/11/members/8'));
});

it('offers a quick PM to other writers but not to the own account', async () => {
  apiMocks.get.mockImplementation((url: string) =>
    url === '/rpg/plots/11'
      ? Promise.resolve(plot)
      : Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
  );

  render(
    <MemoryRouter initialEntries={['/holonet/plots/11']}>
      <Routes>
        <Route path="/holonet/plots/:id" element={<RpgPlotDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Nachricht an Han schreiben' }));
  expect(screen.getByText(/Empfänger:/).textContent).toContain('(8)');
  expect(screen.queryByRole('button', { name: 'Nachricht an Leia schreiben' })).toBeNull();
});
