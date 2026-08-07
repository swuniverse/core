import { fireEvent, render, screen, within } from '@testing-library/react';

import { ColonyDetail } from '../pages/colonies/ColoniesPage';
import type {
  BuildingDef,
  Colony,
  ColonyDetailV2,
  ShipClassDef,
  ShipModuleSelection,
} from '../pages/colonies/types';
import App from './app';

function createDetail(): ColonyDetailV2 {
  return {
    featureAccess: {
      tabs: {
        info: { visible: true },
        build: { visible: true },
        crew: { visible: true },
        buildingManagement: { visible: true },
        shipyard: { visible: true },
        fabrication: { visible: false },
        defense: { visible: false },
        hangar: { visible: true },
        events: { visible: true },
        settings: { visible: true },
      },
      functions: { present: [], active: [], groups: {} },
    },
    eventSummary: { unreadCount: 0, latest: [] },
    energy: { current: 0, max: 0, delta: 0 },
    storage: { current: 0, max: 0, delta: 0 },
    options: {
      name: 'Testkolonie',
      colonyMessage: null,
      populationLimit: 0,
      immigrationEnabled: false,
    },
    population: {
      current: 0,
      max: 0,
      growth: 0,
      workers: 0,
      available: 0,
      housing: 0,
      populationLimit: 0,
      immigrationEnabled: false,
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
      unlocked: true,
      completed: true,
      inProgress: false,
      buildingId: 1,
      buildingName: 'Werfthub',
      fighterPresentFunctionIds: [5],
      fighterActiveFunctionIds: [5],
      presentFunctionIds: [7],
      activeFunctionIds: [7],
      repairPresentFunctionIds: [22],
      repairActiveFunctionIds: [22],
      slotRules: [],
      shipClassLayouts: [],
    },
  };
}

function createColony(detail: ColonyDetailV2): Colony {
  return {
    id: 1,
    name: 'Testkolonie',
    energy: 0,
    energyMax: 0,
    storageUsed: 0,
    storageMax: 0,
    population: 0,
    populationMax: 0,
    fields: [],
    storage: [],
    locationLabel: 'Testsystem',
    detailV2: detail,
    celestialObject: { name: 'Testwelt', description: null, classId: 1 },
  };
}

function createShipyardLayout(): NonNullable<
  NonNullable<ColonyDetailV2['shipyard']['shipClassLayouts']>
>[number] {
  return {
    shipClassId: 101,
    imageKey: 'frigate-layout',
    layoutKey: 'frigate-layout',
    baseStats: {
      moduleLevel: 2,
      baseCrew: 4,
      baseEvadeChance: 0,
      baseHull: 410,
      baseShield: 410,
      baseDamage: 40,
      baseSensorRange: 3,
      baseWarpdrive: 70,
      baseEps: 140,
      baseReactor: 70,
    },
    slots: [
      {
        slotId: 'frigate-energy-weapon-1',
        moduleCategory: 'ENERGY_WEAPON',
        label: 'Energiewaffe',
        anchorX: 30,
        anchorY: 24,
        calloutSide: 'left',
        order: 0,
        required: false,
      },
      {
        slotId: 'frigate-shield-1',
        moduleCategory: 'SHIELDS',
        label: 'Schilde',
        anchorX: 28,
        anchorY: 36,
        calloutSide: 'right',
        order: 1,
        required: false,
      },
      {
        slotId: 'frigate-torpedo-bank-1',
        moduleCategory: 'TORPEDO_BANK',
        label: 'Torpedobank',
        anchorX: 70,
        anchorY: 24,
        calloutSide: 'right',
        order: 2,
        required: false,
      },
      {
        slotId: 'frigate-special-1',
        moduleCategory: 'SPECIAL',
        label: 'Spezialslot I',
        anchorX: 45,
        anchorY: 62,
        calloutSide: 'bottom',
        order: 3,
        required: false,
      },
      {
        slotId: 'frigate-special-2',
        moduleCategory: 'SPECIAL',
        label: 'Spezialslot II',
        anchorX: 55,
        anchorY: 62,
        calloutSide: 'bottom',
        order: 4,
        required: false,
      },
    ],
  };
}

function createShipyardSelections(): ShipModuleSelection[] {
  return [
    { slotId: 'frigate-energy-weapon-1', commodityId: 9001 },
    { slotId: 'frigate-shield-1', commodityId: 9002 },
    { slotId: 'frigate-torpedo-bank-1', commodityId: 9003 },
  ];
}

const shipClassFixture: ShipClassDef = {
  id: 101,
  key: 'NEBULON_B',
  name: 'Nebulon-B',
  category: 'FRIGATE',
  role: 'PHASER',
  hullBase: 410,
  shieldBase: 410,
  cargoCapacity: 80,
  crewMin: 4,
  crewMax: 8,
  warpBase: 4,
  starterAllowed: false,
  unlocked: true,
  buildCosts: [],
};

const mineBuilding: BuildingDef = {
  id: 5001,
  name: 'Dilithium-Mine',
  description: 'Fördert Erz.',
  category: 'PRODUCTION',
  costs: { buildTime: 60 },
  resourceCosts: [],
  allowedFieldTypes: [101],
  isUnique: false,
  production: [],
  bonuses: { energy: 0, population: 0, storage: 0 },
  bmCol: 1,
  epsCost: 2,
  epsProc: 0,
  bevUse: 1,
  bevPro: 0,
};

const fz1Building: BuildingDef = {
  id: 72010100,
  name: 'Forschungszentrum Stufe I',
  description: 'Ermöglicht Forschung.',
  category: 'RESEARCH',
  costs: { buildTime: 120 },
  resourceCosts: [],
  allowedFieldTypes: [101],
  isUnique: false,
  production: [],
  bonuses: { energy: 0, population: 0, storage: 0 },
  bmCol: 2,
  epsCost: 5,
  epsProc: 3,
  bevUse: 2,
  bevPro: 0,
};

const fz2Building: BuildingDef = {
  id: 73010100,
  name: 'Forschungszentrum Stufe II',
  description: 'Verbesserte Forschung.',
  category: 'RESEARCH',
  costs: { buildTime: 180 },
  resourceCosts: [],
  allowedFieldTypes: [],
  isUnique: false,
  production: [],
  bonuses: { energy: 0, population: 0, storage: 0 },
  bmCol: 2,
  epsCost: 8,
  epsProc: 6,
  bevUse: 3,
  bevPro: 0,
};

const noop = vi.fn();
const noopPromise = vi.fn().mockResolvedValue(undefined);
const noopEvents = vi.fn().mockResolvedValue([]);

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  Sprite: vi.fn(),
  Graphics: vi.fn(),
  Assets: { load: vi.fn() },
  Texture: { from: vi.fn() },
}));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should have the app title', () => {
    const { getAllByText } = render(<App />);
    expect(getAllByText('Star Wars Universe').length).toBeGreaterThan(0);
  });
});

function renderColonyDetail(
  detail: ColonyDetailV2,
  overrides: Partial<React.ComponentProps<typeof ColonyDetail>> = {},
) {
  const colony = createColony(detail);
  return render(
    <ColonyDetail
      colony={colony}
      commodities={[]}
      buildingDefs={[]}
      allBuildingDefs={[]}
      shipClasses={[]}
      terraformingDefs={[]}
      activeTab="info"
      setActiveTab={noop}
      onBack={noop}
      onBuild={noop}
      onUpgradeBuilding={noop}
      onDemolish={noop}
      onToggle={noop}
      onTerraform={noopPromise}
      onBuildShip={noopPromise}
      onStartFabrication={noopPromise}
      onCancelFabrication={noopPromise}
      onQueueCrewTraining={noopPromise}
      onAssignCrewToShip={noopPromise}
      onUnassignCrewFromShip={noopPromise}
      onLandShip={noopPromise}
      onDisassembleShip={noopPromise}
      onDefendOrbitShip={noopPromise}
      onBlockadeOrbitShip={noopPromise}
      onClearOrbitOrder={noopPromise}
      onTransferOrbitShipShuttles={noopPromise}
      onQueueShipRepair={noopPromise}
      onQueueShipRetrofit={noopPromise}
      onCancelShipyardQueue={noopPromise}
      onReactivateShipyardQueue={noopPromise}
      onCreateBuildplan={noopPromise}
      onRenameBuildplan={noopPromise}
      onDeleteBuildplan={noopPromise}
      onBuildFromBuildplan={noopPromise}
      onBuildAirfieldRump={noopPromise}
      onStartHangarShip={noopPromise}
      onLoadColonyShields={noopPromise}
      onSetShieldFrequency={noopPromise}
      onSetDefenseTorpedoType={noopPromise}
      onLoadColonyEvents={noopEvents}
      onMarkColonyEventRead={noopPromise}
      onMarkAllColonyEventsRead={noopPromise}
      onRenameColony={noopPromise}
      onSetPopulationLimit={noopPromise}
      onSetImmigration={noopPromise}
      onSetColonyMessage={noopPromise}
      onGiveUpColony={noopPromise}
      onDiscardStorage={noopPromise}
      onActivateBuildings={noopPromise}
      onDeactivateBuildings={noopPromise}
      {...overrides}
    />,
  );
}

describe('ColonyDetail', () => {
  it('renders visible tabs in the requested order', () => {
    const detail = createDetail();
    renderColonyDetail(detail);

    const infoButton = screen.getByRole('button', { name: 'Informationen' });
    const tabLabels = within(infoButton.closest('div') as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(tabLabels).toEqual([
      'Informationen',
      'Baumenü',
      'Crew',
      'Gebäudemanagement',
      'Werft',
      'Hangar',
      'Ereignisse',
      'Einstellungen',
    ]);
    expect(screen.queryByRole('button', { name: 'Fabrikation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Verteidigung' })).toBeNull();
  });

  it('keeps the selected building active for consecutive placements', () => {
    const detail = createDetail();
    detail.surface = {
      width: 2,
      rotationFactor: null,
      layers: ['SURFACE'],
      hasUnderground: false,
    };
    const onBuild = vi.fn();
    const fieldOne = {
      id: 1,
      fieldIndex: 1,
      fieldType: 101,
      terrainTileId: null,
      layer: 'SURFACE' as const,
      buildingId: null,
      isBuilding: false,
      isActive: false,
      buildProgress: 0,
      buildFinishesAt: null,
      availableUpgrades: [],
    };
    const fieldTwo = {
      ...fieldOne,
      id: 2,
      fieldIndex: 2,
    };
    const colony = {
      ...createColony(detail),
      fields: [fieldOne, fieldTwo],
    };

    renderColonyDetail(detail, {
      colony,
      buildingDefs: [mineBuilding, fz1Building],
      allBuildingDefs: [mineBuilding, fz1Building, fz2Building],
      activeTab: 'build',
      onBuild,
    });

    fireEvent.click(screen.getByRole('button', { name: mineBuilding.name }));
    expect(screen.queryByText(mineBuilding.description)).toBeNull();
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Nach Fertigstellung deaktivieren',
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Feld 1' }));

    expect(onBuild).toHaveBeenNthCalledWith(1, 1, mineBuilding.id, true);
    expect(
      screen.getByText('← Feld im Grid klicken zum Platzieren'),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Nach Fertigstellung deaktivieren',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Feld 2' }));

    expect(onBuild).toHaveBeenNthCalledWith(2, 2, mineBuilding.id, false);
  });

  it('renders field upgrades and keeps FZ II out of the build menu', () => {
    const detail = createDetail();
    detail.surface = {
      width: 1,
      rotationFactor: null,
      layers: ['SURFACE'],
      hasUnderground: false,
    };
    const onUpgradeBuilding = vi.fn();
    const colony = {
      ...createColony(detail),
      fields: [
        {
          id: 10,
          fieldIndex: 5,
          fieldType: 101,
          terrainTileId: null,
          layer: 'SURFACE' as const,
          buildingId: fz1Building.id,
          isBuilding: false,
          isActive: true,
          integrity: 100,
          maxIntegrity: 100,
          buildProgress: 100,
          buildFinishesAt: null,
          availableUpgrades: [
            {
              id: 7201010073,
              fromBuildingId: fz1Building.id,
              toBuildingId: fz2Building.id,
              researchId: 200201,
              description: 'Ausbau auf FZ II',
              energyCost: 7,
              costs: [{ commodityId: 1, amount: 4 }],
            },
          ],
        },
      ],
    };

    renderColonyDetail(detail, {
      colony,
      buildingDefs: [mineBuilding, fz1Building],
      allBuildingDefs: [mineBuilding, fz1Building, fz2Building],
      commodities: [{ id: 1, name: 'Erz', nameShort: 'ERZ' }],
      activeTab: 'build',
      onUpgradeBuilding,
    });

    expect(screen.queryByRole('button', { name: fz2Building.name })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: `Feld 5: ${fz1Building.name}`,
      }),
    );

    const upgradeButton = screen.getByRole('button', {
      name: `Upgrade auf ${fz2Building.name}`,
    });
    expect(screen.getByText('Ausbau auf FZ II')).toBeTruthy();

    fireEvent.click(upgradeButton);

    expect(onUpgradeBuilding).toHaveBeenCalledWith(5, 7201010073);
  });

  it('renders build menu placeholders and building hover titles', () => {
    const detail = createDetail();

    renderColonyDetail(detail, {
      buildingDefs: [mineBuilding],
      allBuildingDefs: [mineBuilding],
      activeTab: 'build',
    });

    expect(screen.getByTitle(mineBuilding.name)).toBeTruthy();
    expect(screen.getAllByText('Keine Gebäude verfügbar.')).toHaveLength(3);
  });

  it('uses detail inventory names when storage definitions are missing', () => {
    const detail = createDetail();
    detail.inventory = [
      {
        id: 5,
        commodityId: 5,
        name: 'Deuterium-Vorrat',
        nameShort: 'DEU',
        amount: 100,
        delta: 0,
      },
    ];

    renderColonyDetail(detail, {
      colony: createColony(detail),
      commodities: [],
    });

    expect(screen.getByText('Lager (1)')).toBeTruthy();
    expect(screen.getByText('Deuterium-Vorrat')).toBeTruthy();
    expect(screen.getAllByTitle('Deuterium-Vorrat')).toHaveLength(2);
  });

  it('hides zero-amount storage rows', () => {
    const detail = createDetail();
    const colony = {
      ...createColony(detail),
      storage: [
        { id: 1, colonyId: 1, commodityId: 100, amount: 5 },
        { id: 2, colonyId: 1, commodityId: 200, amount: 0 },
      ],
    };

    renderColonyDetail(detail, {
      colony,
      commodities: [
        { id: 100, name: 'Visible Ore', nameShort: 'VIS' },
        { id: 200, name: 'Empty Rump', nameShort: 'EMP' },
      ],
    });

    expect(screen.getByText('Lager (1)')).toBeTruthy();
    expect(screen.getByText('Visible Ore')).toBeTruthy();
    expect(screen.queryByText('Empty Rump')).toBeNull();
  });

  it('opens the shipyard flow and submits slot-based module selections', () => {
    const detail = createDetail();
    const layout = createShipyardLayout();
    detail.shipyard.slotRules = [
      {
        category: 'FRIGATE',
        allowedBuildingFunctionIds: [7],
        moduleSlots: {
          ENERGY_WEAPON: 1,
          SHIELDS: 1,
          TORPEDO_BANK: 1,
          SPECIAL: 2,
        },
        layoutKey: 'frigate-layout',
        imageKey: 'frigate-layout',
        slots: layout.slots,
      },
    ];
    detail.shipyard.shipClassLayouts = [layout];
    detail.availableShipModules = [
      {
        commodityId: 9001,
        commodityName: 'Laserkanone',
        amount: 2,
        moduleType: 'Laser',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'OFFENSE_SYSTEMS',
        shipyardType: 'ENERGY_WEAPON',
        moduleLevel: 3,
        moduleClass: 3,
        researchRequired: 'Waffenmodule Stufe II',
        faction: null,
        displayName: 'Turbolaser Mk III',
        crewRequired: 2,
        effects: ['Energiewaffenschaden: +10%'],
        shipyardModuleStats: {
          level: 3,
          upgradeFactor: 20,
          downgradeFactor: 10,
          crew: 2,
          energyCost: 60,
          defaultFactor: 10,
        },
      },
      {
        commodityId: 9002,
        commodityName: 'Schild',
        amount: 1,
        moduleType: 'Shield',
        moduleCategory: 'SHIELDS',
        shipyardGroup: 'DEFENSE_SYSTEMS',
        shipyardType: 'SHIELDS',
        moduleLevel: 2,
        moduleClass: 2,
        researchRequired: 'Schildmodule Stufe I',
        faction: null,
        displayName: 'Particle Shield Mk II',
        crewRequired: 1,
        effects: ['Schildkapazität: +10%'],
        shipyardModuleStats: {
          level: 2,
          upgradeFactor: 20,
          downgradeFactor: 10,
          crew: 1,
          energyCost: 40,
          defaultFactor: 10,
        },
      },
      {
        commodityId: 9003,
        commodityName: 'Torpedobank',
        amount: 1,
        moduleType: 'Torpedo',
        moduleCategory: 'WEAPONS',
        shipyardGroup: 'OFFENSE_SYSTEMS',
        shipyardType: 'TORPEDO_BANK',
        moduleLevel: 1,
        moduleClass: 1,
        researchRequired: 'Waffenmodule Stufe I',
        faction: null,
        displayName: 'Torpedobank Mk I',
        crewRequired: 0,
        effects: ['Torpedoleistung: +0%'],
        shipyardModuleStats: {
          level: 1,
          upgradeFactor: 150,
          downgradeFactor: 100,
          crew: 0,
          energyCost: 20,
          defaultFactor: 0,
        },
      },
      {
        commodityId: 9004,
        commodityName: 'Spezialmodul Alpha',
        amount: 1,
        moduleType: 'Special Alpha',
        moduleCategory: 'SPECIAL',
        shipyardGroup: 'CORE_SYSTEMS',
        shipyardType: 'SPECIAL',
        moduleLevel: 1,
        moduleClass: 1,
        researchRequired: null,
        faction: null,
        displayName: 'Spezialmodul Alpha',
        crewRequired: 0,
        effects: ['Alpha-Effekt'],
        shipyardModuleStats: null,
      },
      {
        commodityId: 9005,
        commodityName: 'Spezialmodul Beta',
        amount: 1,
        moduleType: 'Special Beta',
        moduleCategory: 'SPECIAL',
        shipyardGroup: 'CORE_SYSTEMS',
        shipyardType: 'SPECIAL',
        moduleLevel: 1,
        moduleClass: 1,
        researchRequired: null,
        faction: null,
        displayName: 'Spezialmodul Beta',
        crewRequired: 0,
        effects: ['Beta-Effekt'],
        shipyardModuleStats: null,
      },
    ];
    detail.crew = {
      available: 8,
      assignedToColony: 0,
      inTraining: 0,
      localLimit: 0,
      globalLimit: 0,
      remainingGlobal: 0,
      trainableNow: 0,
      trainingQueue: [],
    };

    const onBuildShip = vi.fn().mockResolvedValue(undefined);
    renderColonyDetail(detail, {
      shipClasses: [shipClassFixture],
      activeTab: 'shipyard',
      onBuildShip,
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Werft öffnen' })[1]);
    fireEvent.click(screen.getByRole('button', { name: /Schiffbau/ }));
    expect(screen.getByText('Rumpf auswählen')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Nebulon-B/ }));
    expect(screen.getByText(/Modul-Designer/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Energiewaffe/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Schilde/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Torpedobank/ })).toBeTruthy();
    expect(screen.getByText('Spezialslot I')).toBeTruthy();
    expect(screen.getByText('Spezialslot II')).toBeTruthy();
    expect(screen.queryByText('Hauptsysteme')).toBeNull();
    expect(screen.queryByText('Offensivsysteme')).toBeNull();
    expect(screen.queryByText('Defensivsysteme')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Energiewaffe/ }));
    expect(screen.getByText(/Turbolaser Mk III/)).toBeTruthy();
    expect(screen.getByText(/Crew 2 · Lager/)).toBeTruthy();
    expect(screen.getByText(/Energiewaffenschaden/)).toBeTruthy();
    expect(screen.queryByText(/Torpedobank Mk I/)).toBeNull();
    fireEvent.click(screen.getByText(/Turbolaser Mk III/));

    fireEvent.click(screen.getByRole('button', { name: /Torpedobank/ }));
    expect(screen.getByText(/Torpedobank Mk I/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Torpedobank Mk I/));

    fireEvent.click(screen.getByRole('button', { name: /Schilde/ }));
    expect(screen.getByText(/Particle Shield Mk II/)).toBeTruthy();
    expect(screen.getByText(/Schildkapazität: \+10%/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Particle Shield Mk II/));
    expect(screen.getByText(/benötigt 7 \/ maximal 8/)).toBeTruthy();

    fireEvent.click(screen.getByText('Spezialslot I'));
    expect(screen.getByText(/Spezialmodul Alpha/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Spezialmodul Alpha/));
    fireEvent.click(screen.getByRole('button', { name: /Spezialslot II/ }));
    expect(screen.getByText(/Spezialmodul Beta/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Spezialmodul Beta/));

    fireEvent.change(screen.getByDisplayValue('Nebulon-B'), {
      target: { value: 'Nebulon-B Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schiff bauen' }));
    expect(onBuildShip).toHaveBeenCalledWith(
      101,
      'Nebulon-B Test',
      expect.arrayContaining([
        ...createShipyardSelections(),
        { slotId: 'frigate-special-1', commodityId: 9004 },
        { slotId: 'frigate-special-2', commodityId: 9005 },
      ]),
      'Nebulon-B Buildplan',
    );
  });

  it('honors per-class shipyard overrides over freighter slot rules', () => {
    const detail = createDetail();
    detail.shipyard.fighterPresentFunctionIds = [];
    detail.shipyard.fighterActiveFunctionIds = [];
    detail.shipyard.presentFunctionIds = [7];
    detail.shipyard.activeFunctionIds = [7];
    detail.shipyard.slotRules = [
      {
        category: 'FREIGHTER',
        allowedBuildingFunctionIds: [5, 6, 7, 22],
        moduleSlots: {},
        layoutKey: 'freighter-layout',
        imageKey: 'freighter-layout',
        slots: [],
      },
    ];

    const ytFreighter: ShipClassDef = {
      ...shipClassFixture,
      id: 201,
      key: 'REBEL_FREIGHTER_YT',
      name: 'YT-1300 Frachter',
      category: 'FREIGHTER',
      allowedBuildingFunctionIds: [5, 22],
    };
    const frigateFreighter: ShipClassDef = {
      ...shipClassFixture,
      id: 202,
      key: 'REBEL_FREIGHTER_GR75',
      name: 'GR-75 Frachter',
      category: 'FREIGHTER',
      allowedBuildingFunctionIds: [7, 22],
    };

    renderColonyDetail(detail, {
      shipClasses: [ytFreighter, frigateFreighter],
      activeTab: 'shipyard',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Werft öffnen' }));
    fireEvent.click(screen.getByRole('button', { name: /Schiffbau/ }));

    expect(screen.getByText('GR-75 Frachter')).toBeTruthy();
    expect(screen.queryByText(/YT-1300 Frachter/)).toBeNull();
  });
});
