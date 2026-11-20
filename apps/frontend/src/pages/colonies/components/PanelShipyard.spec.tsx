import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    yard: Record<string, unknown> = shipyard,
  ) =>
    render(
      <PanelShipyard
        shipyard={yard as never}
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

  describe('disassembly like STU (col-AUD-14)', () => {
    const alpha = (lostCargo: unknown[]) => ({
      id: 8,
      name: 'Alpha',
      shipClassId: 1,
      canDisassemble: true,
      crew: 1,
      crewMax: 2,
      disassemblyReturns: { reactorFuel: [], torpedoes: [], lostCargo },
    });

    it('warns that the cargo is destroyed and repeats it in the confirmation', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderPanel([], vi.fn(), 50, [alpha([{ commodityId: 2, amount: 4 }])]);
      fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
      fireEvent.click(screen.getByRole('button', { name: /Schiffdemontage/ }));
      expect(screen.getByRole('alert').textContent).toContain(
        'Die Fracht des Schiffs (4 Einheiten) geht bei der Demontage verloren: 4 Ware #2',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Demontieren' }));
      expect(confirm.mock.calls[0][0]).toContain('(4 Einheiten) geht bei der Demontage verloren');
      confirm.mockRestore();
    });

    it('shows no cargo warning for an empty hold', () => {
      renderPanel([], vi.fn(), 50, [alpha([])]);
      fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
      fireEvent.click(screen.getByRole('button', { name: /Schiffdemontage/ }));
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('opens a deactivated shipyard for disassembly only', () => {
      renderPanel([], vi.fn(), 50, [alpha([])], noop, {
        ...shipyard,
        activeFunctionIds: [],
      });
      fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
      const disabled = (name: RegExp) =>
        (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;
      expect(disabled(/Schiffbau/)).toBe(true);
      expect(disabled(/Schiffsreparatur/)).toBe(true);
      expect(disabled(/Schiffsumrüstung/)).toBe(true);
      expect(disabled(/Schiffdemontage/)).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: /Schiffdemontage/ }));
      expect(screen.getByRole('button', { name: 'Demontieren' })).toBeTruthy();
    });
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

describe('PanelShipyard buildplan list and rename', () => {
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
        inUseCount: 0,
        buildplanCount: 1,
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
  const plan = (overrides: Record<string, unknown>) => ({
    id: 1,
    shipClassId: 1,
    name: 'Alpha-Plan',
    signature: 's',
    moduleSelections: [{ slotId: 'weapon_1', commodityId: 50 }],
    moduleCommodityIds: [50],
    moduleTypes: ['PHASER'],
    moduleNames: ['Phaser Mk1'],
    shipCount: 4,
    buildSeconds: 4500,
    crewRequired: 7,
    canDelete: true,
    ...overrides,
  });
  const renderPlans = (
    buildplans: unknown[],
    onRenameBuildplan: (
      id: number,
      name: string,
    ) => Promise<void> | void = noop,
  ) => {
    render(
      <PanelShipyard
        shipyard={shipyard as never}
        shipClasses={[shipClass as never]}
        queue={[]}
        availableModules={[]}
        slotRules={[]}
        availableCrew={0}
        commodityMap={{}}
        orbitShips={[]}
        buildplans={buildplans as never}
        onBuildShip={noop}
        onDisassembleShip={noop}
        onQueueShipRepair={noop}
        onQueueShipRetrofit={noop}
        onCancelShipyardQueue={noop}
        onReactivateShipyardQueue={noop}
        onCreateBuildplan={noop}
        onRenameBuildplan={onRenameBuildplan}
        onDeleteBuildplan={noop}
        onBuildFromBuildplan={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffbau/ }));
  };

  it('shows ship count, build time, crew and module per slot', () => {
    renderPlans([plan({})]);

    const text = screen.getByText('Alpha-Plan').closest('div')
      ?.parentElement?.textContent;
    expect(text).toContain('Test Corvette');
    expect(text).toContain('4 Schiffe');
    expect(text).toContain('Bauzeit 1h 15m');
    expect(text).toContain('Crew 7');
    expect(text).toContain('weapon_1: Phaser Mk1');
  });

  it('locks delete for a plan in use and keeps it for an unused plan', () => {
    renderPlans([
      plan({ canDelete: false }),
      plan({ id: 2, name: 'Beta-Plan', signature: 't' }),
    ]);

    expect(
      (
        screen.getByRole('button', {
          name: 'Bauplan Alpha-Plan löschen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'Bauplan Beta-Plan löschen',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it('renames a plan in the list and cancels without saving', async () => {
    const rename = vi.fn().mockResolvedValue(undefined);
    renderPlans([plan({})], rename);

    fireEvent.click(
      screen.getByRole('button', { name: 'Bauplan Alpha-Plan umbenennen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(rename).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Neuer Bauplanname')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Bauplan Alpha-Plan umbenennen' }),
    );
    fireEvent.change(screen.getByLabelText('Neuer Bauplanname'), {
      target: { value: '  Neuer Name ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(rename).toHaveBeenCalledWith(1, 'Neuer Name'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Neuer Bauplanname')).toBeNull(),
    );
  });

  it('shows the server error and keeps the form open when renaming fails', async () => {
    const rename = vi
      .fn()
      .mockRejectedValue(
        new Error('Ein Bauplan mit diesem Namen existiert bereits.'),
      );
    renderPlans([plan({})], rename);

    fireEvent.click(
      screen.getByRole('button', { name: 'Bauplan Alpha-Plan umbenennen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(
      await screen.findByText(
        'Ein Bauplan mit diesem Namen existiert bereits.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Neuer Bauplanname')).toBeTruthy();
  });

  it('renames from the editor of a saved plan', async () => {
    const rename = vi.fn().mockResolvedValue(undefined);
    renderPlans([plan({})], rename);

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten & Bauen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Name ändern' }));
    fireEvent.change(screen.getByLabelText('Neuer Bauplanname'), {
      target: { value: 'Editor-Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(rename).toHaveBeenCalledWith(1, 'Editor-Name'));
    expect(
      ((await screen.findByDisplayValue('Editor-Name')) as HTMLInputElement)
        .value,
    ).toBe('Editor-Name');
  });
});
