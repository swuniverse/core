import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAwardsPage } from './admin-awards';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const toastMocks = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('../services/api', () => ({ api: apiMocks }));
vi.mock('../components/Toast', () => ({ useToast: () => toastMocks }));

describe('AdminAwardsPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    toastMocks.info.mockReset();
    toastMocks.error.mockReset();
    apiMocks.get.mockImplementation((path: string) => {
      if (path === '/auth/admin/users') {
        return Promise.resolve([{ id: 17, username: 'Pilot17' }]);
      }
      if (path === '/admin/awards/catalog') {
        return Promise.resolve([
          {
            key: 'COMMUNITY_HELPER',
            description: 'Verdienste um die Gemeinschaft',
            prestige: 10,
            isNpc: false,
          },
        ]);
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    apiMocks.post.mockResolvedValue({ granted: true, count: 2 });
  });

  it('loads player and award choices, submits the exact grant payload, and shows a toast', async () => {
    render(
      <MemoryRouter>
        <AdminAwardsPage />
      </MemoryRouter>,
    );

    const player = await screen.findByRole('combobox', { name: 'Spieler' });
    const award = screen.getByRole('combobox', { name: 'Award' });
    await screen.findByRole('option', { name: /Pilot17/ });
    expect(
      screen.getByRole('option', { name: /COMMUNITY_HELPER/ }),
    ).toBeTruthy();

    fireEvent.change(player, { target: { value: '17' } });
    fireEvent.change(award, { target: { value: 'COMMUNITY_HELPER' } });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Vorhandenen Award erhöhen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Award vergeben' }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith('/admin/awards/grant', {
        playerId: 17,
        awardKey: 'COMMUNITY_HELPER',
        incrementExisting: true,
      });
    });
    expect(toastMocks.info).toHaveBeenCalledWith(
      'Award vergeben (neue Anzahl: 2).',
    );
  });
});
