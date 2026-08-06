import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ColoniesPage } from './colonies/ColoniesPage';
import type {
  BuildingDef,
  Colony,
  ColonyDetailV2,
  CommodityDef,
  ShipClassDef,
  StarterColonizationOptions,
  TerraformingDef,
} from './colonies/types';

const colonyApiMocks = vi.hoisted(() => ({
  fetchStarterColonizationOptions: vi.fn(),
  fetchCommodities: vi.fn(),
  fetchAvailableBuildings: vi.fn(),
  fetchAllBuildings: vi.fn(),
  fetchTerraforming: vi.fn(),
  fetchShipClasses: vi.fn(),
  fetchColonies: vi.fn(),
  fetchColonyDetail: vi.fn(),
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

const starterOptions: StarterColonizationOptions = {
  mode: 'not-required',
  reservedStarterColonyId: null,
  starterShipId: null,
  targets: [],
};

const commodities = [
  { id: 1, name: 'Erz', nameShort: 'ERZ' },
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
const allBuildings: BuildingDef[] = availableBuildings;
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
    eventSummary: { unreadCount: 0, latest: [] },
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

describe('ColoniesPage socket refresh', () => {
  beforeEach(() => {
    socketHandlers.clear();
    for (const mock of Object.values(colonyApiMocks)) {
      mock.mockReset();
    }

    colonyApiMocks.fetchStarterColonizationOptions.mockResolvedValue(
      starterOptions,
    );
    colonyApiMocks.fetchCommodities.mockResolvedValue(commodities);
    colonyApiMocks.fetchAvailableBuildings.mockResolvedValue(availableBuildings);
    colonyApiMocks.fetchAllBuildings.mockResolvedValue(allBuildings);
    colonyApiMocks.fetchTerraforming.mockResolvedValue(terraformingDefs);
    colonyApiMocks.fetchShipClasses.mockResolvedValue(shipClasses);
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

    expect(await screen.findByText('Energie:')).toBeTruthy();
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);

    emitSocket('COLONY_UPDATED', { colonyId: 1 });

    await waitFor(() => {
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
      expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(2);
    });
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

    expect(await screen.findByText('Energie:')).toBeTruthy();
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);

    emitSocket('COLONY_UPDATED', { colonyId: 2 });

    await waitFor(() => {
      expect(colonyApiMocks.fetchColonies).toHaveBeenCalledTimes(2);
    });
    expect(colonyApiMocks.fetchColonyDetail).toHaveBeenCalledTimes(1);
  });

  it('reloads available buildings on TICK only', async () => {
    colonyApiMocks.fetchColonies.mockResolvedValue([createColony(1, 'Alpha', 5, 10)]);
    colonyApiMocks.fetchColonyDetail.mockResolvedValue(createColony(1, 'Alpha', 5, 10));

    render(
      <MemoryRouter initialEntries={['/colonies']}>
        <Routes>
          <Route path="/colonies" element={<ColoniesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Alpha')).toBeTruthy();
    const initialBuildingCalls = colonyApiMocks.fetchAvailableBuildings.mock.calls.length;

    emitSocket('TICK', { tick: 42 });

    await waitFor(() => {
      expect(colonyApiMocks.fetchAvailableBuildings.mock.calls.length).toBeGreaterThan(
        initialBuildingCalls,
      );
    });
    expect(colonyApiMocks.fetchColonyDetail).not.toHaveBeenCalled();
  });
});
