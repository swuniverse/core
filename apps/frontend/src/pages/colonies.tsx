import { useEffect, useMemo, useState } from 'react';
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
}
interface ColonyStorageItem {
  id: number;
  commodityId: number;
  amount: number;
}
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
  bevUse?: number;
  bevPro?: number;
  integrity?: number;
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

type DetailTab = 'info' | 'build' | 'shipyard';

export function ColoniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selected, setSelected] = useState<Colony | null>(null);
  const [commodities, setCommodities] = useState<CommodityDef[]>([]);
  const [buildingDefs, setBuildingDefs] = useState<BuildingDef[]>([]);
  const [shipClasses, setShipClasses] = useState<ShipClassDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

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
      shipClasses={shipClasses}
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
      onBuildShip={async (sci, name) => {
        await api.post(`/colonies/${selected.id}/build-ship`, {
          shipClassId: sci,
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
  shipClasses,
  activeTab,
  setActiveTab,
  onBack,
  onBuild,
  onDemolish,
  onToggle,
  onBuildShip,
}: {
  colony: Colony;
  commodities: CommodityDef[];
  buildingDefs: BuildingDef[];
  shipClasses: ShipClassDef[];
  activeTab: DetailTab;
  setActiveTab: (t: DetailTab) => void;
  onBack: () => void;
  onBuild: (fi: number, bi: number) => void;
  onDemolish: (fi: number) => void;
  onToggle: (fi: number) => void;
  onBuildShip: (sci: number, name: string) => Promise<void> | void;
}) {
  const buildingMap = useMemo(
    () => Object.fromEntries(buildingDefs.map((b) => [b.id, b])),
    [buildingDefs],
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

  const tabs: Array<{ key: DetailTab; label: string; show: boolean }> = [
    { key: 'info', label: 'Informationen', show: true },
    { key: 'build', label: 'Baumenü', show: true },
    {
      key: 'shipyard',
      label: 'Werft',
      show: detail?.shipyard.completed ?? false,
    },
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
              onDemolish={onDemolish}
            />
          )}
          {activeTab === 'build' && (
            <PanelBuild
              buildingDefs={buildingDefs}
              fields={fields}
              storage={storage}
              commodityMap={commodityMap}
              colony={colony}
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
              onBuildShip={onBuildShip}
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
  onDemolish,
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
              <div key={s.id} className="flex justify-between">
                <span className="text-swu-primary">{s.name}</span>
                <span className="text-swu-muted">{s.status}</span>
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
                {detail.population.current} ({detail.population.housing})
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
  colony,
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

      {/* Building Detail */}
      {selectedBuilding && (
        <div className="lg:w-64 lg:sticky lg:top-2 lg:self-start shrink-0">
          <div className="bg-swu-surface border border-swu-accent/30 rounded px-3 py-2 text-xs space-y-2">
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
        </div>
      )}
    </div>
  );
}

// ─── Panel: Werft ────────────────────────────────────────────

function PanelShipyard({
  shipClasses,
  onBuildShip,
}: {
  shipClasses: ShipClassDef[];
  onBuildShip: (sci: number, name: string) => Promise<void> | void;
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
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="space-y-2">
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

// ─── Field Info Modal ────────────────────────────────────────

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-swu-surface border border-swu-border rounded-lg w-[360px] max-w-[90vw] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-swu-border">
          <span className="text-xs font-bold text-swu-primary">
            Feld {field.fieldIndex} - Informationen
          </span>
          <button
            onClick={onClose}
            className="text-swu-muted hover:text-swu-primary text-sm"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
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
                    <span className="text-red-400">
                      -{building.bevUse}
                    </span>
                  </div>
                )}
                {(building.bevPro || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-swu-muted">🏠 Wohnraum</span>
                    <span className="text-green-400">
                      +{building.bevPro}
                    </span>
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
          {((building.epsProc || 0) !== 0 ||
            building.production.length > 0) && (
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
                      className={
                        p.amount < 0 ? 'text-red-400' : 'text-green-400'
                      }
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
      </div>
    </div>
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
        <img
          src={buildingImage(buildingId)}
          alt=""
          className={`absolute h-8 w-8 object-contain ${inactive ? 'opacity-40 grayscale' : 'drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]'}`}
          style={{ width: '32px', height: '32px' }}
          loading="lazy"
        />
      )}
    </button>
  );
}
