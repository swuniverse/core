import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminUsersPage } from './admin-users';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, api: apiMocks };
});

describe('AdminUsersPage', () => {
  beforeEach(() => {
    apiMocks.get.mockResolvedValue([
      {
        id: 9,
        username: 'Hutten-Kartell',
        description: 'Neutraler Händler',
        isNpc: true,
        isAdmin: false,
        permissions: [],
        faction: null,
        createdAt: '2026-01-01T12:00:00.000Z',
        lastActiveAt: null,
        vacationMode: false,
        deletionMark: 0,
        blocked: false,
        lock: null,
      },
    ]);
    apiMocks.patch.mockResolvedValue(undefined);
    apiMocks.post.mockResolvedValue(undefined);
    apiMocks.delete.mockResolvedValue(undefined);
  });

  it('marks NPC accounts and lets admins edit name and description', async () => {
    render(<AdminUsersPage />);

    expect(await screen.findByText('NPC')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Name für Hutten-Kartell'), {
      target: { value: 'Hutten-Handel' },
    });
    fireEvent.change(screen.getByLabelText('Beschreibung für Hutten-Handel'), {
      target: { value: 'Neue Beschreibung' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'NPC speichern' }));

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith('/auth/admin/users/9', {
        username: 'Hutten-Handel',
        description: 'Neue Beschreibung',
      }),
    );
  });

  it('confirms and immediately deletes an account', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('NPC');
    fireEvent.click(screen.getByRole('button', { name: 'Sofort löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/auth/admin/users/9/delete', {}));
  });

  it('shows player details and submits the lock dialog', async () => {
    render(<AdminUsersPage />);
    expect(await screen.findByText('01.01.2026, 13:00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sperren' }));
    fireEvent.change(screen.getByLabelText('Anzahl Ticks'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Begründung'), { target: { value: 'Regelverstoß' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sperre setzen' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/auth/admin/users/9/lock', { ticks: 3, reason: 'Regelverstoß' }));
  });

  it('confirms blocking a player and shows the blocked state', async () => {
    render(<AdminUsersPage />);
    await screen.findByText('NPC');
    fireEvent.click(screen.getByRole('button', { name: 'Blockieren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spieler blockieren' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/auth/admin/users/9/block', {}));
    expect(screen.queryByRole('button', { name: 'Blockieren' })).toBeNull();
  });

  it('toggles the deletion ban', async () => {
    apiMocks.patch.mockResolvedValue({ deletionMark: 3 });
    render(<AdminUsersPage />);
    await screen.findByText('NPC');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Löschverbot' }));
    await waitFor(() => expect(apiMocks.patch).toHaveBeenCalledWith('/auth/admin/users/9/deletion-forbidden', { forbidden: true }));
    expect((screen.getByRole('checkbox', { name: 'Löschverbot' }) as HTMLInputElement).checked).toBe(true);
  });
});
