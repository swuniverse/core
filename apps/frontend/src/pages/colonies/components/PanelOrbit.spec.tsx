import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanelOrbit } from './PanelOrbit';

vi.mock('../../../components/spacecraft/TransferDialog', () => ({
  TransferDialog: ({ direction }: { direction: string }) => (
    <div>Transfer {direction}</div>
  ),
}));

function renderPanel(foreignOrbitShips: Parameters<typeof PanelOrbit>[0]['foreignOrbitShips'] = []) {
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
          },
        ]}
        foreignOrbitShips={foreignOrbitShips}
        commodityMap={{}}
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
    expect(screen.getByText('Transfer TO_COLONY')).toBeTruthy();

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

  it('blocks beaming once a foreign ship is selected', () => {
    renderPanel([rival]);
    fireEvent.click(screen.getByRole('button', { name: 'Schiffe auswählen' }));
    fireEvent.click(screen.getByText('Nemesis').closest('button')!);
    const unload = screen.getByRole('button', { name: 'Entladen' });
    expect((unload as HTMLButtonElement).disabled).toBe(true);
    expect(unload.getAttribute('title')).toContain('fremden Schiffen');
    expect((screen.getByRole('button', { name: 'Verladen' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

