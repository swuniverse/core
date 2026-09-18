import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CommunicationDrawer } from './CommunicationDrawer';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api: apiMocks }));

describe('CommunicationDrawer', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.delete.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path.endsWith('/recipients'))
        return Promise.resolve([
          { userId: 2, username: 'Leia', source: 'SPACECRAFT' },
        ]);
      if (path.endsWith('/logs'))
        return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
      return Promise.resolve(null);
    });
    apiMocks.post.mockResolvedValue({});
    apiMocks.patch.mockResolvedValue({});
    apiMocks.delete.mockResolvedValue({});
  });

  it('previews recipients and sends a broadcast', async () => {
    render(<CommunicationDrawer shipId={7} />);
    expect(await screen.findByText(/Empfänger im Radius: 1/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Broadcast-Text'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/7/communications/broadcast',
        { body: 'Test' },
      ),
    );
  });

  it('edits and deletes log entries using STU-style action buttons', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path.endsWith('/recipients')) return Promise.resolve([]);
      if (path.endsWith('/logs'))
        return Promise.resolve({
          data: [
            {
              id: 3,
              body: 'Erster Eintrag',
              createdAt: '2026-09-10T11:23:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        });
      return Promise.resolve(null);
    });
    render(<CommunicationDrawer shipId={7} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Logbuch' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Logbucheintrag bearbeiten' }),
    );
    fireEvent.change(screen.getByLabelText('Logbucheintrag'), {
      target: { value: 'Korrigiert' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Änderung speichern' }));
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/7/communications/logs/3',
        { body: 'Korrigiert' },
      ),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Logbucheintrag löschen' }),
    );
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/spacecraft/7/communications/logs/3',
      ),
    );
  });

  it('sends a distress signal, closes the dialog, and later shows the active signal', async () => {
    const onClose = vi.fn();
    const first = render(<CommunicationDrawer shipId={7} onClose={onClose} />);
    await screen.findByText(/Empfänger/);
    fireEvent.click(screen.getByRole('tab', { name: 'Notruf' }));
    fireEvent.change(screen.getByLabelText('Notruftext'), {
      target: { value: 'Hilfe benötigt' },
    });
    expect(screen.getByText('14/250 Zeichen')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Notruf senden' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith(
        '/spacecraft/7/communications/distress',
        { message: 'Hilfe benötigt' },
      ),
    );
    expect(onClose).toHaveBeenCalled();

    first.unmount();
    apiMocks.get.mockImplementation((path: string) => {
      if (path.endsWith('/recipients')) return Promise.resolve([]);
      if (path.endsWith('/logs'))
        return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
      return Promise.resolve({ message: 'Hilfe benötigt' });
    });
    render(<CommunicationDrawer shipId={7} />);
    fireEvent.click((await screen.findAllByRole('tab', { name: 'Notruf' }))[0]);
    expect(await screen.findByText('Aktuelles Notrufsignal')).toBeTruthy();
    expect(screen.getByText('Hilfe benötigt')).toBeTruthy();
  });

  it('returns to the send form immediately after ending an active distress signal', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path.endsWith('/recipients')) return Promise.resolve([]);
      if (path.endsWith('/logs'))
        return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
      return Promise.resolve({ message: 'Bereits aktiv' });
    });
    render(<CommunicationDrawer shipId={7} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Notruf' }));
    expect(await screen.findByText('Aktuelles Notrufsignal')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Notruf beenden' }));
    await waitFor(() =>
      expect(apiMocks.delete).toHaveBeenCalledWith(
        '/spacecraft/7/communications/distress',
      ),
    );
    expect(screen.getByLabelText('Notruftext')).toBeTruthy();
  });

  it('enforces the distress text limit in the client', async () => {
    render(<CommunicationDrawer shipId={7} />);
    await screen.findByText(/Empfänger/);
    fireEvent.click(screen.getByRole('tab', { name: 'Notruf' }));
    expect(screen.getByLabelText('Notruftext').getAttribute('maxlength')).toBe(
      '250',
    );
  });
});
