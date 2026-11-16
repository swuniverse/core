import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AllianceRole } from '@swuniverse/shared';
import { AllianceDepotsPanel } from './AllianceDepotsPanel';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../services/api', () => ({ api: mocks }));
describe('AllianceDepotsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue([]);
  });
  it('shows owner, position and stock for leaders and allows refresh', async () => {
    mocks.get.mockResolvedValue([
      {
        stationId: 7,
        name: 'Versorgungsdepot',
        owner: { id: 2, name: 'Besitzer' },
        locationLabel: 'Basis (2|3)',
        cargoUsed: 9,
        cargoMax: 100,
        cargo: [{ commodityId: 5, name: 'Tibanna-Gas', amount: 9 }],
      },
    ]);
    render(<AllianceDepotsPanel allianceId={3} role={AllianceRole.VICE} />);
    await screen.findByText('Besitzer: Besitzer');
    expect(screen.getByText('Standort: Basis (2|3)')).toBeTruthy();
    expect(screen.getByText('Tibanna-Gas: 9')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Depots aktualisieren' }),
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  });
  it.each([AllianceRole.NONE, AllianceRole.DIPLOMAT, null])(
    'does not fetch or show stocks for role %s',
    (role) => {
      const { container } = render(
        <AllianceDepotsPanel allianceId={3} role={role} />,
      );
      expect(container.textContent).toBe('');
      expect(mocks.get).not.toHaveBeenCalled();
    },
  );
  it('removes cached stock when the office is lost and handles empty data', async () => {
    const view = render(
      <AllianceDepotsPanel allianceId={3} role={AllianceRole.PRESIDENT} />,
    );
    await screen.findByText('Keine Depotstationen zugeordnet.');
    view.rerender(
      <AllianceDepotsPanel allianceId={3} role={AllianceRole.NONE} />,
    );
    expect(screen.queryByText('Allianzdepots')).toBeNull();
  });
});
