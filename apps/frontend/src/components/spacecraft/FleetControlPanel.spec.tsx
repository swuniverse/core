import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FleetControlPanel } from './FleetControlPanel';

const apiMocks = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('../../services/api', () => ({ api: apiMocks }));

const renderPanel = (
  props: Partial<Parameters<typeof FleetControlPanel>[0]> = {},
) =>
  render(
    <FleetControlPanel
      shipId={1}
      fleetId={4}
      fleetLeaderId={1}
      hasWarpdrive
      inSystem={false}
      onUpdate={vi.fn()}
      {...props}
    />,
  );

describe('FleetControlPanel', () => {
  beforeEach(() =>
    apiMocks.patch.mockReset().mockResolvedValue({ applied: [], failed: [] }),
  );

  it('shows nothing for a member or a ship without fleet like STU', () => {
    expect(renderPanel({ shipId: 2 }).container.innerHTML).toBe('');
    expect(
      renderPanel({ fleetId: null, fleetLeaderId: null }).container.innerHTML,
    ).toBe('');
  });

  it('offers six activations, six deactivations and three alert levels to the leader', () => {
    renderPanel();
    expect(
      screen.getAllByRole('button', { name: / aktivieren$/ }),
    ).toHaveLength(6);
    expect(
      screen.getAllByRole('button', { name: / deaktivieren$/ }),
    ).toHaveLength(6);
    expect(
      screen.getAllByRole('button', { name: /^Flotte: Alarmstufe/ }),
    ).toHaveLength(3);
  });

  it.each([
    ['in a system', { inSystem: true }],
    ['without a hyperdrive', { hasWarpdrive: false }],
  ])(
    'hides the hyperdrive activation %s (STU isWarpPossible)',
    (_label, props) => {
      renderPanel(props);
      expect(
        screen.queryByRole('button', { name: 'Hyperantrieb aktivieren' }),
      ).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Hyperantrieb deaktivieren' }),
      ).toBeTruthy();
    },
  );

  it('switches a system for the fleet and lists per-ship failures', async () => {
    const onUpdate = vi.fn();
    apiMocks.patch.mockResolvedValue({
      applied: [],
      failed: [{ shipId: 2, shipName: 'Antares', reason: 'Keine Energie' }],
    });
    renderPanel({ onUpdate });

    fireEvent.click(screen.getByRole('button', { name: 'Schilde aktivieren' }));

    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/4/systems/SHIELDS',
        { active: true },
      ),
    );
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Antares: Keine Energie',
    );
    expect(onUpdate).toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Strahlenwaffen deaktivieren' }),
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/4/systems/WEAPONS',
        { active: false },
      ),
    );
  });

  it('sets the fleet alert level', async () => {
    renderPanel();
    fireEvent.click(
      screen.getByRole('button', { name: 'Flotte: Alarmstufe Rot' }),
    );
    await waitFor(() =>
      expect(apiMocks.patch).toHaveBeenCalledWith(
        '/spacecraft/fleets/4/alert-state',
        { alertState: 'RED' },
      ),
    );
  });
});
