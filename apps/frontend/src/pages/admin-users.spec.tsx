import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminUsersPage } from './admin-users';
import type * as ApiModule from '../services/api';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
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
      },
    ]);
    apiMocks.patch.mockResolvedValue(undefined);
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
});
