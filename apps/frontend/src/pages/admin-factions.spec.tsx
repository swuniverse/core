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
        playerLimit: 0,
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

  it('saves a player limit and rejects negative values', async () => {
    apiMocks.patch.mockResolvedValue({ id: 1, playerLimit: 20 });
    render(
      <MemoryRouter>
        <AdminFactionsPage />
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText('Spielerlimit Rebellenallianz');
    fireEvent.change(input, { target: { value: '-1' } });
    fireEvent.blur(input);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(apiMocks.patch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(apiMocks.patch).toHaveBeenCalledWith('/factions/1/player-limit', {
        playerLimit: 20,
      });
    });
    expect(screen.getByText('12')).toBeTruthy();
  });
});
