import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MessagesPage } from './messages';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', () => ({ api }));

const folders = [
  { folder: 'PERSONAL', unread: 1, total: 2 },
  { folder: 'SHIP', unread: 0, total: 0 },
  { folder: 'COLONY', unread: 0, total: 0 },
  { folder: 'TRADE', unread: 0, total: 0 },
  { folder: 'SYSTEM', unread: 0, total: 0 },
  { folder: 'OUTBOX', unread: 0, total: 0 },
  { folder: 'STATION', unread: 0, total: 0 },
];

function renderPage(initialEntry = '/messages?folder=personal') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessagesPage />
    </MemoryRouter>,
  );
}

describe('MessagesPage folders', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              subject: 'Private Nachricht',
              isRead: false,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              sender: { username: 'Leia' },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      if (url === '/messages/folders/trade?page=1') {
        return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
      }
      if (url === '/messages/11') {
        return Promise.resolve({
          id: 11,
          subject: 'Private Nachricht',
          body: 'Bitte antworten.',
          isRead: false,
          isSystem: false,
          createdAt: '2026-10-13T12:00:00.000Z',
          sender: { username: 'Leia' },
          senderId: 7,
          recipientId: 1,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  it('shows all folders including empty counters and requests the selected folder from the server', async () => {
    renderPage();

    expect(await screen.findByText('Private Nachricht')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Persönlich/ }).textContent,
    ).toContain('1/2');
    expect(
      screen.getByRole('button', { name: /Station/ }).textContent,
    ).toContain('0/0');

    fireEvent.click(screen.getByRole('button', { name: /Handel/ }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/messages/folders/trade?page=1'),
    );
    expect(await screen.findByText('Keine Nachrichten.')).toBeTruthy();
  });

  it('opens a received message through the API and updates its local unread state', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('Private Nachricht'));

    expect(await screen.findByText('Bitte antworten.')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/messages/11');
    expect(
      screen.getByRole('button', { name: /Persönlich/ }).textContent,
    ).toContain('0/2');
  });
});
