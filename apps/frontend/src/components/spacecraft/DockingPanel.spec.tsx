import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { SpacecraftDetailDto } from '@swuniverse/shared';
import { DockingPanel } from './DockingPanel';

const apiMocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const base = { id: 2, name: 'Falke' } as SpacecraftDetailDto;

function renderPanel(ship: Partial<SpacecraftDetailDto>, onChanged = vi.fn()) {
  render(
    <MemoryRouter>
      <DockingPanel ship={{ ...base, ...ship } as SpacecraftDetailDto} onChanged={onChanged} />
    </MemoryRouter>,
  );
  return onChanged;
}

describe('DockingPanel', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  it('renders nothing for an undocked ship', () => {
    renderPanel({ kind: 'SHIP', dockedAtId: null });
    expect(screen.queryByText('Angedockt')).toBeNull();
  });

  it('lets a docked ship undock', async () => {
    apiMocks.post.mockResolvedValue({ message: 'Abdockvorgang abgeschlossen', shipIds: [2] });
    const onChanged = renderPanel({ kind: 'SHIP', dockedAtId: 9, dockedAtName: 'Hoth-Depot' });
    expect(screen.getByText('Hoth-Depot')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Abdocken/ }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/undock', {}));
    expect(await screen.findByText('Abdockvorgang abgeschlossen')).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
  });

  it('lists the per-ship result of a fleet undock', async () => {
    apiMocks.post.mockResolvedValue({
      message: 'Flottenbefehl ausgeführt: Abdocken von Hoth-Depot',
      shipIds: [2],
      ships: [
        { shipId: 2, name: 'Falke', status: 'undocked', reason: null },
        { shipId: 3, name: 'Adler', status: 'skipped', reason: 'Nicht genügend Crew vorhanden' },
        { shipId: 4, name: 'Kondor', status: 'aborted', reason: 'Nicht genügend Energie vorhanden' },
      ],
    });
    renderPanel({ kind: 'SHIP', dockedAtId: 9, dockedAtName: 'Hoth-Depot' });
    fireEvent.click(screen.getByRole('button', { name: /Abdocken/ }));
    const list = await screen.findByRole('list', { name: 'Ergebnis je Schiff' });
    expect(list.textContent).toContain('Falke: abgedockt');
    expect(list.textContent).toContain('Adler: übersprungen – Nicht genügend Crew vorhanden');
    expect(list.textContent).toContain('Kondor: abgebrochen – Nicht genügend Energie vorhanden');
  });

  it('lets a station undock one or all ships', async () => {
    apiMocks.post.mockResolvedValue({ message: 'ok', shipIds: [] });
    renderPanel({
      kind: 'STATION',
      dockCapacity: 2,
      dockedShips: [
        { id: 5, name: 'Adler', shipClassId: 1, shipClassName: 'Korvette', hull: 5, hullMax: 10 },
      ],
    });
    expect(screen.getByRole('heading', { name: /Angedockte Schiffe/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Adler abdocken' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/docked/5/undock', {}),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Alle abdocken' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/spacecraft/2/docked/undock-all', {}),
    );
  });

  it('opens the beam dialog for a docked ship from the station', async () => {
    apiMocks.get.mockResolvedValue({ sourceCargo: [], targetCargo: [] });
    renderPanel({
      kind: 'STATION',
      dockCapacity: 2,
      dockedShips: [
        { id: 5, name: 'Adler', shipClassId: 1, shipClassName: 'Korvette', hull: 5, hullMax: 10 },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fracht an Adler beamen' }));
    expect(await screen.findByRole('dialog', { name: 'Fracht an Adler übergeben' })).toBeTruthy();
    await waitFor(() =>
      expect(apiMocks.get).toHaveBeenCalledWith(
        '/spacecraft/2/cargo/ship-transfer-quote?targetShipId=5&direction=TO_TARGET',
      ),
    );
  });

  it('shows the backend error', async () => {
    apiMocks.post.mockImplementation(() => Promise.reject(new Error('Zum Abdocken wird 1 Energie benötigt')));
    renderPanel({ kind: 'SHIP', dockedAtId: 9, dockedAtName: 'Depot' });
    fireEvent.click(screen.getByRole('button', { name: /Abdocken/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('1 Energie');
  });
});
