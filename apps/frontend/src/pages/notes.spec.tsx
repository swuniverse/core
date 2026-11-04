import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NotesPage } from './notes';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: apiMocks }));

const briefing = {
  id: 11,
  title: 'Briefing',
  text: 'Treffpunkt Hoth',
  createdAt: '2026-11-04T12:00:00.000Z',
  updatedAt: '2026-11-04T12:00:00.000Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  apiMocks.get.mockResolvedValue([briefing]);
});
afterEach(cleanup);

it('creates a note with title and text and shows it in the collection', async () => {
  apiMocks.post.mockResolvedValue({
    ...briefing,
    id: 12,
    title: 'Plan',
    text: 'Route',
  });
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Neue Notiz' }));
  fireEvent.change(screen.getByLabelText('Titel'), {
    target: { value: 'Plan' },
  });
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Route' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Notiz anlegen' }));
  await waitFor(() =>
    expect(apiMocks.post).toHaveBeenCalledWith('/user/notes', {
      title: 'Plan',
      text: 'Route',
    }),
  );
  expect(await screen.findByRole('button', { name: 'Plan' })).toBeTruthy();
});

it('autosaves changes to title and text after a debounce without saving on load', async () => {
  apiMocks.patch.mockImplementation((_url: string, body: object) =>
    Promise.resolve({ ...briefing, ...body }),
  );
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  expect(apiMocks.patch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Titel'), {
    target: { value: 'Route' },
  });
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Endor' },
  });
  expect(apiMocks.patch).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(apiMocks.patch).toHaveBeenCalledWith('/user/notes/11', {
      title: 'Route',
      text: 'Endor',
    }),
  );
  expect(apiMocks.patch).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(/Gespeichert/)).toBeTruthy();
});

it('does not save an empty or oversized title and explains the limit', async () => {
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Neue Notiz' }));
  expect(
    (screen.getByRole('button', { name: 'Notiz anlegen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText('Titel'), {
    target: { value: 'x'.repeat(101) },
  });
  expect(
    (screen.getByRole('button', { name: 'Notiz anlegen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText('Titel muss 1–100 Zeichen lang sein')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Titel'), {
    target: { value: 'x'.repeat(100) },
  });
  expect(
    (screen.getByRole('button', { name: 'Notiz anlegen' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

it('deletes a single note from its editor', async () => {
  apiMocks.delete.mockResolvedValue({ deleted: 1 });
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Notiz löschen' }));
  await waitFor(() =>
    expect(apiMocks.delete).toHaveBeenCalledWith('/user/notes/11'),
  );
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Briefing' })).toBeNull(),
  );
  expect(screen.queryByLabelText('Text')).toBeNull();
});

it('bulk deletes selected notes and keeps the unselected note', async () => {
  apiMocks.get.mockResolvedValue([
    briefing,
    { ...briefing, id: 12, title: 'Plan' },
    { ...briefing, id: 13, title: 'Keep' },
  ]);
  apiMocks.delete.mockResolvedValue({ deleted: 2 });
  render(<NotesPage />);
  fireEvent.click(
    await screen.findByRole('checkbox', { name: 'Briefing auswählen' }),
  );
  fireEvent.click(screen.getByRole('checkbox', { name: 'Plan auswählen' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Ausgewählte löschen (2)' }),
  );
  await waitFor(() =>
    expect(apiMocks.delete).toHaveBeenCalledWith('/user/notes', {
      body: JSON.stringify({ ids: [11, 12] }),
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Briefing' })).toBeNull(),
  );
  expect(screen.queryByRole('button', { name: 'Plan' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy();
});

it('keeps failed autosave text visible and lets the player retry', async () => {
  apiMocks.patch
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ...briefing, text: 'New text' });
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'New text' },
  });
  expect(await screen.findByText('Speichern fehlgeschlagen')).toBeTruthy();
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'New text',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Erneut speichern' }));
  expect(await screen.findByText('Gespeichert')).toBeTruthy();
  expect(apiMocks.patch).toHaveBeenLastCalledWith('/user/notes/11', {
    title: 'Briefing',
    text: 'New text',
  });
});

it('flushes a pending autosave when switching notes without saving the other note', async () => {
  apiMocks.get.mockResolvedValue([
    briefing,
    { ...briefing, id: 12, title: 'Plan', text: 'Other text' },
  ]);
  apiMocks.patch.mockResolvedValue({ ...briefing, text: 'Changed' });
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Changed' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
  await waitFor(() =>
    expect(apiMocks.patch).toHaveBeenCalledWith('/user/notes/11', {
      title: 'Briefing',
      text: 'Changed',
    }),
  );
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'Other text',
  );
  expect(apiMocks.patch).toHaveBeenCalledTimes(1);
});

it('serializes autosaves so late responses cannot overwrite newer text', async () => {
  let resolveFirst!: (value: object) => void;
  apiMocks.patch
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    )
    .mockImplementation((_url: string, body: object) =>
      Promise.resolve({ ...briefing, ...body }),
    );
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'First' },
  });
  await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Latest' },
  });
  await act(async () => {
    resolveFirst({ ...briefing, text: 'First' });
  });
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'Latest',
  );
  await waitFor(() =>
    expect(apiMocks.patch).toHaveBeenLastCalledWith('/user/notes/11', {
      title: 'Briefing',
      text: 'Latest',
    }),
  );
});

it('keeps notes when deletion fails', async () => {
  apiMocks.delete.mockRejectedValue(new Error('offline'));
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Notiz löschen' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Briefing' })).toBeTruthy();
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'Treffpunkt Hoth',
  );
});

it('allows retrying creation after a failed request from an empty collection', async () => {
  apiMocks.get.mockResolvedValue([]);
  apiMocks.post
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(briefing);
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Neue Notiz' }));
  fireEvent.change(screen.getByLabelText('Titel'), {
    target: { value: 'Briefing' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Notiz anlegen' }));
  expect(
    await screen.findByText('Notiz konnte nicht angelegt werden'),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Notiz anlegen' }));
  expect(await screen.findByRole('button', { name: 'Briefing' })).toBeTruthy();
});

it('never treats another account’s old browser text as a note collection', async () => {
  localStorage.setItem('swu-notes', 'Private stale text');
  apiMocks.get.mockRejectedValue(new Error('offline'));
  render(<NotesPage />);
  expect(
    await screen.findByText('Notizen konnten nicht geladen werden'),
  ).toBeTruthy();
  expect(screen.queryByLabelText('Text')).toBeNull();
  expect(apiMocks.post).not.toHaveBeenCalled();
  expect(apiMocks.patch).not.toHaveBeenCalled();
});

it('preserves save order when returning to a note while its previous save is in flight', async () => {
  let resolveFirst!: (value: object) => void;
  apiMocks.get.mockResolvedValue([
    briefing,
    { ...briefing, id: 12, title: 'Plan' },
  ]);
  apiMocks.patch
    .mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    )
    .mockImplementation((_url: string, body: object) =>
      Promise.resolve({ ...briefing, ...body }),
    );
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'First' },
  });
  await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Latest' },
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  const callsWhileFirstPending = apiMocks.patch.mock.calls.length;
  await act(async () => {
    resolveFirst({ ...briefing, text: 'First' });
  });
  expect(callsWhileFirstPending).toBe(1);
  await waitFor(() =>
    expect(apiMocks.patch).toHaveBeenLastCalledWith('/user/notes/11', {
      title: 'Briefing',
      text: 'Latest',
    }),
  );
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'Latest',
  );
});

it('cancels pending autosave when the edited note is deleted', async () => {
  apiMocks.delete.mockResolvedValue({ deleted: 1 });
  apiMocks.patch.mockResolvedValue(briefing);
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  fireEvent.change(screen.getByLabelText('Text'), {
    target: { value: 'Changed' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Notiz löschen' }));
  await waitFor(() => expect(screen.queryByLabelText('Text')).toBeNull());
  expect(apiMocks.patch).not.toHaveBeenCalled();
});

it('lists dated notes and opens a selected note for editing', async () => {
  render(<NotesPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Briefing' }));
  expect(screen.getByText(/04\.11\.2026/)).toBeTruthy();
  expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(
    'Briefing',
  );
  expect((screen.getByLabelText('Text') as HTMLTextAreaElement).value).toBe(
    'Treffpunkt Hoth',
  );
});
