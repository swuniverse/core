import { fireEvent, render, screen } from '@testing-library/react';
import { ShipQuickActions } from './ShipQuickActions';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
const props = {
  shipId: 7,
  onRefresh: vi.fn(),
  onInfo: vi.fn(),
  standby: false,
  onNavigation: vi.fn(),
  onSensors: vi.fn(),
};
describe('Last combat report in ship actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('hides the icon without a saved report and performs no lookup', () => {
    render(<ShipQuickActions {...props} />);
    expect(
      screen.queryByRole('button', { name: 'Letzten Kampfbericht öffnen' }),
    ).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('reopens the persisted report and closes the existing dialog', async () => {
    mocks.get.mockResolvedValue({
      parties: { attacker: [], defender: [] },
      rounds: [
        {
          number: 1,
          lines: [{ kind: 'hit', text: 'Falke trifft.', emphasis: 'neutral' }],
        },
      ],
      outcome: { winner: 'draw', destroyedShipIds: [] },
    });
    render(<ShipQuickActions {...props} hasLastCombatReport />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Letzten Kampfbericht öffnen' }),
    );
    await screen.findByRole('dialog', { name: 'Kampfbericht' });
    expect(screen.getByText('Falke trifft.')).toBeTruthy();
    expect(mocks.get).toHaveBeenCalledWith('/spacecraft/7/last-combat-report');
    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows report lookup failures without opening an empty dialog', async () => {
    mocks.get.mockRejectedValue(new Error('Kein Kampfbericht verfügbar'));
    render(<ShipQuickActions {...props} hasLastCombatReport />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Letzten Kampfbericht öffnen' }),
    );
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Kein Kampfbericht verfügbar',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
