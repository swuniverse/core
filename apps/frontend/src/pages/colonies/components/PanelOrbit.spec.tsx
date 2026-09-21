import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanelOrbit } from './PanelOrbit';

vi.mock('../../../components/spacecraft/TransferDialog', () => ({
  TransferDialog: () => null,
}));

function renderPanel(
  canLand: boolean,
  onLandShip: (shipId: number) => Promise<void> | void = vi.fn(),
) {
  render(
    <MemoryRouter>
      <PanelOrbit
        colonyId={1}
        orbitShips={[
          {
            id: 7,
            name: 'Icarus',
            shipClassId: 1,
            status: 'IDLE',
            hull: 100,
            hullMax: 100,
            shields: 50,
            shieldsMax: 50,
            energy: 60,
            energyMax: 60,
            crew: 0,
            crewRequired: 0,
            crewMax: 0,
            hasEnoughCrew: true,
            canManage: true,
            canLand,
          },
        ]}
        commodityMap={{}}
        onLandShip={onLandShip}
        onDisassembleShip={vi.fn()}
        onDefendShip={vi.fn()}
        onBlockadeShip={vi.fn()}
        onClearOrbitOrder={vi.fn()}
        onTransferShuttles={vi.fn()}
        compact
        onOpenManagement={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('PanelOrbit landing', () => {
  it('lands an eligible selected ship from the orbit action bar', async () => {
    const onLandShip = vi.fn(async () => undefined);
    renderPanel(true, onLandShip);

    fireEvent.click(screen.getByRole('button', { name: /Landen/ }));

    await waitFor(() => expect(onLandShip).toHaveBeenCalledWith(7));
  });

  it('hides landing when the selected ship is not eligible', () => {
    renderPanel(false);
    expect(screen.queryByRole('button', { name: /Landen/ })).toBeNull();
  });

  it('shows landing errors without closing the orbit panel', async () => {
    renderPanel(true, async () => {
      throw new Error('Nicht genug Lagerraum');
    });

    fireEvent.click(screen.getByRole('button', { name: /Landen/ }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Nicht genug Lagerraum',
    );
  });
});
