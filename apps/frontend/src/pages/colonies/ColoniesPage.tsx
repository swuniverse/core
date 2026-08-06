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
import { planetImage, commodityImage } from '../../lib/assets';
import { FieldCell } from './components/FieldCell';
import { FieldInfoModal } from './components/FieldInfoModal';
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
  const [modalField, setModalField] = useState<ColonyField | null>(null);
  const [surfaceLayer, setSurfaceLayer] = useState<
    'ALL' | 'ORBIT' | 'SURFACE' | 'UNDERGROUND'
  >('ALL');

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
    if (selectedField) {
      const fresh = fields.find(
        (f) => f.fieldIndex === selectedField.fieldIndex,
      );
      if (fresh) setSelectedField(fresh);
      else setSelectedField(null);
    }
  }, [fields]);

  useEffect(() => {
    if (modalField) {
      const fresh = fields.find((f) => f.fieldIndex === modalField.fieldIndex);
      if (fresh) setModalField(fresh);
      else setModalField(null);
    }
  }, [fields, modalField]);

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
    } else if (!selectedBuilding) {
      if (field.buildingId && !field.isBuilding) {
        setModalField(field);
      } else {
        setSelectedField(field);
      }
    }
  };

  const visibleFields =
    surfaceLayer === 'ALL'
      ? fields
      : fields.filter((field) => field.layer === surfaceLayer);
  const orbitFields = visibleFields
    .filter((f) => f.layer === 'ORBIT' || (!f.layer && f.fieldType >= 900))
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const undergroundFields = visibleFields
    .filter(
      (f) =>
        f.layer === 'UNDERGROUND' ||
        (!f.layer && f.fieldType >= 800 && f.fieldType < 900),
    )
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const surfaceFields = visibleFields
    .filter((f) => f.layer === 'SURFACE' || (!f.layer && f.fieldType < 800))
    .sort((a, b) => a.fieldIndex - b.fieldIndex);

  const tabAccess = detail?.featureAccess?.tabs;
  const isTabVisible = (key: DetailTab, fallback = true) =>
    tabAccess?.[key]?.visible ?? fallback;
  const tabs: Array<{ key: DetailTab; label: string; show: boolean }> = [
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

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab && tab.show)) {
      setActiveTab(tabs.find((tab) => tab.show)?.key ?? 'info');
    }
  }, [activeTab, setActiveTab, tabs]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-xs text-swu-muted hover:text-swu-accent"
        >
          ← Kolonien
        </button>
        {colony.celestialObject?.classId && (
          <img
            src={planetImage(colony.celestialObject.classId)}
            alt=""
            className="w-6 h-6 object-contain"
          />
        )}
        <span
          className="text-sm font-bold text-swu-primary"
          style={{ fontFamily: 'var(--font-swu-display)' }}
        >
          {colony.name}
        </span>
        <span className="text-[10px] text-swu-muted">
          {colony.locationLabel || ''}
        </span>
      </div>

      {/* Resource bar */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] bg-swu-surface border border-swu-border rounded px-3 py-1.5">
        <span>
          Energie:{' '}
          <span className="text-swu-warning font-mono">
            {detail?.energy.current ?? colony.energy}/
            {detail?.energy.max ?? colony.energyMax}
          </span>
          {detail?.energy.delta != null && (
            <span
              className={
                detail.energy.delta >= 0 ? 'text-green-400' : 'text-red-400'
              }
            >
              {' '}
              ({formatSignedAmount(detail.energy.delta)})
            </span>
          )}
        </span>
        <span>
          Bevölkerung:{' '}
          <span className="text-swu-success font-mono">
            {detail?.population.current ?? colony.population}/
            {detail?.population.max ?? colony.populationMax}
          </span>
        </span>
        <span>
          Lager:{' '}
          <span className="text-swu-primary font-mono">
            {detail?.storage.current ?? colony.storageUsed}/
            {detail?.storage.max ?? colony.storageMax}
          </span>
        </span>
        {detail && (
          <span>
            Orbit:{' '}
            <span className="text-swu-muted font-mono">
              {detail.orbitShips.length} Schiffe
            </span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="relative">
        <div className="flex gap-0 border-b border-swu-border overflow-x-auto scrollbar-none">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-1.5 text-xs whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? 'border-swu-accent text-swu-accent' : 'border-transparent text-swu-muted hover:text-swu-primary'}`}
              >
                {t.label}
              </button>
            ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-swu-bg to-transparent pointer-events-none md:hidden" />
      </div>

      {detail?.surface?.hasUnderground && (
        <div className="flex flex-wrap gap-1 text-[10px]">
          {(['ALL', ...detail.surface.layers] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setSurfaceLayer(layer)}
              className={`rounded border px-2 py-1 ${surfaceLayer === layer ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted'}`}
            >
              {layer === 'ALL'
                ? 'Alle Layer'
                : layer === 'SURFACE'
                  ? 'Oberfläche'
                  : layer === 'UNDERGROUND'
                    ? 'Untergrund'
                    : 'Orbit'}
            </button>
          ))}
        </div>
      )}
      {/* Main: Left (Grid+Storage) + Right (Tab content) */}
      <div className="flex gap-3 flex-col lg:flex-row">
        {/* LEFT: Grid + Storage (always visible) */}
        <div className="lg:w-[440px] shrink-0 space-y-2 overflow-x-auto">
          {orbitFields.length > 0 && (
            <div>
              <div className="text-[9px] text-swu-orbit font-bold uppercase mb-0.5">
                Orbit
              </div>
              <div className="grid grid-cols-10 gap-0">
                {orbitFields.map((f) => (
                  <FieldCell
                    key={f.fieldIndex}
                    field={f}
                    buildingId={f.buildingId ?? undefined}
                    buildingName={
                      f.buildingId
                        ? buildingMap[f.buildingId]?.nameShort ||
                          buildingMap[f.buildingId]?.name
                        : undefined
                    }
                    isSelected={selectedField?.fieldIndex === f.fieldIndex}
                    isHighlighted={highlightedFields.has(f.fieldIndex)}
                    isBuildMode={!!selectedBuilding}
                    isFieldActive={f.isActive}
                    buildPreviewTitle={getBuildPreviewTitle(f)}
                    onMouseEnter={() => setHoveredBuildField(f)}
                    onMouseLeave={() => setHoveredBuildField(null)}
                    onClick={() => handleFieldClick(f)}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] text-swu-success font-bold uppercase mb-0.5">
              Oberfläche
            </div>
            <div className="grid grid-cols-10 gap-0">
              {surfaceFields.map((f) => (
                <FieldCell
                  key={f.fieldIndex}
                  field={f}
                  buildingId={f.buildingId ?? undefined}
                  buildingName={
                    f.buildingId
                      ? buildingMap[f.buildingId]?.nameShort ||
                        buildingMap[f.buildingId]?.name
                      : undefined
                  }
                  isSelected={selectedField?.fieldIndex === f.fieldIndex}
                  isHighlighted={highlightedFields.has(f.fieldIndex)}
                  isBuildMode={!!selectedBuilding}
                  isFieldActive={f.isActive}
                  buildPreviewTitle={getBuildPreviewTitle(f)}
                  onMouseEnter={() => setHoveredBuildField(f)}
                  onMouseLeave={() => setHoveredBuildField(null)}
                  onClick={() => handleFieldClick(f)}
                />
              ))}
            </div>
          </div>
          {undergroundFields.length > 0 && (
            <div>
              <div className="text-[9px] text-swu-underground font-bold uppercase mb-0.5">
                Untergrund
              </div>
              <div className="grid grid-cols-10 gap-0">
                {undergroundFields.map((f) => (
                  <FieldCell
                    key={f.fieldIndex}
                    field={f}
                    buildingId={f.buildingId ?? undefined}
                    buildingName={
                      f.buildingId
                        ? buildingMap[f.buildingId]?.nameShort ||
                          buildingMap[f.buildingId]?.name
                        : undefined
                    }
                    isSelected={selectedField?.fieldIndex === f.fieldIndex}
                    isHighlighted={highlightedFields.has(f.fieldIndex)}
                    isBuildMode={!!selectedBuilding}
                    isFieldActive={f.isActive}
                    buildPreviewTitle={getBuildPreviewTitle(f)}
                    onMouseEnter={() => setHoveredBuildField(f)}
                    onMouseLeave={() => setHoveredBuildField(null)}
                    onClick={() => handleFieldClick(f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Storage table */}
          {storage.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded">
              <div className="px-2 py-1 border-b border-swu-border/50 text-[10px] font-bold text-swu-muted uppercase">
                Lager ({storage.length})
              </div>
              <div className="divide-y divide-swu-border/20 max-h-[400px] overflow-y-auto">
                {storage.map((item) => {
                  const commodity = commodityMap[item.commodityId];
                  const label = getStorageCommodityLabel(
                    commodityMap,
                    detail,
                    item.commodityId,
                  );
                  const delta = detail?.productionDeltas.find(
                    (d) => d.commodityId === item.commodityId,
                  )?.amount;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-2 py-0.5 text-[10px]"
                      title={label}
                    >
                      <img
                        src={commodityImage(item.commodityId, commodity?.name)}
                        alt={label}
                        title={label}
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                      <span className="text-swu-muted truncate flex-1">
                        {label}
                      </span>
                      <span className="font-mono text-swu-primary">
                        {item.amount}
                      </span>
                      {delta != null && (
                        <span
                          className={`font-mono ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {formatSignedAmount(delta)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'info' && (
            <PanelInfo
              colony={colony}
              detail={detail}
              selectedField={selectedField}
              buildingMap={buildingMap}
              commodityMap={commodityMap}
              terraformingDefs={terraformingDefs}
              onTerraform={onTerraform}
            />
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
              deactivateAfterBuild={deactivateAfterBuild}
              onDeactivateAfterBuildChange={setDeactivateAfterBuild}
              hoveredBuildField={
                hoveredBuildField &&
                highlightedFields.has(hoveredBuildField.fieldIndex)
                  ? hoveredBuildField
                  : null
              }
              buildingMap={buildingMap}
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
        </div>
      </div>

      {/* Field Info Modal */}
      {modalField && modalField.buildingId && (
        <FieldInfoModal
          buildingMap={buildingMap}
          field={modalField}
          building={buildingMap[modalField.buildingId]}
          commodityMap={commodityMap}
          onClose={() => setModalField(null)}
          onUpgrade={(upgradeId) => {
            onUpgradeBuilding(modalField.fieldIndex, upgradeId);
            setModalField(null);
          }}
          onDemolish={() => {
            onDemolish(modalField.fieldIndex);
            setModalField(null);
          }}
          onToggle={() => {
            onToggle(modalField.fieldIndex);
            setModalField(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Panel: Informationen ────────────────────────────────────
