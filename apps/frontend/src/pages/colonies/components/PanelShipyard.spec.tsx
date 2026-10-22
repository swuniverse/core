import { fireEvent, render, screen } from '@testing-library/react';
import { PanelShipyard } from './PanelShipyard';

const noop = vi.fn();

describe('PanelShipyard passive repair', () => {
  it('explains per-step material use instead of upfront costs', () => {
    render(
      <PanelShipyard
        shipyard={{
          unlocked: true,
          completed: true,
          inProgress: false,
          buildingId: 85130100,
          buildingName: 'Korvettenwerft',
          presentFunctionIds: [6],
          activeFunctionIds: [6],
          repairPresentFunctionIds: [22],
          repairActiveFunctionIds: [22],
          slotRules: [],
          shipClassLayouts: [],
        }}
        shipClasses={[]}
        queue={[]}
        availableModules={[]}
        slotRules={[]}
        availableCrew={0}
        commodityMap={{}}
        orbitShips={[]}
        buildplans={[]}
        onBuildShip={noop}
        onDisassembleShip={noop}
        onQueueShipRepair={noop}
        onQueueShipRetrofit={noop}
        onCancelShipyardQueue={noop}
        onReactivateShipyardQueue={noop}
        onCreateBuildplan={noop}
        onRenameBuildplan={noop}
        onDeleteBuildplan={noop}
        onBuildFromBuildplan={noop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffsreparatur/ }));

    expect(screen.getByText(/Material wird je Reparaturschritt verbraucht/)).toBeTruthy();
    expect(screen.getByText(/fehlende Ersatzteile pausieren/)).toBeTruthy();
  });
});
