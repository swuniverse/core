import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Faction } from '@swuniverse/shared';
import { AdminFactionsPage } from './admin-factions';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, api: apiMocks };
});

describe('AdminFactionsPage', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.get.mockResolvedValue([
      {
        id: 1,
        key: Faction.REBEL_ALLIANCE,
        name: 'Rebellenallianz',
        isSelectable: true,
        playerCount: 12,
      },
    ]);
  });

  it('allows an admin to change faction selectability', async () => {
    apiMocks.patch.mockResolvedValue({
      id: 1,
      key: Faction.REBEL_ALLIANCE,
      name: 'Rebellenallianz',
      isSelectable: false,
      playerCount: 12,
    });
    render(
      <MemoryRouter>
        <AdminFactionsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('checkbox'));

    await waitFor(() => {
      expect(apiMocks.patch).toHaveBeenCalledWith('/factions/1/selectability', {
        isSelectable: false,
      });
    });
    expect(await screen.findByText('Nicht wählbar')).toBeTruthy();
  });
});
