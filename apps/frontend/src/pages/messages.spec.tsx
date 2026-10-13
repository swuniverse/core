import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { MessagesPage } from './messages';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: apiMocks }));

describe('MessagesPage folder mailbox', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/messages/folders') {
        return Promise.resolve([
          { folder: 'PERSONAL', unread: 1, total: 2 },
          { folder: 'SHIP', unread: 0, total: 0 },
          { folder: 'COLONY', unread: 0, total: 0 },
          { folder: 'TRADE', unread: 0, total: 0 },
          { folder: 'SYSTEM', unread: 0, total: 0 },
          { folder: 'OUTBOX', unread: 0, total: 0 },
          { folder: 'STATION', unread: 0, total: 0 },
        ]);
      }
      if (path === '/messages/folders/PERSONAL?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 42,
              subject: 'Fleet report',
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
      if (path === '/messages/42') {
        return Promise.resolve({
          id: 42,
          subject: 'Fleet report',
          body: 'The fleet has arrived.',
          isRead: true,
          isSystem: false,
          createdAt: '2026-10-13T12:00:00.000Z',
          senderId: 8,
          recipientId: 7,
          sender: { username: 'Leia' },
        });
      }
      throw new Error(`Unexpected request: ${path}`);
    });
  });

  it('shows every folder with unread and total counts and server-loads a selected folder', async () => {
    render(
      <MemoryRouter initialEntries={['/messages']}>
        <MessagesPage />
      </MemoryRouter>,
    );

    const personal = await screen.findByRole('button', {
      name: /Persoenlich.*1.*2/i,
    });
    expect(screen.getByRole('button', { name: /Schiff.*0.*0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Kolonie.*0.*0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Handel.*0.*0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /System.*0.*0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Postausgang.*0.*0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Station.*0.*0/i })).toBeTruthy();

    fireEvent.click(personal);

    expect(await screen.findByText('Fleet report')).toBeTruthy();
    expect(apiMocks.get).toHaveBeenCalledWith('/messages/folders/PERSONAL?page=1');
  });

  it('opens a received message through the read API, which marks it read server-side', async () => {
    render(
      <MemoryRouter initialEntries={['/messages?folder=PERSONAL']}>
        <MessagesPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Fleet report'));

    expect(await screen.findByText('The fleet has arrived.')).toBeTruthy();
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledWith('/messages/42'));
  });
});
