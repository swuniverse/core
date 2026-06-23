import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  buildingImage,
  colonyFieldTileImage,
  commodityImage,
  planetImage,
} from '../lib/assets';

// ─── Interfaces ──────────────────────────────────────────────

interface ColonyField {
  id: number;
  fieldIndex: number;
  fieldType: number;
  terrainTileId: number | null;
  buildingId: number | null;
  isBuilding: boolean;
  isActive: boolean;
  buildProgress: number;
  buildFinishesAt: string | null;
  terraformingId?: number | null;
  terraformingFinishesAt?: string | null;
}
interface ColonyStorageItem {
  id: number;
  commodityId: number;
  amount: number;
}
type ShipyardQueueMode = 'BUILD' | 'REPAIR' | 'RETROFIT';

type ShipyardQueueEntry = {
  id: number;
  shipClassId: number;
  spacecraftId?: number | null;
  mode?: ShipyardQueueMode;
  name: string;
  buildPlanName: string | null;
  buildPlanId?: number | null;
  buildPlanSignature?: string | null;
  moduleTypes: string[];
  moduleCommodityIds?: number[];
  moduleNames?: string[];
  crewAssigned?: number;
  crewIds?: number[];
  repairSnapshot?: {
    hullBefore: number;
    hullAfter: number;
    moduleIntegrityBefore: Array<{ moduleId: number; integrity: number }>;
    costs: Array<{ commodityId: number; amount: number }>;
  } | null;
  retrofitSnapshot?: {
    oldModuleCommodityIds: number[];
    newModuleCommodityIds: number[];
    newModuleTypes: string[];
    returnedModuleCommodityIds: number[];
    consumedModuleCommodityIds: number[];
  } | null;
  finishesAt: string;
  status: string;
};

interface ColonyDetailV2 {
  energy: { current: number; max: number; delta: number };
  storage: { current: number; max: number; delta: number };
  population: {
    current: number;
    max: number;
    growth: number;
    workers: number;
    available: number;
    housing: number;
    housingFree?: number;
    housingMax?: number;
    housingBonus?: number;
  };
  inventory: Array<{
    id: number;
    commodityId: number;
    name: string;
    nameShort: string;
    amount: number;
    delta: number;
  }>;
  productionDeltas: Array<{
    commodityId: number;
    name: string;
    nameShort: string;
    amount: number;
  }>;
  deposits?: Array<{
    commodityId: number;
    name: string;
    nameShort: string;
    amountLeft: number;
    delta: number;
    depleted: boolean;
  }>;
  activeBuildJobs: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
    finishesAt: string | null;
    progress: number;
  }>;
  effects: Array<{ label: string; value: number; source: string }>;
  orbitShips: Array<{
    id: number;
    name: string;
    shipClassId: number;
    status: string;
    hull: number;
    hullMax: number;
    shields: number;
    shieldsMax: number;
    energy: number;
    energyMax: number;
    crew: number;
    crewRequired: number;
    crewMax: number;
    hasEnoughCrew: boolean;
    canLand?: boolean;
    canDisassemble?: boolean;
    canRepair?: boolean;
    canRetrofit?: boolean;
    damageSummary?: { hullDamage: number; damagedModules: number };
    modules?: Array<{
      id: number;
      moduleType: string;
      category: string;
      level: number;
      integrity: number;
      isActive: boolean;
      commodityId: number | null;
    }>;
    cargoUsed?: number;
    cargoMax?: number;
  }>;
  research: { pointsPerTick: number };
  planetaryDefense?: Array<{
    fieldIndex: number;
    buildingId: number;
    buildingName: string;
    functionId: number;
    functionName: string;
  }>;
  shipBuildQueue?: ShipyardQueueEntry[];
  shipyardQueue?: ShipyardQueueEntry[];
  availableShipModules?: Array<{
    commodityId: number;
    commodityName: string;
    amount: number;
    moduleType: string;
    moduleCategory: string;
    moduleLevel: number;
    displayName: string;
  }>;
  buildplans?: Array<{
    id: number;
    shipClassId: number;
    name: string;
    signature: string;
    moduleCommodityIds: number[];
    moduleTypes: string[];
  }>;
  fabricationQueue?: Array<{
    id: number;
    queueType: 'MODULE' | 'TORPEDO';
    itemKey: string;
    displayName: string;
    amount: number;
    outputCommodityId: number | null;
    outputAmount: number;
    buildingFunctionId: number;
    functionName: string;
    finishesAt: string;
    status: string;
  }>;
  fabricationCatalog?: Array<{
    itemKey: string;
    queueType: 'MODULE' | 'TORPEDO';
    displayName: string;
    outputCommodityId: number;
    outputAmount: number;
    buildingFunctionIds: number[];
    durationSeconds: number;
    costs: Array<{ commodityId: number; amount: number }>;
    available: boolean;
  }>;
  activeFabricationFunctionIds?: number[];
  hangar?: {
    hasAirfield: boolean;
    inventory: Array<{
      shipClassKey: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
    }>;
    buildable: Array<{
      shipClassId: number;
      shipClassKey: string;
      shipClassName: string;
      hangarCommodityId: number;
      displayName: string;
      buildEnergyCost: number;
      startEnergyCost: number;
      buildCosts: Array<{ commodityId: number; amount: number }>;
      crewRequired: number;
    }>;
    startable: Array<{
      shipClassId: number;
      shipClassKey: string;
      shipClassName: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
      startEnergyCost: number;
      crewRequired: number;
    }>;
    landableOrbitShips: Array<{
      id: number;
      name: string;
      shipClassId: number;
    }>;
  };
  crew?: {
    available: number;
    assignedToColony: number;
    inTraining: number;
    localLimit: number;
    globalLimit: number;
    remainingGlobal: number;
    trainableNow: number;
    trainingQueue: Array<{
      id: number;
      amount: number;
      finishesAt: string;
      status: string;
    }>;
  };
  shipyard: {
    unlocked: boolean;
    completed: boolean;
    inProgress: boolean;
    buildingId: number;
    buildingName: string;
    slotRules?: Array<{
      category: string;
      allowedBuildingFunctionIds: number[];
      moduleSlots: Record<string, number>;
    }>;
  };
}
interface Colony {
  id: number;
  name: string;
  energy: number;
  energyMax: number;
  population: number;
  populationMax: number;
  storageUsed: number;
  storageMax: number;
  locationLabel?: string;
  fieldCount?: number;
  storageItemCount?: number;
  posX?: number;
  posY?: number;
  starSystem?: { name: string; cx?: number; cy?: number; layerId?: number };
  celestialObject?: { name: string | null; classId: number | null };
  fields?: ColonyField[];
  storage?: ColonyStorageItem[];
  detailV2?: ColonyDetailV2;
}
interface BuildingDef {
  id: number;
  name: string;
  rawName?: string;
  nameShort?: string;
  description: string;
  category: string;
  costs: Record<string, number>;
  resourceCosts?: Array<{ commodityId: number; amount: number }>;
  allowedFieldTypes: number[];
  isUnique: boolean;
  visible?: boolean;
  researchId?: number | null;
  production: Array<{ commodityId: number; amount: number }>;
  bonuses: { energy: number; population: number; storage: number };
  researchPoints?: number;
  researchRequired?: string;
  bmCol?: number;
  epsCost?: number;
  epsProc?: number;
  bevUse?: number;
  bevPro?: number;
  integrity?: number;
}
interface CommodityDef {
  id: number;
  name: string;
  nameShort: string;
}
interface TerraformingDef {
  id: number;
  description: string;
  fromFieldType: number;
  toFieldType: number;
  energyCost: number;
  duration: number;
  researchId: number | null;
  costs: Array<{ commodityId: number; amount: number }>;
}

interface ShipClassDef {
  id: number;
  key: string;
  name: string;
  category: string;
  role: string;
  hullBase: number;
  shieldBase: number;
  cargoCapacity: number;
  crewMin: number;
  crewMax: number;
  warpBase: number;
  starterAllowed: boolean;
  unlockTechId?: number | null;
  unlocked?: boolean;
  requirementLabel?: string | null;
  buildCosts?: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────

const FIELD_TYPE_COLORS: Record<number, string> = {
  101: 'bg-green-900/40',
  111: 'bg-emerald-900/50',
  201: 'bg-blue-900/40',
  401: 'bg-amber-900/40',
  501: 'bg-cyan-900/30',
  601: 'bg-lime-900/40',
  701: 'bg-stone-700/60',
  703: 'bg-stone-600/70',
  801: 'bg-zinc-800/60',
  900: 'bg-indigo-900/30',
};
const FIELD_TYPE_NAMES: Record<number, string> = {
  101: 'Ebene',
  111: 'Wald',
  201: 'Ozean',
  401: 'Wueste',
  501: 'Eis',
  601: 'Sumpf',
  701: 'Fels',
  703: 'Gebirge',
  801: 'Untergrund',
  900: 'Orbit',
};
const TILE_TYPE_NAMES: Record<number, string> = {
  ...FIELD_TYPE_NAMES,
  112: 'Nadelwald',
  121: 'Sumpf',
  122: 'Sumpf',
  210: 'Seichtwasser',
  211: 'Korallen',
  212: 'Korallen',
  221: 'Küste',
  222: 'Küste',
  501: 'Eis',
  802: 'Untergrundfels',
  851: 'Untergrundwasser',
};
const BMCOL_LABELS: Record<number, string> = {
  1: 'Soziales',
  2: 'Industrie',
  3: 'Infrastruktur',
  4: 'Energie',
};
// ─── Utilities ───────────────────────────────────────────────

function canAfford(
  building: BuildingDef,
  storage: ColonyStorageItem[],
): boolean {
  return (building.resourceCosts || []).every(
    (c) =>
      (storage.find((s) => s.commodityId === c.commodityId)?.amount || 0) >=
      c.amount,
  );
}
function formatBuildTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function formatSignedAmount(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

// ─── Page ────────────────────────────────────────────────────

type DetailTab =
  | 'info'
  | 'build'
  | 'shipyard'
  | 'fabrication'
  | 'crew'
  | 'hangar';

export function ColoniesPage() {
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  useEffect(() => {
    Promise.all([
      api.get<Colony[]>('/colonies'),
      api.get<CommodityDef[]>('/colonies/commodities/all'),
      api.get<BuildingDef[]>('/colonies/buildings/available'),
      api.get<BuildingDef[]>('/colonies/buildings/all'),
      api.get<TerraformingDef[]>('/colonies/terraforming/all'),
      api.get<ShipClassDef[]>('/spacecraft/classes'),
    ]).then(([data, comms, buildings, allBuildings, terraforming, classes]) => {
      setColonies(data);
      setCommodities(comms);
      setBuildingDefs(buildings);
      setAllBuildingDefs(allBuildings);
      setTerraformingDefs(terraforming);
      setShipClasses(classes);
      const reqId = Number(searchParams.get('selected'));
      if (reqId) loadColonyDetail(reqId);
      setLoading(false);
    });
  }, []);

  const loadColonyDetail = async (id: number) => {
    const detail = await api.get<Colony>(`/colonies/${id}`);
    setSelected(detail);
    setSearchParams({ selected: String(id) }, { replace: true });
  };

  const goBack = () => {
    setSelected(null);
    setSearchParams({}, { replace: true });
  };

  if (loading)
    return <div className="p-4 text-swu-muted text-xs">Laden...</div>;
  if (!selected)
    return (
      <ColonyOverview
        colonies={colonies}
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
      onBuild={async (fi, bi) => {
        await api.post(`/colonies/${selected.id}/build`, {
          fieldIndex: fi,
          buildingId: bi,
        });
        loadColonyDetail(selected.id);
      }}
      onDemolish={async (fi) => {
        await api.delete(`/colonies/${selected.id}/fields/${fi}/building`);
        loadColonyDetail(selected.id);
      }}
      onToggle={async (fi) => {
        await api.post(`/colonies/${selected.id}/fields/${fi}/toggle`, {});
        loadColonyDetail(selected.id);
      }}
      onTerraform={async (fi, ti) => {
        await api.post(`/colonies/${selected.id}/fields/${fi}/terraform`, {
          terraformingId: ti,
        });
        loadColonyDetail(selected.id);
      }}
      onBuildShip={async (
        sci: number,
        name: string,
        moduleTypes?: string[],
        buildPlanName?: string,
        moduleCommodityIds?: number[],
      ) => {
        await api.post(`/colonies/${selected.id}/build-ship`, {
          shipClassId: sci,
          name,
          moduleTypes,
          buildPlanName,
          moduleCommodityIds,
        });
        loadColonyDetail(selected.id);
      }}
      onStartFabrication={async (
        itemKey: string,
        queueType: 'MODULE' | 'TORPEDO',
        buildingFunctionId: number,
      ) => {
        await api.post(`/colonies/${selected.id}/fabrication-queue`, {
          itemKey,
          queueType,
          amount: 1,
          buildingFunctionId,
        });
        loadColonyDetail(selected.id);
      }}
      onCancelFabrication={async (queueId: number) => {
        await api.delete(
          `/colonies/${selected.id}/fabrication-queue/${queueId}`,
        );
        loadColonyDetail(selected.id);
      }}
      onQueueCrewTraining={async (amount: number) => {
        await api.post(`/colonies/${selected.id}/crew-training`, { amount });
        loadColonyDetail(selected.id);
      }}
      onAssignCrewToShip={async (shipId: number, amount: number) => {
        await api.post(`/colonies/${selected.id}/ships/${shipId}/crew/assign`, {
          amount,
        });
        loadColonyDetail(selected.id);
      }}
      onUnassignCrewFromShip={async (shipId: number, amount: number) => {
        await api.post(
          `/colonies/${selected.id}/ships/${shipId}/crew/unassign`,
          { amount },
        );
        loadColonyDetail(selected.id);
      }}
      onLandShip={async (shipId: number) => {
        await api.post(`/colonies/${selected.id}/ships/${shipId}/land`, {});
        loadColonyDetail(selected.id);
      }}
      onDisassembleShip={async (shipId: number) => {
        await api.post(
          `/colonies/${selected.id}/ships/${shipId}/disassemble`,
          {},
        );
        loadColonyDetail(selected.id);
      }}
      onQueueShipRepair={async (shipId: number) => {
        await api.post(
          `/colonies/${selected.id}/ships/${shipId}/repair-queue`,
          {},
        );
        loadColonyDetail(selected.id);
      }}
      onQueueShipRetrofit={async (
        shipId: number,
        moduleCommodityIds: number[],
        buildPlanName?: string,
      ) => {
        await api.post(
          `/colonies/${selected.id}/ships/${shipId}/retrofit-queue`,
          {
            moduleCommodityIds,
            buildPlanName,
          },
        );
        loadColonyDetail(selected.id);
      }}
      onCancelShipyardQueue={async (queueId: number) => {
        await api.delete(`/colonies/${selected.id}/shipyard-queue/${queueId}`);
        loadColonyDetail(selected.id);
      }}
      onBuildAirfieldRump={async (shipClassId: number, amount: number) => {
        await api.post(`/colonies/${selected.id}/hangar/build-rump`, {
          shipClassId,
          amount,
        });
        loadColonyDetail(selected.id);
      }}
      onStartHangarShip={async (shipClassId: number, name?: string) => {
        await api.post(`/colonies/${selected.id}/hangar/start-ship`, {
          shipClassId,
          name,
        });
        loadColonyDetail(selected.id);
      }}
    />
  );
}

// ─── Overview ────────────────────────────────────────────────

function ColonyOverview({
  colonies,
  onSelect,
}: {
  colonies: Colony[];
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-swu-muted">/ Kolonien</div>
      <div className="bg-swu-surface border border-swu-border rounded overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-swu-muted border-b border-swu-border/50">
              <th className="text-left px-3 py-2 font-normal">Kolonie</th>
              <th className="text-right px-3 py-2 font-normal">Bevölkerung</th>
              <th className="text-right px-3 py-2 font-normal">Energie</th>
              <th className="text-right px-3 py-2 font-normal">Lager</th>
            </tr>
          </thead>
          <tbody>
            {colonies.map((c) => (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="border-b border-swu-border/20 hover:bg-swu-accent/5 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {c.celestialObject?.classId && (
                      <img
                        src={planetImage(c.celestialObject.classId)}
                        alt=""
                        className="w-8 h-8 object-contain"
                      />
                    )}
                    <div>
                      <div className="font-bold text-swu-primary">{c.name}</div>
                      <div className="text-[10px] text-swu-muted">
                        {c.locationLabel || 'Unbekannt'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-swu-success">
                  {c.population}/{c.populationMax}
                </td>
                <td className="px-3 py-2 text-right font-mono text-yellow-400">
                  {c.energy}/{c.energyMax}
                </td>
                <td className="px-3 py-2 text-right font-mono text-swu-primary">
                  {c.storageUsed}/{c.storageMax}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Detail ──────────────────────────────────────────────────

function ColonyDetail({
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
  onQueueShipRepair,
  onQueueShipRetrofit,
  onCancelShipyardQueue,
  onBuildAirfieldRump,
  onStartHangarShip,
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
  onBuild: (fi: number, bi: number) => void;
  onDemolish: (fi: number) => void;
  onToggle: (fi: number) => void;
  onTerraform: (fi: number, ti: number) => Promise<void> | void;
  onBuildShip: (
    sci: number,
    name: string,
    moduleTypes?: string[],
    buildPlanName?: string,
    moduleCommodityIds?: number[],
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
  onQueueShipRepair: (shipId: number) => Promise<void> | void;
  onQueueShipRetrofit: (
    shipId: number,
    moduleCommodityIds: number[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onCancelShipyardQueue: (queueId: number) => Promise<void> | void;
  onBuildAirfieldRump: (
    shipClassId: number,
    amount: number,
  ) => Promise<void> | void;
  onStartHangarShip: (
    shipClassId: number,
    name?: string,
  ) => Promise<void> | void;
}) {
  const buildingMap = useMemo(
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
  const [modalField, setModalField] = useState<ColonyField | null>(null);

  const fields = colony.fields || [];
  const storage = colony.storage || [];
  const detail = colony.detailV2;

  const highlightedFields = useMemo(() => {
    if (!selectedBuilding) return new Set<number>();
    return new Set(
      fields
        .filter(
          (f) =>
            !f.buildingId &&
            !f.isBuilding &&
            selectedBuilding.allowedFieldTypes.includes(f.fieldType),
        )
        .map((f) => f.fieldIndex),
    );
  }, [selectedBuilding, fields]);

  const handleFieldClick = (field: ColonyField) => {
    if (selectedBuilding && highlightedFields.has(field.fieldIndex)) {
      onBuild(field.fieldIndex, selectedBuilding.id);
      setSelectedBuilding(null);
      setSelectedField(null);
    } else if (!selectedBuilding) {
      if (field.buildingId && !field.isBuilding) {
        setModalField(field);
      } else {
        setSelectedField(field);
      }
    }
  };

  const orbitFields = fields
    .filter((f) => f.fieldType === 900)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const surfaceFields = fields
    .filter((f) => f.fieldType !== 900 && f.fieldType !== 801)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const undergroundFields = fields
    .filter((f) => f.fieldType === 801)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);

  const hasFabrication =
    (detail?.activeFabricationFunctionIds?.length ?? 0) > 0 ||
    (detail?.fabricationQueue?.length ?? 0) > 0 ||
    (detail?.fabricationCatalog?.length ?? 0) > 0;
  const hasHangar =
    Boolean(detail?.hangar?.hasAirfield) ||
    (detail?.hangar?.inventory?.some((item) => item.amount > 0) ?? false) ||
    (detail?.hangar?.landableOrbitShips?.length ?? 0) > 0;
  const tabs: Array<{ key: DetailTab; label: string; show: boolean }> = [
    { key: 'info', label: 'Informationen', show: true },
    { key: 'build', label: 'Baumenü', show: true },
    {
      key: 'shipyard',
      label: 'Werft',
      show: detail?.shipyard.completed ?? false,
    },
    { key: 'fabrication', label: 'Fabrikation', show: hasFabrication },
    { key: 'hangar', label: 'Hangar', show: hasHangar },
    { key: 'crew', label: 'Crew', show: Boolean(detail?.crew) },
  ];

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
        <span className="text-sm font-bold text-swu-primary">
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
          <span className="text-yellow-400 font-mono">
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
      <div className="flex gap-0 border-b border-swu-border overflow-x-auto">
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

      {/* Main: Left (Grid+Storage) + Right (Tab content) */}
      <div className="flex gap-3 flex-col lg:flex-row">
        {/* LEFT: Grid + Storage (always visible) */}
        <div className="lg:w-[440px] shrink-0 space-y-2 overflow-x-auto">
          {orbitFields.length > 0 && (
            <div>
              <div className="text-[9px] text-indigo-400 font-bold uppercase mb-0.5">
                Orbit
              </div>
              <div className="grid grid-cols-10 gap-0.5">
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
                    onClick={() => handleFieldClick(f)}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] text-green-400 font-bold uppercase mb-0.5">
              Oberfläche
            </div>
            <div className="grid grid-cols-10 gap-0.5">
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
                  onClick={() => handleFieldClick(f)}
                />
              ))}
            </div>
          </div>
          {undergroundFields.length > 0 && (
            <div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5">
                Untergrund
              </div>
              <div className="grid grid-cols-10 gap-0.5">
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
                Lager
              </div>
              <div className="divide-y divide-swu-border/20">
                {storage
                  .sort((a, b) => b.amount - a.amount)
                  .map((item) => {
                    const delta = detail?.productionDeltas.find(
                      (d) => d.commodityId === item.commodityId,
                    )?.amount;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-0.5 text-[10px]"
                      >
                        <img
                          src={commodityImage(
                            item.commodityId,
                            commodityMap[item.commodityId]?.name,
                          )}
                          alt=""
                          className="h-5 w-5 object-contain"
                          loading="lazy"
                        />
                        <span className="text-swu-muted truncate flex-1">
                          {commodityMap[item.commodityId]?.name ||
                            `#${item.commodityId}`}
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
          {activeTab === 'build' && (
            <PanelBuild
              buildingDefs={buildingDefs}
              fields={fields}
              storage={storage}
              commodityMap={commodityMap}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={(b: BuildingDef) => {
                if (selectedBuilding?.id === b.id) setSelectedBuilding(null);
                else {
                  setSelectedBuilding(b);
                  setSelectedField(null);
                }
              }}
            />
          )}
          {activeTab === 'shipyard' && (
            <PanelShipyard
              shipClasses={shipClasses}
              queue={detail?.shipBuildQueue ?? []}
              availableModules={detail?.availableShipModules ?? []}
              slotRules={detail?.shipyard.slotRules ?? []}
              availableCrew={detail?.crew?.available ?? 0}
              orbitShips={detail?.orbitShips ?? []}
              onBuildShip={onBuildShip}
              onQueueShipRepair={onQueueShipRepair}
              onQueueShipRetrofit={onQueueShipRetrofit}
              onCancelShipyardQueue={onCancelShipyardQueue}
            />
          )}
          {activeTab === 'hangar' && detail?.hangar && (
            <PanelHangar
              hangar={detail.hangar}
              orbitShips={detail.orbitShips}
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
              commodityMap={commodityMap}
              onStartFabrication={onStartFabrication}
              onCancelFabrication={onCancelFabrication}
            />
          )}
          {activeTab === 'crew' && detail?.crew && (
            <PanelCrew
              crew={detail.crew}
              orbitShips={detail.orbitShips}
              onQueueCrewTraining={onQueueCrewTraining}
              onAssignCrewToShip={onAssignCrewToShip}
              onUnassignCrewFromShip={onUnassignCrewFromShip}
              onLandShip={onLandShip}
              onDisassembleShip={onDisassembleShip}
            />
          )}
        </div>
      </div>

      {/* Field Info Modal */}
      {modalField && modalField.buildingId && (
        <FieldInfoModal
          field={modalField}
          building={buildingMap[modalField.buildingId]}
          commodityMap={commodityMap}
          onClose={() => setModalField(null)}
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

function PanelInfo({
  colony,
  detail,
  selectedField,
  buildingMap,
  commodityMap,
  terraformingDefs,
  onTerraform,
}: any) {
  return (
    <div className="space-y-2">
      {/* Field info if selected (empty or building-in-progress fields only — completed buildings open modal) */}
      {selectedField && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
          <div className="font-bold text-swu-primary">
            Feld #{selectedField.fieldIndex}
          </div>
          <div className="text-swu-muted">
            Terrain:{' '}
            {TILE_TYPE_NAMES[
              selectedField.terrainTileId ?? selectedField.fieldType
            ] ||
              FIELD_TYPE_NAMES[selectedField.fieldType] ||
              '?'}
          </div>
          {!selectedField.buildingId && !selectedField.terraformingId && (
            <div className="pt-2 border-t border-swu-border/40 space-y-1">
              <div className="text-[10px] text-swu-muted uppercase font-bold">
                Terraforming
              </div>
              {terraformingDefs
                .filter(
                  (option: TerraformingDef) =>
                    option.fromFieldType === selectedField.fieldType,
                )
                .map((option: TerraformingDef) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      onTerraform(selectedField.fieldIndex, option.id)
                    }
                    className="w-full text-left px-2 py-1 rounded border border-swu-border/60 hover:border-swu-accent text-[10px]"
                  >
                    <span className="text-swu-primary">
                      {option.description}
                    </span>
                    <span className="ml-2 text-swu-muted">
                      →{' '}
                      {FIELD_TYPE_NAMES[option.toFieldType] ||
                        option.toFieldType}
                    </span>
                    {option.costs.length > 0 && (
                      <span className="ml-2 text-swu-muted">
                        Kosten:{' '}
                        {option.costs
                          .map(
                            (cost: { commodityId: number; amount: number }) =>
                              `${cost.amount} ${commodityMap[cost.commodityId]?.name || cost.commodityId}`,
                          )
                          .join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              {terraformingDefs.filter(
                (option: TerraformingDef) =>
                  option.fromFieldType === selectedField.fieldType,
              ).length === 0 && (
                <div className="text-[10px] text-swu-muted">
                  Keine Optionen verfügbar
                </div>
              )}
            </div>
          )}
          {selectedField.terraformingId && (
            <div className="text-yellow-400">
              Terraforming läuft bis{' '}
              {selectedField.terraformingFinishesAt || '?'}
            </div>
          )}
          {selectedField.buildingId && selectedField.isBuilding && (
            <div>
              Gebäude:{' '}
              <span className="text-swu-accent">
                {buildingMap[selectedField.buildingId]?.name ||
                  `#${selectedField.buildingId}`}
              </span>
              <span className="text-yellow-400 ml-1">(im Bau)</span>
            </div>
          )}
        </div>
      )}

      {/* Orbit Ships */}
      {detail?.orbitShips.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Schiffe im Orbit
          </div>
          <div className="space-y-0.5 text-xs">
            {detail.orbitShips.map((s: any) => (
              <div key={s.id} className="flex justify-between gap-2">
                <span className="text-swu-primary">{s.name}</span>
                <span className="text-swu-muted">
                  {s.status} · Crew {s.crew}/{s.crewRequired}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planet + System */}
      <div className="flex gap-2">
        {colony.celestialObject && (
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex-1">
            <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
              Planet
            </div>
            <div className="flex items-center gap-2">
              {colony.celestialObject.classId && (
                <img
                  src={planetImage(colony.celestialObject.classId)}
                  alt=""
                  className="w-10 h-10 object-contain"
                />
              )}
              <div className="text-xs">
                <div className="text-swu-primary">
                  {colony.celestialObject.name || colony.name}
                </div>
                {colony.posX != null && colony.posY != null && (
                  <div className="text-[10px] text-swu-muted font-mono">
                    {colony.posX}|{colony.posY}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {colony.starSystem && (
          <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 flex-1">
            <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
              Sternensystem
            </div>
            <div className="text-xs text-swu-primary">
              {colony.starSystem.name}
            </div>
            {colony.starSystem.cx != null && colony.starSystem.cy != null && (
              <div className="text-[10px] text-swu-muted font-mono">
                Sektor {colony.starSystem.cx}|{colony.starSystem.cy}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Population — STU-style */}
      {detail && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Bevölkerung
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div>
              <div className="text-swu-muted text-[10px]">Gesamt</div>
              <div className="font-mono text-swu-primary">
                {detail.population.current}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Arbeiter</div>
              <div className="font-mono text-yellow-400">
                {detail.population.workers}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Verfügbar</div>
              <div className="font-mono text-green-400">
                {detail.population.available}
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Wohnraum</div>
              <div className="font-mono text-swu-primary">
                {detail.population.housingFree ?? detail.population.housing} (
                {detail.population.housingMax ?? detail.population.max})
              </div>
            </div>
            <div>
              <div className="text-swu-muted text-[10px]">Entwicklung</div>
              <div className="font-mono text-green-400">
                {formatSignedAmount(detail.population.growth)}
              </div>
            </div>
          </div>
        </div>
      )}

      {detail?.planetaryDefense && detail.planetaryDefense.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Planetare Verteidigung
          </div>
          <div className="space-y-0.5 text-[10px]">
            {detail.planetaryDefense.map(
              (
                defense: NonNullable<
                  ColonyDetailV2['planetaryDefense']
                >[number],
              ) => (
                <div
                  key={`${defense.fieldIndex}-${defense.functionId}`}
                  className="flex justify-between"
                >
                  <span className="text-swu-muted">
                    Feld {defense.fieldIndex}: {defense.buildingName}
                  </span>
                  <span className="text-swu-primary">
                    {defense.functionName}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {detail?.deposits && detail.deposits.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Vorkommen
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
            {detail.deposits.map(
              (deposit: NonNullable<ColonyDetailV2['deposits']>[number]) => (
                <div
                  key={deposit.commodityId}
                  className="flex justify-between gap-2"
                >
                  <span
                    className={
                      deposit.depleted ? 'text-red-400' : 'text-swu-muted'
                    }
                  >
                    {deposit.name}
                  </span>
                  <span className="font-mono text-swu-primary">
                    {deposit.amountLeft}
                    {deposit.delta !== 0 && (
                      <span
                        className={
                          deposit.delta < 0
                            ? 'text-red-400 ml-1'
                            : 'text-green-400 ml-1'
                        }
                      >
                        {formatSignedAmount(deposit.delta)}
                      </span>
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Effects (non-resource commodities only — resources shown in Lager) */}
      {detail &&
        (() => {
          const storageIds = new Set(
            (colony.storage || []).map((s: any) => s.commodityId),
          );
          const effects = detail.productionDeltas.filter(
            (d: any) => !storageIds.has(d.commodityId),
          );
          if (effects.length === 0) return null;
          return (
            <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
              <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
                Effekte
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                {effects.map((d: any) => (
                  <div key={d.commodityId} className="flex justify-between">
                    <span className="text-swu-muted">{d.name}</span>
                    <span
                      className={
                        d.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {formatSignedAmount(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

// ─── Panel: Baumenü ──────────────────────────────────────────

function PanelBuild({
  buildingDefs,
  fields,
  storage,
  commodityMap,
  selectedBuilding,
  onSelectBuilding,
}: any) {
  const buildingsByColumn = useMemo(() => {
    const cols: Record<number, BuildingDef[]> = {};
    for (const b of buildingDefs) {
      if (b.id === 1) continue;
      const col = b.bmCol ?? 0;
      if (!cols[col]) cols[col] = [];
      cols[col].push(b);
    }
    for (const col of Object.keys(cols)) {
      cols[Number(col)].sort((a: BuildingDef, b: BuildingDef) =>
        a.name.localeCompare(b.name),
      );
    }
    return cols;
  }, [buildingDefs]);

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Building List */}
      <div className="flex-1 min-w-0 space-y-2">
        {[1, 2, 3, 4].map((col) => {
          const colBuildings = buildingsByColumn[col] || [];
          if (colBuildings.length === 0) return null;
          return (
            <div
              key={col}
              className="bg-swu-surface border border-swu-border rounded"
            >
              <div className="px-3 py-1 border-b border-swu-border/50">
                <span className="text-[10px] font-bold text-swu-muted uppercase">
                  {BMCOL_LABELS[col]}
                </span>
              </div>
              <div className="divide-y divide-swu-border/20">
                {colBuildings.map((b: BuildingDef) => {
                  const affordable = canAfford(b, storage);
                  const isSelected = selectedBuilding?.id === b.id;
                  const alreadyBuilt =
                    b.isUnique &&
                    fields.some(
                      (f: ColonyField) =>
                        f.buildingId === b.id && !f.isBuilding,
                    );
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelectBuilding(b)}
                      disabled={alreadyBuilt}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-all ${isSelected ? 'bg-swu-accent/15 text-swu-accent' : alreadyBuilt ? 'opacity-40 cursor-not-allowed' : affordable ? 'hover:bg-swu-primary/5' : 'opacity-60'}`}
                    >
                      <img
                        src={buildingImage(b.id)}
                        alt=""
                        className="h-7 w-7 shrink-0 object-contain"
                        loading="lazy"
                      />
                      <span className="text-swu-primary truncate flex-1">
                        {b.name}
                      </span>
                      {!affordable && !alreadyBuilt && (
                        <span className="text-[9px] text-red-400">✕</span>
                      )}
                      {alreadyBuilt && (
                        <span className="text-[9px] text-swu-muted">
                          gebaut
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Building Detail - Floating */}
      {selectedBuilding && (
        <FloatingPanel
          title={selectedBuilding.name}
          startX={Math.round(window.innerWidth / 2 - 170)}
          startY={Math.round(window.innerHeight / 2 - 200)}
          onClose={() => onSelectBuilding(selectedBuilding)}
        >
          <div className="text-xs space-y-2">
            <div className="font-bold text-swu-accent">
              {selectedBuilding.name}
            </div>
            {selectedBuilding.description && (
              <div className="text-[10px] text-swu-muted">
                {selectedBuilding.description}
              </div>
            )}
            <div>
              <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                Baukosten
              </div>
              {(selectedBuilding.epsCost || 0) > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                    <span>⚡</span>
                    <span className="truncate">Energie</span>
                  </span>
                  <span className="text-swu-primary">
                    {selectedBuilding.epsCost}
                  </span>
                </div>
              )}
              {(selectedBuilding.resourceCosts || [])
                .filter((c: any) => c.amount > 0)
                .map((c: any) => {
                  const avail =
                    storage.find((s: any) => s.commodityId === c.commodityId)
                      ?.amount || 0;
                  const commodity = commodityMap[c.commodityId];
                  return (
                    <div
                      key={c.commodityId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                        <img
                          src={commodityImage(c.commodityId, commodity?.name)}
                          alt=""
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                        <span className="truncate">
                          {commodity?.nameShort || commodity?.name || '?'}
                        </span>
                      </span>
                      <span
                        className={
                          avail >= c.amount
                            ? 'text-swu-primary'
                            : 'text-red-400'
                        }
                      >
                        {c.amount}
                        {avail < c.amount && ` (${avail})`}
                      </span>
                    </div>
                  );
                })}
            </div>
            {((selectedBuilding.bevUse || 0) > 0 ||
              (selectedBuilding.bevPro || 0) > 0 ||
              selectedBuilding.bonuses.storage !== 0) && (
              <div>
                <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                  Auswirkungen
                </div>
                {(selectedBuilding.bevUse || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">👤 Arbeiter</span>
                    <span className="text-red-400">
                      -{selectedBuilding.bevUse}
                    </span>
                  </div>
                )}
                {(selectedBuilding.bevPro || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">🏠 Wohnraum</span>
                    <span className="text-green-400">
                      +{selectedBuilding.bevPro}
                    </span>
                  </div>
                )}
                {selectedBuilding.bonuses.storage !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">📦 Lager</span>
                    <span
                      className={
                        selectedBuilding.bonuses.storage > 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {formatSignedAmount(selectedBuilding.bonuses.storage)}
                    </span>
                  </div>
                )}
              </div>
            )}
            {((selectedBuilding.epsProc || 0) !== 0 ||
              selectedBuilding.production.length > 0) && (
              <div>
                <div className="text-[10px] text-swu-muted uppercase font-bold mb-0.5">
                  Produktion
                </div>
                {(selectedBuilding.epsProc || 0) !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">⚡ Energie</span>
                    <span
                      className={
                        (selectedBuilding.epsProc || 0) < 0
                          ? 'text-red-400'
                          : 'text-green-400'
                      }
                    >
                      {formatSignedAmount(selectedBuilding.epsProc || 0)}/Tick
                    </span>
                  </div>
                )}
                {selectedBuilding.production.map((p: any) => {
                  const commodity = commodityMap[p.commodityId];
                  return (
                    <div
                      key={p.commodityId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-swu-muted">
                        <img
                          src={commodityImage(p.commodityId, commodity?.name)}
                          alt=""
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                        <span className="truncate">
                          {commodity?.name || '?'}
                        </span>
                      </span>
                      <span
                        className={
                          p.amount < 0 ? 'text-red-400' : 'text-green-400'
                        }
                      >
                        {formatSignedAmount(p.amount)}/Tick
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-swu-muted">
              Bauzeit: {formatBuildTime(selectedBuilding.costs.buildTime || 0)}
            </div>
            <div className="text-[10px] text-swu-accent font-bold">
              ← Feld im Grid klicken zum Platzieren
            </div>
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}

// ─── Panel: Hangar ───────────────────────────────────────────

function PanelHangar({
  hangar,
  orbitShips,
  onBuildAirfieldRump,
  onStartHangarShip,
  onLandShip,
}: {
  hangar: NonNullable<ColonyDetailV2['hangar']>;
  orbitShips: ColonyDetailV2['orbitShips'];
  onBuildAirfieldRump: (
    shipClassId: number,
    amount: number,
  ) => Promise<void> | void;
  onStartHangarShip: (
    shipClassId: number,
    name?: string,
  ) => Promise<void> | void;
  onLandShip: (shipId: number) => Promise<void> | void;
}) {
  const [amountByClass, setAmountByClass] = useState<Record<number, number>>(
    {},
  );
  const [nameByClass, setNameByClass] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void> | void) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Hangar-Aktion fehlgeschlagen');
    } finally {
      setBusy(null);
    }
  };

  const landableIds = new Set(hangar.landableOrbitShips.map((ship) => ship.id));
  const landableShips = orbitShips.filter((ship) => landableIds.has(ship.id));

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Hangarbestand
        </div>
        {hangar.inventory.every((item) => item.amount <= 0) ? (
          <div className="text-swu-muted">Keine Rümpfe im Hangar.</div>
        ) : (
          <div className="space-y-1">
            {hangar.inventory
              .filter((item) => item.amount > 0)
              .map((item) => (
                <div
                  key={item.hangarCommodityId}
                  className="flex justify-between"
                >
                  <span className="text-swu-primary">{item.displayName}</span>
                  <span className="font-mono text-swu-muted">
                    ×{item.amount}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Rumpf bauen
        </div>
        {!hangar.hasAirfield && (
          <div className="text-red-400">Aktiver Raumhafen erforderlich.</div>
        )}
        {hangar.buildable.map((item) => {
          const amount = amountByClass[item.shipClassId] ?? 1;
          return (
            <div
              key={item.shipClassId}
              className="border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold text-swu-primary">
                    {item.shipClassName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Energie Bau {item.buildEnergyCost} · Start{' '}
                    {item.startEnergyCost} · Crew {item.crewRequired}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Kosten:{' '}
                    {item.buildCosts
                      .map((cost) => `${cost.amount} #${cost.commodityId}`)
                      .join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={amount}
                    onChange={(e) =>
                      setAmountByClass((current) => ({
                        ...current,
                        [item.shipClassId]: Math.max(
                          1,
                          Number(e.target.value) || 1,
                        ),
                      }))
                    }
                    className="w-16 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                  />
                  <button
                    onClick={() =>
                      run(`build-${item.shipClassId}`, () =>
                        onBuildAirfieldRump(item.shipClassId, amount),
                      )
                    }
                    disabled={
                      !hangar.hasAirfield ||
                      busy === `build-${item.shipClassId}`
                    }
                    className="px-2 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] rounded disabled:opacity-40"
                  >
                    Bauen
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Startbereit
        </div>
        {hangar.startable.filter((item) => item.amount > 0).length === 0 ? (
          <div className="text-swu-muted">Keine startbaren Rümpfe.</div>
        ) : (
          hangar.startable
            .filter((item) => item.amount > 0)
            .map((item) => (
              <div
                key={item.shipClassId}
                className="flex items-center gap-2 border-b border-swu-border/20 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex-1">
                  <div className="font-bold text-swu-primary">
                    {item.shipClassName} ×{item.amount}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Startenergie {item.startEnergyCost} · Crew{' '}
                    {item.crewRequired}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Name optional"
                  value={nameByClass[item.shipClassId] ?? ''}
                  onChange={(e) =>
                    setNameByClass((current) => ({
                      ...current,
                      [item.shipClassId]: e.target.value,
                    }))
                  }
                  className="w-36 px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                />
                <button
                  onClick={() =>
                    run(`start-${item.shipClassId}`, () =>
                      onStartHangarShip(
                        item.shipClassId,
                        nameByClass[item.shipClassId],
                      ),
                    )
                  }
                  disabled={busy === `start-${item.shipClassId}`}
                  className="px-2 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] rounded disabled:opacity-40"
                >
                  Starten
                </button>
              </div>
            ))
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Landbare Orbit-Schiffe
        </div>
        {landableShips.length === 0 ? (
          <div className="text-swu-muted">
            Keine landbaren Schiffe im Orbit.
          </div>
        ) : (
          landableShips.map((ship) => (
            <div
              key={ship.id}
              className="flex justify-between items-center border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
            >
              <span className="text-swu-primary">{ship.name}</span>
              <button
                onClick={() =>
                  run(`land-${ship.id}`, () => onLandShip(ship.id))
                }
                disabled={busy === `land-${ship.id}`}
                className="px-2 py-1 bg-swu-primary/10 border border-swu-border text-swu-primary text-[10px] rounded disabled:opacity-40"
              >
                Landen
              </button>
            </div>
          ))
        )}
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

// ─── Panel: Crew ─────────────────────────────────────────────

function PanelCrew({
  crew,
  orbitShips,
  onQueueCrewTraining,
  onAssignCrewToShip,
  onUnassignCrewFromShip,
  onLandShip: _onLandShip,
  onDisassembleShip: _onDisassembleShip,
}: {
  crew: NonNullable<ColonyDetailV2['crew']>;
  orbitShips: ColonyDetailV2['orbitShips'];
  onQueueCrewTraining: (amount: number) => Promise<void> | void;
  onAssignCrewToShip: (shipId: number, amount: number) => Promise<void> | void;
  onUnassignCrewFromShip: (
    shipId: number,
    amount: number,
  ) => Promise<void> | void;
  onLandShip: (shipId: number) => Promise<void> | void;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const train = async () => {
    setBusy(true);
    setError(null);
    try {
      await onQueueCrewTraining(amount);
      setAmount(1);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Crew-Ausbildung fehlgeschlagen',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Crew-Übersicht
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
          <div>
            Kolonie:{' '}
            <span className="text-swu-primary font-mono">
              {crew.assignedToColony}/{crew.localLimit}
            </span>
          </div>
          <div>
            In Ausbildung:{' '}
            <span className="text-swu-primary font-mono">
              {crew.inTraining}
            </span>
          </div>
          <div>
            Global:{' '}
            <span className="text-swu-primary font-mono">
              {crew.globalLimit}
            </span>
          </div>
          <div>
            Verbleibend:{' '}
            <span className="text-swu-primary font-mono">
              {crew.remainingGlobal}
            </span>
          </div>
          <div>
            Jetzt trainierbar:{' '}
            <span className="text-swu-primary font-mono">
              {crew.trainableNow}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Akademie
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, crew.trainableNow)}
            value={amount}
            onChange={(e) =>
              setAmount(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-24 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary"
          />
          <button
            onClick={train}
            disabled={busy || crew.trainableNow <= 0}
            className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 disabled:opacity-40"
          >
            {busy ? '...' : 'Ausbilden'}
          </button>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Orbit-Crew
        </div>
        <div className="space-y-1 mb-2">
          {orbitShips.length === 0 ? (
            <div className="text-swu-muted">Keine Schiffe im Orbit.</div>
          ) : (
            orbitShips.map((ship) => (
              <div
                key={ship.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <div>
                  <div className="text-swu-primary">{ship.name}</div>
                  <div className="text-[10px] text-swu-muted">
                    Crew {ship.crew}/{ship.crewRequired} · Max {ship.crewMax}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAssignCrewToShip(ship.id, 1)}
                    disabled={crew.available <= 0 || ship.crew >= ship.crewMax}
                    className="px-2 py-1 rounded bg-swu-accent/15 text-swu-accent disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onUnassignCrewFromShip(ship.id, 1)}
                    disabled={ship.crew <= 0}
                    className="px-2 py-1 rounded bg-red-500/10 text-red-300 disabled:opacity-40"
                  >
                    -
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Warteschlange
        </div>
        {crew.trainingQueue.length === 0 ? (
          <div className="text-swu-muted">Keine aktive Ausbildung.</div>
        ) : (
          <div className="space-y-1">
            {crew.trainingQueue.map((job) => (
              <div
                key={job.id}
                className="flex justify-between border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <span className="text-swu-primary">{job.amount} Crew</span>
                <span className="text-swu-muted">
                  bis {new Date(job.finishesAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel: Fabrikation ──────────────────────────────────────

function PanelFabrication({
  catalog,
  queue,
  activeFunctionIds,
  commodityMap,
  onStartFabrication,
  onCancelFabrication,
}: {
  catalog: NonNullable<ColonyDetailV2['fabricationCatalog']>;
  queue: NonNullable<ColonyDetailV2['fabricationQueue']>;
  activeFunctionIds: number[];
  commodityMap: Record<number, CommodityDef>;
  onStartFabrication: (
    itemKey: string,
    queueType: 'MODULE' | 'TORPEDO',
    buildingFunctionId: number,
  ) => Promise<void> | void;
  onCancelFabrication: (queueId: number) => Promise<void> | void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeFunctionSet = useMemo(
    () => new Set(activeFunctionIds),
    [activeFunctionIds],
  );

  const startItem = async (
    item: NonNullable<ColonyDetailV2['fabricationCatalog']>[number],
  ) => {
    const buildingFunctionId = item.buildingFunctionIds.find((functionId) =>
      activeFunctionSet.has(functionId),
    );
    if (!buildingFunctionId) return;
    setBusyKey(item.itemKey);
    setError(null);
    try {
      await onStartFabrication(
        item.itemKey,
        item.queueType,
        buildingFunctionId,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fabrikation fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  const cancelJob = async (queueId: number) => {
    setBusyKey(`queue-${queueId}`);
    setError(null);
    try {
      await onCancelFabrication(queueId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Abbruch fehlgeschlagen');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Aktive Fertigung
        </div>
        {queue.length === 0 ? (
          <div className="text-xs text-swu-muted">Keine aktiven Jobs.</div>
        ) : (
          <div className="space-y-1 text-xs">
            {queue.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-2 border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-bold text-swu-primary truncate">
                    {job.amount}× {job.displayName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    {job.functionName} · bis{' '}
                    {new Date(job.finishesAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => cancelJob(job.id)}
                  disabled={busyKey === `queue-${job.id}`}
                  className="px-2 py-1 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded divide-y divide-swu-border/20">
        {catalog.map((item) => {
          const output = commodityMap[item.outputCommodityId];
          const canStart = item.buildingFunctionIds.some((functionId) =>
            activeFunctionSet.has(functionId),
          );
          return (
            <div key={item.itemKey} className="px-3 py-2 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-swu-primary truncate">
                    {item.displayName}
                  </div>
                  <div className="text-[10px] text-swu-muted">
                    Output: {item.outputAmount}×{' '}
                    {output?.name ?? `Ware #${item.outputCommodityId}`} ·{' '}
                    {formatBuildTime(item.durationSeconds)}
                  </div>
                </div>
                <button
                  onClick={() => startItem(item)}
                  disabled={!canStart || busyKey === item.itemKey}
                  className="px-2 py-1 rounded bg-swu-accent/15 text-swu-accent hover:bg-swu-accent/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Starten
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-swu-muted">
                {item.costs.map((cost) => (
                  <span key={cost.commodityId}>
                    {cost.amount}{' '}
                    {commodityMap[cost.commodityId]?.name ?? cost.commodityId}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel: Werft ────────────────────────────────────────────

function PanelShipyard({
  shipClasses,
  queue,
  availableModules,
  slotRules,
  availableCrew,
  orbitShips,
  onBuildShip,
  onQueueShipRepair,
  onQueueShipRetrofit,
  onCancelShipyardQueue,
}: {
  shipClasses: ShipClassDef[];
  queue: NonNullable<ColonyDetailV2['shipBuildQueue']>;
  availableModules: NonNullable<ColonyDetailV2['availableShipModules']>;
  slotRules: NonNullable<ColonyDetailV2['shipyard']['slotRules']>;
  availableCrew: number;
  orbitShips: ColonyDetailV2['orbitShips'];
  onBuildShip: (
    sci: number,
    name: string,
    moduleTypes?: string[],
    buildPlanName?: string,
    moduleCommodityIds?: number[],
  ) => Promise<void> | void;
  onQueueShipRepair: (shipId: number) => Promise<void> | void;
  onQueueShipRetrofit: (
    shipId: number,
    moduleCommodityIds: number[],
    buildPlanName?: string,
  ) => Promise<void> | void;
  onCancelShipyardQueue: (queueId: number) => Promise<void> | void;
}) {
  const [selectedClass, setSelectedClass] = useState<ShipClassDef | null>(null);
  const [shipName, setShipName] = useState('');
  const [buildPlanName, setBuildPlanName] = useState('');
  const [moduleInput, setModuleInput] = useState('');
  const [selectedModuleCommodityIds, setSelectedModuleCommodityIds] = useState<
    number[]
  >([]);
  const [retrofitShipId, setRetrofitShipId] = useState<number | null>(null);
  const [retrofitBuildPlanName, setRetrofitBuildPlanName] = useState('');
  const [retrofitModuleCommodityIds, setRetrofitModuleCommodityIds] = useState<
    number[]
  >([]);
  const [building, setBuilding] = useState(false);
  const [busyShipyardAction, setBusyShipyardAction] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const queueModeLabel: Record<ShipyardQueueMode, string> = {
    BUILD: 'Bau',
    REPAIR: 'Reparatur',
    RETROFIT: 'Umrüstung',
  };

  const selectedSlotRule = selectedClass
    ? slotRules.find((rule) => rule.category === selectedClass.category)
    : undefined;
  const selectedModuleCounts = selectedModuleCommodityIds.reduce(
    (counts, commodityId) => {
      const module = availableModules.find(
        (candidate) => candidate.commodityId === commodityId,
      );
      if (module) {
        counts[module.moduleCategory] =
          (counts[module.moduleCategory] ?? 0) + 1;
      }
      return counts;
    },
    {} as Record<string, number>,
  );

  const handleBuild = async () => {
    if (!selectedClass || !shipName.trim()) return;
    setBuilding(true);
    setError(null);
    try {
      const moduleTypes = moduleInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      await onBuildShip(
        selectedClass.id,
        shipName.trim(),
        moduleTypes,
        buildPlanName.trim() || undefined,
        selectedModuleCommodityIds,
      );
      setShipName('');
      setBuildPlanName('');
      setModuleInput('');
      setSelectedModuleCommodityIds([]);
      setSelectedClass(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBuilding(false);
    }
  };

  const runShipyardAction = async (
    key: string,
    action: () => Promise<void> | void,
  ) => {
    setBusyShipyardAction(key);
    setError(null);
    try {
      await action();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Werftaktion fehlgeschlagen');
    } finally {
      setBusyShipyardAction(null);
    }
  };

  const toggleRetrofitModule = (commodityId: number) => {
    setRetrofitModuleCommodityIds((current) =>
      current.includes(commodityId)
        ? current.filter((id) => id !== commodityId)
        : [...current, commodityId],
    );
  };

  return (
    <div className="space-y-2">
      {queue.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Werftwarteschlange
          </div>
          <div className="space-y-1 text-xs">
            {queue.map((job) => {
              const mode = job.mode ?? 'BUILD';
              return (
                <div
                  key={job.id}
                  className="flex flex-col border-b border-swu-border/20 pb-1 last:border-0 last:pb-0"
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-swu-primary font-bold">
                      <span className="text-swu-accent mr-1">
                        {queueModeLabel[mode]}
                      </span>
                      {job.name}
                    </span>
                    <span className="text-swu-muted">
                      bis {new Date(job.finishesAt).toLocaleString()}
                    </span>
                  </div>
                  {job.buildPlanName && (
                    <div className="text-[10px] text-swu-muted">
                      Plan: {job.buildPlanName}
                    </div>
                  )}
                  {job.repairSnapshot?.costs?.length ? (
                    <div className="text-[10px] text-swu-muted">
                      Kosten:{' '}
                      {job.repairSnapshot.costs
                        .map((cost) => `${cost.amount} #${cost.commodityId}`)
                        .join(', ')}
                    </div>
                  ) : null}
                  {job.moduleTypes.length > 0 && (
                    <div className="text-[10px] text-swu-muted">
                      Module: {job.moduleTypes.join(', ')}
                    </div>
                  )}
                  <div className="pt-1">
                    <button
                      onClick={() =>
                        runShipyardAction(`cancel-${job.id}`, () =>
                          onCancelShipyardQueue(job.id),
                        )
                      }
                      disabled={busyShipyardAction === `cancel-${job.id}`}
                      className="px-2 py-0.5 rounded border border-red-500/50 bg-red-900/20 text-[10px] text-red-300 disabled:opacity-40"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-swu-surface border border-swu-border rounded divide-y divide-swu-border/20">
        {shipClasses.map((sc) => {
          const locked = sc.unlocked === false;
          return (
            <button
              key={sc.id}
              onClick={() => !locked && setSelectedClass(sc)}
              disabled={locked}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors ${selectedClass?.id === sc.id ? 'bg-swu-accent/10' : locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-swu-primary/5'}`}
            >
              <span className="font-bold text-swu-primary">{sc.name}</span>
              <span className="text-swu-muted">
                Hull {sc.hullBase} | Shields {sc.shieldBase} | Cargo{' '}
                {sc.cargoCapacity}
              </span>
              {locked && (
                <span className="text-[10px] text-yellow-400 ml-auto">
                  {sc.requirementLabel || 'Forschung fehlt'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {orbitShips.length > 0 && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2">
          <div className="text-[10px] font-bold text-swu-muted uppercase">
            Orbit-Schiffe
          </div>
          {orbitShips.map((ship) => {
            const isRetrofitting = retrofitShipId === ship.id;
            return (
              <div
                key={ship.id}
                className="border-b border-swu-border/20 pb-2 last:border-0 last:pb-0 space-y-1"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="text-swu-primary font-bold">
                      {ship.name}
                    </div>
                    <div className="text-[10px] text-swu-muted">
                      Hülle {ship.hull}/{ship.hullMax} · Schaden{' '}
                      {ship.damageSummary?.hullDamage ?? 0} · Module beschädigt{' '}
                      {ship.damageSummary?.damagedModules ?? 0}
                    </div>
                    {ship.modules?.length ? (
                      <div className="text-[10px] text-swu-muted">
                        Installiert:{' '}
                        {ship.modules
                          .map(
                            (module) =>
                              `${module.moduleType} (${module.integrity}%)`,
                          )
                          .join(', ')}
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() =>
                      runShipyardAction(`repair-${ship.id}`, () =>
                        onQueueShipRepair(ship.id),
                      )
                    }
                    disabled={
                      !ship.canRepair ||
                      busyShipyardAction === `repair-${ship.id}`
                    }
                    className="h-7 px-2 rounded bg-swu-accent/15 border border-swu-accent/60 text-[10px] text-swu-accent disabled:opacity-40"
                  >
                    Reparieren
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRetrofitShipId(isRetrofitting ? null : ship.id);
                      setRetrofitBuildPlanName(`${ship.name} Retrofit`);
                      setRetrofitModuleCommodityIds(
                        (ship.modules ?? [])
                          .map((module) => module.commodityId)
                          .filter((id): id is number => id != null),
                      );
                    }}
                    disabled={!ship.canRetrofit}
                    className="px-2 py-1 rounded bg-swu-primary/10 border border-swu-border text-[10px] text-swu-primary disabled:opacity-40"
                  >
                    {isRetrofitting ? 'Umrüstung schließen' : 'Umrüsten'}
                  </button>
                </div>
                {isRetrofitting && (
                  <div className="space-y-2 rounded border border-swu-border/60 bg-swu-bg/50 p-2">
                    <input
                      type="text"
                      value={retrofitBuildPlanName}
                      onChange={(e) => setRetrofitBuildPlanName(e.target.value)}
                      placeholder="Retrofit-Bauplanname"
                      className="w-full px-2 py-1 bg-swu-bg border border-swu-border rounded text-[10px] text-swu-primary"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {availableModules.map((module) => {
                        const checked = retrofitModuleCommodityIds.includes(
                          module.commodityId,
                        );
                        return (
                          <label
                            key={module.commodityId}
                            className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] cursor-pointer ${checked ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border/60 hover:border-swu-accent/60'}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleRetrofitModule(module.commodityId)
                              }
                            />
                            <span className="text-swu-primary truncate">
                              {module.displayName}
                            </span>
                            <span className="ml-auto text-swu-muted">
                              ×{module.amount}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      onClick={() =>
                        runShipyardAction(`retrofit-${ship.id}`, () =>
                          onQueueShipRetrofit(
                            ship.id,
                            retrofitModuleCommodityIds,
                            retrofitBuildPlanName.trim() || undefined,
                          ),
                        )
                      }
                      disabled={busyShipyardAction === `retrofit-${ship.id}`}
                      className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-[10px] font-bold rounded disabled:opacity-40"
                    >
                      Umrüstung starten
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedClass && (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 space-y-2">
          {selectedClass.buildCosts && (
            <div className="text-[10px]">
              <span className="text-swu-muted uppercase font-bold">
                Baukosten:{' '}
              </span>
              {Object.entries(selectedClass.buildCosts).map(([k, v]) => (
                <span key={k} className="text-swu-primary mr-2">
                  {k}: {v}
                </span>
              ))}
            </div>
          )}
          <div className="text-[10px] text-swu-muted">
            <span className="uppercase font-bold">Crew:</span>{' '}
            <span
              className={
                availableCrew >= (selectedClass.crewMin ?? 0)
                  ? 'text-green-400'
                  : 'text-red-400'
              }
            >
              {availableCrew}/{selectedClass.crewMin ?? 0} benötigt
            </span>
          </div>
          {selectedSlotRule && (
            <div className="text-[10px] text-swu-muted">
              <span className="uppercase font-bold">Slots:</span>{' '}
              {Object.entries(selectedSlotRule.moduleSlots)
                .map(
                  ([category, max]) =>
                    `${category} ${selectedModuleCounts[category] ?? 0}/${max}`,
                )
                .join(' · ')}
            </div>
          )}
          {availableModules.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-swu-muted uppercase font-bold">
                Module aus Kolonielager
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {availableModules.map((module) => {
                  const checked = selectedModuleCommodityIds.includes(
                    module.commodityId,
                  );
                  return (
                    <label
                      key={module.commodityId}
                      className={`flex items-center gap-2 px-2 py-1 rounded border text-[10px] cursor-pointer ${checked ? 'border-swu-accent bg-swu-accent/10' : 'border-swu-border/60 hover:border-swu-accent/60'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedModuleCommodityIds((current) =>
                            checked
                              ? current.filter(
                                  (id) => id !== module.commodityId,
                                )
                              : [...current, module.commodityId],
                          );
                        }}
                      />
                      <span className="text-swu-primary truncate">
                        {module.displayName}
                      </span>
                      <span className="ml-auto text-swu-muted">
                        ×{module.amount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Bauplanname (optional)"
              value={buildPlanName}
              onChange={(e) => setBuildPlanName(e.target.value)}
              className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
            <input
              type="text"
              placeholder="Module, Komma-getrennt (optional)"
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
              className="px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Schiffsname..."
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              className="flex-1 px-2 py-1 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
            />
            <button
              onClick={handleBuild}
              disabled={!shipName.trim() || building}
              className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 disabled:opacity-40 transition-colors"
            >
              {building ? '...' : 'Bauen'}
            </button>
          </div>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Floating Panel ─────────────────────────────────────────

function FloatingPanel({
  title,
  startX,
  startY,
  onClose,
  children,
}: {
  title: string;
  startX?: number;
  startY?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: startX ?? 64, y: startY ?? 64 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      offset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-swu-surface border border-swu-border rounded-lg shadow-2xl w-[340px] max-w-[90vw]"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-swu-border cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="text-xs font-bold text-swu-primary">{title}</span>
        <button
          onClick={onClose}
          className="text-swu-muted hover:text-swu-primary text-sm leading-none"
        >
          ✕
        </button>
      </div>
      <div className="px-3 py-2 max-h-[70vh] overflow-y-auto">{children}</div>
    </div>
  );
}

// ─── Field Info Panel ────────────────────────────────────────

function FieldInfoModal({
  field,
  building,
  commodityMap,
  onClose,
  onDemolish,
  onToggle,
}: {
  field: ColonyField;
  building: BuildingDef | undefined;
  commodityMap: Record<number, CommodityDef>;
  onClose: () => void;
  onDemolish: () => void;
  onToggle: () => void;
}) {
  if (!building) return null;
  const terrainName =
    TILE_TYPE_NAMES[field.terrainTileId ?? field.fieldType] ||
    FIELD_TYPE_NAMES[field.fieldType] ||
    '?';
  const isHQ = [1, 82010100, 82010300].includes(field.buildingId!);
  const isBonus = (field.terrainTileId ?? field.fieldType) >= 10000;

  return (
    <FloatingPanel
      title={`Feld ${field.fieldIndex} - Informationen`}
      startX={Math.round(window.innerWidth / 2 - 170)}
      startY={Math.round(window.innerHeight / 2 - 200)}
      onClose={onClose}
    >
      <div className="space-y-3">
        {/* Building info */}
        <div className="flex items-center gap-3">
          <img
            src={buildingImage(building.id)}
            alt=""
            className={`h-12 w-12 object-contain ${!field.isActive ? 'opacity-40 grayscale' : ''}`}
          />
          <div>
            <div className="text-sm font-bold text-swu-primary">
              {building.name}
            </div>
            <div className="text-[10px] text-swu-muted">
              auf {terrainName}
              {isBonus && (
                <span className="ml-1 text-yellow-400">★ Bonusfeld</span>
              )}
            </div>
            {!field.isActive && (
              <div className="text-[10px] text-red-400 font-bold">
                DEAKTIVIERT
              </div>
            )}
            {building.integrity && (
              <div className="text-[10px] text-swu-muted">
                Integrität: {building.integrity}/{building.integrity}
              </div>
            )}
          </div>
        </div>

        {/* Auswirkungen */}
        {((building.bevUse || 0) > 0 ||
          (building.bevPro || 0) > 0 ||
          building.bonuses.storage !== 0) && (
          <div>
            <div className="text-[10px] text-swu-muted uppercase font-bold mb-1">
              Auswirkungen
            </div>
            <div className="space-y-0.5 text-xs">
              {(building.bevUse || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">👤 Arbeiter</span>
                  <span className="text-red-400">-{building.bevUse}</span>
                </div>
              )}
              {(building.bevPro || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">🏠 Wohnraum</span>
                  <span className="text-green-400">+{building.bevPro}</span>
                </div>
              )}
              {building.bonuses.storage !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">📦 Lager</span>
                  <span
                    className={
                      building.bonuses.storage > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {formatSignedAmount(building.bonuses.storage)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Produktion */}
        {((building.epsProc || 0) !== 0 || building.production.length > 0) && (
          <div>
            <div className="text-[10px] text-swu-muted uppercase font-bold mb-1">
              Produktion
            </div>
            <div className="space-y-0.5 text-xs">
              {(building.epsProc || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-swu-muted">⚡ Energie</span>
                  <span
                    className={
                      (building.epsProc || 0) < 0
                        ? 'text-red-400'
                        : 'text-green-400'
                    }
                  >
                    {formatSignedAmount(building.epsProc || 0)}
                  </span>
                </div>
              )}
              {building.production.map((p) => (
                <div
                  key={p.commodityId}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <img
                      src={commodityImage(
                        p.commodityId,
                        commodityMap[p.commodityId]?.name,
                      )}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                    <span className="text-swu-muted">
                      {commodityMap[p.commodityId]?.name || '?'}
                    </span>
                  </span>
                  <span
                    className={p.amount < 0 ? 'text-red-400' : 'text-green-400'}
                  >
                    {formatSignedAmount(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-swu-border/50">
          {!isHQ && (
            <button
              onClick={onToggle}
              className={`px-3 py-1 text-[10px] font-bold rounded border transition-colors ${field.isActive ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/40' : 'bg-green-900/20 border-green-500/50 text-green-400 hover:bg-green-900/40'}`}
            >
              {field.isActive ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          )}
          {!isHQ && (
            <button
              onClick={onDemolish}
              className="px-3 py-1 bg-red-900/20 border border-red-500/50 text-red-400 text-[10px] font-bold rounded hover:bg-red-900/40 transition-colors"
            >
              Demontieren
            </button>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}

// ─── FieldCell ───────────────────────────────────────────────

function FieldCell({
  field,
  buildingName,
  buildingId,
  isSelected,
  isHighlighted,
  isBuildMode,
  isFieldActive,
  onClick,
}: {
  field: ColonyField;
  buildingName?: string;
  buildingId?: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isBuildMode: boolean;
  isFieldActive: boolean;
  onClick: () => void;
}) {
  const terrainTileId = field.terrainTileId ?? field.fieldType;
  const inactive = buildingId && !field.isBuilding && !isFieldActive;
  const isBonus = terrainTileId >= 10000;
  const bonusUsed = isBonus && !!buildingId && !field.isBuilding;
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 overflow-hidden rounded border text-xs flex items-center justify-center transition-all
        ${isSelected ? 'border-swu-accent ring-1 ring-swu-accent' : ''}
        ${isHighlighted ? 'border-dashed border-swu-accent ring-2 ring-swu-accent/60 animate-pulse' : ''}
        ${inactive ? 'border-red-500/50' : ''}
        ${!isSelected && !isHighlighted && !inactive && isBonus && !bonusUsed ? 'border-yellow-400/70' : ''}
        ${!isSelected && !isHighlighted && !inactive && bonusUsed ? 'border-green-400/70' : ''}
        ${!isSelected && !isHighlighted && !inactive && !isBonus ? 'border-swu-border/50' : ''}
        ${FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg'}
        ${field.isBuilding ? 'animate-pulse' : ''}
        ${isBuildMode && !isHighlighted && !field.buildingId ? 'opacity-30' : ''}
        ${isHighlighted ? 'cursor-crosshair' : 'hover:border-swu-primary'}`}
      title={`${TILE_TYPE_NAMES[terrainTileId] || FIELD_TYPE_NAMES[field.fieldType] || '?'}${isBonus ? ' ★' : ''}${buildingName ? ' — ' + buildingName : ''}${inactive ? ' (deaktiviert)' : ''} (${field.fieldIndex})`}
    >
      <img
        src={colonyFieldTileImage(terrainTileId)}
        alt=""
        className="h-full w-full rounded object-cover"
        loading="lazy"
      />
      {buildingId && (
        <>
          <span
            className={`absolute rounded-md ${inactive ? 'bg-black/10' : 'bg-black/18 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'}`}
            style={{ width: '34px', height: '34px' }}
          />
          <img
            src={buildingImage(buildingId)}
            alt=""
            className={`absolute h-9 w-9 object-contain ${inactive ? 'opacity-40 grayscale' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]'}`}
            style={{
              width: '36px',
              height: '36px',
              filter: inactive ? undefined : 'contrast(1.08) saturate(1.08)',
            }}
            loading="lazy"
          />
        </>
      )}
    </button>
  );
}
