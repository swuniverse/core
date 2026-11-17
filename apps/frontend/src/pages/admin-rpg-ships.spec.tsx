import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminRpgShipsPage } from './admin-rpg-ships';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: mocks }));
const ship = {
  id: 12,
  name: 'Szenenschiff',
  plotId: null,
  plotTitle: null,
  hidden: false,
  shipClassId: 4,
  location: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation((path) =>
    Promise.resolve(
      path.endsWith('/plots') ? [{ id: 8, title: 'RPG-Szene' }] : [ship],
    ),
  );
});
it('assigns an own RPG plot, hides the ship, and reveals it on removal using only admin endpoints', async () => {
  mocks.put.mockResolvedValue({ ...ship, plotId: 8, plotTitle: 'RPG-Szene' });
  mocks.patch.mockResolvedValue({
    ...ship,
    plotId: 8,
    plotTitle: 'RPG-Szene',
    hidden: true,
  });
  mocks.delete.mockResolvedValue(ship);
  render(<AdminRpgShipsPage />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Transponder zuordnen' }),
  );
  await waitFor(() =>
    expect(mocks.put).toHaveBeenCalledWith(
      '/spacecraft/admin/rpg/12/transponder',
      { plotId: 8 },
    ),
  );
  await screen.findByText(/Für Spieler sichtbar · RPG-Szene/);
  fireEvent.click(screen.getByRole('button', { name: 'Ausblenden' }));
  await screen.findByRole('button', { name: 'Einblenden' });
  expect(mocks.patch).toHaveBeenCalledWith(
    '/spacecraft/admin/rpg/12/visibility',
    { hidden: true },
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Transponder entfernen' }),
  );
  await screen.findByText(/Für Spieler sichtbar · Kein RPG-Transponder/);
  expect(mocks.delete).toHaveBeenCalledWith(
    '/spacecraft/admin/rpg/12/transponder',
  );
  expect(
    mocks.get.mock.calls.every(([path]) =>
      path.startsWith('/spacecraft/admin/rpg'),
    ),
  ).toBe(true);
});
it('retains the state when the server rejects hiding and displays the reason', async () => {
  mocks.get.mockImplementation((path) =>
    Promise.resolve(
      path.endsWith('/plots')
        ? []
        : [{ ...ship, plotId: 8, plotTitle: 'RPG-Szene' }],
    ),
  );
  mocks.patch.mockRejectedValue(
    new Error('Nur freie Szenenschiffe können ausgeblendet werden'),
  );
  render(<AdminRpgShipsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ausblenden' }));
  expect((await screen.findByRole('alert')).textContent).toContain(
    'Nur freie Szenenschiffe',
  );
  expect(screen.getByText(/Für Spieler sichtbar · RPG-Szene/)).toBeTruthy();
});
it('disables assignment when there is no own active plot', async () => {
  mocks.get.mockImplementation((path) =>
    Promise.resolve(path.endsWith('/plots') ? [] : [ship]),
  );
  render(<AdminRpgShipsPage />);
  const button = await screen.findByRole('button', {
    name: 'Transponder zuordnen',
  });
  expect((button as HTMLButtonElement).disabled).toBe(true);
});
