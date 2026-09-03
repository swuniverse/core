import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { colonyApi } from './api';
import { api } from '../../services/api';
import type {
  BuildingDef,
  BuildingMassActionResult,
  Colony,
  ColonyEventDto,
  ColonyField,
  ColonyFieldUpgrade,
  ColonyStorageItem,
  CommodityDef,
  DetailTab,
  ShipClassDef,
  ShipModuleSelection,
  StarterColonizationOptions,
  TerraformingDef,
} from './types';
import { planetImage } from '../../lib/assets';
import { FieldInspector } from './components/FieldInspector';
import { ColonyOverview } from './components/ColonyOverview';
import { PanelInfo } from './components/PanelInfo';
import { PanelBuild } from './components/PanelBuild';
import { PanelShipyard } from './components/PanelShipyard';
import { PanelOrbit } from './components/PanelOrbit';
import { PanelDefense } from './components/PanelDefense';
import { PanelEvents } from './components/PanelEvents';
import { PanelSettings } from './components/PanelSettings';
import { PanelBuildingManagement } from './components/PanelBuildingManagement';
import { PanelFabrication } from './components/PanelFabrication';
import { PanelCrew } from './components/PanelCrew';
import { PanelHangar } from './components/PanelHangar';
import { PanelWaste } from './components/PanelWaste';
import { ColonyCommandBar } from './components/ColonyCommandBar';
import { ColonyStatusBar } from './components/ColonyStatusBar';
import { ColonyMap } from './components/ColonyMap';
import { SupplyDock } from './components/SupplyDock';
import { WorkModeNav } from './components/WorkModeNav';
import { BuildInspector } from './components/BuildInspector';
import {
  formatSignedAmount,
  getEffectiveBuildingForField,
  getFieldTypeCandidates,
} from './utils';
import { useSocket } from '../../hooks/use-socket';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Aktion fehlgeschlagen';

const getStorageCommodityLabel = (
  commodityMap: Record<number, CommodityDef>,
  detail: Colony['detailV2'],
  commodityId: number,
) =>
  commodityMap[commodityId]?.name ||
  commodityMap[commodityId]?.nameShort ||
  detail?.inventory.find((item) => item.commodityId === commodityId)?.name ||
  detail?.productionDeltas.find((item) => item.commodityId === commodityId)
    ?.name ||
  `Ware #${commodityId}`;

const buildStorageRows = (
  colony: Colony,
  commodityMap: Record<number, CommodityDef>,
) => {
  const rows = new Map<number, ColonyStorageItem>();
  for (const item of colony.storage ?? []) {
    if (item.amount > 0) rows.set(item.commodityId, item);
  }
  for (const item of colony.detailV2?.inventory ?? []) {
    if (item.amount <= 0 || rows.has(item.commodityId)) continue;
    rows.set(item.commodityId, {
      id: item.id,
      commodityId: item.commodityId,
      amount: item.amount,
    });
  }
  for (const item of colony.detailV2?.productionDeltas ?? []) {
    if (
      item.amount === 0 ||
      rows.has(item.commodityId) ||
      !commodityMap[item.commodityId]?.isSaveable
    )
      continue;
    rows.set(item.commodityId, {
      id: -item.commodityId,
      commodityId: item.commodityId,
      amount: 0,
    });
  }
  return Array.from(rows.values()).sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return getStorageCommodityLabel(
      commodityMap,
      colony.detailV2,
      a.commodityId,
    ).localeCompare(
      getStorageCommodityLabel(commodityMap, colony.detailV2, b.commodityId),
      'de',
    );
  });
};

const buildingMatchesField = (building: BuildingDef, field: ColonyField) =>
  getFieldTypeCandidates(field).some((fieldType) =>
    building.allowedFieldTypes.includes(fieldType),
  );

// ─── Page ────────────────────────────────────────────────────

export function ColoniesPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [commodities, setCommodities] = useState<CommodityDef[]>([]);
  const [buildingDefs, setBuildingDefs] = useState<BuildingDef[]>([]);
  const [allBuildingDefs, setAllBuildingDefs] = useState<BuildingDef[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClassDef[]>([]);
  const [terraformingDefs, setTerraformingDefs] = useState<TerraformingDef[]>(
    [],
  );
  const [starterOptions, setStarterOptions] =
    useState<StarterColonizationOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  const detailRequestSequenceRef = useRef(0);
  const initialSelectedIdRef = useRef(Number(searchParams.get('selected')));

  const loadColonyOverview = useCallback(async () => {
    const data = await colonyApi.fetchColonies();
    setColonies(data);
  }, []);

  const loadColonyDetail = useCallback(
    async (id: number) => {
      const requestSequence = ++detailRequestSequenceRef.current;
      const detail = await colonyApi.fetchColonyDetail(id);
      if (requestSequence !== detailRequestSequenceRef.current) return;
      setSelected(detail);
      setSearchParams({ selected: String(id) }, { replace: true });
    },
    [setSearchParams],
  );

  const loadAvailableBuildings = useCallback(async () => {
    const buildings = await colonyApi.fetchAvailableBuildings();
    setBuildingDefs(buildings);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const starter = await colonyApi.fetchStarterColonizationOptions();
      const [comms, buildings, allBuildings, terraforming, classes] =
        await Promise.all([
          colonyApi.fetchCommodities(),
          colonyApi.fetchAvailableBuildings(),
          colonyApi.fetchAllBuildings(),
          colonyApi.fetchTerraforming(),
          colonyApi.fetchShipClasses(),
        ]);
      setCommodities(comms);
      setBuildingDefs(buildings);
      setAllBuildingDefs(allBuildings);
      setTerraformingDefs(terraforming);
      setShipClasses(classes);
      setStarterOptions(starter);
      if (starter.mode === 'required') {
        setSelected(null);
        setColonies([]);
        setLoading(false);
        return;
      }

      await loadColonyOverview();
      const reqId = initialSelectedIdRef.current;
      if (reqId) await loadColonyDetail(reqId);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loadColonyDetail, loadColonyOverview, toast]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useSocket('COLONY_UPDATED', (payload) => {
    void loadColonyOverview();

    let colonyId: unknown;
    if (payload && typeof payload === 'object' && 'colonyId' in payload) {
      colonyId = payload.colonyId;
    }

    if (typeof colonyId !== 'number' || colonyId !== selected?.id) return;
    void loadColonyDetail(colonyId);
  });

  useSocket('TICK', () => {
    void loadAvailableBuildings();
  });

  const goBack = () => {
    setSelected(null);
    setSearchParams({}, { replace: true });
  };

  // ponytail: wraps async action, shows error toast on failure
  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const handleStarterFound = async (celestialObjectId: number) => {
    await act(async () => {
      const result = await colonyApi.foundStarterColony(celestialObjectId);
      const detail = await colonyApi.fetchColonyDetail(result.colonyId);
      setStarterOptions({
        mode: 'not-required',
        reservedStarterColonyId: result.colonyId,
        starterShipId: null,
        targets: [],
      });
      setSelected(detail);
      setSearchParams({ selected: String(result.colonyId) }, { replace: true });
    });
  };

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;

  if (starterOptions?.mode === 'required') {
    return (
      <StarterColonizationGate
        options={starterOptions}
        onFound={handleStarterFound}
      />
    );
  }
  if (!selected)
    return (
      <ColonyOverview
        colonies={colonies}
        commodities={commodities}
        onSelect={(id) => loadColonyDetail(id)}
      />
    );

  return (
    <ColonyDetail
      colony={selected}
      commodities={commodities}
      buildingDefs={buildingDefs}
      allBuildingDefs={allBuildingDefs}
      shipClasses={shipClasses}
      terraformingDefs={terraformingDefs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onBack={goBack}
      onBuild={(fi, bi, activateAfterBuild) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/build`, {
            fieldIndex: fi,
            buildingId: bi,
            activateAfterBuild,
          });
          loadColonyDetail(selected.id);
        })
      }
      onUpgradeBuilding={(fi, ui) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/fields/${fi}/upgrade`, {
            upgradeId: ui,
          });
          loadColonyDetail(selected.id);
        })
      }
      onDemolish={(fi) =>
        act(async () => {
          await api.delete(`/colonies/${selected.id}/fields/${fi}/building`);
          loadColonyDetail(selected.id);
        })
      }
      onToggle={(fi) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/fields/${fi}/toggle`, {});
          loadColonyDetail(selected.id);
        })
      }
      onTerraform={(fi, ti) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/fields/${fi}/terraform`, {
            terraformingId: ti,
          });
          loadColonyDetail(selected.id);
        })
      }
      onBuildShip={(sci, name, moduleSelections, buildPlanName) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/build-ship`, {
            shipClassId: sci,
            name,
            moduleSelections,
            buildPlanName,
          });
          loadColonyDetail(selected.id);
        })
      }
      onStartFabrication={(itemKey, queueType, buildingFunctionId) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/fabrication-queue`, {
            itemKey,
            queueType,
            amount: 1,
            buildingFunctionId,
          });
          loadColonyDetail(selected.id);
        })
      }
      onCancelFabrication={(queueId) =>
        act(async () => {
          await api.delete(
            `/colonies/${selected.id}/fabrication-queue/${queueId}`,
          );
          loadColonyDetail(selected.id);
        })
      }
      onQueueCrewTraining={(amount) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/crew-training`, { amount });
          loadColonyDetail(selected.id);
        })
      }
      onAssignCrewToShip={(shipId, amount) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/ships/${shipId}/crew/assign`,
            { amount },
          );
          loadColonyDetail(selected.id);
        })
      }
      onUnassignCrewFromShip={(shipId, amount) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/ships/${shipId}/crew/unassign`,
            { amount },
          );
          loadColonyDetail(selected.id);
        })
      }
      onLandShip={(shipId) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/ships/${shipId}/land`, {});
          loadColonyDetail(selected.id);
        })
      }
      onDisassembleShip={(shipId) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/ships/${shipId}/disassemble`,
            {},
          );
          loadColonyDetail(selected.id);
        })
      }
      onDefendOrbitShip={(shipId) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/orbit/ships/${shipId}/defend`,
            {},
          );
          loadColonyDetail(selected.id);
        })
      }
      onBlockadeOrbitShip={(shipId) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/orbit/ships/${shipId}/blockade`,
            {},
          );
          loadColonyDetail(selected.id);
        })
      }
      onClearOrbitOrder={(shipId) =>
        act(async () => {
          await api.delete(
            `/colonies/${selected.id}/orbit/ships/${shipId}/order`,
          );
          loadColonyDetail(selected.id);
        })
      }
      onTransferOrbitShipShuttles={(shipId, items) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/orbit/ships/${shipId}/shuttles`,
            { items },
          );
          loadColonyDetail(selected.id);
        })
      }
      onQueueShipRepair={(shipId) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/ships/${shipId}/repair-queue`,
            {},
          );
          loadColonyDetail(selected.id);
        })
      }
      onQueueShipRetrofit={(shipId, moduleSelections, buildPlanName) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/ships/${shipId}/retrofit-queue`,
            { moduleSelections, buildPlanName },
          );
          loadColonyDetail(selected.id);
        })
      }
      onCancelShipyardQueue={(queueId) =>
        act(async () => {
          await api.delete(
            `/colonies/${selected.id}/shipyard-queue/${queueId}`,
          );
          loadColonyDetail(selected.id);
        })
      }
      onReactivateShipyardQueue={(queueId) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/shipyard-queue/${queueId}/reactivate`,
            {},
          );
          loadColonyDetail(selected.id);
        })
      }
      onCreateBuildplan={(shipClassId, name, moduleSelections) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/buildplans`, {
            shipClassId,
            name,
            moduleSelections,
          });
          loadColonyDetail(selected.id);
        })
      }
      onRenameBuildplan={(planId, name) =>
        act(async () => {
          await api.patch(`/colonies/${selected.id}/buildplans/${planId}`, {
            name,
          });
          loadColonyDetail(selected.id);
        })
      }
      onDeleteBuildplan={(planId) =>
        act(async () => {
          await api.delete(`/colonies/${selected.id}/buildplans/${planId}`);
          loadColonyDetail(selected.id);
        })
      }
      onBuildFromBuildplan={(planId, name) =>
        act(async () => {
          await api.post(
            `/colonies/${selected.id}/buildplans/${planId}/build`,
            { name },
          );
          loadColonyDetail(selected.id);
        })
      }
      onBuildAirfieldRump={(shipClassId, amount) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/hangar/build-rump`, {
            shipClassId,
            amount,
          });
          loadColonyDetail(selected.id);
        })
      }
      onStartHangarShip={(shipClassId, name) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/hangar/start-ship`, {
            shipClassId,
            name,
          });
          loadColonyDetail(selected.id);
        })
      }
      onLoadColonyShields={(amount) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/shields/load`, { amount });
          loadColonyDetail(selected.id);
        })
      }
      onSetShieldFrequency={(frequency) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/shields/frequency`, {
            frequency,
          });
          loadColonyDetail(selected.id);
        })
      }
      onSetDefenseTorpedoType={(torpedoTypeId) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/defense/torpedo-type`, {
            torpedoTypeId,
          });
          loadColonyDetail(selected.id);
        })
      }
      onLoadColonyEvents={async (unreadOnly = false) =>
        api.get<ColonyEventDto[]>(
          `/colonies/${selected.id}/events?limit=50&unreadOnly=${unreadOnly}`,
        )
      }
      onMarkColonyEventRead={(eventId) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/events/${eventId}/read`, {});
          loadColonyDetail(selected.id);
        })
      }
      onMarkAllColonyEventsRead={() =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/events/read-all`, {});
          loadColonyDetail(selected.id);
        })
      }
      onRenameColony={(name) =>
        act(async () => {
          await api.put(`/colonies/${selected.id}`, { name });
          loadColonyDetail(selected.id);
        })
      }
      onSetPopulationLimit={(limit) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/population-limit`, {
            limit,
          });
          loadColonyDetail(selected.id);
        })
      }
      onSetImmigration={(enabled) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/immigration`, { enabled });
          loadColonyDetail(selected.id);
        })
      }
      onSetColonyMessage={(message) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/message`, { message });
          loadColonyDetail(selected.id);
        })
      }
      onGiveUpColony={(confirmation) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/give-up`, { confirmation });
          const data = await api.get<Colony[]>('/colonies');
          setColonies(data);
          setSelected(null);
          setSearchParams({}, { replace: true });
        })
      }
      onDiscardStorage={(items) =>
        act(async () => {
          await api.post(`/colonies/${selected.id}/storage/discard`, { items });
          loadColonyDetail(selected.id);
        })
      }
      onActivateBuildings={async (mode, options) => {
        try {
          const result = await colonyApi.activateBuildings(
            selected.id,
            mode,
            options,
          );
          loadColonyDetail(selected.id);
          return result;
        } catch (error: unknown) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
      onDeactivateBuildings={async (mode, options) => {
        try {
          const result = await colonyApi.deactivateBuildings(
            selected.id,
            mode,
            options,
          );
          loadColonyDetail(selected.id);
          return result;
        } catch (error: unknown) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
    />
  );
}

function StarterColonizationGate({
  options,
  onFound,
}: {
  options: StarterColonizationOptions;
  onFound: (celestialObjectId: number) => Promise<void> | void;
}) {
  const [busyTargetId, setBusyTargetId] = useState<number | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded border border-swu-accent/40 bg-swu-surface px-4 py-3">
        <div className="text-sm font-semibold text-swu-primary">
          Starterkolonisierung erforderlich
        </div>
        <div className="mt-1 text-xs text-swu-muted">
          Wähle einen freien Startplaneten. Die normale Kolonieübersicht ist
          erst nach der Gründung verfügbar.
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {options.targets.map((target) => (
          <div
            key={target.id}
            className="rounded border border-swu-border bg-swu-surface px-4 py-3 space-y-3"
          >
            <div className="flex items-center gap-3">
              {target.classId ? (
                <img
                  src={planetImage(target.classId)}
                  alt={target.name ?? 'Starterplanet'}
                  className="h-12 w-12 rounded border border-swu-border/60 object-cover"
                />
              ) : null}
              <div>
                <div className="text-sm font-semibold text-swu-primary">
                  {target.name ?? `Planet ${target.id}`}
                </div>
                <div className="text-[11px] text-swu-muted">
                  System {target.systemId} · Feld {target.posX}/{target.posY}
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                setBusyTargetId(target.id);
                try {
                  await onFound(target.id);
                } finally {
                  setBusyTargetId(null);
                }
              }}
              disabled={busyTargetId === target.id}
              className="w-full rounded border border-swu-accent bg-swu-accent/15 px-3 py-2 text-xs font-semibold text-swu-accent disabled:opacity-40"
            >
              {busyTargetId === target.id
                ? 'Gründe…'
                : 'Starterkolonie gründen'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────

export function ColonyDetail({
  colony,
  commodities,
  buildingDefs,
  allBuildingDefs,
  shipClasses,
  terraformingDefs,
  activeTab,
  setActiveTab,
  onBack,
  onBuild,
  onUpgradeBuilding,
  onDemolish,
  onToggle,
  onTerraform,
  onBuildShip,
  onStartFabrication,
  onCancelFabrication,
  onQueueCrewTraining,
  onAssignCrewToShip,
  onUnassignCrewFromShip,
  onLandShip,
  onDisassembleShip,
  onDefendOrbitShip,
  onBlockadeOrbitShip,
  onClearOrbitOrder,
  onTransferOrbitShipShuttles,
  onQueueShipRepair,
  onQueueShipRetrofit,
  onCancelShipyardQueue,
  onReactivateShipyardQueue,
  onCreateBuildplan,
  onRenameBuildplan,
  onDeleteBuildplan,
  onBuildFromBuildplan,
  onBuildAirfieldRump,
  onStartHangarShip,
  onLoadColonyShields,
  onSetShieldFrequency,
  onSetDefenseTorpedoType,
  onLoadColonyEvents,
  onMarkColonyEventRead,
  onMarkAllColonyEventsRead,
  onRenameColony,
  onSetPopulationLimit,
  onSetImmigration,
  onSetColonyMessage,
  onGiveUpColony,
  onDiscardStorage,
  onActivateBuildings,
  onDeactivateBuildings,
}: {
  colony: Colony;
  commodities: CommodityDef[];
  buildingDefs: BuildingDef[];
  allBuildingDefs: BuildingDef[];
  shipClasses: ShipClassDef[];
  terraformingDefs: TerraformingDef[];
  activeTab: DetailTab;
  setActiveTab: (t: DetailTab) => void;
  onBack: () => void;
  onBuild: (fi: number, bi: number, activateAfterBuild: boolean) => void;
  onUpgradeBuilding: (fi: number, ui: number) => void;
  onDemolish: (fi: number) => void;
  onToggle: (fi: number) => void;
  onTerraform: (fi: number, ti: number) => Promise<void> | void;
  onBuildShip: (
    sci: number,
    name: string,
    moduleSelections?: ShipModuleSelection[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onStartFabrication: (
    itemKey: string,
    queueType: 'MODULE' | 'TORPEDO',
    buildingFunctionId: number,
  ) => Promise<void> | void;
  onCancelFabrication: (queueId: number) => Promise<void> | void;
  onQueueCrewTraining: (amount: number) => Promise<void> | void;
  onAssignCrewToShip: (shipId: number, amount: number) => Promise<void> | void;
  onUnassignCrewFromShip: (
    shipId: number,
    amount: number,
  ) => Promise<void> | void;
  onLandShip: (shipId: number) => Promise<void> | void;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
  onDefendOrbitShip: (shipId: number) => Promise<void> | void;
  onBlockadeOrbitShip: (shipId: number) => Promise<void> | void;
  onClearOrbitOrder: (shipId: number) => Promise<void> | void;
  onTransferOrbitShipShuttles: (
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ) => Promise<void> | void;
  onQueueShipRepair: (shipId: number) => Promise<void> | void;
  onQueueShipRetrofit: (
    shipId: number,
    moduleSelections: ShipModuleSelection[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onCancelShipyardQueue: (queueId: number) => Promise<void> | void;
  onReactivateShipyardQueue: (queueId: number) => Promise<void> | void;
  onCreateBuildplan: (
    shipClassId: number,
    name: string,
    moduleSelections?: ShipModuleSelection[],
  ) => Promise<void> | void;
  onRenameBuildplan: (planId: number, name: string) => Promise<void> | void;
  onDeleteBuildplan: (planId: number) => Promise<void> | void;
  onBuildFromBuildplan: (planId: number, name: string) => Promise<void> | void;
  onBuildAirfieldRump: (
    shipClassId: number,
    amount: number,
  ) => Promise<void> | void;
  onStartHangarShip: (
    shipClassId: number,
    name?: string,
  ) => Promise<void> | void;
  onLoadColonyShields: (amount: number) => Promise<void> | void;
  onSetShieldFrequency: (frequency: number) => Promise<void> | void;
  onSetDefenseTorpedoType: (commodityId: number | null) => Promise<void> | void;
  onLoadColonyEvents: (unreadOnly?: boolean) => Promise<ColonyEventDto[]>;
  onMarkColonyEventRead: (eventId: number) => Promise<void> | void;
  onMarkAllColonyEventsRead: () => Promise<void> | void;
  onRenameColony: (name: string) => Promise<void> | void;
  onSetPopulationLimit: (limit: number) => Promise<void> | void;
  onSetImmigration: (enabled: boolean) => Promise<void> | void;
  onSetColonyMessage: (message: string | null) => Promise<void> | void;
  onGiveUpColony: (confirmation: string) => Promise<void> | void;
  onDiscardStorage: (
    items: Array<{ commodityId: number; amount: number }>,
  ) => Promise<void> | void;
  onActivateBuildings: (
    mode: number,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
  onDeactivateBuildings: (
    mode: number,
    options: { fieldIndexes?: number[]; commodityId?: number },
  ) => Promise<BuildingMassActionResult>;
}) {
  const buildingMap = useMemo<Record<number, BuildingDef>>(
    () => Object.fromEntries(allBuildingDefs.map((b) => [b.id, b])),
    [allBuildingDefs],
  );
  const commodityMap = useMemo(
    () => Object.fromEntries(commodities.map((c) => [c.id, c])),
    [commodities],
  );
  const [selectedField, setSelectedField] = useState<ColonyField | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDef | null>(
    null,
  );
  const [deactivateAfterBuild, setDeactivateAfterBuild] = useState(false);
  const [hoveredBuildField, setHoveredBuildField] =
    useState<ColonyField | null>(null);

  const detail = colony.detailV2;
  const fieldUpgradeMap = useMemo(
    () =>
      Object.fromEntries(
        (detail?.buildingManagement?.fields ?? []).map((field) => [
          field.fieldIndex,
          'availableUpgrades' in field
            ? (field.availableUpgrades as ColonyFieldUpgrade[])
            : [],
        ]),
      ) as Record<number, ColonyFieldUpgrade[]>,
    [detail?.buildingManagement?.fields],
  );
  const fields = useMemo(
    () =>
      (colony.fields || []).map((field) => ({
        ...field,
        availableUpgrades:
          field.availableUpgrades ?? fieldUpgradeMap[field.fieldIndex] ?? [],
      })),
    [colony.fields, fieldUpgradeMap],
  );
  const storage = useMemo(
    () => buildStorageRows(colony, commodityMap),
    [colony, commodityMap],
  );

  useEffect(() => {
    setSelectedField((current) => {
      if (!current) return current;
      return (
        fields.find((field) => field.fieldIndex === current.fieldIndex) ?? null
      );
    });
  }, [fields]);

  const highlightedFields = useMemo(() => {
    if (!selectedBuilding) return new Set<number>();
    return new Set(
      fields
        .filter(
          (f) =>
            !f.buildingId &&
            !f.isBuilding &&
            buildingMatchesField(selectedBuilding, f),
        )
        .map((f) => f.fieldIndex),
    );
  }, [selectedBuilding, fields]);

  const getBuildPreviewTitle = (field: ColonyField): string | undefined => {
    if (!selectedBuilding) return undefined;

    const isBuildTarget =
      !field.buildingId &&
      !field.isBuilding &&
      highlightedFields.has(field.fieldIndex);
    if (!isBuildTarget) return undefined;

    const previewBuilding = getEffectiveBuildingForField(
      selectedBuilding,
      field,
      buildingMap,
    );
    const effects: string[] = [];
    const workerUsage = previewBuilding.bevUse || 0;
    const housing = previewBuilding.bevPro || 0;
    const energy = previewBuilding.epsProc || 0;

    if (workerUsage > 0) {
      effects.push(`👤 Arbeiter -${workerUsage}`);
    }
    if (housing > 0) {
      effects.push(`🏠 Wohnraum +${housing}`);
    }
    if (previewBuilding.bonuses.storage !== 0) {
      effects.push(
        `📦 Lager ${formatSignedAmount(previewBuilding.bonuses.storage)}`,
      );
    }
    if (energy !== 0) {
      effects.push(`⚡ Energie ${formatSignedAmount(energy)}/Tick`);
    }
    for (const production of previewBuilding.production) {
      const commodity = commodityMap[production.commodityId];
      effects.push(
        `${commodity?.nameShort || commodity?.name || `Ware #${production.commodityId}`} ${formatSignedAmount(production.amount)}/Tick`,
      );
    }

    return [
      `Bauen: ${previewBuilding.name}`,
      previewBuilding.id !== selectedBuilding.id
        ? `Bonusfeld-Version von ${selectedBuilding.name}`
        : undefined,
      effects.length ? 'Auswirkungen:' : undefined,
      ...effects.map((effect) => `  ${effect}`),
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleFieldClick = (field: ColonyField) => {
    if (selectedBuilding && highlightedFields.has(field.fieldIndex)) {
      onBuild(field.fieldIndex, selectedBuilding.id, !deactivateAfterBuild);
      setHoveredBuildField(null);
      setSelectedField(null);
      return;
    }

    setSelectedField(field);
  };

  const orbitFields = fields
    .filter((f) => f.layer === 'ORBIT' || (!f.layer && f.fieldType >= 900))
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const undergroundFields = fields
    .filter(
      (f) =>
        f.layer === 'UNDERGROUND' ||
        (!f.layer && f.fieldType >= 800 && f.fieldType < 900),
    )
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const surfaceFields = fields
    .filter((f) => f.layer === 'SURFACE' || (!f.layer && f.fieldType < 800))
    .sort((a, b) => a.fieldIndex - b.fieldIndex);

  const tabAccess = detail?.featureAccess?.tabs;
  const tabs = useMemo<
    Array<{ key: DetailTab; label: string; show: boolean }>
  >(() => {
    const isTabVisible = (key: DetailTab, fallback = true) =>
      tabAccess?.[key]?.visible ?? fallback;

    return [
      { key: 'info', label: 'Informationen', show: isTabVisible('info') },
      {
        key: 'orbit',
        label: 'Orbit',
        show: (detail?.orbitShips.length ?? 0) > 0,
      },
      { key: 'build', label: 'Baumenü', show: isTabVisible('build') },
      { key: 'crew', label: 'Crew', show: isTabVisible('crew') },
      {
        key: 'buildingManagement',
        label: 'Gebäudemanagement',
        show: isTabVisible('buildingManagement'),
      },
      {
        key: 'shipyard',
        label: 'Werft',
        show: isTabVisible('shipyard', false),
      },
      {
        key: 'fabrication',
        label: 'Fabrikation',
        show: isTabVisible('fabrication', false),
      },
      {
        key: 'defense',
        label: 'Verteidigung',
        show: isTabVisible('defense', false),
      },
      { key: 'hangar', label: 'Hangar', show: isTabVisible('hangar', false) },
      {
        key: 'waste',
        label: 'Entsorgung',
        show: Boolean(detail?.waste?.canDiscard),
      },
      {
        key: 'events',
        label: `Ereignisse${detail?.eventSummary?.unreadCount ? ` (${detail.eventSummary.unreadCount})` : ''}`,
        show: isTabVisible('events'),
      },
      {
        key: 'settings',
        label: 'Einstellungen',
        show: isTabVisible('settings'),
      },
    ];
  }, [
    detail?.orbitShips.length,
    detail?.eventSummary?.unreadCount,
    detail?.waste?.canDiscard,
    tabAccess,
  ]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab && tab.show)) {
      setActiveTab(tabs.find((tab) => tab.show)?.key ?? 'info');
    }
  }, [activeTab, setActiveTab, tabs]);

  return (
    <div className="space-y-2">
      <ColonyCommandBar colony={colony} onBack={onBack} />

      <ColonyStatusBar colony={colony} detail={detail} />

      <WorkModeNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main: Map-first Leitstand */}
      <div className="grid gap-3 xl:grid-cols-[minmax(560px,720px)_minmax(360px,1fr)]">
        <ColonyMap
          orbitFields={orbitFields}
          surfaceFields={surfaceFields}
          undergroundFields={undergroundFields}
          selectedField={selectedField}
          highlightedFields={highlightedFields}
          isBuildMode={!!selectedBuilding}
          buildingMap={buildingMap}
          getBuildPreviewTitle={getBuildPreviewTitle}
          onFieldClick={handleFieldClick}
          onFieldMouseEnter={setHoveredBuildField}
          onFieldMouseLeave={() => setHoveredBuildField(null)}
        />

        <div className="min-w-0 space-y-3">
          {(activeTab === 'info' || activeTab === 'build') && (
            <div>
              {activeTab === 'build' && selectedBuilding ? (
                <BuildInspector
                  selectedBuilding={selectedBuilding}
                  hoveredBuildField={
                    hoveredBuildField &&
                    highlightedFields.has(hoveredBuildField.fieldIndex)
                      ? hoveredBuildField
                      : null
                  }
                  buildingMap={buildingMap}
                  commodityMap={commodityMap}
                  storage={storage}
                  deactivateAfterBuild={deactivateAfterBuild}
                  onDeactivateAfterBuildChange={setDeactivateAfterBuild}
                  onClearSelection={() => {
                    setSelectedBuilding(null);
                    setHoveredBuildField(null);
                  }}
                />
              ) : (
                <FieldInspector
                  field={selectedField}
                  building={
                    selectedField?.buildingId
                      ? buildingMap[selectedField.buildingId]
                      : undefined
                  }
                  buildingMap={buildingMap}
                  commodityMap={commodityMap}
                  terraformingDefs={terraformingDefs}
                  selectedBuilding={selectedBuilding}
                  onClearSelection={() => setSelectedField(null)}
                  onTerraform={onTerraform}
                  onUpgrade={onUpgradeBuilding}
                  onDemolish={onDemolish}
                  onToggle={onToggle}
                />
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <PanelInfo colony={colony} detail={detail} />
          )}
          {activeTab === 'orbit' && detail && (
            <PanelOrbit
              orbitShips={detail.orbitShips}
              orbitBlockers={detail.orbitBlockers}
              inventory={detail.inventory}
              commodityMap={commodityMap}
              isBlockaded={colony.stats?.isBlockaded ?? false}
              onLandShip={onLandShip}
              onDisassembleShip={onDisassembleShip}
              onDefendShip={onDefendOrbitShip}
              onBlockadeShip={onBlockadeOrbitShip}
              onClearOrbitOrder={onClearOrbitOrder}
              onTransferShuttles={onTransferOrbitShipShuttles}
            />
          )}
          {activeTab === 'build' && (
            <PanelBuild
              buildingDefs={buildingDefs}
              fields={fields}
              storage={storage}
              commodityMap={commodityMap}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={(b: BuildingDef) => {
                setHoveredBuildField(null);
                if (selectedBuilding?.id === b.id) setSelectedBuilding(null);
                else {
                  setSelectedBuilding(b);
                  setDeactivateAfterBuild(false);
                  setSelectedField(null);
                }
              }}
            />
          )}
          {activeTab === 'buildingManagement' && detail?.buildingManagement && (
            <PanelBuildingManagement
              management={detail.buildingManagement}
              onActivate={onActivateBuildings}
              onDeactivate={onDeactivateBuildings}
            />
          )}
          {activeTab === 'shipyard' && (
            <PanelShipyard
              shipyard={detail?.shipyard}
              shipClasses={shipClasses}
              queue={detail?.shipBuildQueue ?? []}
              availableModules={detail?.availableShipModules ?? []}
              slotRules={detail?.shipyard.slotRules ?? []}
              availableCrew={detail?.crew?.available ?? 0}
              commodityMap={commodityMap}
              orbitShips={detail?.orbitShips ?? []}
              buildplans={detail?.buildplans ?? []}
              onBuildShip={onBuildShip}
              onDisassembleShip={onDisassembleShip}
              onQueueShipRepair={onQueueShipRepair}
              onQueueShipRetrofit={onQueueShipRetrofit}
              onCancelShipyardQueue={onCancelShipyardQueue}
              onReactivateShipyardQueue={onReactivateShipyardQueue}
              onCreateBuildplan={onCreateBuildplan}
              onRenameBuildplan={onRenameBuildplan}
              onDeleteBuildplan={onDeleteBuildplan}
              onBuildFromBuildplan={onBuildFromBuildplan}
            />
          )}
          {activeTab === 'waste' && detail?.waste?.canDiscard && (
            <PanelWaste detail={detail} onDiscardStorage={onDiscardStorage} />
          )}
          {activeTab === 'events' && (
            <PanelEvents
              initialEvents={detail?.eventSummary?.latest ?? []}
              onLoadEvents={onLoadColonyEvents}
              onMarkRead={onMarkColonyEventRead}
              onMarkAllRead={onMarkAllColonyEventsRead}
            />
          )}
          {activeTab === 'defense' && detail?.defense && (
            <PanelDefense
              defense={detail.defense}
              inventory={detail.inventory}
              onLoadColonyShields={onLoadColonyShields}
              onSetShieldFrequency={onSetShieldFrequency}
              onSetDefenseTorpedoType={onSetDefenseTorpedoType}
            />
          )}
          {activeTab === 'hangar' && detail?.hangar && (
            <PanelHangar
              hangar={detail.hangar}
              orbitShips={detail.orbitShips}
              commodityMap={commodityMap}
              onBuildAirfieldRump={onBuildAirfieldRump}
              onStartHangarShip={onStartHangarShip}
              onLandShip={onLandShip}
            />
          )}
          {activeTab === 'fabrication' && (
            <PanelFabrication
              catalog={detail?.fabricationCatalog ?? []}
              queue={detail?.fabricationQueue ?? []}
              activeFunctionIds={detail?.activeFabricationFunctionIds ?? []}
              presentFunctions={
                detail?.featureAccess?.functions.present.filter((fn) =>
                  [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 29, 30].includes(
                    fn.id,
                  ),
                ) ?? []
              }
              commodityMap={commodityMap}
              onStartFabrication={onStartFabrication}
              onCancelFabrication={onCancelFabrication}
            />
          )}
          {activeTab === 'settings' && detail && (
            <PanelSettings
              colonyName={colony.name}
              population={detail.population}
              options={detail.options}
              onRenameColony={onRenameColony}
              onSetPopulationLimit={onSetPopulationLimit}
              onSetImmigration={onSetImmigration}
              onSetColonyMessage={onSetColonyMessage}
              onGiveUpColony={onGiveUpColony}
            />
          )}
          {activeTab === 'crew' &&
            (detail?.crew ? (
              <PanelCrew
                crew={detail.crew}
                social={detail.social}
                orbitShips={detail.orbitShips}
                onQueueCrewTraining={onQueueCrewTraining}
                onAssignCrewToShip={onAssignCrewToShip}
                onUnassignCrewFromShip={onUnassignCrewFromShip}
                onLandShip={onLandShip}
                onDisassembleShip={onDisassembleShip}
              />
            ) : (
              <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs text-swu-muted">
                Keine Crewdaten verfügbar. Bitte Backend/Seite neu laden.
              </div>
            ))}

          {activeTab === 'info' && (
            <SupplyDock
              storage={storage}
              detail={detail}
              commodityMap={commodityMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Informationen ────────────────────────────────────
