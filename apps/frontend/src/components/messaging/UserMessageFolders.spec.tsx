import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserMessageFolders } from './UserMessageFolders';
const api = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../../services/api', () => ({ api }));
describe('Own message folders', () => {
  beforeEach(() => vi.resetAllMocks());
  it('selects folders, creates and sorts them', async () => {
    const select = vi.fn(),
      refresh = vi.fn(async () => undefined);
    render(
      <UserMessageFolders
        folders={[
          { id: 1, name: 'Archiv', sortOrder: 0 },
          { id: 2, name: 'Freunde', sortOrder: 1 },
        ]}
        activeId={null}
        onSelect={select}
        onRefresh={refresh}
        moveIds={[]}
        onMoved={refresh}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Archiv' }),
    );
    expect(select).toHaveBeenCalledWith(1);
    fireEvent.change(screen.getByLabelText('Ordnername'), {
      target: { value: 'Neu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ordner anlegen' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/user-folders', {
        name: 'Neu',
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Freunde nach oben' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/user-folders/2/sort', {
        direction: 'up',
      }),
    );
  });
  it('moves a multiple or single selection and back to PERSONAL', async () => {
    const moved = vi.fn(async () => undefined);
    const props = {
      folders: [{ id: 1, name: 'Archiv', sortOrder: 0 }],
      activeId: null,
      onSelect: vi.fn(),
      onRefresh: moved,
      onMoved: moved,
    };
    const view = render(<UserMessageFolders {...props} moveIds={[10, 11]} />);
    fireEvent.change(screen.getByLabelText('Verschieben nach'), {
      target: { value: '1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '2 Nachricht(en) verschieben' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/user-folders/move', {
        ids: [10, 11],
        folderId: 1,
      }),
    );
    await waitFor(() => expect(moved).toHaveBeenCalled());
    view.rerender(<UserMessageFolders {...props} moveIds={[10]} />);
    fireEvent.change(screen.getByLabelText('Verschieben nach'), {
      target: { value: '' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '1 Nachricht(en) verschieben' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages/user-folders/move', {
        ids: [10],
        folderId: null,
      }),
    );
  });
});
