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

    expect(
      screen.getByText(/Material wird je Reparaturschritt verbraucht/),
    ).toBeTruthy();
    expect(screen.getByText(/fehlende Ersatzteile pausieren/)).toBeTruthy();
  });
});

describe('PanelShipyard EPS cost and function occupation', () => {
  const shipClass = {
    id: 1,
    key: 'TEST_CORVETTE',
    name: 'Test Corvette',
    category: 'CORVETTE',
    unlocked: true,
    crewMin: 0,
    crewMax: 2,
    hullBase: 10,
    shieldBase: 5,
    cargoCapacity: 1,
    allowedBuildingFunctionIds: [6],
  };
  const shipyard = {
    unlocked: true,
    completed: true,
    inProgress: false,
    buildingId: 85130100,
    buildingName: 'Korvettenwerft',
    presentFunctionIds: [6],
    activeFunctionIds: [6],
    repairPresentFunctionIds: [],
    repairActiveFunctionIds: [],
    slotRules: [],
    shipClassLayouts: [
      {
        shipClassId: 1,
        inUseCount: 3,
        buildplanCount: 2,
        imageKey: 'x',
        layoutKey: 'x',
        slots: [],
        stuRumpId: 6501,
        baseStats: {
          moduleLevel: 3,
          baseCrew: 1,
          baseEvadeChance: 0,
          baseHull: 10,
          baseShield: 0,
          baseDamage: 0,
          baseSensorRange: 0,
          baseWarpdrive: 0,
          baseEps: 10,
          baseReactor: 10,
          epsCost: 50,
        },
      },
    ],
  };
  const queueJob = (overrides: Record<string, unknown>) => ({
    id: 3,
    shipClassId: 1,
    name: 'Bauauftrag',
    mode: 'BUILD',
    buildingFunctionId: 6,
    buildPlanName: null,
    moduleSelections: [],
    moduleTypes: [],
    finishesAt: '2026-10-30T12:00:00.000Z',
    status: 'QUEUED',
    ...overrides,
  });
  const renderPanel = (
    queue: unknown[],
    onBuildShip = vi.fn(),
    availableEnergy = 20,
    orbitShips: unknown[] = [],
    onDisassembleShip = noop,
  ) =>
    render(
      <PanelShipyard
        shipyard={shipyard as never}
        shipClasses={[shipClass as never]}
        queue={queue as never}
        availableModules={[]}
        slotRules={[]}
        availableCrew={0}
        availableEnergy={availableEnergy}
        commodityMap={{}}
        orbitShips={orbitShips as never}
        buildplans={[]}
        onBuildShip={onBuildShip}
        onDisassembleShip={onDisassembleShip}
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
  const openDesigner = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffbau/ }));
    fireEvent.click(screen.getByRole('button', { name: /Test Corvette/ }));
  };

  it('previews recovered supplies and confirms before disassembly', () => {
    const disassemble = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel(
      [],
      vi.fn(),
      50,
      [
        {
          id: 8,
          name: 'Alpha',
          shipClassId: 1,
          canDisassemble: true,
          crew: 1,
          crewMax: 2,
          disassemblyReturns: {
            reactorFuel: [{ commodityId: 5, amount: 2 }],
            torpedoes: [{ commodityId: 81, amount: 3 }],
          },
        },
      ],
      disassemble,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffdemontage/ }));
    expect(screen.getByText(/einige eingebaute Module/i)).toBeTruthy();
    expect(screen.getByText(/Reaktorladung: 2/)).toBeTruthy();
    expect(screen.getByText(/Torpedos: 3/)).toBeTruthy();
    expect(screen.getByText(/freien Lagerplatz/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(disassemble).not.toHaveBeenCalled();
    expect(confirm.mock.calls[0][0]).toContain('Reaktorladung: 2');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
    expect(disassemble).toHaveBeenCalledWith(8);
    confirm.mockRestore();
  });

  it('shows EPS cost against available energy and sends the selected function', () => {
    const onBuildShip = vi.fn();
    renderPanel([], onBuildShip);

    openDesigner();

    expect(screen.getByText(/EPS-Kosten 50 \(vorhanden 20\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));
    expect(onBuildShip).toHaveBeenCalledWith(
      1,
      'Test Corvette',
      expect.anything(),
      expect.anything(),
      6,
    );
  });

  it('shows hull image, German type, counters and German labels on the hull tile', () => {
    renderPanel([]);
    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffbau/ }));

    const tile = screen.getByRole('button', { name: /Test Corvette/ });
    expect(tile.querySelector('img')?.getAttribute('src')).toMatch(
      /\/ships\/.+/,
    );
    const text = tile.textContent ?? '';
    expect(text).toContain('Typ: Korvette');
    expect(text).toContain('Hülle 10');
    expect(text).toContain('Schilde 5');
    expect(text).toContain('Laderaum 1');
    expect(text).toContain('Im Einsatz: 3');
    expect(text).toContain('Baupläne: 2');
    expect(text).not.toMatch(/Hull|Shields|Cargo/);
  });

  it('marks a function with an active build or retrofit job as occupied', () => {
    renderPanel([queueJob({ mode: 'RETROFIT', name: 'Umrüstung: Alpha' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));

    expect(screen.getByText(/Belegt: Umrüstung/)).toBeTruthy();
  });

  it('ignores repair jobs and unbound legacy jobs for the occupation', () => {
    renderPanel([
      queueJob({ mode: 'REPAIR', id: 4 }),
      queueJob({ buildingFunctionId: null, id: 5 }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));

    expect(screen.getByText(/Frei: ein Bau- oder Umrüstauftrag/)).toBeTruthy();
  });
});
