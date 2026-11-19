import { render, screen } from '@testing-library/react';
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
