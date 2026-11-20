import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ColoniesPage } from './colonies/ColoniesPage';
import { useAuthStore } from '../stores/auth.store';
import type {
  BuildingDef,
  Colony,
  ColonyDetailV2,
  CommodityDef,
  ShipClassDef,
  TerraformingDef,
} from './colonies/types';

vi.mock('./colonies/components/ColonySandboxPanel', () => ({ ColonySandboxPanel: () => <div>Sandboxen zur Planung</div> }));

const colonyApiMocks = vi.hoisted(() => ({
  fetchCommodities: vi.fn(),
  fetchAvailableBuildings: vi.fn(),
  fetchAllBuildings: vi.fn(),
  fetchTerraforming: vi.fn(),
  fetchFieldCategories: vi.fn(),
  fetchShipClasses: vi.fn(),
  fetchColonies: vi.fn(),
  fetchColonyDetail: vi.fn(),
  fetchEnvironmentScan: vi.fn(),
  fetchBuildingRepairPreview: vi.fn(),
  repairBuilding: vi.fn(),
  repairDamagedBuildings: vi.fn(),
}));

const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: unknown) => void>(),
);

vi.mock('./colonies/api', () => ({
  colonyApi: colonyApiMocks,
}));

vi.mock('../hooks/use-socket', () => ({
  useSocket: (event?: string, handler?: (payload: unknown) => void) => {
    if (event && handler) socketHandlers.set(event, handler);
  },
}));

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../components/Toast', () => ({
  useToast: () => toastMock,
}));

const commodities = [
  { id: 1, name: 'Erz', nameShort: 'ERZ', isSaveable: true },
  { id: 1001, name: 'Ausbildungsgrad', nameShort: 'AUS', isSaveable: false },
] as CommodityDef[];
const availableBuildings = [
  {
    id: 101,
    name: 'Solarkollektor',
    description: 'Energie fuer die Kolonie.',
    category: 'ENERGY',
    costs: { buildTime: 60 },
    allowedFieldTypes: [1],
    isUnique: false,
    production: [],
    bonuses: { energy: 0, population: 0, storage: 0 },
  },
] as BuildingDef[];
const airfieldBuilding = {
  ...availableBuildings[0],
  id: 102,
  name: 'Raumhafen',
  functions: [4],
} as BuildingDef;
const allBuildings: BuildingDef[] = [...availableBuildings, airfieldBuilding];
const terraformingDefs: TerraformingDef[] = [];
const shipClasses: ShipClassDef[] = [];

function createDetail(
  energyCurrent: number,
  populationCurrent: number,
): ColonyDetailV2 {
  return {
    featureAccess: {
      tabs: {
        info: { visible: true },
        build: { visible: true },
        crew: { visible: false },
        buildingManagement: { visible: false },
        shipyard: { visible: false },
        fabrication: { visible: false },
        defense: { visible: false },
        hangar: { visible: false },
        events: { visible: false },
        settings: { visible: false },
      },
      functions: { present: [], active: [], groups: {} },
    },
    energy: { current: energyCurrent, max: 20, delta: 0 },
    storage: { current: 2, max: 10, delta: 0 },
    options: {
      name: 'Alpha',
      colonyMessage: null,
      populationLimit: 0,
      immigrationEnabled: true,
    },
    population: {
      current: populationCurrent,
      max: 30,
      growth: 0,
      workers: 0,
      available: 0,
      housing: 30,
      populationLimit: 0,
      immigrationEnabled: true,
    },
    inventory: [],
    productionDeltas: [],
    effects: [],
    research: { pointsPerTick: 0 },
    activeBuildJobs: [],
    orbitShips: [],
    social: {
      local: {
        primaryEffect: { commodityId: 1, name: 'A', value: 0 },
        secondaryEffect: { commodityId: 2, name: 'B', value: 0 },
        negativeEffect: 0,
        lifeStandard: {
          commodityId: 3,
          name: 'C',
          value: 0,
          absolute: 0,
          percent: 0,
        },
        generatedCrew: 0,
        workers: 0,
        population: 0,
      },
      global: {
        globalCrewLimit: 0,
        crewOnShips: 0,
        availableCrewOnColony: 0,
        inTraining: 0,
        trainableRemaining: 0,
      },
      calculatorDefaults: {
        primaryEffect: 0,
        secondaryEffect: 0,
        negativeEffect: 0,
        workers: 0,
        lifeStandardAbsolute: 0,
        population: 0,
        generatedCrew: 0,
      },
    },
    crew: {
      available: 0,
      assignedToColony: 0,
      inTraining: 0,
      localLimit: 0,
      globalLimit: 0,
      remainingGlobal: 0,
      trainableNow: 0,
      trainingQueue: [],
    },
    shipBuildQueue: [],
    shipyardQueue: [],
    availableShipModules: [],
    buildplans: [],
    activeFabricationFunctionIds: [],
    fabricationCatalog: [],
    fabricationQueue: [],
    shipyard: {
      unlocked: false,
      completed: false,
      inProgress: false,
      buildingId: 0,
      buildingName: '',
      fighterPresentFunctionIds: [],
      fighterActiveFunctionIds: [],
      presentFunctionIds: [],
      activeFunctionIds: [],
      repairPresentFunctionIds: [],
      repairActiveFunctionIds: [],
      slotRules: [],
      shipClassLayouts: [],
    },
  };
}

function createColony(
  id: number,
  name: string,
  energy: number,
  population: number,
): Colony {
  return {
    id,
    name,
    energy,
    energyMax: 20,
    population,
    populationMax: 30,
    storageUsed: 2,
    storageMax: 10,
    locationLabel: `${name} System`,
    fields: [],
    storage: [],
    detailV2: createDetail(energy, population),
    celestialObject: { name, description: null, classId: 1 },
  };
}

function emitSocket(event: string, payload: unknown) {
  socketHandlers.get(event)?.(payload);
}

function createAirfieldColony(active: boolean): Colony {
  const colony = createColony(1, 'Alpha', 5, 10);
  colony.fields = [
    {
      id: 1,
      fieldIndex: 1,
      fieldType: 1,
      terrainTileId: null,
      layer: 'SURFACE',
      buildingId: airfieldBuilding.id,
      isBuilding: false,
      isActive: active,
      buildProgress: 100,
      buildFinishesAt: null,
      availableUpgrades: [],
    },
  ];
  const detail = colony.detailV2;
  if (!detail?.featureAccess) throw new Error('feature access fixture missing');
  detail.featureAccess.functions.groups.airfield = {
    presentFunctionIds: [4],
    activeFunctionIds: active ? [4] : [],
  };
  detail.hangar = {
    hasAirfield: active,
    hasFighterShipyard: false,
    inventory: [],
    buildable: [],
    startable: [],
    landableOrbitShips: [],
  };
  return colony;
}

function createDamagedAirfieldColony(integrity: number, energy: number, stock: number): Colony {
  const colony = createAirfieldColony(false);
  const field = colony.fields![0];
  field.fieldIndex = 9;
  field.id = 9;
  field.integrity = integrity;
  field.maxIntegrity = 100;
  colony.fields = [field];
  colony.energy = energy;
  colony.detailV2!.energy.current = energy;
  colony.storage = [{ id: 1, commodityId: 1, amount: stock }];
  return colony;
}

describe('ColoniesPage socket refresh', () => {
  beforeEach(() => {
    socketHandlers.clear();
    for (const mock of Object.values(colonyApiMocks)) {
      mock.mockReset();
    }

    colonyApiMocks.fetchCommodities.mockResolvedValue(commodities);
    colonyApiMocks.fetchAvailableBuildings.mockResolvedValue(
      availableBuildings,
    );
    colonyApiMocks.fetchAllBuildings.mockResolvedValue(allBuildings);
    colonyApiMocks.fetchTerraforming.mockResolvedValue(terraformingDefs);
    colonyApiMocks.fetchFieldCategories.mockResolvedValue({
      tiles: {},
      anyCategories: [],
    });
    colonyApiMocks.fetchShipClasses.mockResolvedValue(shipClasses);
    colonyApiMocks.fetchEnvironmentScan.mockResolvedValue(null);
    colonyApiMocks.fetchBuildingRepairPreview.mockResolvedValue({
      fields: [],
      totalEnergyCost: 0,
      totalCosts: [],
    });
    colonyApiMocks.repairBuilding.mockResolvedValue({});
    colonyApiMocks.repairDamagedBuildings.mockResolvedValue({
      action: 'REPAIR',
      repaired: [],
      skipped: [],
      totalEnergyCost: 0,
      totalCosts: [],
      previewAfter: { fields: [], totalEnergyCost: 0, totalCosts: [] },
    });
  });

  it('hides the sandbox switch without the COLONY_SANDBOX grant', async () => {
    useAuthStore.setState({ user: { isAdmin: false, permissions: [] } as never });
    colonyApiMocks.fetchColonies.mockResolvedValue([createColony(1, 'Alpha', 5, 10)]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(createColony(1, 'Alpha', 5, 10));
    render(<MemoryRouter initialEntries={['/colonies?selected=1']}><Routes><Route path="/colonies" element={<ColoniesPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByLabelText('Koloniefelder')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sandbox' })).toBeNull();
  });

  it('switches from the live colony to the sandbox and back', async () => {
    useAuthStore.setState({ user: { isAdmin: false, permissions: ['COLONY_SANDBOX'] } as never });
    colonyApiMocks.fetchColonies.mockResolvedValue([createColony(1, 'Alpha', 5, 10)]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(createColony(1, 'Alpha', 5, 10));
    render(<MemoryRouter initialEntries={['/colonies?selected=1']}><Routes><Route path="/colonies" element={<ColoniesPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Sandbox' }));
    expect(screen.getByText('Sandboxen zur Planung')).toBeTruthy();
    expect(screen.queryByLabelText('Koloniefelder')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kolonie' }));
    expect(screen.getByLabelText('Koloniefelder')).toBeTruthy();
    expect(screen.queryByText('Sandboxen zur Planung')).toBeNull();
  });

  it('refreshes overview and selected detail for matching COLONY_UPDATED', async () => {
    colonyApiMocks.fetchColonies
      .mockResolvedValueOnce([createColony(1, 'Alpha', 5, 10)])
      .mockResolvedValueOnce([createColony(1, 'Alpha', 8, 12)]);
    colonyApiMocks.fetchColonyDetail
      .mockResolvedValueOnce(createColony(1, 'Alpha', 5, 10))
      .mockResolvedValueOnce(createColony(1, 'Alpha', 8, 12));

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Energie')).toBeTruthy();
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);

    emitSocket('COLONY_UPDATED', { colonyId: 1 });

    await waitFor(() => {
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
      expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(2);
    });
  });

  it('repairs a selected field and refreshes the list and dialog details in place', async () => {
    const before = createDamagedAirfieldColony(70, 5, 5);
    const after = createDamagedAirfieldColony(100, 3, 3);
    const preview = {
      fields: [
        {
          fieldIndex: 9,
          buildingId: airfieldBuilding.id,
          buildingName: airfieldBuilding.name,
          integrity: 70,
          maxIntegrity: 100,
          damageRatio: 0.3,
          energyCost: 2,
          costs: [{ commodityId: 1, amount: 2 }],
          repairable: true,
        },
      ],
      totalEnergyCost: 2,
      totalCosts: [{ commodityId: 1, amount: 2 }],
    };
    colonyApiMocks.fetchColonies
      .mockResolvedValueOnce([before])
      .mockResolvedValueOnce([after]);
    colonyApiMocks.fetchColonyDetail
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(after);
    colonyApiMocks.fetchBuildingRepairPreview.mockResolvedValue(preview);
    colonyApiMocks.repairBuilding.mockResolvedValue(after.fields![0]);

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Feld 9: Raumhafen (deaktiviert) (beschädigt)',
      }),
    );
    expect(await screen.findByRole('button', { name: 'Reparieren' })).toBeTruthy();
    expect(screen.getByText('5/20')).toBeTruthy();
    expect(
      screen.getByRole('listitem', { name: 'Erz Lagerbestand' }).textContent,
    ).toContain('5');
    expect(colonyApiMocks.fetchBuildingRepairPreview).toHaveBeenCalledWith(
      1,
      [9],
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reparieren' }));

    await waitFor(() => {
      expect(colonyApiMocks.repairBuilding).toHaveBeenCalledWith(1, 9);
      expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(2);
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
    });
    expect(
      screen.getByRole('dialog', { name: 'Feld 9 - Informationen' }),
    ).toBeTruthy();
    expect(await screen.findByText('Integrität: 100/100')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reparieren' })).toBeNull();
    expect(await screen.findByText('3/20')).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByRole('listitem', { name: 'Erz Lagerbestand' }).textContent,
      ).toContain('3');
    });
  });

  it('does not navigate back to a colony when repair finishes after leaving it', async () => {
    const colony = createDamagedAirfieldColony(70, 5, 5);
    let resolveRepair!: (value: unknown) => void;
    const pendingRepair = new Promise<unknown>((resolve) => {
      resolveRepair = resolve;
    });
    colonyApiMocks.fetchColonies.mockResolvedValue([colony]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(colony);
    colonyApiMocks.fetchBuildingRepairPreview.mockResolvedValue({
      fields: [
        {
          fieldIndex: 9,
          buildingId: airfieldBuilding.id,
          buildingName: airfieldBuilding.name,
          integrity: 70,
          maxIntegrity: 100,
          damageRatio: 0.3,
          energyCost: 2,
          costs: [{ commodityId: 1, amount: 2 }],
          repairable: true,
        },
      ],
      totalEnergyCost: 2,
      totalCosts: [{ commodityId: 1, amount: 2 }],
    });
    colonyApiMocks.repairBuilding.mockReturnValueOnce(pendingRepair);

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Feld 9: Raumhafen (deaktiviert) (beschädigt)',
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Reparieren' }));
    expect(colonyApiMocks.repairBuilding).toHaveBeenCalledWith(1, 9);

    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    fireEvent.click(screen.getByRole('button', { name: '← Kolonien' }));
    expect(await screen.findByText('Kolonien')).toBeTruthy();

    await act(async () => resolveRepair(colony.fields![0]));
    await waitFor(() => {
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
    });
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Koloniefelder')).toBeNull();
    expect(screen.getByText('Kolonien')).toBeTruthy();
  });

  it('refreshes only overview for foreign COLONY_UPDATED ids', async () => {
    colonyApiMocks.fetchColonies
      .mockResolvedValueOnce([
        createColony(1, 'Alpha', 5, 10),
        createColony(2, 'Beta', 7, 9),
      ])
      .mockResolvedValueOnce([
        createColony(1, 'Alpha', 5, 10),
        createColony(2, 'Beta', 9, 11),
      ]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(
      createColony(1, 'Alpha', 5, 10),
    );

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Energie')).toBeTruthy();
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);

    emitSocket('COLONY_UPDATED', { colonyId: 2 });

    await waitFor(() => {
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
    });
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);
  });

  it('closes hangar context when a socket refresh removes active access', async () => {
    const activeColony = createAirfieldColony(true);
    const inactiveColony = createAirfieldColony(false);
    colonyApiMocks.fetchColonies.mockResolvedValue([activeColony]);
    colonyApiMocks.fetchColonyDetail
      .mockResolvedValueOnce(activeColony)
      .mockResolvedValueOnce(inactiveColony);

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Feld 1: Raumhafen' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hangar öffnen' }));
    expect(screen.getByText('Hangarbestand')).toBeTruthy();

    emitSocket('COLONY_UPDATED', { colonyId: 1 });

    await waitFor(() => expect(screen.queryByText('Hangarbestand')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Planet' })).toBeTruthy();
  });

  it('shows zero-stock production resources but not effects', async () => {
    const colony = createColony(1, 'Alpha', 5, 10);
    colony.detailV2!.productionDeltas = [
      { commodityId: 1, name: 'Erz', nameShort: 'ERZ', amount: 15 },
      {
        commodityId: 1001,
        name: 'Ausbildungsgrad',
        nameShort: 'AUS',
        amount: 1,
      },
    ];
    colonyApiMocks.fetchColonies.mockResolvedValue([colony]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(colony);

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lagerraum')).toBeTruthy();
    const storageRow = screen.getByRole('listitem', {
      name: 'Erz Lagerbestand',
    });
    expect(storageRow.textContent).toContain('0');
    expect(storageRow.textContent).toContain('+15');
    expect(screen.queryByTitle('Ausbildungsgrad')).toBeNull();
  });

  it('keeps colony detail visible when the environment scan fails', async () => {
    const colony = createColony(1, 'Alpha', 5, 10);
    colony.starSystem = {
      id: 7,
      name: 'Testsystem',
      systemTypeId: 1,
      systemTypeName: 'Gelber Stern',
      maxX: 4,
      maxY: 4,
    };
    colonyApiMocks.fetchColonies.mockResolvedValue([colony]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(colony);
    colonyApiMocks.fetchEnvironmentScan.mockRejectedValue(
      new Error('Umgebungsscan nicht verfügbar'),
    );

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lagerraum')).toBeTruthy();
    expect(screen.getByText('Bevölkerung')).toBeTruthy();
    expect(screen.getByText('Umgebungsscan nicht verfügbar')).toBeTruthy();
  });

  it('does not block colony detail while the environment scan is pending', async () => {
    const colony = createColony(1, 'Alpha', 5, 10);
    colony.starSystem = {
      id: 7,
      name: 'Testsystem',
      systemTypeId: 1,
      systemTypeName: 'Gelber Stern',
      maxX: 4,
      maxY: 4,
    };
    colonyApiMocks.fetchColonies.mockResolvedValue([colony]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(colony);
    colonyApiMocks.fetchEnvironmentScan.mockReturnValue(
      new Promise(() => undefined),
    );

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lagerraum')).toBeTruthy();
    expect(screen.getByText('Bevölkerung')).toBeTruthy();
  });

  it('removes shield strength after a socket refresh removes shield functions', async () => {
    const shielded = createColony(1, 'Alpha', 5, 10);
    shielded.detailV2!.defense = {
      shields: { current: 25, max: 100, frequency: null },
      activeFunctionIds: [],
      energyPhalanx: false,
      particlePhalanx: false,
      antiParticle: false,
      torpedoTypeId: null,
    };
    shielded.detailV2!.featureAccess!.functions.present = [
      {
        id: 24,
        key: 'SHIELD_GENERATOR',
        name: 'Schildgenerator',
        buildingIds: [1],
      },
    ];
    const unshielded = createColony(1, 'Alpha', 5, 10);
    unshielded.detailV2!.defense = shielded.detailV2!.defense;
    colonyApiMocks.fetchColonies.mockResolvedValue([shielded]);
    colonyApiMocks.fetchColonyDetail
      .mockResolvedValueOnce(shielded)
      .mockResolvedValueOnce(unshielded);

    render(
      <MemoryRouter initialEntries={['/colonies?selected=1']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('progressbar', { name: 'Schildstärke' }),
    ).toBeTruthy();
    emitSocket('COLONY_UPDATED', { colonyId: 1 });

    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: 'Schildstärke' }),
      ).toBeNull(),
    );
    expect(screen.getByText('Lagerraum')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Informationen' })).toBeTruthy();
  });

  it('reloads available buildings on TICK only', async () => {
    colonyApiMocks.fetchColonies.mockResolvedValue([
      createColony(1, 'Alpha', 5, 10),
    ]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(
      createColony(1, 'Alpha', 5, 10),
    );

    render(
      <MemoryRouter initialEntries={['/colonies']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Alpha')).toBeTruthy();
    const initialBuildingCalls =
      colonyApiMocks.fetchAvailableBuildings.mock.calls.length;

    emitSocket('TICK', { tick: 42 });

    await waitFor(() => {
      expect(
        colonyApiMocks.fetchAvailableBuildings.mock.calls.length,
      ).toBeGreaterThan(initialBuildingCalls);
    });
    expect(colonyApiMocks.fetchColonyDetail).not.toHaveBeenCalled();
  });
});
