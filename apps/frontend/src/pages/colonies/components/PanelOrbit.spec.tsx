import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanelOrbit } from './PanelOrbit';

vi.mock('../../../components/spacecraft/TransferDialog', () => ({
  TransferDialog: ({
    direction,
    shipId,
    initiator,
    crewTransfer,
  }: {
    direction: string;
    shipId: number;
    initiator?: string;
    crewTransfer?: boolean;
  }) => (
    <div>
      {`Transfer ${direction} ship ${shipId} ${initiator} crew ${crewTransfer === false ? 'no' : 'yes'}`}
    </div>
  ),
}));

function renderPanel(
  foreignOrbitShips: Parameters<typeof PanelOrbit>[0]['foreignOrbitShips'] = [],
  shipOverrides: Record<string, unknown> = {},
) {
  const handlers = {
    onDisassembleShip: vi.fn(),
    onDefendShip: vi.fn(),
    onBlockadeShip: vi.fn(),
    onClearOrbitOrder: vi.fn(),
    onTransferShuttles: vi.fn(),
  };
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
            warpdrive: 8,
            warpdriveMax: 20,
            crew: 0,
            crewRequired: 0,
            crewMax: 0,
            hasEnoughCrew: true,
            canManage: true,
            canLand: true,
            ...shipOverrides,
          },
        ]}
        foreignOrbitShips={foreignOrbitShips}
        commodityMap={{}}
        {...handlers}
        compact
        onOpenManagement={vi.fn()}
      />
    </MemoryRouter>,
  );
  return handlers;
}

describe('PanelOrbit landing', () => {
  it('does not offer landing in the colony orbit action bar', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: /Landen/ })).toBeNull();
  });

  it('shows STU orbit actions and all four runtime status bars', () => {
    renderPanel();

    expect(screen.getByText('Hülle')).toBeTruthy();
    expect(screen.getByText('Schilde')).toBeTruthy();
    expect(screen.getByText('EPS')).toBeTruthy();
    expect(screen.getByText('Hyperantrieb')).toBeTruthy();
    expect(screen.getByText('8/20')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Entladen' }));
    expect(screen.getByText('Transfer TO_COLONY ship 7 COLONY crew yes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Schiffe auswählen' }));
    const selector = screen.getByRole('dialog', {
      name: 'Schiffe im Orbit auswählen',
    });
    expect(selector).toBeTruthy();
    expect(screen.getAllByText('Hülle')).toHaveLength(2);
    expect(screen.getAllByText('Schilde')).toHaveLength(2);
    expect(screen.getAllByText('EPS')).toHaveLength(2);
    expect(screen.getAllByText('Hyperantrieb')).toHaveLength(2);
  });
});

describe('PanelOrbit foreign ships (STU OrbitShipWrappersRetriever)', () => {
  const rival = {
    id: 8,
    name: 'Nemesis',
    shipClassId: 2,
    shipClassKey: null,
    shipClassName: 'Korvette',
    ownerId: 2,
    ownerName: 'Rivale',
    fleetId: 9,
    fleetName: 'Rot',
  };

  it('groups foreign ships by fleet with their owner and hides their state', () => {
    renderPanel([rival]);
    fireEvent.click(screen.getByRole('button', { name: 'Schiffe auswählen' }));
    expect(screen.getByText('Rot von Rivale')).toBeTruthy();
    expect(screen.getByText('Nemesis')).toBeTruthy();
    expect(screen.getByText('Korvette')).toBeTruthy();
    // Only the own ship shows hull and shields.
    expect(screen.getAllByText('Hülle')).toHaveLength(2);
  });

  it('beams with a selected foreign ship as the colony, without crew transfer', () => {
    renderPanel([rival]);
    fireEvent.click(screen.getByRole('button', { name: 'Schiffe auswählen' }));
    fireEvent.click(screen.getByText('Nemesis').closest('button')!);
    const unload = screen.getByRole('button', { name: 'Entladen' });
    expect((unload as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(unload);
    expect(screen.getByText('Transfer TO_COLONY ship 8 COLONY crew no')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Verladen' }));
    expect(screen.getByText('Transfer TO_SHIP ship 8 COLONY crew no')).toBeTruthy();
  });
});

describe('PanelOrbit actions for own ships', () => {
  it('starts defend and blockade orders and offers disassembly after confirmation', () => {
    const handlers = renderPanel([], { canDefend: true, canBlock: false, canDisassemble: true });
    fireEvent.click(screen.getByRole('button', { name: 'Verteidigen' }));
    expect(handlers.onDefendShip).toHaveBeenCalledWith(7);
    expect((screen.getByRole('button', { name: 'Blockieren' }) as HTMLButtonElement).disabled).toBe(true);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(handlers.onDisassembleShip).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(handlers.onDisassembleShip).toHaveBeenCalledWith(7);
    confirm.mockRestore();
  });

  it('ends a running orbit order', () => {
    const handlers = renderPanel([], {
      orbitAssignment: { id: 1, mode: 'BLOCKADE', fleetId: 3 },
    });
    expect(screen.queryByRole('button', { name: 'Verteidigen' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Blockade beenden' }));
    expect(handlers.onClearOrbitOrder).toHaveBeenCalledWith(7);
  });
});
