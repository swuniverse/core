import { render, screen, within } from '@testing-library/react';

import { ColonyDetail } from '../pages/colonies/ColoniesPage';
import type { Colony, ColonyDetailV2 } from '../pages/colonies/types';
import App from './app';

const createDetail = (): ColonyDetailV2 =>
  ({
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
      functions: {
        present: [],
        active: [],
        groups: {},
      },
    },
    eventSummary: { unreadCount: 0, latest: [] },
    energy: { current: 0, max: 0, delta: 0 },
    population: { current: 0, max: 0 },
    storage: { current: 0, max: 0 },
    orbitShips: [],
    productionDeltas: [],
    inventory: [],
    options: { immigrationEnabled: false, colonyMessage: null },
    social: {
      criminalEnergy: 0,
      criminalPopulation: 0,
      military: 0,
      militaryCombatStrength: 0,
      militaryPower: 0,
      taxIncome: 0,
      taxRate: 0,
    },
    crew: { available: 0, trainingQueue: [], stationedByShip: [] },
    shipBuildQueue: [],
    availableShipModules: [],
    buildplans: [],
    activeFabricationFunctionIds: [],
    fabricationCatalog: [],
    fabricationQueue: [],
  }) as ColonyDetailV2;

const createColony = (detail: ColonyDetailV2): Colony =>
  ({
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
    celestialObject: { classId: 1 },
  }) as Colony;

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

describe('ColonyDetail', () => {
  it('renders visible tabs in the requested order', () => {
    const detail = createDetail();
    const colony = createColony(detail);

    render(
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
        onQueueShipRepair={noopPromise}
        onQueueShipRetrofit={noopPromise}
        onCancelShipyardQueue={noopPromise}
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
        onActivateBuildings={noopPromise}
        onDeactivateBuildings={noopPromise}
      />,
    );

    const tabList = screen.getByRole('button', { name: 'Informationen' }).closest('div');
    expect(tabList).toBeTruthy();
    const tabLabels = within(tabList as HTMLElement)
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
});
