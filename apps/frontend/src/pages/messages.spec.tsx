import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { MessagesPage } from './messages';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
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
      <ToastProvider>
        <MessagesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('MessagesPage folders', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.patch.mockReset();
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              body: 'Private Nachricht',
              isRead: false,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              senderId: 7,
              sender: { id: 7, username: 'Leia', avatar: null, faction: null, isNpc: false },
              senderContact: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 6,
        });
      }
      if (url === '/messages/folders/trade?page=1') {
        return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
      }
      if (url === '/messages/11') {
        return Promise.resolve({
          id: 11,
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
    expect(screen.getAllByText('Leia').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Betreff/)).toBeNull();
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

  it('shows a read receipt only for confirmed outbox messages', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/outbox?page=1') {
        return Promise.resolve({
          data: [
            { id: 21, body: 'Gelesen', isSystem: false, readReceipt: true, createdAt: '2026-10-13T12:00:00.000Z', recipient: { username: 'Leia' } },
            { id: 22, body: 'Offen', isSystem: false, readReceipt: false, createdAt: '2026-10-13T12:00:00.000Z', recipient: { username: 'Han' } },
          ],
          total: 2,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });

    renderPage('/messages?folder=outbox');

    expect(await screen.findByTitle('Nachricht gelesen')).toBeTruthy();
    expect(screen.getAllByTitle('Nachricht gelesen')).toHaveLength(1);
  });

  it('shows a desktop action rail with compose, notes and folder navigation', async () => {
    renderPage();

    expect(await screen.findByRole('complementary', {
      name: 'Nachrichtenaktionen',
    })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nachricht verfassen' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Notizzettel öffnen' }).getAttribute('href')).toBe('/notes');
  });

  it('shows a COLONY message severity and full text on its card', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/colony?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 12,
              body: 'Schildgenerator ausgefallen',
              isRead: false,
              isSystem: true,
              createdAt: '2026-10-13T12:00:00.000Z',
              originSeverity: 'CRITICAL',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });

    renderPage('/messages?folder=colony');

    expect(await screen.findByText('CRITICAL')).toBeTruthy();
    expect(screen.getByText('Schildgenerator ausgefallen')).toBeTruthy();
    expect(within(screen.getByRole('article')).getByText('System')).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Kontaktmodus/ })).toBeNull();
  });

  it.each([
    ['COLONY', 5, '/colonies/5'],
    ['SPACECRAFT', 6, '/spacecraft/6'],
    ['HOLONET_POST', 7, '/holonet/7'],
    ['ALLIANCE_TOPIC', 8, '/alliances/8/forum/topics/8'],
  ])('links a %s message target from its card', async (targetKind, targetId, href) => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [{ id: 31, body: 'Verlinkte Meldung', isRead: true, isSystem: true, createdAt: '2026-10-13T12:00:00.000Z', senderId: 1, targetKind, targetId }],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });

    renderPage();
    await screen.findByText('Verlinkte Meldung');

    expect((await screen.findByRole('link', { name: 'ansehen' })).getAttribute('href')).toBe(href);
  });

  it('does not render a target link without a complete target', async () => {
    renderPage();
    await screen.findByText('Private Nachricht');
    expect(screen.queryByRole('link', { name: 'ansehen' })).toBeNull();
  });

  it('refreshes the folder summary and header badge after displaying unread messages', async () => {
    const headerRefresh = vi.fn();
    window.addEventListener('swu:messages-read', headerRefresh);
    const refreshedFolders = folders.map((entry) =>
      entry.folder === 'PERSONAL' ? { ...entry, unread: 0, total: 2 } : entry,
    );
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') {
        return Promise.resolve(
          api.get.mock.calls.filter(([path]) => path === url).length === 1
            ? folders
            : refreshedFolders,
        );
      }
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              body: 'Private Nachricht',
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
      if (url === '/messages/11') {
        return Promise.resolve({
          id: 11,
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

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Persönlich/ }).textContent,
      ).toContain('0/2'),
    );
    expect(headerRefresh).toHaveBeenCalled();
    window.removeEventListener('swu:messages-read', headerRefresh);
  });

  it('refreshes the folder summary after deleting a message', async () => {
    const refreshedFolders = folders.map((entry) =>
      entry.folder === 'PERSONAL' ? { ...entry, unread: 0, total: 1 } : entry,
    );
    api.delete.mockResolvedValue(undefined);
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') {
        return Promise.resolve(
          api.get.mock.calls.filter(([path]) => path === url).length === 1
            ? folders
            : refreshedFolders,
        );
      }
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              body: 'Private Nachricht',
              isRead: false,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              sender: { username: 'Leia' },
            },
          ],
          total: 2,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Nachricht löschen' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Persönlich/ }).textContent,
      ).toContain('0/1'),
    );
  });

  it('marks the active incoming folder as read and refreshes it', async () => {
    api.post.mockResolvedValue({ affected: 1 });
    renderPage();

    fireEvent.click(await screen.findByRole('button', {
      name: 'Ordner als gelesen markieren',
    }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/messages/folders/personal/mark-read',
        {},
      ),
    );
  });

  it('does not offer received-message bulk actions in the outbox', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/outbox?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 13,
              body: 'Gesendete Nachricht',
              isRead: true,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              recipient: { username: 'Han' },
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });

    renderPage('/messages?folder=outbox');

    expect(await screen.findByText('Gesendete Nachricht')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Alle selektierten löschen/ }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Ordner als gelesen markieren' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ordner leeren' })).toBeNull();
  });

  it('deletes multiple selected messages only after confirmation', async () => {
    api.post.mockResolvedValue({ affected: 2 });
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [
            {
              id: 11,
              body: 'Private Nachricht',
              isRead: false,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              sender: { username: 'Leia' },
            },
            {
              id: 12,
              body: 'Zweite Nachricht',
              isRead: false,
              isSystem: false,
              createdAt: '2026-10-13T12:00:00.000Z',
              sender: { username: 'Leia' },
            },
          ],
          total: 2,
          page: 1,
          limit: 20,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', {
      name: 'Nachricht Private Nachricht auswählen',
    }));
    fireEvent.click(screen.getByRole('checkbox', {
      name: 'Nachricht Zweite Nachricht auswählen',
    }));
    fireEvent.click(screen.getByRole('button', {
      name: /Alle selektierten löschen/,
    }));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {
      name: 'Nachrichten löschen bestätigen',
    }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/bulk-delete', {
        ids: [11, 12],
      }),
    );
  });

  it('confirms before emptying the active incoming folder', async () => {
    api.post.mockResolvedValue({ affected: 1 });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ordner leeren' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ordner leeren bestätigen' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/folders/personal/empty', {}),
    );
  });

  it('focuses and dismisses a confirmation dialog with Escape', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ordner leeren' }));
    const cancel = screen.getByRole('button', { name: 'Abbrechen' });

    await waitFor(() => expect(document.activeElement).toBe(cancel));
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('loads and shows correspondence when replying', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/personal?page=1') {
        return Promise.resolve({
          data: [{
            id: 11,
            body: 'Private Nachricht',
            isRead: false,
            isSystem: false,
            createdAt: '2026-10-13T12:00:00.000Z',
            senderId: 7,
            sender: { id: 7, username: 'Leia', avatar: null, faction: null, isNpc: false },
          }],
          total: 1,
          page: 1,
          limit: 6,
        });
      }
      if (url === '/messages/correspondence/7') {
        return Promise.resolve([{
          id: 10,
          body: '[b]Alter Verlauf[/b]',
          isRead: true,
          isSystem: false,
          createdAt: '2026-10-12T12:00:00.000Z',
          sender: { username: 'Leia' },
          senderId: 7,
          recipientId: 1,
        }]);
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Antworten' }));

    expect(await screen.findByText('Korrespondenz')).toBeTruthy();
    expect(screen.getByText('Alter Verlauf')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/messages/correspondence/7');
  });

  it('shows a full card with sender link, settler id, avatar and NPC badge', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/folders/trade?page=1') {
        return Promise.resolve({
          data: [{
            id: 40,
            body: '[b]Angebot[/b] für Dich',
            isRead: false,
            isSystem: false,
            createdAt: '2026-10-13T12:00:00.000Z',
            senderId: 99,
            sender: { id: 99, username: 'Händlergilde', avatar: '/a.png', faction: null, isNpc: true },
            senderContact: null,
          }],
          total: 1,
          page: 1,
          limit: 6,
        });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 6 });
    });
    renderPage('/messages?folder=trade');

    expect(await screen.findByText('Angebot')).toBeTruthy();
    expect(screen.getByText('(99)')).toBeTruthy();
    expect(screen.getByText('NPC')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Profil von Händlergilde' }).getAttribute('href')).toBe('/players/99');
    expect(screen.getByText('(neu)')).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Kontaktmodus/ })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /verschieben/ })).toBeNull();
  });

  it('creates a contact from the card switcher and updates an existing one', async () => {
    api.post.mockResolvedValue({ id: 5, mode: 'ENEMY' });
    api.patch.mockResolvedValue({ id: 5, mode: 'FRIEND' });
    renderPage();

    const group = await screen.findByRole('group', { name: 'Kontaktmodus für Leia' });
    fireEvent.click(within(group).getByRole('button', { name: 'Feind' }));
    await waitFor(() =>
      expect(within(group).getByRole('button', { name: 'Feind' }).getAttribute('aria-pressed')).toBe('true'),
    );
    expect(api.post).toHaveBeenCalledWith('/contacts', { playerId: 7, mode: 'ENEMY' });

    fireEvent.click(within(group).getByRole('button', { name: 'Freund' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/contacts/5/mode', { mode: 'FRIEND' }));
  });

  it('moves a single personal message into a custom folder from its card', async () => {
    const baseGet = api.get.getMockImplementation() as (url: string) => unknown;
    api.get.mockImplementation((url: string) =>
      url === '/messages/user-folders'
        ? Promise.resolve([{ id: 3, name: 'Archiv', sortOrder: 0 }])
        : baseGet(url),
    );
    api.post.mockResolvedValue({ affected: 1 });
    renderPage();

    const select = await screen.findByRole('combobox', { name: 'Nachricht Private Nachricht verschieben' });
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Archiv' })).toBeTruthy());
    fireEvent.change(select, { target: { value: '3' } });

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/user-folders/move', { ids: [11], folderId: 3 }),
    );
  });

  it('navigates folder pages by page number', async () => {
    const baseGet = api.get.getMockImplementation() as (url: string) => unknown;
    api.get.mockImplementation((url: string) =>
      url.startsWith('/messages/folders/personal?page=')
        ? Promise.resolve({ data: [], total: 40, page: 1, limit: 6 })
        : baseGet(url),
    );
    renderPage();

    const pages = await screen.findByRole('navigation', { name: 'Seiten' });
    expect(within(pages).getAllByRole('button').map((b) => b.textContent)).toEqual(['1', '2', '3', '7']);
    fireEvent.click(within(pages).getByRole('button', { name: 'Seite 7' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/messages/folders/personal?page=7'));
  });

  it('renders contacts, changes their mode, and selects one in compose', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/contacts') {
        return Promise.resolve([
          {
            id: 4,
            userId: 1,
            contactUserId: 7,
            contactUsername: 'Leia',
            mode: 'FRIEND',
            comment: 'Generalin',
            createdAt: '2026-10-13T12:00:00.000Z',
          },
        ]);
      }
      if (url === '/contacts/received') return Promise.resolve([]);
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    api.patch = vi.fn().mockResolvedValue({
      id: 4,
      contactUserId: 7,
      contactUsername: 'Leia',
      mode: 'NEUTRAL',
      comment: 'Generalin',
      createdAt: '2026-10-13T12:00:00.000Z',
    });

    renderPage('/messages?tab=contacts');

    expect(await screen.findByRole('link', { name: 'Leia' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Modus für Leia'), {
      target: { value: 'NEUTRAL' },
    });
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/contacts/4/mode', {
        mode: 'NEUTRAL',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nachricht verfassen' }));
    fireEvent.change(await screen.findByLabelText('Kontakt wählen'), {
      target: { value: '7' },
    });
    expect(screen.getByLabelText('Empfänger (Siedler-ID)')).toHaveProperty('value', '7');
    expect(screen.getAllByText('Leia').length).toBeGreaterThan(0);
  });

  it('toggles both one-sided contact permissions independently and keeps failed changes closed', async () => {
    let contact = {
      id: 4, userId: 1, contactUserId: 7, contactUsername: 'Leia',
      mode: 'NEUTRAL', comment: '', treatAsFriend: false, shareLivePositions: false,
      createdAt: '2026-10-13T12:00:00.000Z',
    };
    api.get.mockImplementation((url: string) => Promise.resolve(
      url === '/contacts' ? [contact] : url === '/contacts/received' ? [] : url === '/messages/folders' ? folders : { data: [], total: 0, page: 1, limit: 20 },
    ));
    api.patch.mockImplementation((_url: string, permissions: object) => {
      contact = { ...contact, ...permissions };
      return Promise.resolve(contact);
    });
    renderPage('/messages?tab=contacts');
    const friend = await screen.findByRole('checkbox', { name: 'Als Freund behandeln: Leia' });
    const position = screen.getByRole('checkbox', { name: 'Live-Position teilen mit Leia' });
    expect(friend).toHaveProperty('checked', false);
    expect(position).toHaveProperty('checked', false);
    fireEvent.click(friend);
    await waitFor(() => expect(friend).toHaveProperty('checked', true));
    expect(api.patch).toHaveBeenLastCalledWith('/contacts/4/permissions', { treatAsFriend: true });
    expect(position).toHaveProperty('checked', false);
    fireEvent.click(position);
    await waitFor(() => expect(position).toHaveProperty('checked', true));
    expect(api.patch).toHaveBeenLastCalledWith('/contacts/4/permissions', { shareLivePositions: true });
    fireEvent.click(friend);
    await waitFor(() => expect(friend).toHaveProperty('checked', false));
    expect(position).toHaveProperty('checked', true);
    fireEvent.click(position);
    await waitFor(() => expect(position).toHaveProperty('checked', false));
    api.patch.mockRejectedValueOnce(new Error('Freigabe nicht gespeichert'));
    fireEvent.click(position);
    expect(await screen.findByText('Freigabe nicht gespeichert')).toBeTruthy();
    expect(position).toHaveProperty('checked', false);
  });

  it('shows the ignore list, who ignores the player, and deletes selected entries', async () => {
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/ignore-list') return Promise.resolve([{
        id: 8,
        ignoredUserId: 7,
        ignoredUsername: 'Leia',
        createdAt: '2026-10-13T12:00:00.000Z',
      }]);
      if (url === '/ignore-list/ignored-by') return Promise.resolve([{
        id: 9,
        ownerId: 3,
        ownerUsername: 'Tarkin',
        createdAt: '2026-10-14T12:00:00.000Z',
      }]);
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    api.delete.mockResolvedValue({ deleted: 1 });

    renderPage('/messages?tab=ignore-list');

    expect(await screen.findByRole('link', { name: 'Leia' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Tarkin' })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Leia markieren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Markierte löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ignorierungen löschen bestätigen' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/ignore-list', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [8] }),
    }));
  });

  it('shows a send error and keeps the draft', async () => {
    renderPage('/messages?tab=compose&to=7&name=Leia');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/messages/folders'));
    api.post.mockImplementationOnce(() => Promise.reject(new Error('Der Text ist zu kurz')));

    expect(screen.queryByLabelText('Betreff')).toBeNull();
    fireEvent.change(screen.getByLabelText('Nachricht'), {
      target: { value: 'Entwurf bleibt erhalten' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/messages', {
      recipientId: 7,
      body: 'Entwurf bleibt erhalten',
    }));
    expect((await screen.findByRole('alert')).textContent).toContain('Der Text ist zu kurz');
    expect(screen.getByDisplayValue('Entwurf bleibt erhalten')).toBeTruthy();
  });

  it('resolves a typed settler id to the recipient name and sends to it', async () => {
    api.post.mockResolvedValue(undefined);
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/database/settlers/9') return Promise.resolve({ id: 9, username: 'Wedge' });
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Nachricht verfassen' }));
    fireEvent.change(await screen.findByLabelText('Empfänger (Siedler-ID)'), { target: { value: '9' } });
    expect(await screen.findByText('Wedge')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nachricht'), { target: { value: 'Hallo Wedge' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/messages', { recipientId: 9, body: 'Hallo Wedge' }));
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/user/search'));
  });

  it('refreshes the folder summary after sending a message', async () => {
    const refreshedFolders = folders.map((entry) =>
      entry.folder === 'OUTBOX' ? { ...entry, total: 1 } : entry,
    );
    api.post.mockResolvedValue(undefined);
    api.get.mockImplementation((url: string) => {
      if (url === '/messages/folders') {
        return Promise.resolve(
          api.get.mock.calls.filter(([path]) => path === url).length === 1
            ? folders
            : refreshedFolders,
        );
      }
      if (url === '/messages/folders/outbox?page=1') {
        return Promise.resolve({ data: [], total: 1, page: 1, limit: 20 });
      }
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
    renderPage('/messages?tab=compose&to=7&name=Leia');

    fireEvent.change(screen.getByLabelText('Nachricht'), {
      target: { value: 'Statusbericht' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Postausgang/ }).textContent,
      ).toContain('0/1'),
    );
  });
});

describe('MessagesPage messenger inbox', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.patch.mockReset();
    api.get.mockImplementation((url: string) => {
      if (url === '/user/settings') {
        return Promise.resolve({ inbox_messenger_style: '1' });
      }
      if (url === '/messages/folders') return Promise.resolve(folders);
      if (url === '/messages/conversations?page=1') {
        return Promise.resolve({
          data: [{ partnerId: 7, partner: { username: 'Leia', avatar: null, faction: null }, body: 'Bitte antworten.', createdAt: '2026-10-13T12:00:00.000Z', unread: 1 }],
          total: 1,
          page: 1,
          limit: 20,
        });
      }
      if (url === '/messages/correspondence/7') return Promise.resolve([]);
      return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  it('switches Personal to conversations and opens a conversation for reply', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /Leia/ })).toBeTruthy();
    expect(screen.getByText('Bitte antworten.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Leia/ }));

    expect((await screen.findByLabelText('Empfänger (Siedler-ID)') as HTMLInputElement).value).toBe('7');
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/messages/correspondence/7'),
    );
  });
});
