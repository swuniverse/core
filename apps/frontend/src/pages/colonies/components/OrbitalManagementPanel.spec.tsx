import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OrbitalManagementPanel } from './OrbitalManagementPanel';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../services/api', () => ({ api: apiMocks }));

const reactor = {
  fuel: { current: 5, max: 10 },
  profile: { label: 'Fusion', loadUnits: 1, costs: [] },
};

describe('OrbitalManagementPanel foreign ships', () => {
  it('groups by fleet and owner and offers crew only on own ships', async () => {
    apiMocks.get.mockResolvedValue({
      colony: { energy: 50, energyMax: 100, storage: [] },
      ships: [
        {
          id: 1, name: 'Eigen', shipClassId: 1, foreign: false, ownerName: 'Ich', fleetId: null, fleetName: null,
          crew: { current: 3, max: 5, minimum: 1 }, battery: { current: 2, max: 20 }, reactor,
          torpedoes: null, cargo: { used: 0, max: 10 }, shieldsActive: false, hyperdriveActive: false,
        },
        {
          id: 2, name: 'Fremd', shipClassId: 1, foreign: true, ownerName: 'Rivale', fleetId: 9, fleetName: 'Rot',
          crew: null, battery: { current: null, max: 20 }, reactor: { ...reactor, fuel: { current: null, max: 10 } },
          torpedoes: null, cargo: null, shieldsActive: true, hyperdriveActive: false,
        },
      ],
    });
    render(<OrbitalManagementPanel colonyId={1} />);

    expect(await screen.findByText('Einzelschiffe von Ich')).toBeTruthy();
    expect(screen.getByText('Rot von Rivale')).toBeTruthy();
    expect(screen.getByLabelText('Eigen Crew')).toBeTruthy();
    expect(screen.queryByLabelText('Fremd Crew')).toBeNull();
    expect(screen.getByText('Nur bei eigenen Schiffen')).toBeTruthy();
    expect(screen.getByText('?/20')).toBeTruthy();
    expect(screen.getByLabelText('Fremd Batterie')).toBeTruthy();
  });
});

describe('OrbitalManagementPanel supply and shuttles (STU management.twig)', () => {
  const own = {
    id: 1, name: 'Eigen', shipClassId: 1, shipClassKey: null, foreign: false, ownerName: 'Ich', fleetId: null, fleetName: null,
    crew: { current: 3, max: 5, minimum: 1 }, battery: { current: 2, max: 20 }, reactor,
    torpedoes: null, cargo: { used: 0, max: 10 }, shieldsActive: false, hyperdriveActive: false,
    possibleTorpedoTypes: [
      { id: 1, name: 'Photon', commodityId: 501, stock: 12 },
      { id: 2, name: 'Plasma', commodityId: 502, stock: 4 },
    ],
    shuttles: {
      capacity: 2,
      blockReason: null,
      items: [{ commodityId: 21401, name: 'Shuttle', ship: 0, colony: 3 }],
    },
  };

  it('shows the hull, colony torpedo reserves and picks the torpedo type from a list', async () => {
    apiMocks.get.mockResolvedValue({ colony: { energy: 50, energyMax: 100, storage: [] }, ships: [own] });
    apiMocks.post.mockResolvedValue({ results: [] });
    render(<OrbitalManagementPanel colonyId={1} />);

    expect((await screen.findByAltText('Rumpf Eigen')).getAttribute('src')).toContain('/ships/1.png');
    expect(screen.getByText('Photon (12 im Lager)')).toBeTruthy();
    expect(screen.getByText('Plasma (4 im Lager)')).toBeTruthy();
    expect(screen.queryByText('Shuttle-Transfer')).toBeNull();

    fireEvent.change(screen.getByLabelText('Eigen Torpedotyp'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Eigen Torpedomenge'), { target: { value: '3' } });
    fireEvent.click(screen.getByLabelText('Eigen auswählen'));
    fireEvent.click(screen.getByRole('button', { name: 'Ausführen' }));
    await waitFor(() =>
      expect(apiMocks.post).toHaveBeenCalledWith('/colonies/1/orbital-management', {
        ships: [expect.objectContaining({ shipId: 1, torpedoTypeId: 2, torpedoLoad: 3 })],
      }),
    );
  });

  it('transfers shuttles between colony and ship within the ramp capacity', async () => {
    apiMocks.get.mockResolvedValue({ colony: { energy: 50, energyMax: 100, storage: [] }, ships: [own] });
    const onTransferShuttles = vi.fn(async () => undefined);
    render(<OrbitalManagementPanel colonyId={1} onTransferShuttles={onTransferShuttles} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Shuttle-Management öffnen' }));
    const input = screen.getByLabelText('Shuttle auf dem Schiff');
    fireEvent.change(input, { target: { value: '3' } });
    expect(screen.getByText('Summe: 3/2')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Transfer starten' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transfer starten' }));
    await waitFor(() =>
      expect(onTransferShuttles).toHaveBeenCalledWith(1, [{ commodityId: 21401, amount: 2 }]),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
