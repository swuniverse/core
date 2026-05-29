import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { buildingImage, commodityImage, planetImage } from '../lib/assets';

interface ColonyField {
  id: number;
  fieldIndex: number;
  fieldType: number;
  buildingId: number | null;
  isBuilding: boolean;
  buildProgress: number;
  buildFinishesAt: string | null;
}

interface ColonyStorageItem {
  id: number;
  commodityId: number;
  amount: number;
}

interface ColonyDetailV2 {
  energy: { current: number; max: number; delta: number };
  storage: { current: number; max: number; delta: number };
  population: { current: number; max: number; growth: number };
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
  }>;
  research: { pointsPerTick: number };
  shipyard: {
    unlocked: boolean;
    completed: boolean;
    inProgress: boolean;
    buildingId: number;
    buildingName: string;
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
  starSystem?: { name: string };
  celestialObject?: { name: string | null; classId: number | null };
  fields?: ColonyField[];
  storage?: ColonyStorageItem[];
  detailV2?: ColonyDetailV2;
}

interface BuildingProduction {
  commodityId: number;
  amount: number;
}

interface BuildingBonuses {
  energy: number;
  population: number;
  storage: number;
}

interface BuildingDef {
  id: number;
  name: string;
  nameShort: string;
  description: string;
  category: string;
  costs: Record<string, number>;
  resourceCosts?: Array<{ commodityId: number; amount: number }>;
  allowedFieldTypes: number[];
  isUnique: boolean;
  production: BuildingProduction[];
  bonuses: BuildingBonuses;
  researchPoints?: number;
  researchRequired?: string;
}

interface CommodityDef {
  id: number;
  name: string;
  nameShort: string;
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
  warpBase: number;
  starterAllowed: boolean;
  unlockTechId?: number | null;
  unlocked?: boolean;
  requirementLabel?: string | null;
  buildCosts?: Record<string, number>;
}

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

const CATEGORY_LABELS: Record<string, string> = {
  INFRASTRUCTURE: 'Infra',
  PRODUCTION: 'Produktion',
  HABITATION: 'Wohnen',
  MILITARY: 'Militär',
  RESEARCH: 'Forschung',
  SPECIAL: 'Spezial',
};

const COST_COMMODITY_MAP: Record<string, number> = {
  credits: 1,
  durastahl: 2,
  tibannaGas: 3,
  kyberKristalle: 4,
  beskar: 5,
  kristallinesSilizium: 6,
  energiemodule: 7,
};

function canAfford(
  building: BuildingDef,
  storage: ColonyStorageItem[],
): boolean {
  if (building.resourceCosts?.length) {
    return building.resourceCosts.every((cost) => {
      const available =
        storage.find((s) => s.commodityId === cost.commodityId)?.amount || 0;
      return available >= cost.amount;
    });
  }

  return Object.entries(COST_COMMODITY_MAP).every(([key, id]) => {
    const required = building.costs[key] || 0;
    return (
      required <= 0 ||
      (storage.find((s) => s.commodityId === id)?.amount || 0) >= required
    );
  });
}

function formatBuildTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ColoniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [commodities, setCommodities] = useState<CommodityDef[]>([]);
  const [buildingDefs, setBuildingDefs] = useState<BuildingDef[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClassDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Colony[]>('/colonies'),
      api.get<CommodityDef[]>('/colonies/commodities/all'),
      api.get<BuildingDef[]>('/colonies/buildings/available'),
      api.get<ShipClassDef[]>('/spacecraft/classes'),
    ]).then(([data, comms, buildings, classes]) => {
      setColonies(data);
      setCommodities(comms);
      setBuildingDefs(buildings);
      setShipClasses(classes);
      const requestedId = Number(searchParams.get('selected'));
      const initialColony =
        data.find((colony) => colony.id === requestedId) ?? data[0];
      if (initialColony) loadColonyDetail(initialColony.id);
      setLoading(false);
    });
  }, [searchParams]);

  const loadColonyDetail = async (colonyId: number) => {
    const detail = await api.get<Colony>(`/colonies/${colonyId}`);
    setSelected(detail);
    setSearchParams({ selected: String(colonyId) }, { replace: true });
  };

  if (loading)
    return <div className="p-6 text-swu-muted">Kolonien werden geladen...</div>;

  if (colonies.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-swu-accent">Kolonien</h1>
        <p className="text-swu-muted mt-4">
          Noch keine Kolonien. Waehle deine erste Heimatwelt im Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-swu-accent mb-4">Kolonien</h1>
      <div className="flex gap-4">
        <div className="w-48 space-y-2">
          {colonies.map((c) => (
            <button
              key={c.id}
              onClick={() => loadColonyDetail(c.id)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selected?.id === c.id
                  ? 'border-swu-accent bg-swu-accent/10 text-swu-accent'
                  : 'border-swu-border text-swu-muted hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-sm">{c.name}</div>
              <div className="text-xs mt-1">
                {c.locationLabel ||
                  c.celestialObject?.name ||
                  c.starSystem?.name ||
                  'Unknown'}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <ColonyDetail
            colony={selected}
            commodities={commodities}
            buildingDefs={buildingDefs}
            shipClasses={shipClasses}
            onBuild={(fieldIndex, buildingId) =>
              handleBuild(selected.id, fieldIndex, buildingId)
            }
            onDemolish={(fieldIndex) => handleDemolish(selected.id, fieldIndex)}
            onBuildShip={(shipClassId, name) =>
              handleBuildShip(selected.id, shipClassId, name)
            }
          />
        )}
      </div>
    </div>
  );

  async function handleBuild(
    colonyId: number,
    fieldIndex: number,
    buildingId: number,
  ) {
    await api.post(`/colonies/${colonyId}/build`, { fieldIndex, buildingId });
    loadColonyDetail(colonyId);
  }

  async function handleDemolish(colonyId: number, fieldIndex: number) {
    await api.delete(`/colonies/${colonyId}/fields/${fieldIndex}/building`);
    loadColonyDetail(colonyId);
  }

  async function handleBuildShip(
    colonyId: number,
    shipClassId: number,
    name: string,
  ) {
    await api.post(`/colonies/${colonyId}/build-ship`, { shipClassId, name });
    loadColonyDetail(colonyId);
  }
}

function ColonyDetail({
  colony,
  commodities,
  buildingDefs,
  shipClasses,
  onBuild,
  onDemolish,
  onBuildShip,
}: {
  colony: Colony;
  commodities: CommodityDef[];
  buildingDefs: BuildingDef[];
  shipClasses: ShipClassDef[];
  onBuild: (fieldIndex: number, buildingId: number) => void;
  onDemolish: (fieldIndex: number) => void;
  onBuildShip: (shipClassId: number, name: string) => Promise<void> | void;
}) {
  const buildingMap = Object.fromEntries(buildingDefs.map((b) => [b.id, b]));
  const commodityMap = Object.fromEntries(commodities.map((c) => [c.id, c]));

  const [selectedField, setSelectedField] = useState<ColonyField | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDef | null>(
    null,
  );

  const fields = colony.fields || [];
  const storage = colony.storage || [];

  const categories = useMemo(() => {
    const cats = new Set(buildingDefs.map((b) => b.category));
    return Array.from(cats);
  }, [buildingDefs]);

  const categoryBuildings = useMemo(() => {
    if (!selectedCategory) return [];
    return buildingDefs.filter(
      (b) => b.category === selectedCategory && b.id !== 1,
    );
  }, [selectedCategory, buildingDefs]);

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

  const isUniqueAlreadyBuilt = useMemo(() => {
    if (!selectedBuilding || !selectedBuilding.isUnique) return false;
    return fields.some(
      (f) => f.buildingId === selectedBuilding.id && !f.isBuilding,
    );
  }, [selectedBuilding, fields]);

  const orbitFields = fields
    .filter((f) => f.fieldType === 900)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const undergroundFields = fields
    .filter((f) => f.fieldType === 801)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);
  const surfaceFields = fields
    .filter((f) => f.fieldType !== 900 && f.fieldType !== 801)
    .sort((a, b) => a.fieldIndex - b.fieldIndex);

  const handleFieldClick = (field: ColonyField) => {
    if (selectedBuilding && highlightedFields.has(field.fieldIndex)) {
      onBuild(field.fieldIndex, selectedBuilding.id);
      setSelectedBuilding(null);
      setSelectedField(null);
    } else if (!selectedBuilding) {
      setSelectedField(field);
    }
  };

  const handleSelectBuilding = (building: BuildingDef) => {
    if (selectedBuilding?.id === building.id) {
      setSelectedBuilding(null);
    } else {
      setSelectedBuilding(building);
      setSelectedField(null);
    }
  };

  return (
    <div className="flex-1 space-y-4">
      {/* Colony Header */}
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            {colony.celestialObject?.classId && (
              <img
                src={planetImage(colony.celestialObject.classId)}
                alt=""
                className="w-10 h-10 object-contain shrink-0"
              />
            )}
            <div>
              <h2 className="text-lg font-bold text-swu-primary">
                {colony.name}
              </h2>
              <p className="text-xs text-swu-muted mt-1">
                {colony.locationLabel ||
                  colony.celestialObject?.name ||
                  colony.starSystem?.name ||
                  'Unknown location'}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-swu-muted">
            <p>Felder: {colony.fieldCount ?? colony.fields?.length ?? 0}</p>
            <p>
              Lagerposten:{' '}
              {colony.storageItemCount ?? colony.storage?.length ?? 0}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <ResourceBar
            label="Energie"
            current={colony.detailV2?.energy.current ?? colony.energy}
            max={colony.detailV2?.energy.max ?? colony.energyMax}
            delta={colony.detailV2?.energy.delta}
            color="text-yellow-400"
            barColor="bg-yellow-500"
          />
          <ResourceBar
            label="Bevoelkerung"
            current={colony.detailV2?.population.current ?? colony.population}
            max={colony.detailV2?.population.max ?? colony.populationMax}
            delta={colony.detailV2?.population.growth}
            color="text-swu-success"
            barColor="bg-swu-success"
          />
          <ResourceBar
            label="Lager"
            current={colony.detailV2?.storage.current ?? colony.storageUsed}
            max={colony.detailV2?.storage.max ?? colony.storageMax}
            delta={colony.detailV2?.storage.delta}
            color="text-swu-primary"
            barColor="bg-swu-primary"
          />
        </div>
      </div>

      {colony.detailV2 && <ColonyRuntimeOverview detail={colony.detailV2} />}

      {/* Grid + Build Panel */}
      <div className="flex gap-4">
        {/* Colony Grid */}
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-swu-muted">Koloniefeld</h3>

          <div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1">
              Orbit
            </div>
            <div className="grid grid-cols-10 gap-1">
              {orbitFields.map((field) => (
                <FieldCell
                  key={field.fieldIndex}
                  field={field}
                  buildingName={
                    field.buildingId
                      ? buildingMap[field.buildingId]?.nameShort ||
                        buildingMap[field.buildingId]?.name
                      : undefined
                  }
                  buildingId={field.buildingId ?? undefined}
                  isSelected={selectedField?.fieldIndex === field.fieldIndex}
                  isHighlighted={highlightedFields.has(field.fieldIndex)}
                  isBuildMode={!!selectedBuilding}
                  onClick={() => handleFieldClick(field)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-green-400 font-bold uppercase mb-1">
              Surface
            </div>
            <div className="grid grid-cols-10 gap-1">
              {surfaceFields.map((field) => (
                <FieldCell
                  key={field.fieldIndex}
                  field={field}
                  buildingName={
                    field.buildingId
                      ? buildingMap[field.buildingId]?.nameShort ||
                        buildingMap[field.buildingId]?.name
                      : undefined
                  }
                  buildingId={field.buildingId ?? undefined}
                  isSelected={selectedField?.fieldIndex === field.fieldIndex}
                  isHighlighted={highlightedFields.has(field.fieldIndex)}
                  isBuildMode={!!selectedBuilding}
                  onClick={() => handleFieldClick(field)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">
              Underground
            </div>
            <div className="grid grid-cols-10 gap-1">
              {undergroundFields.map((field) => (
                <FieldCell
                  key={field.fieldIndex}
                  field={field}
                  buildingName={
                    field.buildingId
                      ? buildingMap[field.buildingId]?.nameShort ||
                        buildingMap[field.buildingId]?.name
                      : undefined
                  }
                  buildingId={field.buildingId ?? undefined}
                  isSelected={selectedField?.fieldIndex === field.fieldIndex}
                  isHighlighted={highlightedFields.has(field.fieldIndex)}
                  isBuildMode={!!selectedBuilding}
                  onClick={() => handleFieldClick(field)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Build Panel (right side) */}
        <div className="w-80 space-y-3">
          {/* Category Tabs */}
          <div className="bg-swu-surface border border-swu-border rounded-lg p-3">
            <h3 className="text-xs font-bold text-swu-muted uppercase mb-2">
              Baumenü
            </h3>
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat ? null : cat);
                    setSelectedBuilding(null);
                  }}
                  className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                    selectedCategory === cat
                      ? 'border-swu-accent bg-swu-accent/15 text-swu-accent'
                      : 'border-swu-border text-swu-muted hover:border-swu-primary hover:text-swu-primary'
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {/* Building List */}
          {selectedCategory && categoryBuildings.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-3">
              <div className="grid grid-cols-3 gap-1.5">
                {categoryBuildings.map((b) => {
                  const affordable = canAfford(b, storage);
                  const isSelected = selectedBuilding?.id === b.id;
                  const alreadyBuilt =
                    b.isUnique &&
                    fields.some((f) => f.buildingId === b.id && !f.isBuilding);
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBuilding(b)}
                      disabled={alreadyBuilt}
                      className={`p-2 rounded border text-center transition-all ${
                        isSelected
                          ? 'border-swu-accent bg-swu-accent/15 ring-1 ring-swu-accent'
                          : alreadyBuilt
                            ? 'border-swu-border/30 opacity-40 cursor-not-allowed'
                            : affordable
                              ? 'border-swu-border hover:border-swu-primary'
                              : 'border-red-900/50 opacity-60'
                      }`}
                    >
                      <img
                        src={buildingImage(b.id)}
                        alt=""
                        className="mx-auto mb-1 h-14 w-14 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.18)]"
                        loading="lazy"
                      />
                      <div className="text-xs font-bold text-swu-primary truncate">
                        {b.nameShort}
                      </div>
                      <div className="text-[9px] text-swu-muted truncate mt-0.5">
                        {b.name}
                      </div>
                      {alreadyBuilt && (
                        <div className="text-[8px] text-swu-muted mt-0.5">
                          ✓ gebaut
                        </div>
                      )}
                      {!affordable && !alreadyBuilt && (
                        <div className="text-[8px] text-red-400 mt-0.5">
                          ✗ Kosten
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Building Detail */}
          {selectedBuilding && (
            <BuildingDetailPanel
              building={selectedBuilding}
              colony={colony}
              storage={storage}
              commodityMap={commodityMap}
              isUniqueAlreadyBuilt={isUniqueAlreadyBuilt}
              highlightedCount={highlightedFields.size}
            />
          )}

          {/* Field Info (when no building selected) */}
          {!selectedBuilding && selectedField && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-primary mb-2">
                Feld #{selectedField.fieldIndex}
              </h3>
              <div className="text-xs text-swu-muted space-y-1">
                <p>
                  Terrain:{' '}
                  {FIELD_TYPE_NAMES[selectedField.fieldType] || 'Unbekannt'}
                </p>
                {selectedField.buildingId && (
                  <p>
                    Gebaeude:{' '}
                    <span className="text-swu-accent">
                      {buildingMap[selectedField.buildingId]?.name ||
                        `#${selectedField.buildingId}`}
                    </span>
                    {selectedField.isBuilding && (
                      <span className="text-yellow-400 ml-1">(im Bau...)</span>
                    )}
                  </p>
                )}
                {selectedField.buildingId &&
                  !selectedField.isBuilding &&
                  buildingMap[selectedField.buildingId] && (
                    <div className="mt-2 pt-2 border-t border-swu-border/50 space-y-1">
                      {buildingMap[selectedField.buildingId].bonuses.energy !==
                        0 && (
                        <p>
                          Energie:{' '}
                          <span
                            className={
                              buildingMap[selectedField.buildingId].bonuses
                                .energy > 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {buildingMap[selectedField.buildingId].bonuses
                              .energy > 0
                              ? '+'
                              : ''}
                            {
                              buildingMap[selectedField.buildingId].bonuses
                                .energy
                            }
                          </span>
                        </p>
                      )}
                      {buildingMap[selectedField.buildingId].production.length >
                        0 && (
                        <p>
                          Produziert:{' '}
                          {buildingMap[selectedField.buildingId].production
                            .map(
                              (p) =>
                                `${commodityMap[p.commodityId]?.nameShort || '?'} +${p.amount}`,
                            )
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  )}
              </div>
              {selectedField.buildingId &&
                !selectedField.isBuilding &&
                selectedField.buildingId !== 1 && (
                  <button
                    onClick={() => onDemolish(selectedField.fieldIndex)}
                    className="mt-3 px-3 py-1 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded hover:bg-red-900/50 transition-colors"
                  >
                    Abreissen
                  </button>
                )}
            </div>
          )}

          {/* Storage */}
          {storage.length > 0 && (
            <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-swu-muted mb-2">Lager</h3>
              <div className="space-y-1">
                {storage.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-swu-muted">
                      <img
                        src={commodityImage(item.commodityId)}
                        alt=""
                        className="h-7 w-7 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.16)]"
                        style={{
                          width: '28px',
                          height: '28px',
                          maxWidth: '28px',
                          maxHeight: '28px',
                        }}
                        loading="lazy"
                      />
                      <span className="truncate">
                        {commodityMap[item.commodityId]?.name ||
                          `Item #${item.commodityId}`}
                      </span>
                    </span>
                    <span className="text-swu-primary font-mono">
                      {item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ship Build Panel */}
          {fields.some((f) => f.buildingId === 11 && !f.isBuilding) &&
            shipClasses.length > 0 && (
              <ShipBuildPanel
                shipClasses={shipClasses}
                onBuildShip={onBuildShip}
              />
            )}
        </div>
      </div>
    </div>
  );
}

function ColonyRuntimeOverview({ detail }: { detail: ColonyDetailV2 }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-swu-muted uppercase mb-2">
          Produktion / Tick
        </h3>
        {detail.productionDeltas.length === 0 ? (
          <p className="text-xs text-swu-muted">Noch keine Warenproduktion.</p>
        ) : (
          <div className="space-y-1">
            {detail.productionDeltas.map((delta) => (
              <div
                key={delta.commodityId}
                className="flex justify-between text-xs"
              >
                <span className="text-swu-muted">{delta.nameShort}</span>
                <span className="text-green-400">+{delta.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-swu-muted uppercase mb-2">
          Aktive Baujobs
        </h3>
        {detail.activeBuildJobs.length === 0 ? (
          <p className="text-xs text-swu-muted">
            Keine laufenden Bauauftraege.
          </p>
        ) : (
          <div className="space-y-1">
            {detail.activeBuildJobs.map((job) => (
              <div
                key={`${job.fieldIndex}-${job.buildingId}`}
                className="text-xs"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-swu-primary truncate">
                    {job.buildingName}
                  </span>
                  <span className="text-swu-muted">Feld {job.fieldIndex}</span>
                </div>
                <p className="text-[10px] text-swu-muted">
                  Fertig:{' '}
                  {job.finishesAt
                    ? new Date(job.finishesAt).toLocaleString()
                    : 'bald'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-swu-muted uppercase mb-2">
          Forschung & Werft
        </h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-swu-muted">FP/Tick</span>
            <span className="text-swu-primary">
              {detail.research.pointsPerTick}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-swu-muted">Werft-Forschung</span>
            <span
              className={
                detail.shipyard.unlocked ? 'text-green-400' : 'text-yellow-400'
              }
            >
              {detail.shipyard.unlocked ? 'bereit' : 'fehlt'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-swu-muted">Werfthub</span>
            <span
              className={
                detail.shipyard.completed ? 'text-green-400' : 'text-swu-muted'
              }
            >
              {detail.shipyard.completed
                ? 'gebaut'
                : detail.shipyard.inProgress
                  ? 'im Bau'
                  : 'fehlt'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-swu-muted uppercase mb-2">
          Orbit
        </h3>
        {detail.orbitShips.length === 0 ? (
          <p className="text-xs text-swu-muted">Keine Schiffe im Orbit.</p>
        ) : (
          <div className="space-y-1">
            {detail.orbitShips.map((ship) => (
              <div key={ship.id} className="text-xs text-swu-primary truncate">
                {ship.name}{' '}
                <span className="text-swu-muted">({ship.status})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BuildingDetailPanel({
  building,
  colony,
  storage,
  commodityMap,
  isUniqueAlreadyBuilt,
  highlightedCount,
}: {
  building: BuildingDef;
  colony: Colony;
  storage: ColonyStorageItem[];
  commodityMap: Record<number, CommodityDef>;
  isUniqueAlreadyBuilt: boolean;
  highlightedCount: number;
}) {
  const affordable = canAfford(building, storage);

  return (
    <div className="bg-swu-surface border border-swu-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold text-swu-accent">{building.name}</h3>
        <p className="text-[10px] text-swu-muted mt-0.5">
          {building.description}
        </p>
      </div>

      {/* Baukosten */}
      <div>
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Baukosten
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {(building.resourceCosts?.length
            ? building.resourceCosts.map((cost) => ({
                key: String(cost.commodityId),
                commodityId: cost.commodityId,
                amount: cost.amount,
              }))
            : Object.entries(COST_COMMODITY_MAP).map(([key, commodityId]) => ({
                key,
                commodityId,
                amount: building.costs[key] || 0,
              }))
          ).map(({ key, commodityId, amount }) => {
            if (!amount || amount <= 0) return null;
            const available =
              storage.find((s) => s.commodityId === commodityId)?.amount || 0;
            const enough = available >= amount;
            return (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-swu-muted">
                  {commodityMap[commodityId]?.nameShort || key}
                </span>
                <span className={enough ? 'text-swu-primary' : 'text-red-400'}>
                  {amount}
                  {!enough && (
                    <span className="text-[9px] ml-0.5">({available})</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Produktion */}
      {building.production.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Produktion
          </div>
          <div className="space-y-0.5">
            {building.production.map((p) => (
              <div key={p.commodityId} className="flex justify-between text-xs">
                <span className="text-swu-muted">
                  {commodityMap[p.commodityId]?.name || `#${p.commodityId}`}
                </span>
                <span className="text-green-400">+{p.amount}/Tick</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auswirkungen */}
      {(building.bonuses.energy !== 0 ||
        building.bonuses.population !== 0 ||
        building.bonuses.storage !== 0) && (
        <div>
          <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
            Auswirkungen
          </div>
          <div className="space-y-0.5 text-xs">
            {building.bonuses.energy !== 0 && (
              <div className="flex justify-between">
                <span className="text-swu-muted">Energie</span>
                <span
                  className={
                    building.bonuses.energy > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {building.bonuses.energy > 0 ? '+' : ''}
                  {building.bonuses.energy}
                </span>
              </div>
            )}
            {building.bonuses.population !== 0 && (
              <div className="flex justify-between">
                <span className="text-swu-muted">Bevoelkerung</span>
                <span
                  className={
                    building.bonuses.population > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {building.bonuses.population > 0 ? '+' : ''}
                  {building.bonuses.population}
                </span>
              </div>
            )}
            {building.bonuses.storage !== 0 && (
              <div className="flex justify-between">
                <span className="text-swu-muted">Lager</span>
                <span
                  className={
                    building.bonuses.storage > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {building.bonuses.storage > 0 ? '+' : ''}
                  {building.bonuses.storage}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Baubar + Bauzeit */}
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-swu-muted">Baubar: </span>
          {building.isUnique ? (
            <span
              className={
                isUniqueAlreadyBuilt ? 'text-red-400' : 'text-swu-primary'
              }
            >
              {isUniqueAlreadyBuilt ? '0/1' : '1/1'}
            </span>
          ) : (
            <span className="text-swu-primary">{highlightedCount} Felder</span>
          )}
        </div>
        <div>
          <span className="text-swu-muted">Bauzeit: </span>
          <span className="text-swu-primary">
            {formatBuildTime(building.costs.buildTime || 0)}
          </span>
        </div>
      </div>

      {/* Vorschau */}
      <div>
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Vorschau
        </div>
        <div className="space-y-0.5 text-xs">
          {building.bonuses.energy !== 0 && (
            <div className="flex justify-between">
              <span className="text-swu-muted">Energie</span>
              <span className="text-swu-primary">
                {colony.energyMax + building.bonuses.energy}{' '}
                <span
                  className={
                    building.bonuses.energy > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  ({building.bonuses.energy > 0 ? '+' : ''}
                  {building.bonuses.energy})
                </span>
              </span>
            </div>
          )}
          {building.bonuses.population !== 0 && (
            <div className="flex justify-between">
              <span className="text-swu-muted">Bev. Max</span>
              <span className="text-swu-primary">
                {colony.populationMax + building.bonuses.population}{' '}
                <span
                  className={
                    building.bonuses.population > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  ({building.bonuses.population > 0 ? '+' : ''}
                  {building.bonuses.population})
                </span>
              </span>
            </div>
          )}
          {building.bonuses.storage !== 0 && (
            <div className="flex justify-between">
              <span className="text-swu-muted">Lager Max</span>
              <span className="text-swu-primary">
                {colony.storageMax + building.bonuses.storage}{' '}
                <span
                  className={
                    building.bonuses.storage > 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  ({building.bonuses.storage > 0 ? '+' : ''}
                  {building.bonuses.storage})
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Erlaubte Felder */}
      <div>
        <div className="text-[10px] font-bold text-swu-muted uppercase mb-1">
          Erlaubte Felder
        </div>
        <div className="flex flex-wrap gap-1">
          {building.allowedFieldTypes.map((ft) => (
            <span
              key={ft}
              className={`w-5 h-5 rounded border border-swu-border/50 ${FIELD_TYPE_COLORS[ft] || 'bg-swu-bg'}`}
              title={FIELD_TYPE_NAMES[ft] || String(ft)}
            />
          ))}
        </div>
      </div>

      {/* Affordability warning */}
      {!affordable && (
        <div className="text-[10px] text-red-400 border-t border-swu-border/50 pt-2">
          Nicht genug Ressourcen
        </div>
      )}
      {isUniqueAlreadyBuilt && (
        <div className="text-[10px] text-yellow-400 border-t border-swu-border/50 pt-2">
          Bereits gebaut (einzigartig)
        </div>
      )}
    </div>
  );
}

function FieldCell({
  field,
  buildingName,
  buildingId,
  isSelected,
  isHighlighted,
  isBuildMode,
  onClick,
}: {
  field: ColonyField;
  buildingName?: string;
  buildingId?: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isBuildMode: boolean;
  onClick: () => void;
}) {
  const shortName = buildingName
    ? buildingName.length > 4
      ? buildingName.slice(0, 3) + '.'
      : buildingName
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded border text-xs flex items-center justify-center transition-all
        ${isSelected ? 'border-swu-accent ring-1 ring-swu-accent' : ''}
        ${isHighlighted ? 'border-dashed border-swu-accent ring-2 ring-swu-accent/60 animate-pulse' : ''}
        ${!isSelected && !isHighlighted ? 'border-swu-border/50' : ''}
        ${FIELD_TYPE_COLORS[field.fieldType] || 'bg-swu-bg'}
        ${field.isBuilding ? 'animate-pulse' : ''}
        ${isBuildMode && !isHighlighted && !field.buildingId ? 'opacity-30' : ''}
        ${isHighlighted ? 'cursor-crosshair' : 'hover:border-swu-primary'}
      `}
      title={`${FIELD_TYPE_NAMES[field.fieldType] || 'Unknown'}${buildingName ? ' — ' + buildingName : ''} (${field.fieldIndex})`}
    >
      {buildingId ? (
        <img
          src={buildingImage(buildingId)}
          alt=""
          className="colony-field-building-icon h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.16)]"
          style={{
            width: '32px',
            height: '32px',
            maxWidth: '32px',
            maxHeight: '32px',
          }}
          loading="lazy"
        />
      ) : shortName ? (
        <span className="text-[8px] font-bold text-swu-accent leading-none">
          {shortName}
        </span>
      ) : null}
    </button>
  );
}

function ShipBuildPanel({
  shipClasses,
  onBuildShip,
}: {
  shipClasses: ShipClassDef[];
  onBuildShip: (shipClassId: number, name: string) => Promise<void> | void;
}) {
  const [selectedClass, setSelectedClass] = useState<ShipClassDef | null>(null);
  const [shipName, setShipName] = useState('');
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = async () => {
    if (!selectedClass || !shipName.trim()) return;
    setBuilding(true);
    setError(null);
    try {
      await onBuildShip(selectedClass.id, shipName.trim());
      setShipName('');
      setSelectedClass(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Schiffbau');
    } finally {
      setBuilding(false);
    }
  };

  const visibleClasses = shipClasses;

  return (
    <div className="bg-swu-surface border border-swu-border rounded-lg p-4">
      <h3 className="text-sm font-bold text-swu-muted mb-2">Werft</h3>
      <div className="space-y-2">
        {visibleClasses.map((sc) => {
          const locked = sc.unlocked === false;
          return (
            <button
              key={sc.id}
              onClick={() => !locked && setSelectedClass(sc)}
              disabled={locked}
              className={`w-full text-left p-2 rounded border text-xs transition-colors ${
                selectedClass?.id === sc.id
                  ? 'border-swu-accent bg-swu-accent/10'
                  : locked
                    ? 'border-swu-border/40 opacity-50 cursor-not-allowed'
                    : 'border-swu-border hover:border-swu-primary'
              }`}
            >
              <div className="font-bold text-swu-primary">{sc.name}</div>
              <div className="text-swu-muted mt-0.5">
                Hull {sc.hullBase} | Shields {sc.shieldBase} | Cargo{' '}
                {sc.cargoCapacity} | Warp {sc.warpBase}
              </div>
              {locked && (
                <div className="text-[10px] text-yellow-400 mt-1">
                  Erfordert: {sc.requirementLabel || 'weitere Forschung'}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedClass?.buildCosts && (
        <div className="mt-3 rounded border border-swu-border/60 bg-swu-bg/40 p-2 text-[10px]">
          <div className="font-bold text-swu-muted uppercase mb-1">
            Baukosten
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {Object.entries(selectedClass.buildCosts).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-swu-muted">{key}</span>
                <span className="text-swu-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedClass && (
        <div className="mt-3 pt-3 border-t border-swu-border/50 space-y-2">
          <input
            type="text"
            placeholder="Schiffsname..."
            value={shipName}
            onChange={(e) => setShipName(e.target.value)}
            className="w-full px-3 py-1.5 bg-swu-bg border border-swu-border rounded text-xs text-swu-primary placeholder-swu-muted/50 focus:outline-none focus:border-swu-accent"
          />
          <button
            onClick={handleBuild}
            disabled={!shipName.trim() || building}
            className="w-full px-3 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-bold rounded hover:bg-swu-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {building ? 'Baue...' : `${selectedClass.name} bauen`}
          </button>
          {error && <p className="text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ResourceBar({
  label,
  current,
  max,
  delta,
  color,
  barColor,
}: {
  label: string;
  current: number;
  max: number;
  delta?: number;
  color: string;
  barColor: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-swu-muted mb-1">
        <span>{label}</span>
        <span className={color}>
          {current}/{max}
          {delta !== undefined && (
            <span
              className={
                delta >= 0 ? 'text-green-400 ml-1' : 'text-red-400 ml-1'
              }
            >
              {delta >= 0 ? '+' : ''}
              {delta}
            </span>
          )}
        </span>
      </div>
      <div className="h-2 bg-swu-bg rounded-full overflow-hidden border border-swu-border">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
